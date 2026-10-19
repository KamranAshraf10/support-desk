import { useMeta } from '../meta/MetaContext';

/** Colour comes from the code (CSS class), text comes from /api/meta in the current language. */
export function StatusBadge({ status }) {
  const { statusLabel } = useMeta();
  return <span className={`badge status-${status}`}>{statusLabel(status)}</span>;
}

export function PriorityBadge({ priority }) {
  const { priorityLabel } = useMeta();
  return (
    <span className={`badge priority priority-${priority}`}>
      <span className="dot" aria-hidden="true" />
      {priorityLabel(priority)}
    </span>
  );
}

/** Ticket references (TK-1042) and emails are always LTR, even inside Arabic text. */
export function Ltr({ children, className = '' }) {
  return (
    <bdi dir="ltr" className={className}>
      {children}
    </bdi>
  );
}
