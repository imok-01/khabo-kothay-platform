# IMAGE GOOGLE PLACES PHOTO PILOT REPORT

**Date:** 2026-08-20
**Status:** ⛔ BLOCKED — No Google Places API key configured
**Classification:** CREDENTIAL REQUIRED — Cannot proceed with API testing

---

## 1. EXECUTIVE SUMMARY

The Google Places Photo Micro-Pilot **cannot proceed** because no Google Places API key is configured in the project environment.

The project already has a complete Places API (New) client (`src/services/googlePlacesClient.ts`) that is architected to support photo retrieval, but photos are deliberately excluded from the current field masks (noted as "out of scope"). The missing piece is a valid API key.

---

## 2. CURRENT ENVIRONMENT STATE

### What Exists

| Component | Status | Location |
|-----------|--------|----------|
| Google Places API client | ✅ Ready | `src/services/googlePlacesClient.ts` |
| Place Details (New) integration | ✅ Implemented | Same file — `fetchPlaceSummary()`, `fetchPlaceDetails()` |
| Field mask architecture | ✅ Exists | `SUMMARY_MASK`, `REVIEWS_MASK` — photos deliberately excluded |
| API key configuration | ❌ Missing | `.env` has no `VITE_GOOGLE_PLACES_API_KEY` or `VITE_GOOGLE_MAPS_API_KEY` |
| Photo field mask | ❌ Not implemented | Would need `places.photos` added to field mask |
| Photo retrieval endpoint | ❌ Not implemented | Would use Places Photos (New) API |

### What's Missing

```
VITE_GOOGLE_PLACES_API_KEY=          # Empty in .env.example
VITE_GOOGLE_MAPS_API_KEY=            # Empty in .env.example
```

Neither key is present in the actual `.env` file.

---

## 3. WHAT'S REQUIRED TO PROCEED

### Minimum Credential Requirements

1. **Google Cloud Project** with:
   - Places API (New) enabled
   - Billing account attached
   - Quota allocated

2. **API Key** with:
   - Application restriction: HTTP referrers (for browser use) or IP addresses (for server-side pilot)
   - API restriction: Places API (New) + Maps JavaScript API (if Explore map also needs it)

3. **Environment configuration**:
   ```
   VITE_GOOGLE_PLACES_API_KEY=AIza...your_key_here
   ```

### Recommended Key Setup for Pilot

For a server-side pilot script (Node.js), use an **IP-restricted** key:
- Restrict to your development machine's IP
- Enable only "Places API (New)"
- This is more secure than a browser key for automated testing

---

## 4. ARCHITECTURE READINESS ASSESSMENT

### The existing `googlePlacesClient.ts` is well-positioned for photo integration:

**Current field masks** (photos deliberately excluded):
```typescript
const SUMMARY_MASK = [
  'places.id',
  'places.rating',
  // ... other fields
].join(',');
```

**Required addition for photos:**
```typescript
const PHOTO_MASK = [
  'places.photos.name',
  'places.photos.widthPx',
  'places.photos.heightPx',
  'places.photos.authorAttributions',
  'places.photos.googleMapsUri',
].join(',');
```

**Photo retrieval would use:**
```
GET https://places.googleapis.com/v1/{photoResourceName}/media
  ?maxWidthPx=800
  &skipHttpRedirect=true
```

### Key architectural consideration:

Google Places photos are **not permanent URLs**. The `photoResourceName` is stable, but the actual image URL must be fetched dynamically via the Photos (New) endpoint. This means:

