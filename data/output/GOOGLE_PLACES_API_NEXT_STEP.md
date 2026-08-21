# Google Places API (New) — Next Step Document

## Current State
The Google Places API (New) client is **already implemented and production-ready** in:
- `src/services/googlePlacesClient.ts` — Core client with field masks, error handling, normalization
- `src/services/googleDataService.ts` — Higher-level service for refreshing place data
- `src/domain/liveGoogle.ts` — Domain types for live Google data
- `src/hooks/useLiveGoogle.ts` / `useGoogleRefresh.ts` — React hooks for components

## Current Environment Variable Expected
The client expects **one** of these environment variables (with fallback):
```env
VITE_GOOGLE_PLACES_API_KEY=your_places_api_key_here
# OR fallback to existing Maps key:
VITE_GOOGLE_MAPS_API_KEY=your_maps_api_key_here
```

**Current .env status**: Neither is set. The client gracefully handles missing key via `GooglePlacesError('missing-key')`.

## Current Field Masks
### Summary Mask (rating, count, status, hours, etc.)
```typescript
const SUMMARY_MASK = [
  'places.id',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.currentOpeningHours',
  'places.regularOpeningHours',
  'places.priceLevel',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.googleMapsUri',
  'places.formattedAddress',
].join(',');
```

### Reviews Mask (up to 5 reviews per place)
```typescript
const REVIEWS_MASK = [
  'places.reviews.authorAttribution.displayName',
  'places.reviews.rating',
  'places.reviews.text',
  'places.reviews.originalText',
  'places.reviews.publishTime',
  'places.reviews.relativePublishTimeDescription',
].join(',');
```

**Note**: Place Details (New) returns max 5 reviews per request. Pagination not supported by API.

## Where Reviews Will Be Added
- **Service**: `googleDataService.ts` → `refreshReviewsForPlaceIds()` 
- **Hook**: `useLiveGoogle.ts` → `refreshReviews()`
- **Repository**: `reviewRepository.ts` → upserts normalized reviews
- **Hook**: `useReviews.ts` → consumes from repository

## Where Photos Will Be Added
- **Service**: `googleDataService.ts` → needs `fetchPlacePhotos()` implementation
- **Photo endpoint**: Place Photos (New) — separate API from Place Details
- **Photo service**: `imageService.ts` / `imageRepository.ts` already exist
- **Hook**: `useImages.ts` → consumes from repository

## What Remains to Implement After API Key Provided

### 1. Reviews (High Priority)
- [ ] Wire `googleDataService.refreshReviewsForPlaceIds()` to call `fetchPlaceDetails()` with `REVIEWS_MASK`
- [ ] Upsert normalized reviews to `reviewRepository`
- [ ] Update `useReviews` hook to consume from repository
- [ ] Handle pagination limitation (API returns max 5 reviews)

### 2. Photos (Medium Priority)
- [ ] Implement `fetchPlacePhotos(placeId)` in `googlePlacesClient.ts`
- [ ] Use Place Photos (New) endpoint: `https://places.googleapis.com/v1/places/{place_id}/photos`
- [ ] Download and store photo URLs via `imageService.ts` / `imageRepository.ts`
- [ ] Handle photo attribution (author, author_url)

### 3. Summary Refresh (Already Implemented)
- `googleDataService.refreshSummariesForPlaceIds()` → calls `fetchPlaceSummary()`

## Next Pilot (5 Restaurants)
After API key is provided, run this validation pilot:

### Targets (same 5 restaurants)
| Order | Restaurant | Place ID |
|-------|------------|----------|
| 1 | Seasonal Tastes | ChIJnZL9x7XHVTcRjmRUVqzzp2s |
| 2 | Almjlis Arabian Restaurant | ChIJNYCUDQDHVTcRbZ-EG2mgl3o |
| 3 | Gulshan banani | ChIJserEPgDHVTcRxjCuwNRSbc8 |
| 4 | The New Gulshan Plaza Restaurant | ChIJ7_UxHafHVTcRHWbnbvsqFfk |
| 5 | Chef's Table - Gulshan 2 | ChIJaUObm0LHVTcRKSVUsPI3CbE |

### Validation Checklist
- [ ] Summary refresh works (rating, count, status, hours)
- [ ] Reviews fetched (up to 5 per place)
- [ ] Individual star ratings captured per review
- [ ] Full review text captured (check `originalText` vs `text`)
- [ ] Review dates/timestamps captured
- [ ] Photo URLs returned and accessible
- [ ] Attribution URLs correct (Google Maps place link)
- [ ] Error handling for missing key, rate limits, not found
- [ ] No duplicate reviews/photos

## Exact Next Step
1. **Human provides API key**: Set `VITE_GOOGLE_PLACES_API_KEY` in `.env`
2. **Run validation script** (to be created) against 5 restaurants
3. **Verify output** matches expected structure
4. **If GREEN**: Scale to 206 restaurants

---

**Do NOT implement the API changes yet.** Wait for human to provide the API key and approve the validation pilot.

*Prepared: 2026-08-20*