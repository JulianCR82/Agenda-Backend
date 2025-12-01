const mongoose = require("mongoose");

const NotificacionSchema = new mongoose.Schema({
  destinatario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true
  },
  tipo: {
    type: String,
    enum: [
      "evento_nuevo",           // Docente creó un evento para ti
      "recordatorio_evento",    // Un evento está próximo
      "solicitud_aceptada",     // Tu solicitud de curso fue aceptada
      "solicitud_rechazada",    // Tu solicitud de curso fue rechazada
      "evento_editado",         // Un evento fue modificado
      "evento_cancelado",       // Un evento fue cancelado
      "otro"
    ],
    required: true
  },
  titulo: {
    type: String,
    required: true
  },
  mensaje: {
    type: String,
    required: true
  },
  leida: {
    type: Boolean,
    default: false
  },
  // Referencias opcionales para poder navegar a la entidad relacionada
  evento: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Evento"
  },
  curso: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Curso"
  },
  // Datos adicionales en formato JSON (opcional)
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaLeida: {
    type: Date
  }
});

// Índices para mejorar consultas
NotificacionSchema.index({ destinatario: 1, leida: 1 });
NotificacionSchema.index({ fechaCreacion: -1 });
NotificacionSchema.index({ destinatario: 1, fechaCreacion: -1 });

module.exports = mongoose.model("Notificacion", NotificacionSchema);