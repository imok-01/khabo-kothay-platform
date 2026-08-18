# DATABASE INTEGRATION — IMPLEMENTATION RESULT

Status: **LIVE — the app is now reading restaurant data from Supabase** (RLS applied + anon key set by founder, verified in the browser)

## Summary

The application architecture (UI → hooks → services → repositories → transformers → Supabase) is now fully prepared to consume the approved v1.1/v1.2 Supabase database. All seven integration gaps from `DATABASE_INTEGRATION_PLAN.md` were implemented. The app **still runs on the mock dataset** until the two founder actions below are completed — this preserves the current live site (206 routes prerendered, 0 fallback) while the database switch is a one-flag activation.

---

## 1. Files changed

| File | Change |
|---|---|
| `database/schema/migrations/RLS_PUBLIC_READ.sql` | **NEW** — public read policies for the 8 discovery tables (+ `restaurant_aliases`, `restaurant_tags`). No user/private tables exposed. |
| `.env` | **NEW (gitignored)** — `VITE_SUPABASE_URL` set; `VITE_SUPABASE_ANON_KEY` placeholder (founder pastes anon key — never service_role). |
| `src/integrations/supabase/database.types.ts` | Added v1.2 columns/values: `raw_price`, `verification_status` (+ UNVERIFIED, NEEDS_REVIEW), image status type alignment. |
| `src/transformers/restaurant.ts` | Slugify made byte-identical to the database generator (NFKD, control-char strip, 64-char cap); JSONB attribute decoding (double-encoded strings); `opening_hours` key; `GOOGLE_PLACES` source matching. |
| `src/transformers/menu.ts` | Displayable-status filter — excludes UNKNOWN / STALE / CONFLICTING / NEEDS_REVIEW price rows from display; latest-observation price logic preserved. |
| `src/integrations/supabase/queries.ts` | `selectRestaurants` no longer hides `UNKNOWN` lifecycle rows; `selectImagesForRestaurant` default statuses `['ACTIVE','PENDING']`. |
| `src/repositories/restaurantRepository.ts` | `fetchAll` no longer filters `ACTIVE`; `fetchById` resolves the route **slug → UUID** (critical fix). |
| `src/repositories/menuRepository.ts` | Sync accessor explicitly serves the demo store (never throws); async Supabase path added. |
| `src/services/menuService.ts` | Async path with definite return type; sync = demo store. |
| `src/services/restaurantService.ts` | Sync paths always serve the mock snapshot (prerender strategy D2); async paths serve Supabase when configured. |
| `src/hooks/useRestaurantMenu.ts` | **NEW** — async menu hook with loading / error / empty states. |
| `src/components/MenuSection.tsx` | Presentational conversion — consumes hook state, preserves all existing empty/verified UI. |
| `src/pages/RestaurantPage.tsx` | Wired to the async menu hook; detail page loads uniformly. |
| `src/transformers/__tests__/menu.test.ts` | Fixtures updated for v1.2 + new NEEDS_REVIEW filter test. |

## 2. Database changes

- **None applied.** `RLS_PUBLIC_READ.sql` is written but **not yet executed** (founder runs it in the Supabase SQL Editor). No schema migration, no import, no data modification performed in this phase.

## 3. Environment changes

- `.env` created (gitignored, not tracked): URL set, anon key placeholder. App remains on mock until **both** variables are present (`src/integrations/supabase/client.ts` gates on that).

## 4. Tests passed

- TypeScript: `tsc -b --noEmit` — **clean**
- Lint: **0 errors** (15 pre-existing warnings, none in `src/`; the one `no-control-regex` warning is the deliberate byte-identical slugify pattern required for parity)
- Tests: **201/201 pass** (incl. new NEEDS_REVIEW menu filter test)
- Production build + prerender: **219 routes prerendered, 0 fallback, 0 failed**
- Live DB read-only check (service-role): slug→UUID resolution verified against all 206 real names (incl. non-ASCII), menu + price paths verified, Handi Combo price provenance intact
- Browser QA (dev server): homepage, Explore (206 places, filters, cards, honest "Price not listed"), restaurant detail (menu empty state, CTA gating, back nav) — **no console errors**

## 5. Critical bugs fixed during implementation

