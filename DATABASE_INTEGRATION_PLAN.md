# KHABO KOTHAY — APPLICATION DATABASE INTEGRATION PLAN

**Branch:** `chore/repository-restructure` · **Date:** 2026-08-18
**Phase 1 — ANALYSIS ONLY.** No code changes made. Approval required before implementation.

---

## 1. CURRENT STATE

**Database (live, verified):** 206 restaurants · 206 sources · 751 attributes · 206 menus · 4,278 menu_items · 4,278 price_observations · 206 image_references · 206 review_signals. Schema v1.2 applied (enum 8 values; `price_observations` has `raw_price` + `verification_status`).

**Frontend (Vite + React 19 + TS + React Router 7 + leaflet):** fully layered after the earlier cleanup:

```
UI (pages/components)
  → hooks/contexts
  → services
  → repositories (seam: isSupabaseConfigured() ? Supabase : mock)
  → transformers
  → source (mock data today · Supabase target)
```

- **Already built (the architecture was designed for this swap):**
  - `src/integrations/supabase/client.ts` — lazy typed client, gated on `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (dynamic import; mock path unaffected when unset).
  - `src/integrations/supabase/database.types.ts` — full typed schema (19 tables; matches live DB — verified in the import-readiness phase).
  - `src/integrations/supabase/queries.ts` — 20+ typed row-level queries (restaurants, sources, aliases, attributes, tags, menus, items, prices, images, signals, verification, reviews, profiles, roles, favorites, saved).
  - `src/repositories/restaurantRepository.ts`, `menuRepository.ts`, `imageRepository.ts` — **dual implementations** (mock + Supabase) with active-source selection.
  - `src/transformers/` — `restaurant.ts`, `menu.ts`, `image.ts`, `review.ts`, `user.ts` map DB rows → domain objects.
  - `.env.example` already documents `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

**Current active source:** the **mock** path (`src/data/restaurants.ts` — 206 venues auto-generated from the same identity XLSX; menus from `src/data/menus.ts` + demoDb overrides; images from `src/data/images.ts` + Google blocks). Supabase is NOT configured in any env today, so nothing queries the live DB.

## 2. WHAT CONNECTS ALREADY (no work needed)

| Layer | Status |
|---|---|
| Supabase client + typed schema + query layer | ✅ complete |
| Restaurant repository (Supabase impl): fetchAll / fetchById + bundle composition | ✅ complete |
| Menu repository (Supabase impl): `fetchMenuForRestaurant` (async) | ✅ complete |
| Image repository (Supabase impl): `fetchSourcesForRestaurant` | ✅ complete |
| Transformers: `mapRestaurantRows`, `mapMenuRows`, `mapImageReferenceRows` | ✅ exist (fixes needed — see §4) |
| Existing tests / typecheck / lint / build | ✅ green on mock path |

## 3. WHAT NEEDS MIGRATION

