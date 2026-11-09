import type { Status } from "../hooks/useInterview";

const LABELS: Record<Status, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  answering: "Answering",
};

// Colour comes from the --state variable set on .app by the current status.
export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className="badge" role="status">
      <span className="dot" />
      {LABELS[status]}
    </span>
  );
}
