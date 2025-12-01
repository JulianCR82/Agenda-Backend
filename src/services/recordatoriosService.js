const cron = require("node-cron");
const Evento = require("../models/Evento");
const { crearNotificacion } = require("../controllers/notificacionController");

// Función para enviar recordatorios de eventos próximos
const enviarRecordatorios = async () => {
  try {
    console.log("🔔 Verificando eventos próximos...");

    const ahora = new Date();
    const en30Minutos = new Date(ahora.getTime() + 30 * 60000); // 30 minutos
    const en1Hora = new Date(ahora.getTime() + 60 * 60000); // 1 hora
    const en1Dia = new Date(ahora.getTime() + 24 * 60 * 60000); // 1 día

    // Buscar eventos que:
    // 1. Empiecen en los próximos 30 min, 1 hora o 1 día
    // 2. No tengan recordatorio enviado
    // 3. No estén cancelados
    const eventos = await Evento.find({
      fechaInicio: {
        $gte: ahora,
        $lte: en1Dia
      },
      recordatorioEnviado: false,
      estado: { $ne: "cancelado" }
    }).populate("curso", "nombre");

    console.log(`📊 Eventos encontrados: ${eventos.length}`);

    for (const evento of eventos) {
      const tiempoRestante = evento.fechaInicio - ahora;
      const minutosRestantes = Math.floor(tiempoRestante / 60000);
      
      let debeNotificar = false;
      let tiempoTexto = "";

      // Determinar si debe enviar notificación según el tiempo restante
      if (minutosRestantes <= 30 && minutosRestantes > 25) {
        debeNotificar = true;
        tiempoTexto = "en 30 minutos";
      } else if (minutosRestantes <= 60 && minutosRestantes > 55) {
        debeNotificar = true;
        tiempoTexto = "en 1 hora";
      } else if (minutosRestantes <= 1440 && minutosRestantes > 1435) { // 24 horas
        debeNotificar = true;
        tiempoTexto = "mañana";
      }

      if (debeNotificar) {
        // Enviar notificación a cada destinatario
        for (const destinatarioId of evento.destinatarios) {
          await crearNotificacion({
            destinatario: destinatarioId,
            tipo: "recordatorio_evento",
            titulo: `Recordatorio: ${evento.titulo}`,
            mensaje: `El evento "${evento.titulo}" ${evento.curso ? `del curso ${evento.curso.nombre}` : ''} comienza ${tiempoTexto}`,
            evento: evento._id,
            curso: evento.curso?._id
          });

          console.log(`✅ Recordatorio enviado para evento: ${evento.titulo} (${tiempoTexto})`);
        }

        // Marcar como recordatorio enviado
        evento.recordatorioEnviado = true;
        await evento.save();
      }
    }

    console.log("✨ Verificación de recordatorios completada");

  } catch (error) {
    console.error("❌ Error al enviar recordatorios:", error);
  }
};

// Función para resetear recordatorios de eventos pasados
const resetearRecordatorios = async () => {
  try {
    console.log("🔄 Reseteando recordatorios de eventos pasados...");

    const ahora = new Date();

    // Resetear flag de eventos que ya pasaron
    const resultado = await Evento.updateMany(
      {
        fechaFin: { $lt: ahora },
        recordatorioEnviado: true
      },
      {
        recordatorioEnviado: false
      }
    );

    console.log(`✅ ${resultado.modifiedCount} eventos reseteados`);

  } catch (error) {
    console.error("❌ Error al resetear recordatorios:", error);
  }
};

// Configurar cron jobs
const iniciarCronJobs = () => {
  console.log("⏰ Iniciando sistema de recordatorios automáticos...");

  // Verificar eventos próximos cada 5 minutos
  cron.schedule("*/5 * * * *", () => {
    console.log("⏰ Ejecutando cron job de recordatorios...");
    enviarRecordatorios();
  });

  // Resetear recordatorios de eventos pasados cada día a las 2 AM
  cron.schedule("0 2 * * *", () => {
    console.log("🔄 Ejecutando cron job de reseteo...");
    resetearRecordatorios();
  });

  console.log("✅ Cron jobs iniciados correctamente");
  console.log("   - Recordatorios: cada 5 minutos");
  console.log("   - Reseteo: diariamente a las 2 AM");
};

// Función manual para probar recordatorios (útil para desarrollo)
const enviarRecordatoriosManual = async (req, res) => {
  try {
    await enviarRecordatorios();
    res.json({ message: "Recordatorios procesados manualmente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al procesar recordatorios" });
  }
};

module.exports = {
  iniciarCronJobs,
  enviarRecordatorios,
  resetearRecordatorios,
  enviarRecordatoriosManual
};