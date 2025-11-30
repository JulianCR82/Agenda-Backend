const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  crearEvento,
  obtenerMisEventos,
  obtenerEventosCurso,
  obtenerEventoPorId,
  editarEvento,
  eliminarEvento,
  obtenerEventosProximos,
  marcarCompletado,
  obtenerEventosPasados
} = require("../controllers/eventoController");

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Crear evento (docentes para cursos, estudiantes personales)
router.post("/", crearEvento);

// ⚠️ IMPORTANTE: Rutas específicas ANTES de rutas con parámetros dinámicos (:id)

// Obtener todos los eventos del usuario autenticado
router.get("/mis-eventos", obtenerMisEventos);

// Obtener eventos próximos (dashboard)
router.get("/proximos", obtenerEventosProximos);

// Obtener eventos pasados (historial)
router.get("/pasados", obtenerEventosPasados);

// Obtener eventos de un curso específico (solo docente del curso)
router.get("/curso/:cursoId", obtenerEventosCurso);

// Obtener un evento por ID (DEBE IR DESPUÉS de las rutas específicas)
router.get("/:id", obtenerEventoPorId);

// Marcar evento como completado (específico ANTES de editar)
router.patch("/:id/completar", marcarCompletado);

// Editar evento (solo creador)
router.put("/:id", editarEvento);

// Eliminar evento (solo creador)
router.delete("/:id", eliminarEvento);

module.exports = router;