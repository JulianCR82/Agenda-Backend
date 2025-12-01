const Evento = require("../models/Evento");
const Notificacion = require("../models/Notificacion");
const { crearNotificacion } = require("./notificacionController");

// Procesar recordatorios manualmente (para pruebas)
exports.procesarRecordatorios = async (req, res) => {
  try {
    const { enviarRecordatorios } = require("../services/recordatoriosService");
    await enviarRecordatorios();
    
    res.json({ 
      message: "Recordatorios procesados correctamente",
      timestamp: new Date()
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al procesar recordatorios" });
  }
};

// Obtener eventos pendientes de recordatorio
exports.obtenerEventosPendientesRecordatorio = async (req, res) => {
  try {
    const ahora = new Date();
    const en1Dia = new Date(ahora.getTime() + 24 * 60 * 60000);

    const eventos = await Evento.find({
      fechaInicio: {
        $gte: ahora,
        $lte: en1Dia
      },
      recordatorioEnviado: false,
      estado: { $ne: "cancelado" }
    })
    .populate("curso", "nombre codigo")
    .populate("creador", "nombre email")
    .populate("destinatarios", "nombre email")
    .sort({ fechaInicio: 1 });

    // Calcular tiempo restante para cada evento
    const eventosConTiempo = eventos.map(evento => {
      const tiempoRestante = evento.fechaInicio - ahora;
      const minutosRestantes = Math.floor(tiempoRestante / 60000);
      const horasRestantes = Math.floor(minutosRestantes / 60);

      return {
        ...evento.toObject(),
        minutosRestantes,
        horasRestantes,
        debeNotificar: minutosRestantes <= 1440 // Dentro de 24 horas
      };
    });

    res.json({ 
      eventos: eventosConTiempo,
      total: eventosConTiempo.length,
      timestamp: ahora
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener eventos pendientes" });
  }
};

// Obtener recordatorios enviados para un evento
exports.obtenerRecordatoriosEvento = async (req, res) => {
  try {
    const eventoId = req.params.eventoId;

    const recordatorios = await Notificacion.find({
      evento: eventoId,
      tipo: "recordatorio_evento"
    })
    .populate("destinatario", "nombre email")
    .sort({ fechaCreacion: -1 });

    res.json({ 
      recordatorios,
      total: recordatorios.length
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener recordatorios del evento" });
  }
};

// Obtener mis recordatorios (del usuario autenticado)
exports.obtenerMisRecordatorios = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { limite = 20 } = req.query;

    const recordatorios = await Notificacion.find({
      destinatario: usuarioId,
      tipo: "recordatorio_evento"
    })
    .populate("evento", "titulo fechaInicio fechaFin tipo")
    .populate("curso", "nombre codigo color")
    .sort({ fechaCreacion: -1 })
    .limit(parseInt(limite));

    const noLeidos = await Notificacion.countDocuments({
      destinatario: usuarioId,
      tipo: "recordatorio_evento",
      leida: false
    });

    res.json({ 
      recordatorios,
      total: recordatorios.length,
      noLeidos
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener recordatorios" });
  }
};

// Resetear flag de recordatorio de un evento (útil para pruebas)
exports.resetearRecordatorioEvento = async (req, res) => {
  try {
    const eventoId = req.params.eventoId;
    const usuarioId = req.usuario.id;

    const evento = await Evento.findById(eventoId);

    if (!evento) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    // Solo el creador puede resetear
    if (evento.creador.toString() !== usuarioId) {
      return res.status(403).json({ message: "No tienes permisos para resetear este recordatorio" });
    }

    evento.recordatorioEnviado = false;
    await evento.save();

    res.json({ 
      message: "Flag de recordatorio reseteado correctamente",
      evento: {
        _id: evento._id,
        titulo: evento.titulo,
        recordatorioEnviado: evento.recordatorioEnviado
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al resetear recordatorio" });
  }
};

// Forzar envío de recordatorio para un evento específico (útil para pruebas)
exports.enviarRecordatorioManual = async (req, res) => {
  try {
    const eventoId = req.params.eventoId;
    const usuarioId = req.usuario.id;

    const evento = await Evento.findById(eventoId)
      .populate("curso", "nombre");

    if (!evento) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    // Solo el creador puede enviar recordatorio manual
    if (evento.creador.toString() !== usuarioId) {
      return res.status(403).json({ message: "No tienes permisos" });
    }

    const ahora = new Date();
    const tiempoRestante = evento.fechaInicio - ahora;
    const minutosRestantes = Math.floor(tiempoRestante / 60000);

    if (minutosRestantes < 0) {
      return res.status(400).json({ message: "Este evento ya pasó" });
    }

    let tiempoTexto = `en ${minutosRestantes} minutos`;
    if (minutosRestantes > 60) {
      const horasRestantes = Math.floor(minutosRestantes / 60);
      tiempoTexto = `en ${horasRestantes} hora${horasRestantes > 1 ? 's' : ''}`;
    }

    // Enviar notificación a cada destinatario
    const notificacionesEnviadas = [];
    for (const destinatarioId of evento.destinatarios) {
      const notificacion = await crearNotificacion({
        destinatario: destinatarioId,
        tipo: "recordatorio_evento",
        titulo: `Recordatorio: ${evento.titulo}`,
        mensaje: `El evento "${evento.titulo}" ${evento.curso ? `del curso ${evento.curso.nombre}` : ''} comienza ${tiempoTexto}`,
        evento: evento._id,
        curso: evento.curso?._id,
        metadata: {
          envioManual: true,
          enviadoPor: usuarioId
        }
      });
      notificacionesEnviadas.push(notificacion);
    }

    // Marcar como enviado
    evento.recordatorioEnviado = true;
    await evento.save();

    res.json({ 
      message: "Recordatorio enviado manualmente",
      destinatarios: evento.destinatarios.length,
      notificacionesEnviadas: notificacionesEnviadas.length
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al enviar recordatorio manual" });
  }
};

// Obtener estadísticas de recordatorios (para docentes)
exports.obtenerEstadisticasRecordatorios = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // Total de eventos creados por el docente
    const totalEventos = await Evento.countDocuments({ 
      creador: usuarioId,
      esEventoCurso: true 
    });

    // Eventos con recordatorio enviado
    const eventosConRecordatorio = await Evento.countDocuments({ 
      creador: usuarioId,
      esEventoCurso: true,
      recordatorioEnviado: true 
    });

    // Eventos pendientes de recordatorio (próximos 24 horas)
    const ahora = new Date();
    const en1Dia = new Date(ahora.getTime() + 24 * 60 * 60000);
    
    const eventosPendientes = await Evento.countDocuments({
      creador: usuarioId,
      esEventoCurso: true,
      fechaInicio: { $gte: ahora, $lte: en1Dia },
      recordatorioEnviado: false,
      estado: { $ne: "cancelado" }
    });

    // Total de recordatorios enviados
    const totalRecordatoriosEnviados = await Notificacion.countDocuments({
      tipo: "recordatorio_evento",
      // Filtrar por eventos creados por este docente
      evento: { $in: await Evento.find({ creador: usuarioId }).distinct("_id") }
    });

    res.json({
      totalEventos,
      eventosConRecordatorio,
      eventosPendientes,
      totalRecordatoriosEnviados,
      porcentajeConRecordatorio: totalEventos > 0 
        ? ((eventosConRecordatorio / totalEventos) * 100).toFixed(2) 
        : 0
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};