import { useCallback, useSyncExternalStore } from 'react';
import { RefreshCw } from 'lucide-react';
import type { GoogleRefreshMeta } from '../domain/liveGoogle';
import {
  getGoogleRefreshMeta,
  refreshGoogleSummary,
  subscribeGoogleRefresh,
} from '../hooks/useGoogleRefresh';
import { statusPill } from '../lib/statusPill';
import { Button } from './ui';

/** Stable idle metadata — avoids re-render loops in useSyncExternalStore. */
const IDLE_META: GoogleRefreshMeta = { status: 'idle' };

interface GoogleRefreshButtonProps {
  placeId?: string;
  label?: string;
  /** Show the status as an admin chip next to the button. */
  showStatus?: boolean;
}

/**
 * Executive-admin control: runs a controlled summary refresh (rating, count,
 * status, hours, price level, contact) for a place. Never touches photos,
 * menus, price history or Khabo Kothay fields. The status mark is the console's
 * one `.status-pill`, derived from the refresh state through `statusPill`.
 */
export default function GoogleRefreshButton({ placeId, label = 'Refresh Google data', showStatus = true }: GoogleRefreshButtonProps) {
  const meta = useSyncExternalStore(
    useCallback((cb: () => void) => subscribeGoogleRefresh(cb), []),
    () => (placeId ? getGoogleRefreshMeta(placeId) : IDLE_META),
    () => IDLE_META,
  );

  const running = meta.status === 'refreshing';

  const onClick = () => {
    if (!placeId || running) return;
    void refreshGoogleSummary(placeId, { force: true });
  };

  const statusWord =
    meta.status === 'updated' ? 'published'
    : meta.status === 'failed' ? 'failed'
    : meta.status === 'refreshing' ? 'pending'
    : 'draft';

  const statusText =
    meta.status === 'refreshing' ? 'Refreshing…'
    : meta.status === 'updated' ? 'Updated'
    : meta.status === 'failed' ? 'Failed'
    : meta.status === 'unavailable' ? 'Unavailable'
    : 'Idle';

  return (
    <span className="admin-table__actions">
      {/* `busy` rather than a swapped label: the row already had the word
          "Refreshing…" and nothing else, so a request in flight looked like a
          button someone had renamed. The primitive adds the spinner and
          `aria-busy` and swallows the click. */}
      <Button
        variant="ghost"
        size="sm"
        icon={RefreshCw}
        busy={running}
        disabled={!placeId}
        onClick={onClick}
        title={meta.lastError ? `Last error: ${meta.lastError}` : undefined}
        aria-label="Refresh Google data for this place"
      >
        {running ? 'Refreshing…' : label}
      </Button>
      {showStatus && meta.status !== 'idle' && (
        <span className={statusPill(statusWord)} title={meta.lastError}>
          {statusText}
        </span>
      )}
    </span>
  );
}
