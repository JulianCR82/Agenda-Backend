const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  procesarRecordatorios,
  obtenerEventosPendientesRecordatorio,
  obtenerRecordatoriosEvento,
  obtenerMisRecordatorios,
  resetearRecordatorioEvento,
  enviarRecordatorioManual,
  obtenerEstadisticasRecordatorios
} = require("../controllers/recordatoriosController");

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Procesar recordatorios manualmente (solo docentes, útil para desarrollo)
router.post("/procesar", (req, res, next) => {
  if (req.usuario.rol !== "docente") {
    return res.status(403).json({ message: "Solo los docentes pueden ejecutar esta acción" });
  }
  next();
}, procesarRecordatorios);

// Obtener eventos pendientes de recordatorio (solo docentes)
router.get("/pendientes", (req, res, next) => {
  if (req.usuario.rol !== "docente") {
    return res.status(403).json({ message: "Solo los docentes pueden ver eventos pendientes" });
  }
  next();
}, obtenerEventosPendientesRecordatorio);

// Obtener mis recordatorios (cualquier usuario)
router.get("/mis-recordatorios", obtenerMisRecordatorios);

// Obtener recordatorios de un evento específico
router.get("/evento/:eventoId", obtenerRecordatoriosEvento);

// Resetear flag de recordatorio de un evento (solo creador)
router.patch("/evento/:eventoId/resetear", resetearRecordatorioEvento);

// Enviar recordatorio manual para un evento (solo creador)
router.post("/evento/:eventoId/enviar", enviarRecordatorioManual);

// Obtener estadísticas de recordatorios (solo docentes)
router.get("/estadisticas", (req, res, next) => {
  if (req.usuario.rol !== "docente") {
    return res.status(403).json({ message: "Solo los docentes pueden ver estadísticas" });
  }
  next();
}, obtenerEstadisticasRecordatorios);

module.exports = router;