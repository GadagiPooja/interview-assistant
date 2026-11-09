import type { Metrics, Status } from "../hooks/useInterview";

function toBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-•*]\s*/, ""));
}

const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export default function AnswerPanel({
  answer, metrics, status,
}: { answer: string; metrics: Metrics | null; status: Status }) {
  const bullets = toBullets(answer);
  const streaming = status === "answering";
  const validMetrics = metrics && metrics.endpointToFirstTokenMs >= 0;

  return (
    <section className="answer" aria-label="Suggested answer" aria-live="polite">
      <h2>Suggested answer</h2>

      {bullets.length === 0 ? (
        <p className="empty">
          {status === "thinking" ? "Thinking about the question…" : "Your answer appears here, one point at a time."}
        </p>
      ) : (
        <ul>
          {bullets.map((b, i) => (
            <li key={i}>
              {b}
              {streaming && i === bullets.length - 1 && <span className="caret" />}
            </li>
          ))}
        </ul>
      )}

      {validMetrics && (
        <div className="metrics">
          <span className={`chip ${metrics!.endpointToFirstTokenMs <= 3000 ? "ok" : "slow"}`}>
            First word {secs(metrics!.endpointToFirstTokenMs)} after the question
          </span>
          <span className="chip">Complete in {secs(metrics!.totalMs)}</span>
        </div>
      )}
    </section>
  );
}
