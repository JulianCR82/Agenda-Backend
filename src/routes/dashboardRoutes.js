const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  dashboardEstudiante,
  dashboardDocente,
  dashboardGeneral
} = require("../controllers/dashboardController");

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Dashboard general (detecta automáticamente el rol)
router.get("/", dashboardGeneral);

// Dashboard específico para estudiante
router.get("/estudiante", dashboardEstudiante);

// Dashboard específico para docente
router.get("/docente", dashboardDocente);

module.exports = router;