const Evento = require("../models/Evento");
const Curso = require("../models/Curso");

// Crear evento
exports.crearEvento = async (req, res) => {
  try {
    const { 
      titulo, 
      descripcion, 
      tipo, 
      fechaInicio, 
      fechaFin, 
      cursoId, 
      color,
      destinatarios // array de IDs de estudiantes (opcional, si es vacío se asigna a todos)
    } = req.body;

    const creadorId = req.usuario.id;
    const rolCreador = req.usuario.rol;

    // Validar fechas
    if (new Date(fechaInicio) >= new Date(fechaFin)) {
      return res.status(400).json({ message: "La fecha de inicio debe ser anterior a la fecha de fin" });
    }

    let nuevoEvento;

    // CASO 1: Docente crea evento para un curso
    if (rolCreador === "docente" && cursoId) {
      const curso = await Curso.findById(cursoId);
      
      if (!curso) {
        return res.status(404).json({ message: "Curso no encontrado" });
      }

      // Verificar que el docente sea el dueño del curso
      if (curso.docente.toString() !== creadorId) {
        return res.status(403).json({ message: "No tienes permisos para crear eventos en este curso" });
      }

      // Si no se especifican destinatarios, asignar a todos los estudiantes del curso
      const destinatariosFinales = destinatarios && destinatarios.length > 0 
        ? destinatarios 
        : curso.estudiantes;

      nuevoEvento = new Evento({
        titulo,
        descripcion,
        tipo,
        fechaInicio,
        fechaFin,
        curso: cursoId,
        creador: creadorId,
        esEventoCurso: true,
        destinatarios: destinatariosFinales,
        color: color || curso.color || "#3B82F6"
      });
    } 
    // CASO 2: Estudiante crea evento personal
    else if (rolCreador === "estudiante") {
      nuevoEvento = new Evento({
        titulo,
        descripcion,
        tipo,
        fechaInicio,
        fechaFin,
        creador: creadorId,
        esEventoCurso: false,
        destinatarios: [creadorId], // Solo para él mismo
        color: color || "#3B82F6"
      });
    }
    // CASO 3: Docente crea evento personal (sin curso)
    else if (rolCreador === "docente" && !cursoId) {
      nuevoEvento = new Evento({
        titulo,
        descripcion,
        tipo,
        fechaInicio,
        fechaFin,
        creador: creadorId,
        esEventoCurso: false,
        destinatarios: [creadorId],
        color: color || "#3B82F6"
      });
    } else {
      return res.status(400).json({ message: "Datos inválidos para crear evento" });
    }

    await nuevoEvento.save();
    
    const eventoCompleto = await Evento.findById(nuevoEvento._id)
      .populate("curso", "nombre codigo color")
      .populate("creador", "nombre email")
      .populate("destinatarios", "nombre email");

    res.status(201).json({ 
      message: "Evento creado correctamente", 
      evento: eventoCompleto 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear el evento" });
  }
};

// Obtener eventos del usuario autenticado
exports.obtenerMisEventos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { fechaInicio, fechaFin, tipo, cursoId } = req.query;

    let filtro = {
      $or: [
        { destinatarios: usuarioId }, // Eventos donde es destinatario
        { creador: usuarioId }         // Eventos que creó
      ]
    };

    // Filtros opcionales
    if (fechaInicio && fechaFin) {
      filtro.fechaInicio = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    }

    if (tipo) {
      filtro.tipo = tipo;
    }

    if (cursoId) {
      filtro.curso = cursoId;
    }

    const eventos = await Evento.find(filtro)
      .populate("curso", "nombre codigo color")
      .populate("creador", "nombre email")
      .sort({ fechaInicio: 1 });

    res.json({ eventos, total: eventos.length });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener eventos" });
  }
};

// Obtener eventos de un curso específico (para docentes)
exports.obtenerEventosCurso = async (req, res) => {
  try {
    const cursoId = req.params.cursoId;
    const usuarioId = req.usuario.id;

    const curso = await Curso.findById(cursoId);
    
    if (!curso) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    // Verificar permisos: debe ser el docente del curso
    if (curso.docente.toString() !== usuarioId) {
      return res.status(403).json({ message: "No tienes permisos para ver los eventos de este curso" });
    }

    const eventos = await Evento.find({ curso: cursoId })
      .populate("creador", "nombre email")
      .populate("destinatarios", "nombre email")
      .sort({ fechaInicio: 1 });

    res.json({ eventos, total: eventos.length });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener eventos del curso" });
  }
};

