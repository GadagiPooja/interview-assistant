import OpenAI from "openai";
import { Context, QA } from "./types";
import { systemPrompt, classifierPrompt } from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.LLM_BASE_URL, // undefined = real OpenAI
});
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export async function isQuestionLLM(text: string, timeoutMs = 1200): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await openai.chat.completions.create(
      {
        model: MODEL, max_tokens: 3, temperature: 0,
        messages: [{ role: "system", content: classifierPrompt }, { role: "user", content: text }],
      },
      { signal: ctrl.signal }
    );
    return /QUESTION/i.test(r.choices[0]?.message?.content ?? "");
  } catch {
    return true; // on timeout/error, prefer answering over staying silent
  } finally {
    clearTimeout(timer);
  }
}

export async function streamAnswer(opts: {
  question: string; ctx: Context; history: QA[];
  signal: AbortSignal; onToken: (t: string) => void;
}): Promise<string> {
  // Conversation memory: last 4 Q&A pairs
  const memory = opts.history.slice(-4).flatMap((h) => [
    { role: "user" as const, content: h.q },
    { role: "assistant" as const, content: h.a },
  ]);

  const stream = await openai.chat.completions.create(
    {
      model: MODEL, stream: true, temperature: 0.4, max_tokens: 220,
      messages: [
        { role: "system", content: systemPrompt(opts.ctx) },
        ...memory,
        { role: "user", content: opts.question },
      ],
    },
    { signal: opts.signal }
  );

  let full = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) { full += delta; opts.onToken(delta); }
  }
  return full;
}
