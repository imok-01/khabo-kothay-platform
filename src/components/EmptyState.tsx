import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

export interface Suggestion {
  label: string;
  to: string;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  actionTo?: string;
  /** contextual alternatives offered when nothing matches */
  suggestions?: Suggestion[];
}

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  actionTo,
  suggestions,
}: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">{icon ?? <SearchX size={36} />}</span>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && actionTo && (
        <div className="empty__actions">
          <Link to={actionTo} className="btn btn--primary">{actionLabel}</Link>
        </div>
      )}
      {suggestions && suggestions.length > 0 && (
        <div className="suggestions" role="group" aria-label="Suggested alternatives">
          <span className="suggestions__label">Try instead:</span>
          {suggestions.map((s) => (
            <Link key={s.label} to={s.to} className="chip chip--select">{s.label}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
