export default function QuestionPanel({ question }: { question: string }) {
  return (
    <section className="question" aria-label="Detected question">
      <h2>Detected question</h2>
      {question ? <p>{question}</p> : <p className="empty">Waiting for the interviewer to ask something.</p>}
    </section>
  );
}
