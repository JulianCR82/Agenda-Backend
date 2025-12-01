const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  crearNotificacionManual,
  obtenerMisNotificaciones,
  obtenerNotificacionesNoLeidas,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion,
  eliminarNotificacionesLeidas,
  obtenerEstadisticas
} = require("../controllers/notificacionController");

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Crear notificación manual (solo docentes)
router.post("/", crearNotificacionManual);

// Obtener todas mis notificaciones (con filtros opcionales)
router.get("/", obtenerMisNotificaciones);

// Obtener solo notificaciones no leídas
router.get("/no-leidas", obtenerNotificacionesNoLeidas);

// Obtener estadísticas
router.get("/estadisticas", obtenerEstadisticas);

// Marcar una notificación como leída
router.patch("/:id/leer", marcarComoLeida);

// Marcar todas como leídas
router.patch("/leer-todas", marcarTodasComoLeidas);

// Eliminar una notificación
router.delete("/:id", eliminarNotificacion);

// Eliminar todas las notificaciones leídas
router.delete("/limpiar/leidas", eliminarNotificacionesLeidas);

module.exports = router;