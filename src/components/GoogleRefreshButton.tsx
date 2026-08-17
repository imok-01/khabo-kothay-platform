import { useCallback, useSyncExternalStore } from 'react';
import { RefreshCw } from 'lucide-react';
import type { GoogleRefreshMeta } from '../domain/liveGoogle';
import {
  getGoogleRefreshMeta,
  refreshGoogleSummary,
  subscribeGoogleRefresh,
} from '../services/googleDataService';

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
 * menus, price history or Khabo Kothay fields. The status chip mirrors the
 * existing admin-status language used across the admin panels.
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

  const statusClass =
    meta.status === 'updated' ? 'approved'
    : meta.status === 'failed' ? 'rejected'
    : meta.status === 'refreshing' ? 'pending'
    : 'draft';

  const statusText =
    meta.status === 'refreshing' ? 'Refreshing…'
    : meta.status === 'updated' ? 'Updated'
    : meta.status === 'failed' ? 'Failed'
    : meta.status === 'unavailable' ? 'Unavailable'
    : 'Idle';

  return (
    <span className="admin-table__actions" style={{ gap: 'var(--s2)', alignItems: 'center' }}>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={onClick}
        disabled={running || !placeId}
        title={meta.lastError ? `Last error: ${meta.lastError}` : undefined}
        aria-label={`Refresh Google data for this place`}
      >
        <RefreshCw size={12} aria-hidden="true" className={running ? 'spin' : ''} />
        {running ? 'Refreshing…' : label}
      </button>
      {showStatus && (
        <span className={`admin-status admin-status--${statusClass}`} title={meta.lastError}>
          {statusText}
        </span>
      )}
    </span>
  );
}
