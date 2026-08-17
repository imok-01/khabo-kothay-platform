import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGoogleRefreshMeta,
  getGoogleSnapshot,
  isFresh,
  refreshGoogleBulk,
  refreshGooglePlaceData,
  resetGoogleRefreshStoreForTests,
} from '../googleDataService';
import { GooglePlacesError, normalizePlaceDetails } from '../googlePlacesClient';

const PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function fullBody(): Record<string, unknown> {
  return {
    id: PLACE_ID,
    rating: 4.6,
    userRatingCount: 1847,
    businessStatus: 'OPERATIONAL',
    currentOpeningHours: {
      openNow: true,
      weekdayDescriptions: ['Monday: 12:00–22:00', 'Tuesday: 12:00–22:00'],
      periods: [{ open: { day: 1, hour: 12, minute: 0 }, close: { day: 1, hour: 22, minute: 0 } }],
    },
    regularOpeningHours: { weekdayDescriptions: ['Monday: 12:00–22:00'] },
    priceLevel: 2,
    websiteUri: 'https://example.com/restaurant',
    nationalPhoneNumber: '+880 2 555 1234',
    googleMapsUri: `https://maps.google.com/?cid=123`,
    formattedAddress: 'Road 11, Banani, Dhaka 1213',
    reviews: [
      {
        authorAttribution: { displayName: 'Rahim Ahmed' },
        rating: 5,
        text: { text: 'Great kacchi!', languageCode: 'en' },
        originalText: { text: 'Great kacchi!', languageCode: 'en' },
        publishTime: '2026-07-01T10:00:00Z',
        relativePublishTimeDescription: '6 weeks ago',
      },
    ],
  };
}

beforeEach(() => {
  resetGoogleRefreshStoreForTests();
  vi.stubGlobal('fetch', vi.fn());
  // Most tests exercise the live path — configure a (fake) browser key.
  vi.stubEnv('VITE_GOOGLE_PLACES_API_KEY', 'test-place-key');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('refreshGooglePlaceData — success paths', () => {
  it('fetches and normalizes a full Place Details response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(fullBody()));

    const snap = await refreshGooglePlaceData(PLACE_ID);

    expect(snap).not.toBeNull();
    expect(snap!.rating).toBe(4.6);
    expect(snap!.userRatingCount).toBe(1847);
    expect(snap!.businessStatus).toBe('OPERATIONAL');
    expect(snap!.currentHours?.openNow).toBe(true);
    expect(snap!.price?.priceLevel).toBe(2);
    expect(snap!.websiteUri).toBe('https://example.com/restaurant');
    expect(snap!.phone).toBe('+880 2 555 1234');
    expect(snap!.reviews).toHaveLength(1);
    expect(snap!.reviews[0].author).toBe('Rahim Ahmed');
    expect(snap!.reviews[0].sourceUrl).toContain('maps.google.com');
    expect(getGoogleRefreshMeta(PLACE_ID).status).toBe('updated');
    expect(getGoogleSnapshot(PLACE_ID)).toBe(snap);
  });

  it('uses the explicit field mask (no wildcard) in the request headers', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(jsonResponse(fullBody()));
    await refreshGooglePlaceData(PLACE_ID);
    const [, init] = fetchMock.mock.calls[0];
    const mask = (init as RequestInit).headers as Record<string, string>;
    expect(mask['X-Goog-FieldMask']).toBeDefined();
    expect(mask['X-Goog-FieldMask']).not.toContain('*');
    expect(mask['X-Goog-FieldMask']).toContain('places.rating');
    // Photos are deliberately never requested.
    expect(mask['X-Goog-FieldMask']).not.toContain('photos');
  });

  it('handles missing fields gracefully — they stay undefined', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: PLACE_ID, rating: 4.1 }));
    const snap = await refreshGooglePlaceData(PLACE_ID);
    expect(snap!.rating).toBe(4.1);
    expect(snap!.userRatingCount).toBeUndefined();
    expect(snap!.reviews).toEqual([]);
    expect(snap!.price).toBeUndefined();
    expect(getGoogleRefreshMeta(PLACE_ID).status).toBe('updated');
  });
});

