import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

export type TranscriptEvent = { text: string; isFinal: boolean; speechFinal: boolean };

export class SttStream {
  private conn;
  private open = false;
  private queue: Buffer[] = [];
  private keepAlive?: NodeJS.Timeout;

  constructor(
    onTranscript: (e: TranscriptEvent) => void,
    onUtteranceEnd: () => void,
    onError: (err: unknown) => void
  ) {
    const dg = createClient(process.env.DEEPGRAM_API_KEY!);
    this.conn = dg.listen.live({
      model: "nova-2",
      language: "en",
      smart_format: true,
      interim_results: true,
      endpointing: 500,        // ms of silence -> speech_final
      utterance_end_ms: 1200,  // fallback boundary (needs interim_results)
      vad_events: true,
    });

    this.conn.on(LiveTranscriptionEvents.Open, () => {
      this.open = true;
      this.queue.forEach((b) => this.conn.send(b)); // flush audio buffered before open
      this.queue = [];
      this.keepAlive = setInterval(() => this.conn.keepAlive(), 8000);
    });
    this.conn.on(LiveTranscriptionEvents.Transcript, (d: any) => {
      const text = d.channel?.alternatives?.[0]?.transcript ?? "";
      if (!text) return;
      onTranscript({ text, isFinal: d.is_final, speechFinal: d.speech_final });
    });
    this.conn.on(LiveTranscriptionEvents.UtteranceEnd, onUtteranceEnd);
    this.conn.on(LiveTranscriptionEvents.Error, onError);
  }

  send(chunk: Buffer) {
    if (this.open) this.conn.send(chunk);
    else this.queue.push(chunk);
  }

  close() {
    clearInterval(this.keepAlive);
    try { this.conn.requestClose(); } catch {}
  }
}
