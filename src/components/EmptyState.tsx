import { Link } from 'react-router-dom';
import { SearchX, ArrowRight } from 'lucide-react';
import { Button } from './ui';

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
          {/* `iconAfter`, so the one way out of a dead end leans towards where
              it goes when you reach for it. An empty state is the moment the
              product most needs to feel like it is helping. */}
          <Button variant="primary" to={actionTo} iconAfter={ArrowRight}>
            {actionLabel}
          </Button>
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
