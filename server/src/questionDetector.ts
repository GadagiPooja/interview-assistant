// Pause detection (Deepgram speech_final / UtteranceEnd) decides WHEN to evaluate.
// These heuristics decide WHAT the text is. An LLM classifier handles only "ambiguous".
export type Verdict = "question" | "not_question" | "incomplete" | "ambiguous";

const SMALL_TALK = /(how are you|how's it going|can you hear me|can you see (my|the) screen|nice to meet you|good (morning|afternoon)|thanks?( you)?)\b/i;
const STARTERS = /^(so |and |okay |ok |now |alright |great,? )*(what|why|how|when|where|who|which|can|could|would|do|does|did|is|are|have|has|will|tell me|walk me through|talk me through|describe|explain|give me|share)\b/i;
const DANGLING = /\b(and|or|but|the|a|an|to|of|with|for|about|that|which|if|so|because|in|on)[\s,]*$/i;

export function classify(text: string): Verdict {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words < 3) return "not_question";
  if (SMALL_TALK.test(t) && words < 8) return "not_question";
  if (!t.endsWith("?") && DANGLING.test(t)) return "incomplete";
  if (t.endsWith("?") || STARTERS.test(t)) return words >= 4 ? "question" : "ambiguous";
  return "ambiguous";
}