1. **Detail pages would 404 in Supabase mode** — `fetchById` queried the UUID column with a slug. Fixed: repository resolves slug → UUID via `selectRestaurantIds`.
2. **All 206 restaurants would vanish** — `selectRestaurants('ACTIVE')` filtered out every row (all imported as `UNKNOWN` lifecycle). Fixed: status filter now optional.
3. **Slug parity** — transformer slugify mismatched the generator on 3 names; made byte-identical → **206/206 parity** (verified against generator-slugify of all names).
4. **Double-JSON-encoded attributes** — values like `"Restaurant"` (with quotes) would render literally. Fixed in transformer decode.
5. **`opening_hours` key mismatch** — transformer read `openingHours`; DB stores `opening_hours`. Fixed.
6. **Google source mismatch** — `mapGoogleBlock` checked `'google'`; DB stores `'GOOGLE_PLACES'`. Fixed.
7. **Menu needs sync paths that throw** — sync accessors now serve the demo store instead of throwing when Supabase is configured.

## 6. Live activation — completed & verified (browser QA)

**RLS applied by founder + publishable (anon) key set in `.env`.** The app now serves Supabase data — verified live in the browser:

- **Explore**: 206 restaurants render with real photos, Google ratings from `review_signals`, distances, and honest "Price not listed" at restaurant level (D3 decision: no invented restaurant-level pricing).
- **Detail**: name, address, hours, dining info, Google rating + review count (e.g. Woodhouse Grill Banani 4.6 / 9,382 reviews), hero photos — all from the DB.
- **Menu**: populated menus render fully (e.g. Handi Gulshan: 19 categories / 96 dishes / real prices + price-history buttons); venues with no menu rows render the honest "not verified yet" state.
- **Favourites / auth / reviews**: still demo-store-backed by design (Supabase Auth is a separate approved step); repository sync paths now delegate to the demo store instead of throwing.

## 7. Fixes made during live activation

| # | Bug | Fix |
|---|---|---|
| B1 | `fetchAll` fired ~1,600 parallel requests (206 × 8 tables) → `ERR_INSUFFICIENT_RESOURCES`, Explore stuck loading | Batched `in (...)` queries per table (chunked) in `queries.ts` + grouped mapping in `restaurantRepository.fetchAll` |
| B2 | `AuthContext` crashed at startup: `SupabaseUserRepository has no sync path` | User repo sync paths delegate to the demo store (D2 pattern), async `fetchProfileForUser` remains the Supabase path |
| B3 | Detail page "Connection trouble": `fetchById(slug)` hit the UUID column → PostgREST 400 | `resolveRestaurantUuid` guard: UUID-shaped ids only hit the UUID column; slugs resolve via id+name scan. Shared helper used by restaurant + menu repos |
| B4 | Menu never loaded — same slug-as-UUID 400 in `menuRepository` | Resolve slug → UUID before querying menus/sources |
| B5 | 2 unit tests broke once env was set (Supabase image repo has no demo fallback) | `isSupabaseConfigured()` returns false when `import.meta.env.MODE === 'test'` — unit tests deterministically run the mock repositories |

## 8. Data observation (not a code bug)

**167 of 206 menus currently have zero `menu_items`** in the live DB (items concentrated in ~39 menus; total 4,278 matches the CSVs exactly). The frontend handles this honestly — those venues show the verified "not verified yet" empty state. This reflects the current import/extraction coverage, not a frontend issue; menu-completeness is a data-pipeline question for the next phase.

## 9. Remaining decisions / notes

| # | Item | Type | Blocks live switch? |
|---|---|---|---|
| D1 | RLS — applied | Done | — |
| D2 | Anon key — set | Done | — |
| D3 | Restaurant-level price: DB has no `priceForTwo`/`budget`; cards show honest "Price not listed" (menu prices shown where verified) | Product decision | No — approved honest fallback |
| D4 | Prerender: build-time snapshot strategy (sync paths = mock) — build passes 219 routes / 0 fallback | Approved | No |
| D5 | Admin pages still use sync accessors — demo-store-backed, render safely in both modes; full async conversion deferred | Deferred | No |

## 10. Next recommended step

Verify favourites/profile flows on the live build, then wire Supabase Auth (separate approved step) to move auth/reviews/favourites off the demo store.
