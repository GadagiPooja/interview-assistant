import { WebSocket } from "ws";
import { SttStream } from "./stt";
import { classify } from "./questionDetector";
import { isQuestionLLM, streamAnswer } from "./llm";
import { Context, QA, Status } from "./types";

export class Session {
  private stt?: SttStream;
  private ctx: Context = { resume: "", jd: "" };
  private history: QA[] = [];
  private pending = "";            // finalized text not yet judged
  private abort?: AbortController;
  private lastAudioAt = 0;

  constructor(private ws: WebSocket) {
    ws.on("message", (data, isBinary) => {
      if (isBinary) { this.stt?.send(data as Buffer); return; }
      try { this.onControl(JSON.parse(data.toString())); }
      catch { this.send({ type: "error", message: "Bad control message" }); }
    });
    ws.on("close", () => this.cleanup());
  }

  private send(msg: object) {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
  private status(s: Status) { this.send({ type: "status", state: s }); }

  private onControl(msg: any) {
    if (msg.type === "start") {
      this.cleanup();
      this.ctx = msg.context ?? this.ctx;
      this.history = []; this.pending = "";
      this.stt = new SttStream(
        (e) => this.onTranscript(e),
        () => this.evaluate(true),
        (err) => this.send({ type: "error", message: `STT error: ${String(err)}` })
      );
      this.status("listening");
    } else if (msg.type === "stop") {
      this.cleanup();
      this.status("idle");
    }
  }

  private onTranscript(e: { text: string; isFinal: boolean; speechFinal: boolean }) {
    this.send({ type: "transcript", text: e.text, isFinal: e.isFinal });
    if (!e.isFinal) return;
    this.pending = (this.pending + " " + e.text).trim();
    this.lastAudioAt = Date.now();
    if (e.speechFinal) this.evaluate(false);
  }

  // force=true when UtteranceEnd fires: stop waiting for "incomplete" text
  private async evaluate(force: boolean) {
    const text = this.pending;
    if (!text) return;
    let verdict = classify(text);
    if (verdict === "incomplete" && !force) return; // wait for more speech
    if (verdict === "incomplete") verdict = "ambiguous";

    if (verdict === "not_question") { this.pending = ""; return; }
    if (verdict === "ambiguous") {
      this.status("thinking");
      if (!(await isQuestionLLM(text))) { this.pending = ""; this.status("listening"); return; }
    }
    this.pending = "";
    this.answer(text, this.lastAudioAt || Date.now());
  }

  private async answer(question: string, speechEndedAt: number) {
    this.abort?.abort(); // a newer question cancels the older answer
    const ctrl = (this.abort = new AbortController());
    const detectedAt = Date.now();
    this.send({ type: "question", text: question });
    this.status("thinking");

    let firstTokenAt = 0;
    try {
      const full = await streamAnswer({
        question, ctx: this.ctx, history: this.history, signal: ctrl.signal,
        onToken: (t) => {
          if (ctrl.signal.aborted) return;
          if (!firstTokenAt) { firstTokenAt = Date.now(); this.status("answering"); }
          this.send({ type: "answer_delta", text: t });
        },
      });
      if (ctrl.signal.aborted) return;
      this.history.push({ q: question, a: full });
      this.send({
        type: "answer_done",
        metrics: {
          endpointToFirstTokenMs: firstTokenAt - speechEndedAt,
          detectToFirstTokenMs: firstTokenAt - detectedAt,
          totalMs: Date.now() - speechEndedAt,
        },
      });
      this.status("listening");
    } catch (err: any) {
      if (ctrl.signal.aborted) return;
      this.send({ type: "error", message: `LLM error: ${err?.message ?? err}` });
      this.status("listening");
    }
  }

  private cleanup() {
    this.abort?.abort();
    this.stt?.close();
    this.stt = undefined;
  }
}
