const Curso = require("../models/Curso");
const Evento = require("../models/Evento");
const Notificacion = require("../models/Notificacion");
const Usuario = require("../models/Usuario");

// Dashboard para ESTUDIANTE
exports.dashboardEstudiante = async (req, res) => {
  try {
    const estudianteId = req.usuario.id;

    if (req.usuario.rol !== "estudiante") {
      return res.status(403).json({ message: "Este endpoint es solo para estudiantes" });
    }

    const ahora = new Date();
    const en7Dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60000);

    // 1. Cursos en los que está inscrito
    const cursosInscritos = await Curso.find({ estudiantes: estudianteId })
      .populate("docente", "nombre email")
      .select("nombre codigo color docente");

    // 2. Eventos de hoy
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date();
    finDia.setHours(23, 59, 59, 999);

    const eventosHoy = await Evento.find({
      destinatarios: estudianteId,
      fechaInicio: {
        $gte: inicioDia,
        $lte: finDia
      },
      estado: { $ne: "cancelado" }
    })
    .populate("curso", "nombre codigo color")
    .populate("creador", "nombre")
    .sort({ fechaInicio: 1 });

    // 3. Eventos próximos (desde mañana hasta 7 días)
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    mañana.setHours(0, 0, 0, 0);

    const eventosProximos = await Evento.find({
      destinatarios: estudianteId,
      fechaInicio: {
        $gte: mañana,
        $lte: en7Dias
      },
      estado: { $ne: "cancelado" }
    })
    .populate("curso", "nombre codigo color")
    .populate("creador", "nombre")
    .sort({ fechaInicio: 1 })
    .limit(10);

    // 4. Notificaciones no leídas
    const notificacionesNoLeidas = await Notificacion.countDocuments({
      destinatario: estudianteId,
      leida: false
    });

    // 5. Eventos pendientes (no completados, desde ahora en adelante)
    const eventosPendientes = await Evento.countDocuments({
      destinatarios: estudianteId,
      fechaInicio: { $gte: inicioDia },
      estado: "pendiente"
    });

    // 6. Tareas/Exámenes próximos (desde ahora hasta 3 días)
    const en3Dias = new Date();
    en3Dias.setDate(en3Dias.getDate() + 3);
    
    const tareasExamenes = await Evento.find({
      destinatarios: estudianteId,
      tipo: { $in: ["tarea", "examen"] },
      fechaInicio: {
        $gte: ahora,
        $lte: en3Dias
      },
      estado: { $ne: "cancelado" }
    })
    .populate("curso", "nombre codigo color")
    .populate("creador", "nombre")
    .sort({ fechaInicio: 1 })
    .limit(10);

    // 7. Resumen de actividad reciente
    const eventosCompletados = await Evento.countDocuments({
      destinatarios: estudianteId,
      estado: "completado"
    });

    res.json({
      estudiante: {
        nombre: req.usuario.nombre || "Estudiante",
        rol: req.usuario.rol
      },
      cursosInscritos: {
        cursos: cursosInscritos,
        total: cursosInscritos.length
      },
      eventosHoy: {
        eventos: eventosHoy,
        total: eventosHoy.length
      },
      eventosProximos: {
        eventos: eventosProximos,
        total: eventosProximos.length
      },
      tareasExamenes: {
        eventos: tareasExamenes,
        total: tareasExamenes.length
      },
      estadisticas: {
        notificacionesNoLeidas,
        eventosPendientes,
        eventosCompletados,
        cursosActivos: cursosInscritos.length
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener dashboard de estudiante" });
  }
};

// Dashboard para DOCENTE
exports.dashboardDocente = async (req, res) => {
  try {
    const docenteId = req.usuario.id;

    if (req.usuario.rol !== "docente") {
      return res.status(403).json({ message: "Este endpoint es solo para docentes" });
    }

    const ahora = new Date();
    const en7Dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60000);

    // 1. Cursos creados por el docente
    const misCursos = await Curso.find({ docente: docenteId })
      .select("nombre codigo color estudiantes solicitudes");

    // 2. Total de estudiantes
    let totalEstudiantes = 0;
    misCursos.forEach(curso => {
      totalEstudiantes += curso.estudiantes.length;
    });

    // 3. Solicitudes pendientes
    let totalSolicitudes = 0;
    const cursosConSolicitudes = [];
    misCursos.forEach(curso => {
      if (curso.solicitudes.length > 0) {
        totalSolicitudes += curso.solicitudes.length;
        cursosConSolicitudes.push({
          _id: curso._id,
          nombre: curso.nombre,
          codigo: curso.codigo,
          solicitudesPendientes: curso.solicitudes.length
        });
      }
    });

    // 4. Eventos próximos que creó (desde mañana hasta 7 días)
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    mañana.setHours(0, 0, 0, 0);

    const eventosProximos = await Evento.find({
      creador: docenteId,
      fechaInicio: {
        $gte: mañana,
        $lte: en7Dias
      },
      estado: { $ne: "cancelado" }
    })
    .populate("curso", "nombre codigo color")
    .sort({ fechaInicio: 1 })
    .limit(10);

    // 5. Eventos de hoy
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date();
    finDia.setHours(23, 59, 59, 999);

    const eventosHoy = await Evento.find({
      creador: docenteId,
      fechaInicio: {
        $gte: inicioDia,
        $lte: finDia
      },
      estado: { $ne: "cancelado" }
    })
    .populate("curso", "nombre codigo color")
    .sort({ fechaInicio: 1 });

    // 6. Eventos por curso
    const eventosPorCurso = await Promise.all(
      misCursos.slice(0, 5).map(async (curso) => {
        const totalEventos = await Evento.countDocuments({
          curso: curso._id,
          fechaInicio: { $gte: new Date() }
        });
        return {
          curso: {
            _id: curso._id,
            nombre: curso.nombre,
            codigo: curso.codigo,
            color: curso.color
          },
          totalEventos,
          totalEstudiantes: curso.estudiantes.length
        };
      })
    );

    // 7. Estadísticas generales
    const totalEventosCreados = await Evento.countDocuments({
      creador: docenteId
    });

    const eventosProximosSemana = await Evento.countDocuments({
      creador: docenteId,
      fechaInicio: {
        $gte: ahora,
        $lte: en7Dias
      },
      estado: { $ne: "cancelado" }
    });

    const recordatoriosEnviados = await Evento.countDocuments({
      creador: docenteId,
      recordatorioEnviado: true
    });

    res.json({
      docente: {
        nombre: req.usuario.nombre || "Docente",
        rol: req.usuario.rol
      },
      cursos: {
        total: misCursos.length,
        detalle: misCursos.map(c => ({
          _id: c._id,
          nombre: c.nombre,
          codigo: c.codigo,
          color: c.color,
          totalEstudiantes: c.estudiantes.length,
          solicitudesPendientes: c.solicitudes.length
        }))
      },
      solicitudesPendientes: {
        total: totalSolicitudes,
        cursos: cursosConSolicitudes
      },
      eventosHoy: {
        eventos: eventosHoy,
        total: eventosHoy.length
      },
      eventosProximos: {
        eventos: eventosProximos,
        total: eventosProximos.length
      },
      eventosPorCurso: eventosPorCurso,
      estadisticas: {
        totalEstudiantes,
        totalCursos: misCursos.length,
        totalEventosCreados,
        eventosProximosSemana,
        recordatoriosEnviados,
        solicitudesPendientes: totalSolicitudes
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener dashboard de docente" });
  }
};

// Dashboard general (detecta automáticamente el rol)
exports.dashboardGeneral = async (req, res) => {
  try {
    if (req.usuario.rol === "estudiante") {
      return exports.dashboardEstudiante(req, res);
    } else if (req.usuario.rol === "docente") {
      return exports.dashboardDocente(req, res);
    } else {
      return res.status(400).json({ message: "Rol no reconocido" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener dashboard" });
  }
};