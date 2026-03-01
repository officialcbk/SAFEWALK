import type { WalkStatus } from "../types/walk";

interface Props {
  status: WalkStatus;
}

function StatusBadge({ status }: Props) {
  const label = status === "active" ? "Active" : "Inactive";
  const rootClass =
    status === "active"
      ? "sw-status-badge sw-status-badge--active"
      : "sw-status-badge sw-status-badge--inactive";

  return (
    <span className={rootClass}>
      <span className="sw-status-badge-dot" />
      {label}
    </span>
  );
}

export default StatusBadge;
