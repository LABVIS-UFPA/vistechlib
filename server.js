import fs from "fs";
import path from "path";
import { WebSocketServer } from "ws";

const PORT = 3000;
const RESULTS_FILE = path.join(process.cwd(), "results.json");

function readResults() {
  if (!fs.existsSync(RESULTS_FILE)) return [];

  try {
    const raw = fs.readFileSync(RESULTS_FILE, "utf8");
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Erro ao ler results.json:", err);
    return [];
  }
}

function saveExperiment(experimentData) {
  const results = readResults();

  results.push({
    receivedAt: new Date().toISOString(),
    experimentData,
  });

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), "utf8");
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  console.log("WebSocket conectado");

  ws.on("message", (message) => {
    try {
      const payload = JSON.parse(message.toString());

      if (payload.type === "SAVE_EXPERIMENT") {
        saveExperiment(payload.experimentData);

        ws.send(JSON.stringify({
          type: "SAVE_EXPERIMENT_OK",
        }));

        console.log("Experimento salvo em results.json");
      }
    } catch (err) {
      console.error("Erro no WebSocket:", err);

      ws.send(JSON.stringify({
        type: "SAVE_EXPERIMENT_ERROR",
        message: err.message,
      }));
    }
  });

  ws.on("close", () => {
    console.log("WebSocket desconectado");
  });
});

console.log(`WebSocket rodando em ws://localhost:${PORT}`);