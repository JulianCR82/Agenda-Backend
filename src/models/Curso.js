const mongoose = require("mongoose");

const CursoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  codigo: { type: String, required: true, unique: true },
  descripcion: String,
  docente: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  estudiantes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }],
  solicitudes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }],
  duracion: String,
  color: String,
  fechaInicio: { type: Date },   // ⬅️ Faltaba
  fechaFin: { type: Date },      // ⬅️ Faltaba
  fechaCreacion: { type: Date, default: Date.now }
});


module.exports = mongoose.model("Curso", CursoSchema);
