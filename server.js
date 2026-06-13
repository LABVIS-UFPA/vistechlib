import http from "http";
import fs from "fs";
import path from "path";
import { WebSocketServer } from "ws";

const PORT = 3000;

const ROOT_DIR = process.cwd();
const HOME_FILE = path.join(ROOT_DIR, "test", "experimento.html");
const RESULTS_FILE = path.join(process.cwd(), "results.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Arquivo não encontrado");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });

    res.end(content);
  });
}

function readResults() {
  if (!fs.existsSync(RESULTS_FILE)) {
    return [];
  }

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

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);

  if (urlPath === "/") {
    sendFile(res, HOME_FILE);
    return;
  }

  const requestedPath = path.normalize(path.join(ROOT_DIR, urlPath));

  if (!requestedPath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Acesso negado");
    return;
  }

  sendFile(res, requestedPath);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("WebSocket conectado");

  ws.on("message", (message) => {
    try {
      const payload = JSON.parse(message.toString());

      if (payload.type === "SAVE_EXPERIMENT") {
        saveExperiment(payload.experimentData);

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

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`WebSocket rodando em ws://localhost:${PORT}`);
});
