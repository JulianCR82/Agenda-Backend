const express = require("express");
const cors = require("cors");

require("dotenv").config();
const connectDB = require("./database/connection");

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a la base de datos
connectDB();

app.get("/", (req, res) => {
  res.json({ message: "Backend funcionando 🚀" });
});

const PORT = 4000;

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Rutas de cursos
app.use("/api/cursos", require("./routes/cursoRoutes"));

// En tu archivo principal (después de las rutas de cursos)
app.use("/api/eventos", require("./routes/eventoRoutes"));


app.listen(PORT, () => console.log("Servidor corriendo en el puerto " + PORT));
