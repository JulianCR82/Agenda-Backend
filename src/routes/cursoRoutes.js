const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  crearCurso,
  obtenerCursosDocente,
  solicitarUnion,
  verSolicitudes,
  aceptarSolicitud,
  rechazarSolicitud,
  obtenerEstudiantesCurso
} = require("../controllers/cursoController");


// Crear curso (solo docentes)
router.post("/", authMiddleware, (req, res, next) => {
  if (req.usuario.rol !== "docente") {
    return res.status(403).json({ message: "Solo los docentes pueden crear cursos" });
  }
  next();
}, crearCurso);

// Ver cursos del docente logueado
router.get("/mios", authMiddleware, obtenerCursosDocente);

// Estudiante solicita unirse a un curso
router.post("/:id/solicitar", authMiddleware, solicitarUnion);

// Docente ve solicitudes pendientes
router.get("/:id/solicitudes", authMiddleware, verSolicitudes);

// Docente acepta solicitud
router.post("/:id/aceptar", authMiddleware, aceptarSolicitud);

// Docente rechaza solicitud
router.post("/:id/rechazar", authMiddleware, rechazarSolicitud);

// Docente ve estudiantes asignados al curso
router.get("/:id/estudiantes", authMiddleware, obtenerEstudiantesCurso);

module.exports = router;
