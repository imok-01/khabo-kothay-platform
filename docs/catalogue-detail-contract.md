# Catalogue vs Detail Data Contract

Purpose: a single, explicit boundary for what every surface of Khabo Kothay is
allowed to load, so discovery pages stay lightweight and heavy intelligence is
fetched only where it is needed. This is documentation of the *intended*
boundary; it does not change behaviour on its own.

## Principles

- Discovery must be cheap and fast. Catalogue payloads stay small.
- Heavy data is loaded on demand, on the detail page only.
- No menu items, per-item prices, price observations, or review text in any
  listing/card/search payload.
- External enrichment (Google) is a summary signal, never a source of truth.

## Allowed in catalogue / search / cards / map popups

- Identity: `id`, `name`, `tagline`, `cuisines`, `location`, `address`, lat/lng
- Lightweight metadata: `budget` tier, scalar `priceForTwo`
- Summary signals: `google.rating` + `google.reviewCount` (directional only),
  `khabo.reviewCount` (when present), one cover photo (`google.photos[0]`)
- Status: `isOpenNow` (derived from `openingHours`)
- Lightweight intelligence: `intelligence.diningFeatures` and a small set of
  `intelligence.specialties` (catalogue-grade only)
- Discovery attributes: `hasDelivery`, `isFamilyFriendly`, `hasOutdoorSeating`

## Detail page only (deferred fetch)

- Full `Menu` + `MenuItem` + per-item prices (`useRestaurantMenu`)
- `price_observations` / price history (`menuEstimate` summary may show, the
  observation list must not)
- Full review text — both `google.reviews` and `khabo.reviews`
- Photo gallery (beyond the single cover)

## Enforcement (Phase 4.2B)

The boundary is enforced at the repository seam (`restaurantRepository`):

- `fetchAll` (catalogue) does **not** load `userReviews`. KK community review
  *text* is stripped by `toCatalogueView` before any catalogue / search / card
  surface receives the object. Summary `reviewCount` (from `review_signals`) is
  preserved — only the review bodies are removed.
- `fetchBundle` / `fetchById` (detail) still load `userReviews`, so the
  restaurant detail page continues to render full reviews unchanged.
- `google.reviews` was always empty in the mapping (`mapGoogleBlock` returns
  `reviews: []`); the Google review *count* remains a summary signal that links
  out to Google Maps.

This keeps catalogue payloads free of review text with zero new Supabase calls
on discovery pages.
- Verification details (`verification_records`, per-field status)
- Offer list
- Dish-level intelligence and price charts

## Future indexed (not stored on the entity)

- Tokenised cuisine / vibe / specialty / dish names — belong in a search index
  (Layer E), built from the catalogue + menu, never loaded per card.
- Geo grid for proximity search.

## Enforcement notes

- The repository seam (`restaurantRepository`) already excludes `menu_items`
  and `price_observations` from `fetchAll` and loads them via `menuService`
  on detail. Keep it that way.
- **Phase 4.3B (final verification):** the menu foundation is version-aware
  (PUBLISHED → ACTIVE → first fallback) and reads `available` / `featured` /
  `is_signature` / `image_url` from `menu_items` rows, with safe defaults for
  legacy rows. Catalogue egress (no `menu_items` / `price_observations` in
  `fetchAll`) is protected by a regression test at
  `src/repositories/__tests__/menuEgress.test.ts`; demo/prod menu isolation is
  guarded by `src/data/__tests__/menuIsolation.test.ts`.
- `khabo.reviews` text currently rides in `fetchAll` — move to a detail-only
  fetch in a future P1 change (see Phase 4.0 findings).
- Never add `restaurant.menu` (`MenuInfo`) population; it is deprecated in
  favour of the live `Menu` type served by `menuService`.