| # | Gap | Detail | Blocking? |
|---|---|---|---|
| G1 | **RLS policies** | Supabase default denies all reads to the anon key. The public tables (`restaurants`, `restaurant_sources`, `restaurant_attributes`, `menus`, `menu_items`, `price_observations`, `image_references`, `review_signals`) need **public read** policies before the frontend can read anything. | **YES** |
| G2 | **Env configuration** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` must be set (local `.env` + Vercel env vars). Anon key (public) + RLS — never the service-role key. | **YES** |
| G3 | **Sync-path consumers break** | With Supabase active, `menuRepository.getEffectiveMenu` and `restaurantRepository.allSync/byIdSync` **throw**. Consumers: `RestaurantPage`, `MenuSection`, `ExecutiveAdminPage`, `RestaurantAdminPage` (all call `getEffectiveMenu`; admin pages also use sync catalogue). Must re-point to the async paths (`fetchMenuForRestaurant`, `fetchAll`/`fetchById`) with loading + empty states. | **YES** |
| G4 | **Prerender snapshot** | `scripts/prerender.mjs` + `src/lib/prerender.ts` use the **sync** paths at build time. Supabase repo has no sync path (documented risk). Build with Supabase configured needs a static snapshot source (mock dataset — same 206 venues, same ids by construction) or a generated snapshot JSON. | **YES** (build) |
| G5 | **ID parity (slugify)** | Mock ids = generator `slugify(name)` (NFKD normalize + strip non-ASCII + `slice(0,64)`, dedupe with placeId suffix). Transformer `resolveSlug` uses a **different slugify** (no NFKD/non-ASCII strip, no length cap) and falls back to `slugify(name)` because the DB stores **no `slug` attribute** and `restaurant_aliases` is empty. Non-ASCII names (e.g. curly-apostrophe “Khalifa’s”, “Café”) and 64+ char names would produce **different route ids** → broken links + favorites drift. | **YES** |
| G6 | **Price display contract** | Transformer reads `priceForTwo` / `budget` attributes — the DB stores only `price_range` (string) + per-item `price_observations`. Supabase path would show “Not listed” for all + default budget. Menu items DO have verified prices (`UNVERIFIED` 4,245 / `NEEDS_REVIEW` 33). Safe mapping required (see §6, decision D1). | **MEDIUM** |
| G7 | **Image status mismatch** | Imported `image_references.status = 'PENDING'`; `selectImagesForRestaurant` defaults to `status='ACTIVE'` → **zero images** would render. Reconcile (query without status filter for Google, or pipeline status change). | **YES** |
| G8 | **Auth-dependent features** | Favorites / saved / user reviews run on demoAuth + localStorage (`store/demoDb`), not the Supabase tables. Future auth swap — placeholders only; not part of this phase (per scope). | no (future) |

## 4. FILES AFFECTED (implementation phase)

| File | Change |
|---|---|
| `database/schema/…/RLS_PUBLIC_READ.sql` (new) | RLS policies for public read (approved separately) |
| `.env` (local, gitignored) + Vercel env vars | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `src/transformers/restaurant.ts` | slugify parity with the generator (G5); price mapping (G6); image status handling (G7) |
| `src/transformers/menu.ts` | ensure `NEEDS_REVIEW` prices excluded from display; verified prices shown |
| `src/pages/RestaurantPage.tsx`, `src/components/MenuSection.tsx`, `src/pages/ExecutiveAdminPage.tsx`, `src/pages/RestaurantAdminPage.tsx` | re-point sync menu/catalogue to async paths (G3) |
| `src/services/menuService.ts` (+ hooks) | expose/consume `fetchMenuForRestaurant` in the UI path |
| `scripts/prerender.mjs`, `src/lib/prerender.ts` | static snapshot source when Supabase is configured (G4) |
| `src/hooks/` | async data hooks for restaurant + menu loading states |
| Docs | this plan + integration result report |

**Not touched:** recommendation engine logic, auth architecture, favorites logic, restaurant data, database schema, menu extraction.

## 5. RISKS

| Risk | Severity | Mitigation |
|---|---|---|
| Prerender/hydration mismatch (build on snapshot, runtime on DB) | HIGH | Snapshot = same 206 venues/ids by construction; async loading states; verify routes on live data |
| ID drift (slugify mismatch) breaking links/favorites | HIGH | Fix slugify parity before enabling Supabase (G5) |
| Empty images (PENDING vs ACTIVE) | HIGH | Fix query/status handling (G7) |
| Price semantics (priceForTwo/budget not in DB) | MEDIUM | Conservative display per prior decisions (D1) — no invented cost-for-two |
| RLS misconfiguration (0 rows or 401) | HIGH | Public-read RLS as a gated step before env enablement |
| Multiple menus / partial menus / NULL title | LOW | Queries already return arrays; empty-menu state exists |
| NEEDS_REVIEW prices shown as verified | MEDIUM | Transformer filters `verification_status = 'UNVERIFIED'` only |

## 6. DECISIONS REQUIRED (founder)

- **D1 — Restaurant-level price display with DB data:** DB has no `priceForTwo`/`budget`; only `price_range` strings + per-item prices. Safe default (consistent with prior decisions): restaurant-level stays **“Not listed”** until a real aggregate rule exists; menu items show **verified prices only** (`raw_price` provenance, `UNVERIFIED`). Alternative (requires data approval): add parsed `price_range`-derived budget attribute to the pipeline.
- **D2 — Prerender snapshot source:** keep the mock dataset as the build-time snapshot (same 206 venues) **vs** generate a static JSON snapshot from the live DB at build time. Recommend: keep mock snapshot for v1 (identical ids/content by construction), revisit at the SSR/SEO phase.
- **D3 — Image statuses:** change the pipeline to emit `ACTIVE` for Google photos (data change) **vs** relax the frontend query to include `PENDING` for Google-sourced images. Recommend: relax the query (no data change, honors provenance).

## 7. MIGRATION ORDER (after approval)

1. **RLS public-read policies** (SQL, approved + applied) → anon reads work.
2. **Env setup** (local `.env` + Vercel) → `isSupabaseConfigured()` becomes true.
3. **Transformer fixes** (G5 slugify parity, G6 price mapping per D1, G7 image handling per D3) — unit tests.
4. **Re-point sync consumers** (G3) — 4 files → async hooks with loading/empty states.
5. **Prerender snapshot** (G4, per D2) — build stays green with Supabase configured.
6. **Verification battery:** tsc · lint · tests · build+prerender · live preview against the live DB (routes, price “Not listed” + verified menu prices, meal types empty, images, favourites still mock) · responsive spot-check.
7. **Report** — `DATABASE_INTEGRATION_RESULT.md`.

**Stop — awaiting founder approval of this plan (and decisions D1–D3) before implementation.**
