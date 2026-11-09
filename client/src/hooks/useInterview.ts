import { useRef, useState, useCallback } from "react";

export type Status = "idle" | "listening" | "thinking" | "answering";
export type Metrics = { endpointToFirstTokenMs: number; detectToFirstTokenMs: number; totalMs: number };
const WS_URL = (import.meta as any).env?.VITE_WS_URL ?? "ws://localhost:8080/ws";

// Prefer tab audio (interviewer only); fall back to microphone.
async function getAudioStream(): Promise<{ stream: MediaStream; source: "tab" | "mic"; raw: MediaStream }> {
  try {
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const audio = display.getAudioTracks();
    if (audio.length) return { stream: new MediaStream(audio), source: "tab", raw: display };
    display.getTracks().forEach((t) => t.stop()); // user forgot "Share tab audio"
  } catch { /* cancelled or unsupported -> mic fallback */ }
  const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  return { stream: mic, source: "mic", raw: mic };
}

export function useInterview() {
  const [status, setStatus] = useState<Status>("idle");
  const [finals, setFinals] = useState<string[]>([]);
  const [interim, setInterim] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"tab" | "mic" | "">("");

  const ws = useRef<WebSocket | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const raw = useRef<MediaStream | null>(null);

  const start = useCallback(async (context: { resume: string; jd: string }) => {
    setError(""); setFinals([]); setInterim(""); setQuestion(""); setAnswer(""); setMetrics(null);
    try {
      const a = await getAudioStream();
      raw.current = a.raw;
      setSource(a.source);

      const socket = new WebSocket(WS_URL);
      ws.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "start", context }));
        const r = new MediaRecorder(a.stream, { mimeType: "audio/webm;codecs=opus" });
        r.ondataavailable = async (e) => {
          if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(await e.data.arrayBuffer());
          }
        };
        r.start(250);
        rec.current = r;
      };

      socket.onmessage = (ev) => {
        const m = JSON.parse(ev.data);
        switch (m.type) {
          case "status": setStatus(m.state); break;
          case "transcript":
            if (m.isFinal) { setFinals((f) => [...f, m.text]); setInterim(""); }
            else setInterim(m.text);
            break;
          case "question": setQuestion(m.text); setAnswer(""); setMetrics(null); break;
          case "answer_delta": setAnswer((p) => p + m.text); break;
          case "answer_done": setMetrics(m.metrics); break;
          case "error": setError(m.message); break;
        }
      };
      socket.onerror = () => setError("Cannot reach the server. Is it running on port 8080?");
      socket.onclose = () => setStatus("idle");
      setStatus("listening");
    } catch (e: any) {
      setError(e?.message ?? "Could not capture audio");
    }
  }, []);

  const stop = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: "stop" }));
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
    raw.current?.getTracks().forEach((t) => t.stop());
    ws.current?.close();
    setStatus("idle");
  }, []);

  return { status, finals, interim, question, answer, metrics, error, source, start, stop };
}
