import { WifiOff } from 'lucide-react';

interface FetchErrorProps {
  onRetry: () => void;
  message?: string;
}

export default function FetchError({
  onRetry,
  message = 'We couldn\'t load this right now. Check your connection and try again.',
}: FetchErrorProps) {
  return (
    <div className="empty" role="alert">
      <span className="empty__icon" aria-hidden="true"><WifiOff size={36} /></span>
      <h3>Connection trouble</h3>
      <p>{message}</p>
      <button type="button" className="btn btn--primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
