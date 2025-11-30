const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // El token debe venir en los headers como: Authorization: Bearer TOKEN
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  // Separar "Bearer" del token
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token inválido o mal formateado" });
  }

  try {
    // Decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Guardar la información del usuario en la request para usarla en los controladores
    req.usuario = decoded; // { id, rol }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
};