describe('refreshGooglePlaceData — freshness policy', () => {
  it('serves a fresh snapshot from memory without a second network call', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(jsonResponse(fullBody()));
    const first = await refreshGooglePlaceData(PLACE_ID);
    expect(first).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await refreshGooglePlaceData(PLACE_ID);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no re-fetch within the freshness window
  });

  it('refetches when the snapshot is stale (force)', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(jsonResponse(fullBody()));
    await refreshGooglePlaceData(PLACE_ID);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await refreshGooglePlaceData(PLACE_ID, { force: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('isFresh reflects the 24h window', () => {
    const now = Date.now();
    expect(isFresh(undefined)).toBe(false);
    expect(isFresh({ placeId: PLACE_ID, reviews: [], fetchedAt: new Date(now - 23 * 3600_000).toISOString() })).toBe(true);
    expect(isFresh({ placeId: PLACE_ID, reviews: [], fetchedAt: new Date(now - 25 * 3600_000).toISOString() })).toBe(false);
  });
});

describe('refreshGooglePlaceData — error handling', () => {
  it('invalid place ID → failed status, snapshot stays absent, no throw', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { code: 404, status: 'NOT_FOUND', message: 'Place not found' } }, 404),
    );
    const snap = await refreshGooglePlaceData('INVALID_ID');
    expect(snap).toBeNull();
    expect(getGoogleRefreshMeta('INVALID_ID').status).toBe('failed');
    expect(getGoogleSnapshot('INVALID_ID')).toBeUndefined();
  });

  it('permission denied → failed, no throw', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { code: 403, status: 'PERMISSION_DENIED', message: 'nope' } }, 403),
    );
    expect(await refreshGooglePlaceData(PLACE_ID)).toBeNull();
    expect(getGoogleRefreshMeta(PLACE_ID).status).toBe('failed');
    expect(getGoogleRefreshMeta(PLACE_ID).lastError).toContain('nope');
  });

  it('rate limit (429) → failed with a rate-limit code, no throw', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'quota' } }, 429));
    const snap = await refreshGooglePlaceData(PLACE_ID);
    expect(snap).toBeNull();
    expect(getGoogleRefreshMeta(PLACE_ID).status).toBe('failed');
  });

  it('network failure → failed, no throw', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await refreshGooglePlaceData(PLACE_ID)).toBeNull();
    expect(getGoogleRefreshMeta(PLACE_ID).status).toBe('failed');
    expect(getGoogleRefreshMeta(PLACE_ID).lastError).toContain('Network error');
  });

  it('non-JSON response → failed, no throw', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('<html>oops</html>', { status: 500 }));
    expect(await refreshGooglePlaceData(PLACE_ID)).toBeNull();
    expect(getGoogleRefreshMeta(PLACE_ID).status).toBe('failed');
  });

  it('missing API key → unavailable, and no network call is made', async () => {
    vi.stubEnv('VITE_GOOGLE_PLACES_API_KEY', '');
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    const fetchMock = vi.mocked(fetch);
    const snap = await refreshGooglePlaceData(PLACE_ID);
    expect(snap).toBeNull();
    expect(getGoogleRefreshMeta(PLACE_ID).status).toBe('unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('refreshGoogleBulk', () => {
  it('refreshes a set of place IDs (summary path) and reports the count', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(jsonResponse(fullBody())));
    const done = await refreshGoogleBulk(['id-a', 'id-b', 'id-c']);
    expect(done).toBe(3);
    expect(getGoogleSnapshot('id-a')).toBeDefined();
    expect(getGoogleSnapshot('id-b')).toBeDefined();
    expect(getGoogleSnapshot('id-c')).toBeDefined();
  });

  it('counts only successful refreshes when some fail', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('id-bad')) {
        return jsonResponse({ error: { code: 404, status: 'NOT_FOUND', message: 'gone' } }, 404);
      }
      return jsonResponse(fullBody());
    });
    const done = await refreshGoogleBulk(['id-ok', 'id-bad']);
    expect(done).toBe(1);
    expect(getGoogleRefreshMeta('id-bad').status).toBe('failed');
  });
});

describe('normalizePlaceDetails', () => {
  it('wires review attribution and maps source link', () => {
    const snap = normalizePlaceDetails(fullBody(), PLACE_ID);
    expect(snap.reviews[0].translated).toBe(false);
    expect(snap.reviews[0].sourceUrl).toContain('maps.google.com');
    expect(snap.reviews[0].sourceUrl).toContain('cid=123');
  });

  it('marks translated review text', () => {
    const body = fullBody();
    body.reviews = [
      {
        authorAttribution: { displayName: 'Rahim Ahmed' },
        rating: 5,
        text: { text: 'English', languageCode: 'en' },
        originalText: { text: 'অন্য ভাষা', languageCode: 'bn' },
        publishTime: '2026-07-01T10:00:00Z',
        relativePublishTimeDescription: '6 weeks ago',
      },
    ];
    const snap = normalizePlaceDetails(body as never, PLACE_ID);
    expect(snap.reviews[0].translated).toBe(true);
    expect(snap.reviews[0].language).toBe('bn');
    expect(snap.reviews[0].originalText).toBe('অন্য ভাষা');
  });
});

describe('GooglePlacesError', () => {
  it('carries a typed code and HTTP status', () => {
    const err = new GooglePlacesError('rate-limited', 'too many requests', 429);
    expect(err.code).toBe('rate-limited');
    expect(err.httpStatus).toBe(429);
    expect(err.name).toBe('GooglePlacesError');
  });
});
