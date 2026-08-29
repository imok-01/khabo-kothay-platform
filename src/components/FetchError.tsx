import { WifiOff, RotateCcw } from 'lucide-react';
import { Button } from './ui';

interface FetchErrorProps {
  onRetry: () => void;
  message?: string;
}

export default function FetchError({
  onRetry,
  /* Not "check your connection and try again" — the button says that. A message
     whose only content is the label of the button beneath it wastes the one line
     a diner reads before deciding whether this product is worth the wait. */
  message = 'Nothing loaded. Your connection may have dropped mid-request.',
}: FetchErrorProps) {
  return (
    <div className="empty" role="alert">
      <span className="empty__icon" aria-hidden="true"><WifiOff size={36} /></span>
      <h3>Connection trouble</h3>
      <p>{message}</p>
      <Button variant="primary" icon={RotateCcw} onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
