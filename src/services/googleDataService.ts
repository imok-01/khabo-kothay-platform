import type { LiveGoogleSnapshot, GoogleRefreshMeta } from '../domain/liveGoogle';
import {
  fetchPlaceDetails,
  fetchPlaceSummary,
  isGooglePlacesConfigured,
  normalizePlaceDetails,
} from './googlePlacesClient';

/**
 * Central Google data refresh service — the single entry point for live
 * Google enrichment. UI components never call the Places API directly; they
 * ask this service for a snapshot.
 *
 *   UI → googleDataService → Places (New) → normalized snapshot → UI
 *
 * Freshness policy:
 *   - `FRESHNESS_MS` — a snapshot is considered current for this window.
 *   - On-demand: callers ask for a place; if we hold a fresh snapshot we
 *     return it immediately, otherwise a controlled refresh runs.
 *   - Manual admin refresh bypasses the window (`{ force: true }`).
 *   - No automatic background polling. Ever.
 *
 * Storage:
 *   - Snapshots live in memory for the session only (Map keyed by place ID).
 *     Google content is never written to localStorage/IndexedDB — respecting
 *     current Places caching/storage restrictions. A page reload simply
 *     refetches on demand.
 *
 * Cost control:
 *   - Field masks are explicit and minimal (see googlePlacesClient).
 *   - `refreshGooglePlaceData` (full, includes up-to-5 reviews) is used for
 *     the restaurant page and admin detail; a lighter `refreshGoogleSummary`
 *     exists for bulk operations that only need rating/count/status/hours.
 *   - Bulk refreshes are throttled (`BULK_CONCURRENCY`, small delay) to avoid
 *     hammering the quota.
 */

const FRESHNESS_MS = 1000 * 60 * 60 * 24; // 24h
const BULK_CONCURRENCY = 4;
const BULK_DELAY_MS = 350;

interface StoreEntry {
  snapshot?: LiveGoogleSnapshot;
  meta: GoogleRefreshMeta;
}

const store = new Map<string, StoreEntry>();
const inFlight = new Map<string, Promise<LiveGoogleSnapshot | null>>();
const listeners = new Set<() => void>();

/** Stable idle metadata — returned for untracked place IDs (avoids re-render loops). */
const IDLE_META: GoogleRefreshMeta = { status: 'idle' };

/** Operational metadata for a place ID (never empty — callers may render it). */
export function getGoogleRefreshMeta(placeId: string): GoogleRefreshMeta {
  return store.get(placeId)?.meta ?? IDLE_META;
}

/** The current in-memory snapshot for a place ID, if any. */
export function getGoogleSnapshot(placeId: string): LiveGoogleSnapshot | undefined {
  return store.get(placeId)?.snapshot;
}

/** True when the snapshot is fresh enough to serve without a network call. */
export function isFresh(snapshot: LiveGoogleSnapshot | undefined, now = Date.now()): boolean {
  if (!snapshot) return false;
  const at = Date.parse(snapshot.fetchedAt);
  if (Number.isNaN(at)) return false;
  return now - at <= FRESHNESS_MS;
}

/** Subscribe to snapshot/meta changes (returns an unsubscribe function). */
export function subscribeGoogleRefresh(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  for (const l of listeners) l();
}

function setMeta(placeId: string, meta: GoogleRefreshMeta): void {
  const entry = store.get(placeId) ?? { meta: { status: 'idle' as const } };
  entry.meta = { ...entry.meta, ...meta };
  store.set(placeId, entry);
  emit();
}

/**
 * Ensure the app is configured before spending a network call. Returns a
 * normalized snapshot, or null when Google data is unavailable/errored —
 * callers then fall back to the seed data and show a subtle notice.
 */
export async function refreshGooglePlaceData(
  placeId: string,
  options: { force?: boolean; summary?: boolean } = {},
): Promise<LiveGoogleSnapshot | null> {
  const entry = store.get(placeId);
  const fresh = !options.force && isFresh(entry?.snapshot);

  if (fresh && entry?.snapshot) {
    return entry.snapshot;
  }

  // Reuse an in-flight refresh so two components never double-call.
  const key = `${placeId}:${options.summary ? 'summary' : 'full'}`;
  const running = inFlight.get(key);
  if (running) return running;

  if (!isGooglePlacesConfigured()) {
    setMeta(placeId, { status: 'unavailable', lastAttemptedAt: new Date().toISOString() });
    return null;
  }

  setMeta(placeId, { status: 'refreshing', lastAttemptedAt: new Date().toISOString() });

  const promise = (async () => {
    try {
      const raw = options.summary ? await fetchPlaceSummary(placeId) : await fetchPlaceDetails(placeId);
      const snapshot = normalizePlaceDetails(raw, placeId);
      store.set(placeId, {
        snapshot,
        meta: {
          status: 'updated',
          lastAttemptedAt: new Date().toISOString(),
          lastSuccessfulAt: new Date().toISOString(),
        },
      });
      emit();
      return snapshot;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMeta(placeId, {
        status: 'failed',
        lastAttemptedAt: new Date().toISOString(),
        lastError: message,
      });
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

/** Convenience wrapper for the summary-only (bulk-friendly) path. */
export function refreshGoogleSummary(placeId: string, options: { force?: boolean } = {}): Promise<LiveGoogleSnapshot | null> {
  return refreshGooglePlaceData(placeId, { ...options, summary: true });
}

/**
 * Bulk refresh for administrators. Throttled to stay quota-friendly.
 * Resolves with the count of places successfully refreshed.
 */
export async function refreshGoogleBulk(placeIds: string[]): Promise<number> {
  const unique = [...new Set(placeIds)];
  let done = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < unique.length) {
      const id = unique[cursor++];
      const result = await refreshGooglePlaceData(id, { force: true, summary: true });
      if (result) done += 1;
      await new Promise((r) => setTimeout(r, BULK_DELAY_MS));
    }
  };

  const workers = Array.from({ length: Math.min(BULK_CONCURRENCY, unique.length) }, worker);
  await Promise.all(workers);
  return done;
}

/** All place IDs currently tracked (for admin status views). */
export function trackedPlaceIds(): string[] {
  return [...store.keys()];
}

/** Test-only: clear the in-memory session store between test runs. */
export function resetGoogleRefreshStoreForTests(): void {
  store.clear();
  inFlight.clear();
  listeners.clear();
}
