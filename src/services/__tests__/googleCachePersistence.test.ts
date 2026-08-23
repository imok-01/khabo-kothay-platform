import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';
const CACHE_KEY = 'khabo-kothay:google-cache';

function fakeLocalStorage() {
  const mem = new Map<string, string>();
  return {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fullBody() {
  return { id: PLACE_ID, rating: 4.6, userRatingCount: 1847, reviews: [] };
}

describe('google cache persistence (last-known cache)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_PLACES_API_KEY', 'test-place-key');
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('persists the last-known snapshot to localStorage on refresh', async () => {
    const ls = fakeLocalStorage();
    vi.stubGlobal('localStorage', ls);
    vi.mocked(fetch).mockResolvedValue(jsonResponse(fullBody()));

    const mod = await import('../googleDataService');
    const snap = await mod.refreshGooglePlaceData(PLACE_ID);

    expect(snap).not.toBeNull();
    const raw = ls.getItem(CACHE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed[PLACE_ID].snapshot.rating).toBe(4.6);
    // Transient refresh meta is reset on persist, not stored.
    expect(parsed[PLACE_ID].meta.status).toBe('idle');
  });

  it('hydrates a persisted snapshot so it survives a reload', async () => {
    const ls = fakeLocalStorage();
    ls.setItem(
      CACHE_KEY,
      JSON.stringify({
        [PLACE_ID]: {
          snapshot: {
            placeId: PLACE_ID,
            reviews: [],
            rating: 4.2,
            userRatingCount: 10,
            fetchedAt: new Date().toISOString(),
          },
          meta: { status: 'idle' },
        },
      }),
    );
    vi.stubGlobal('localStorage', ls);

    const mod = await import('../googleDataService');
    // hydrateGoogleCache runs at module load; the snapshot must be available.
    const snap = mod.getGoogleSnapshot(PLACE_ID);
    expect(snap).toBeDefined();
    expect(snap!.rating).toBe(4.2);
  });

  it('never throws when localStorage is unavailable (SSR/prerender)', async () => {
    // No localStorage global — module import + refresh must not throw.
    vi.mocked(fetch).mockResolvedValue(jsonResponse(fullBody()));
    const mod = await import('../googleDataService');
    const snap = await mod.refreshGooglePlaceData(PLACE_ID);
    expect(snap).not.toBeNull();
  });
});
