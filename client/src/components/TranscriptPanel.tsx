import { useEffect, useRef } from "react";

export default function TranscriptPanel({ finals, interim }: { finals: string[]; interim: string }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [finals, interim]);

  const empty = finals.length === 0 && !interim;
  return (
    <section className="transcript" aria-label="Live transcript">
      <h2>Live transcript</h2>
      {empty && (
        <p className="empty">
          Press Start listening, choose the interview tab and tick Share tab audio.
        </p>
      )}
      {finals.map((t, i) => (
        <p key={i} className={i === finals.length - 1 && !interim ? "line latest" : "line"}>{t}</p>
      ))}
      {interim && <p className="line interim">{interim}</p>}
      <div ref={end} />
    </section>
  );
}
