# Real-Time Interview Assistant (POC)

Audio -> Deepgram streaming STT -> question detection -> OpenAI streaming answer -> React UI.

## Setup
Requires Node 20+ and Chrome.

1. `cd server && npm install && cp .env.example .env` then fill `DEEPGRAM_API_KEY` and `OPENAI_API_KEY`
2. `npm run dev` (server on :8080, check http://localhost:8080/health)
3. In a second terminal: `cd client && npm install && npm run dev`
4. Open http://localhost:5173 in Chrome, paste resume and job description, click Start.
   Pick the tab with the interview and tick "Share tab audio". If you cancel, the microphone is used.

Docker (optional): `docker compose up --build`

## Data flow
```
Browser: tab audio -> MediaRecorder (WebM/Opus, 250 ms chunks)
  | WebSocket (binary)
Node server (one Session per connection)
  | -> Deepgram live WS -> interim/final transcripts
  | -> Question detector (heuristics; LLM classifier only if ambiguous)
  | -> OpenAI streaming completion (resume + JD + last 4 Q&A)
  | WebSocket JSON: status, transcript, question, answer_delta, answer_done
Browser: transcript / question / answer panels, status, latency metrics
```

## Key decisions
- Deepgram nova-2: low latency, interim results, endpointing + UtteranceEnd, accepts WebM/Opus (no transcoding).
- gpt-4o-mini: fast first token, cheap.
- Question detection: Deepgram pause events decide WHEN, regex heuristics decide WHAT, LLM only for ambiguous text (1.2 s timeout, defaults to answering).
- A new question aborts the previous answer via AbortController.
- Extras: conversation memory, latency metrics.

## Known limitations
Chrome only; no speaker diarization; mic fallback also hears the candidate; no WebSocket reconnect; no rate limiting; heuristics are English-only.

## Next week
Speculative generation on interim text, diarization, question-type prompts, AudioWorklet + raw PCM, reconnect logic, detector unit tests.