// Obtener un evento por ID
exports.obtenerEventoPorId = async (req, res) => {
  try {
    const eventoId = req.params.id;
    const usuarioId = req.usuario.id;

    const evento = await Evento.findById(eventoId)
      .populate("curso", "nombre codigo color")
      .populate("creador", "nombre email")
      .populate("destinatarios", "nombre email");

    if (!evento) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    // Verificar permisos: debe ser el creador o destinatario
    const esCreador = evento.creador._id.toString() === usuarioId;
    const esDestinatario = evento.destinatarios.some(d => d._id.toString() === usuarioId);

    if (!esCreador && !esDestinatario) {
      return res.status(403).json({ message: "No tienes permisos para ver este evento" });
    }

    res.json({ evento });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el evento" });
  }
};

// Editar evento
exports.editarEvento = async (req, res) => {
  try {
    const eventoId = req.params.id;
    const usuarioId = req.usuario.id;
    const { titulo, descripcion, tipo, fechaInicio, fechaFin, color, estado } = req.body;

    const evento = await Evento.findById(eventoId);

    if (!evento) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    // Solo el creador puede editar
    if (evento.creador.toString() !== usuarioId) {
      return res.status(403).json({ message: "Solo el creador puede editar este evento" });
    }

    // Validar fechas si se proporcionan
    if (fechaInicio && fechaFin && new Date(fechaInicio) >= new Date(fechaFin)) {
      return res.status(400).json({ message: "La fecha de inicio debe ser anterior a la fecha de fin" });
    }

    // Actualizar campos
    if (titulo) evento.titulo = titulo;
    if (descripcion !== undefined) evento.descripcion = descripcion;
    if (tipo) evento.tipo = tipo;
    if (fechaInicio) evento.fechaInicio = fechaInicio;
    if (fechaFin) evento.fechaFin = fechaFin;
    if (color) evento.color = color;
    if (estado) evento.estado = estado;

    await evento.save();

    const eventoActualizado = await Evento.findById(eventoId)
      .populate("curso", "nombre codigo color")
      .populate("creador", "nombre email")
      .populate("destinatarios", "nombre email");

    res.json({ 
      message: "Evento actualizado correctamente", 
      evento: eventoActualizado 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al editar el evento" });
  }
};

// Eliminar evento
exports.eliminarEvento = async (req, res) => {
  try {
    const eventoId = req.params.id;
    const usuarioId = req.usuario.id;

    const evento = await Evento.findById(eventoId);

    if (!evento) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    // Solo el creador puede eliminar
    if (evento.creador.toString() !== usuarioId) {
      return res.status(403).json({ message: "Solo el creador puede eliminar este evento" });
    }

    await Evento.findByIdAndDelete(eventoId);

    res.json({ message: "Evento eliminado correctamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar el evento" });
  }
};

// Obtener eventos próximos (para dashboard)
exports.obtenerEventosProximos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { dias = 7 } = req.query; // Por defecto, próximos 7 días

    const ahora = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + parseInt(dias));

    const eventos = await Evento.find({
      $or: [
        { destinatarios: usuarioId },
        { creador: usuarioId }
      ],
      fechaInicio: {
        $gte: ahora,
        $lte: fechaLimite
      },
      estado: { $ne: "cancelado" }
    })
    .populate("curso", "nombre codigo color")
    .populate("creador", "nombre email")
    .sort({ fechaInicio: 1 })
    .limit(10);

    res.json({ eventos, total: eventos.length });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener eventos próximos" });
  }
};

// Marcar evento como completado
exports.marcarCompletado = async (req, res) => {
  try {
    const eventoId = req.params.id;
    const usuarioId = req.usuario.id;

    const evento = await Evento.findById(eventoId);

    if (!evento) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    // Verificar que sea destinatario o creador
    const esCreador = evento.creador.toString() === usuarioId;
    const esDestinatario = evento.destinatarios.some(d => d.toString() === usuarioId);

    if (!esCreador && !esDestinatario) {
      return res.status(403).json({ message: "No tienes permisos para modificar este evento" });
    }

    evento.estado = "completado";
    await evento.save();

    res.json({ message: "Evento marcado como completado", evento });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al marcar evento como completado" });
  }
};

// Obtener eventos pasados (historial)
exports.obtenerEventosPasados = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { limite = 50, tipo, cursoId } = req.query;

    const ahora = new Date();

    let filtro = {
      $or: [
        { destinatarios: usuarioId },
        { creador: usuarioId }
      ],
      fechaFin: {
        $lt: ahora  // Eventos cuya fecha de fin ya pasó
      }
    };

    // Filtros opcionales
    if (tipo) {
      filtro.tipo = tipo;
    }

    if (cursoId) {
      filtro.curso = cursoId;
    }

    const eventos = await Evento.find(filtro)
      .populate("curso", "nombre codigo color")
      .populate("creador", "nombre email")
      .sort({ fechaFin: -1 })  // Más recientes primero
      .limit(parseInt(limite));

    res.json({ 
      eventos, 
      total: eventos.length,
      mensaje: "Historial de eventos pasados"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener eventos pasados" });
  }
};