const Curso = require("../models/Curso");

exports.crearCurso = async (req, res) => {
  try {
    const { nombre, codigo, descripcion, color, fechaInicio, fechaFin } = req.body;

    // el id del docente viene del token (middleware)
    const docenteId = req.usuario.id;

    const existe = await Curso.findOne({ codigo });
    if (existe) return res.status(400).json({ message: "Ese código ya está en uso" });

    const nuevoCurso = new Curso({
      nombre,
      codigo,
      descripcion,
      color,
      fechaInicio,
      fechaFin,
      docente: docenteId
    });

    await nuevoCurso.save();
    res.json({ message: "Curso creado correctamente", curso: nuevoCurso });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al crear el curso" });
  }
};

// Obtener cursos del docente autenticado
exports.obtenerCursosDocente = async (req, res) => {
  try {
    if (req.usuario.rol !== "docente") {
      return res.status(403).json({ msg: "Solo los docentes pueden ver sus cursos" });
    }

    const cursos = await Curso.find({ docente: req.usuario.id });

    res.json(cursos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error del servidor" });
  }
};

exports.solicitarUnion = async (req, res) => {
  try {
    const idEstudiante = req.usuario.id;
    const idCurso = req.params.id;

    if (req.usuario.rol !== "estudiante") {
      return res.status(403).json({ message: "Solo los estudiantes pueden solicitar unirse" });
    }

    const curso = await Curso.findById(idCurso);
    if (!curso) return res.status(404).json({ message: "El curso no existe" });

    if (curso.estudiantes.includes(idEstudiante)) {
      return res.status(400).json({ message: "Ya eres parte de este curso" });
    }

    if (curso.solicitudes.includes(idEstudiante)) {
      return res.status(400).json({ message: "Ya solicitaste unirte" });
    }

    curso.solicitudes.push(idEstudiante);
    await curso.save();

    res.json({ message: "Solicitud enviada correctamente" });

  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};




exports.verSolicitudes = async (req, res) => {
  try {
    const idCurso = req.params.id;

    const curso = await Curso.findById(idCurso)
      .populate("solicitudes", "nombre email");

    if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

    if (req.usuario.id !== curso.docente.toString()) {
      return res.status(403).json({ message: "No tienes permisos para ver estas solicitudes" });
    }

    res.json({ solicitudes: curso.solicitudes });

  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.aceptarSolicitud = async (req, res) => {
  try {
    const idCurso = req.params.id;
    const { idEstudiante } = req.body;

    const curso = await Curso.findById(idCurso);
    if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

    if (req.usuario.id !== curso.docente.toString()) {
      return res.status(403).json({ message: "No tienes permisos" });
    }

    // Validar que esté en solicitudes
    if (!curso.solicitudes.includes(idEstudiante)) {
      return res.status(400).json({ message: "El estudiante no tiene una solicitud pendiente" });
    }

    // Mover de solicitudes → estudiantes aprobados
    curso.solicitudes.pull(idEstudiante);
    curso.estudiantes.push(idEstudiante);
    await curso.save();

    res.json({ message: "Estudiante aceptado correctamente" });

  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.rechazarSolicitud = async (req, res) => {
  try {
    const idCurso = req.params.id;
    const { idEstudiante } = req.body;

    const curso = await Curso.findById(idCurso);
    if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

    if (req.usuario.id !== curso.docente.toString()) {
      return res.status(403).json({ message: "No tienes permisos" });
    }

    if (!curso.solicitudes.includes(idEstudiante)) {
      return res.status(400).json({ message: "El estudiante no tiene una solicitud pendiente" });
    }

    curso.solicitudes.pull(idEstudiante);
    await curso.save();

    res.json({ message: "Solicitud rechazada correctamente" });

  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.obtenerEstudiantesCurso = async (req, res) => {
  try {
    const idCurso = req.params.id;

    const curso = await Curso.findById(idCurso)
      .populate("estudiantes", "nombre email fechaCreacion");

    if (!curso) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    // Verificar que quien consulta sea el docente del curso
    if (req.usuario.id !== curso.docente.toString()) {
      return res.status(403).json({ message: "No tienes permisos para ver los estudiantes de este curso" });
    }

    res.json({ 
      estudiantes: curso.estudiantes,
      totalEstudiantes: curso.estudiantes.length
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};