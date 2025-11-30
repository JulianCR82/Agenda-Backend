const mongoose = require("mongoose");

const EventoSchema = new mongoose.Schema({
  titulo: { 
    type: String, 
    required: true 
  },
  descripcion: { 
    type: String 
  },
  tipo: { 
    type: String, 
    enum: ["clase", "examen", "tarea", "reunion", "otro"],
    default: "otro"
  },
  fechaInicio: { 
    type: Date, 
    required: true 
  },
  fechaFin: { 
    type: Date, 
    required: true 
  },
  curso: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Curso",
    required: function() {
      // Solo es requerido si el creador es docente
      return this.esEventoCurso;
    }
  },
  creador: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Usuario",
    required: true
  },
  esEventoCurso: {
    // true: evento creado por docente para estudiantes del curso
    // false: evento personal del estudiante
    type: Boolean,
    default: false
  },
  destinatarios: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Usuario"
  }],
  color: {
    type: String,
    default: "#3B82F6"
  },
  estado: {
    type: String,
    enum: ["pendiente", "completado", "cancelado"],
    default: "pendiente"
  },
  recordatorioEnviado: {
    type: Boolean,
    default: false
  },
  fechaCreacion: { 
    type: Date, 
    default: Date.now 
  }
});

// Índices para mejorar búsquedas
EventoSchema.index({ fechaInicio: 1 });
EventoSchema.index({ curso: 1 });
EventoSchema.index({ destinatarios: 1 });
EventoSchema.index({ creador: 1 });

module.exports = mongoose.model("Evento", EventoSchema);