/**
 * Image loading queue.
 *
 * Google's photo CDN (lh3.googleusercontent.com) rate-limits bursts: when a
 * page mounts dozens of cards at once, some requests come back as non-image
 * responses which Chrome then blocks (ERR_BLOCKED_BY_ORB) and the browser
 * reports as an img `error`. A single failure used to show the permanent
 * "photo coming soon" fallback even though the URL was fine.
 *
 * This module gates every image through a small concurrency window with
 * retry + backoff, so:
 *   - we never fire more than `MAX_CONCURRENT` requests at once;
 *   - a transient throttled response is retried a couple of times with
 *     increasing delay instead of being treated as a dead URL;
 *   - repeated requests for the same URL share one in-flight load.
 */
const MAX_CONCURRENT = 6;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [900, 2400];
/** A request that neither loads nor errors within this window is a stall. */
const REQUEST_TIMEOUT_MS = 15000;

interface PendingEntry {
  promise: Promise<boolean>;
  resolve: (ok: boolean) => void;
}

const pending = new Map<string, PendingEntry>();
const inFlight = new Set<string>();
const queue: string[] = [];

function pump(): void {
  while (inFlight.size < MAX_CONCURRENT && queue.length > 0) {
    const url = queue.shift()!;
    if (pending.has(url)) startLoad(url);
  }
}

function startLoad(url: string): void {
  if (inFlight.has(url)) return;
  inFlight.add(url);
  attempt(url, 0).then((ok) => {
    inFlight.delete(url);
    const entry = pending.get(url);
    if (entry) {
      entry.resolve(ok);
      pending.delete(url);
    }
    pump();
  });
}

function attempt(url: string, attemptNo: number): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(ok);
    };
    const retry = () => {
      if (attemptNo < MAX_ATTEMPTS - 1) {
        // Transient throttling — retry after a short backoff.
        setTimeout(() => attempt(url, attemptNo + 1).then(finish), RETRY_DELAYS_MS[attemptNo]);
      } else {
        finish(false);
      }
    };
    img.onload = () => finish(true);
    img.onerror = retry;
    // Guard against requests that hang forever without firing load/error.
    timer = setTimeout(retry, REQUEST_TIMEOUT_MS);
    img.src = url;
  });
}

/**
 * Resolves true when the image loaded successfully (a subsequent `<img>`
 * with the same URL will hit the browser cache instantly). Concurrent callers
 * with the same URL share a single load.
 */
export function loadImage(url: string): Promise<boolean> {
  const existing = pending.get(url);
  if (existing) return existing.promise;

  let resolveFn!: (ok: boolean) => void;
  const promise = new Promise<boolean>((resolve) => {
    resolveFn = resolve;
  });
  pending.set(url, { promise, resolve: resolveFn });
  queue.push(url);
  pump();
  return promise;
}