- KK cannot store a permanent image URL from Google Places
- KK must either:
  - (a) Fetch photo URLs dynamically at page load (requires API key in frontend)
  - (b) Fetch and cache photos server-side (requires backend proxy)
  - (c) Download and re-host photos (requires compliance with Google's Terms of Service)

---

## 5. GOOGLE PLACES PHOTO POLICY INVESTIGATION

### What the API Provides

| Field | Description |
|-------|-------------|
| `photos[].name` | Stable resource name (e.g., `places/ChIJ.../photos/AIza...`) |
| `photos[].widthPx` | Original width in pixels |
| `photos[].heightPx` | Original height in pixels |
| `photos[].authorAttributions[]` | Author name, photo URI, attribution URI |
| `photos[].googleMapsUri` | Link to the photo on Google Maps |

### Photo Retrieval

```
GET https://places.googleapis.com/v1/{name}/media
  ?maxWidthPx=1600
  &skipHttpRedirect=true
```

Returns a JSON response with:
- `photoUri` — temporary URL to the image (expires)
- `mimeType` — typically `image/jpeg`

### Policy Considerations (Must Verify with Google ToS)

| Question | Likely Answer | Action Required |
|----------|---------------|-----------------|
| Can KK permanently store photo URLs? | ❌ No — URLs expire | Must re-fetch or cache |
| Can KK download and re-host images? | ⚠️ Depends on ToS | Must verify Google Maps/Places ToS |
| Does KK need to show author attribution? | ✅ Yes — when displaying photos | Must show author name + link |
| Does KK need to link to Google Maps? | ✅ Yes — attribution requirement | Must include Maps link |
| Can KK use photos commercially? | ⚠️ Depends on ToS | Must verify licensing terms |
| Do photo resource names expire? | ✅ Resource names are stable | Safe to store |
| Do photo URIs expire? | ✅ Yes — temporary | Must re-fetch |

### Critical Compliance Questions (Require Legal/ToS Review)

1. **Can a restaurant listing app permanently download and host Google-contributed photos?**
2. **Does displaying Google Places photos require a "Powered by Google" badge?**
3. **Are there usage limits on photo retrieval calls?**
4. **Can photos be modified (cropped, resized) before display?**
5. **What happens when a photo is removed from Google Maps?**

---

## 6. WHAT THE PILOT WOULD TEST (IF KEY WERE AVAILABLE)

### Pilot Design (5 restaurants)

For each restaurant:
1. Call Place Details (New) with `places.photos` in field mask
2. Verify place identity matches KK restaurant
3. Count available photos
4. Retrieve top 3 photos via Photos (New) endpoint
5. Verify each photo is retrievable
6. Record author attributions
7. Record photo metadata (dimensions, source)
8. Test photo URL expiry behavior

### Expected API Costs

| Operation | Cost |
|-----------|------|
| Place Details (New) | $0.017 per request |
| Place Photos (New) | $0.007 per photo request |
| 5 restaurants × 1 detail + 3 photos | ~$0.19 total |
| 206 restaurants (if scaled) | ~$8.06 total |

**Very affordable** — cost is not a barrier.

---

## 7. RECOMMENDATION

### Current Status: ⛔ BLOCKED

**Cannot proceed without a Google Places API key.**

### Required Action

1. **Create a Google Cloud Project** (if not already done)
2. **Enable Places API (New)**
3. **Attach a billing account**
4. **Create an API key** with appropriate restrictions
5. **Add key to `.env`**:
   ```
   VITE_GOOGLE_PLACES_API_KEY=AIza...your_key
   ```
6. **Re-run this pilot**

### Alternative if No Key Available

If a Google API key cannot be obtained at this time, the recommended fallback is:

1. **Install Playwright/Puppeteer** in the development environment
2. **Use Restaurant Guru** (when rate limits reset) with browser rendering
3. **Manual collection** for priority restaurants

---

## 8. FILES CREATED/INSPECTED

| File | Status |
|------|--------|
| `src/services/googlePlacesClient.ts` | ✅ Inspected — ready for photo integration |
| `.env` | ⚠️ Missing Google API key |
| `.env.example` | ⚠️ Empty placeholders for Google keys |
| `IMAGE_GOOGLE_PLACES_PILOT_REPORT.md` | ✅ Created |

---

## 9. NO PRODUCTION MODIFICATIONS

**No KK application, database, or frontend files were modified.** This is a research/planning report only.
