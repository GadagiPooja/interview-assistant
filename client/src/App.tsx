import { useState } from "react";
import { useInterview } from "./hooks/useInterview";
import ContextForm from "./components/ContextForm";
import TranscriptPanel from "./components/TranscriptPanel";
import QuestionPanel from "./components/QuestionPanel";
import AnswerPanel from "./components/AnswerPanel";
import StatusBadge from "./components/StatusBadge";
import "./App.css";

export default function App() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const s = useInterview();
  const running = s.status !== "idle";

  return (
    <div className="app" data-state={s.status}>
      <header className="top">
        <div className="brand">
          <span className={`bars ${running ? "live" : ""}`} aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
          <h1>Interview Assistant</h1>
        </div>
        <StatusBadge status={s.status} />
        {s.source && (
          <span className="source">Hearing: {s.source === "tab" ? "shared tab" : "microphone"}</span>
        )}
        <div className="spacer" />
        {!running ? (
          <button className="btn start" onClick={() => s.start({ resume, jd })}>Start listening</button>
        ) : (
          <button className="btn stop" onClick={s.stop}>Stop</button>
        )}
      </header>

      {s.error && <div className="error" role="alert">{s.error}</div>}

      <details className="context" open={!running}>
        <summary>Resume and job description</summary>
        <ContextForm resume={resume} jd={jd} disabled={running} onResume={setResume} onJd={setJd} />
      </details>

      <QuestionPanel question={s.question} />

      <main className="grid">
        <TranscriptPanel finals={s.finals} interim={s.interim} />
        <AnswerPanel answer={s.answer} metrics={s.metrics} status={s.status} />
      </main>
    </div>
  );
}
