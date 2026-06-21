import fs from "fs";
import path from "path";
import { WebSocketServer } from "ws";

const PORT = 3000;
const RESULTS_DIR = path.join(process.cwd(), "results");
const INTERACTIONS_DIR = path.join(process.cwd(), "log-interactions");

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

if (!fs.existsSync(INTERACTIONS_DIR)) {
  fs.mkdirSync(INTERACTIONS_DIR, { recursive: true });
}

function ensureInteractionCsvHeader(filePath) {
  if (fs.existsSync(filePath)) return;

  const header =
    "participantId,blockNumber,taskIndexInBlock,taskKey,visualizationId,datasetId,eventType,eventTarget,eventValue,eventSteps,timestamp\n";

  fs.writeFileSync(filePath, header, "utf8");
}

function saveInteractionLog(participantId, interactionLog = []) {
  if (!Array.isArray(interactionLog) || interactionLog.length === 0) {
    return;
  }

  const interactionFile = path.join(INTERACTIONS_DIR, `${participantId}.csv`);

  ensureInteractionCsvHeader(interactionFile);

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
    ]
      .map(csvEscape)
      .join(",");
  });

  fs.appendFileSync(interactionFile, rows.join("\n") + "\n", "utf8");
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";

  const text = String(value);

  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function saveExperiment(experimentData) {
  const participantId = experimentData.participantId;

  const resultFile = path.join(RESULTS_DIR, `${participantId}.json`);

  const payload = {
    receivedAt: new Date().toISOString(),
    experimentData,
  };

  fs.writeFileSync(resultFile, JSON.stringify(payload, null, 2), "utf8");
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  console.log("WebSocket conectado");

  ws.on("message", (message) => {
    try {
      const payload = JSON.parse(message.toString());

      if (payload.type === "SAVE_EXPERIMENT") {
        saveExperiment(payload.experimentData);

        saveInteractionLog(payload.experimentData.participantId, payload.interactionLog);

        ws.send(
          JSON.stringify({
            type: "SAVE_EXPERIMENT_OK",
          }),
        );

        console.log("Experimento salvo em arquivo individual");
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
