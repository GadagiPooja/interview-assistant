import "./env";
import http from "http";
import express from "express";
import { WebSocketServer } from "ws";
import { Session } from "./session";

const PORT = Number(process.env.PORT ?? 8080);
console.log("LLM key prefix:", process.env.OPENAI_API_KEY?.slice(0, 4), "| base:", process.env.LLM_BASE_URL);

if (!process.env.DEEPGRAM_API_KEY || !process.env.OPENAI_API_KEY) {
  console.warn("WARNING: DEEPGRAM_API_KEY or OPENAI_API_KEY is missing. Fill server/.env");
}

const app = express();
app.get("/health", (_req, res) => res.send("ok"));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => new Session(ws));

server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
