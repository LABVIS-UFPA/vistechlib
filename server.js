import fs from "fs";
import path from "path";
import { WebSocketServer } from "ws";

const PORT = 3000;
const RESULTS_FILE = path.join(process.cwd(), "results.json");
const INTERACTION_LOG_FILE = path.join(process.cwd(), "interaction-log.csv");

function ensureInteractionCsvHeader() {
  if (fs.existsSync(INTERACTION_LOG_FILE)) return;

  const header =
    "participantId,blockNumber,taskIndexInBlock,taskKey,visualizationId,datasetId,eventType,eventTarget,eventValue,eventSteps,timestamp\n";

  fs.writeFileSync(INTERACTION_LOG_FILE, header, "utf8");
}

function saveInteractionLog(interactionLog = []) {
  if (!Array.isArray(interactionLog) || interactionLog.length === 0) {
    return;
  }

  ensureInteractionCsvHeader();

  const rows = interactionLog.map((interaction) => {
    const eventTarget =
      interaction.details?.controlKey ?? interaction.details?.target ?? "";

    const eventValue =
      interaction.details?.value ??
      interaction.details?.dataIndex ??
      (interaction.details?.innerX !== undefined &&
      interaction.details?.innerY !== undefined
        ? `${interaction.details.innerX};${interaction.details.innerY}`
        : "");

    const eventSteps = interaction.details?.steps ?? "";

    return [
      interaction.participantId,
      interaction.blockNumber,
      interaction.taskIndexInBlock,
      interaction.taskKey,
      interaction.visualizationId,
      interaction.datasetId,
      interaction.eventType,
      eventTarget,
      eventValue,
      eventSteps,
      interaction.timestamp,
    ].map(csvEscape).join(",");
  });

  fs.appendFileSync(INTERACTION_LOG_FILE, rows.join("\n") + "\n", "utf8");
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";

  const text = String(value);

  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

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

        saveInteractionLog(payload.interactionLog);

        ws.send(
          JSON.stringify({
            type: "SAVE_EXPERIMENT_OK",
          }),
        );

        console.log("Experimento salvo em results.json");
      }
    } catch (err) {
      console.error("Erro no WebSocket:", err);

      ws.send(
        JSON.stringify({
          type: "SAVE_EXPERIMENT_ERROR",
          message: err.message,
        }),
      );
    }
  });

  ws.on("close", () => {
    console.log("WebSocket desconectado");
  });
});

console.log(`WebSocket rodando em ws://localhost:${PORT}`);
