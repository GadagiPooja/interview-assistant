type Props = {
  resume: string; jd: string; disabled: boolean;
  onResume: (v: string) => void; onJd: (v: string) => void;
};

export default function ContextForm({ resume, jd, disabled, onResume, onJd }: Props) {
  return (
    <div className="fields">
      <label>
        Your resume or summary
        <textarea
          placeholder="Paste your resume or a short summary"
          value={resume}
          disabled={disabled}
          onChange={(e) => onResume(e.target.value)}
        />
      </label>
      <label>
        Job description
        <textarea
          placeholder="Paste the job description"
          value={jd}
          disabled={disabled}
          onChange={(e) => onJd(e.target.value)}
        />
      </label>
    </div>
  );
}
