const Notificacion = require("../models/Notificacion");

// Crear notificación (función auxiliar, usada internamente)
exports.crearNotificacion = async (datos) => {
  try {
    const { destinatario, tipo, titulo, mensaje, evento, curso, metadata } = datos;

    const notificacion = new Notificacion({
      destinatario,
      tipo,
      titulo,
      mensaje,
      evento,
      curso,
      metadata
    });

    await notificacion.save();
    return notificacion;
  } catch (error) {
    console.error("Error al crear notificación:", error);
    return null;
  }
};

// Crear notificación manual (endpoint)
exports.crearNotificacionManual = async (req, res) => {
  try {
    const { destinatarioId, tipo, titulo, mensaje, eventoId, cursoId } = req.body;

    // Solo docentes pueden crear notificaciones manuales
    if (req.usuario.rol !== "docente") {
      return res.status(403).json({ message: "Solo los docentes pueden crear notificaciones manuales" });
    }

    const notificacion = new Notificacion({
      destinatario: destinatarioId,
      tipo: tipo || "otro",
      titulo,
      mensaje,
      evento: eventoId,
      curso: cursoId
    });

    await notificacion.save();

    res.status(201).json({ 
      message: "Notificación creada correctamente", 
      notificacion 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear la notificación" });
  }
};

// Obtener notificaciones del usuario autenticado
exports.obtenerMisNotificaciones = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { leida, tipo, limite = 50 } = req.query;

    let filtro = { destinatario: usuarioId };

    // Filtros opcionales
    if (leida !== undefined) {
      filtro.leida = leida === "true";
    }

    if (tipo) {
      filtro.tipo = tipo;
    }

    const notificaciones = await Notificacion.find(filtro)
      .populate("evento", "titulo fechaInicio fechaFin tipo")
      .populate("curso", "nombre codigo color")
      .sort({ fechaCreacion: -1 })
      .limit(parseInt(limite));

    const noLeidas = await Notificacion.countDocuments({
      destinatario: usuarioId,
      leida: false
    });

    res.json({ 
      notificaciones, 
      total: notificaciones.length,
      noLeidas
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener notificaciones" });
  }
};

// Obtener solo notificaciones no leídas
exports.obtenerNotificacionesNoLeidas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const notificaciones = await Notificacion.find({
      destinatario: usuarioId,
      leida: false
    })
    .populate("evento", "titulo fechaInicio fechaFin tipo")
    .populate("curso", "nombre codigo color")
    .sort({ fechaCreacion: -1 })
    .limit(20);

    res.json({ 
      notificaciones, 
      total: notificaciones.length 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener notificaciones no leídas" });
  }
};

// Marcar notificación como leída
exports.marcarComoLeida = async (req, res) => {
  try {
    const notificacionId = req.params.id;
    const usuarioId = req.usuario.id;

    const notificacion = await Notificacion.findById(notificacionId);

    if (!notificacion) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    // Verificar que la notificación pertenece al usuario
    if (notificacion.destinatario.toString() !== usuarioId) {
      return res.status(403).json({ message: "No tienes permisos para marcar esta notificación" });
    }

    notificacion.leida = true;
    notificacion.fechaLeida = new Date();
    await notificacion.save();

    res.json({ 
      message: "Notificación marcada como leída", 
      notificacion 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al marcar notificación como leída" });
  }
};

// Marcar todas como leídas
exports.marcarTodasComoLeidas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const resultado = await Notificacion.updateMany(
      { destinatario: usuarioId, leida: false },
      { leida: true, fechaLeida: new Date() }
    );

    res.json({ 
      message: "Todas las notificaciones marcadas como leídas",
      actualizadas: resultado.modifiedCount
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al marcar todas como leídas" });
  }
};

// Eliminar una notificación
exports.eliminarNotificacion = async (req, res) => {
  try {
    const notificacionId = req.params.id;
    const usuarioId = req.usuario.id;

    const notificacion = await Notificacion.findById(notificacionId);

    if (!notificacion) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    // Verificar que la notificación pertenece al usuario
    if (notificacion.destinatario.toString() !== usuarioId) {
      return res.status(403).json({ message: "No tienes permisos para eliminar esta notificación" });
    }

    await Notificacion.findByIdAndDelete(notificacionId);

    res.json({ message: "Notificación eliminada correctamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar la notificación" });
  }
};

// Eliminar todas las notificaciones leídas
exports.eliminarNotificacionesLeidas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const resultado = await Notificacion.deleteMany({
      destinatario: usuarioId,
      leida: true
    });

    res.json({ 
      message: "Notificaciones leídas eliminadas correctamente",
      eliminadas: resultado.deletedCount
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar notificaciones" });
  }
};

// Obtener estadísticas de notificaciones
exports.obtenerEstadisticas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const mongoose = require("mongoose");

    const total = await Notificacion.countDocuments({ destinatario: usuarioId });
    const noLeidas = await Notificacion.countDocuments({ destinatario: usuarioId, leida: false });
    const leidas = await Notificacion.countDocuments({ destinatario: usuarioId, leida: true });

    // Notificaciones por tipo (convertir usuarioId a ObjectId)
    const porTipo = await Notificacion.aggregate([
      { $match: { destinatario: new mongoose.Types.ObjectId(usuarioId) } },
      { $group: { _id: "$tipo", cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);

    res.json({
      total,
      noLeidas,
      leidas,
      porTipo
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};