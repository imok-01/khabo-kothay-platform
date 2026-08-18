# KHABO KOTHAY — ARCHITECTURE MIGRATION EXECUTION PLAN (APPROVED WITH CONDITIONS)

**Status:** APPROVED WITH CONDITIONS — plan only. No implementation until founder signs off on this document.
**Baseline:** `development` @ `e47e7d3`, clean tree.
**Conditions honored:** no file moves, no deletions, no folder renames, no database logic changes, no Supabase schema changes. Business logic, product behavior, and working systems are preserved. Migration is wrapper-first: current code → adapter/hook layer → components re-pointed gradually → validation → obsolete direct connections removed later.

---

## 1. APPROVED LAYERING STANDARD (four layers)

```
PRESENTATION LAYER   pages/ · components/ · design system (index/phase3/editorial.css) ·
                     visual states · presentation helpers (usePageTitle)
        ↓ imports only
APPLICATION LAYER    hooks/ · context/ · user workflows · state coordination
        ↓ imports only
DOMAIN LAYER         domain/ · business entities · types · business rules ·
                     recommendation logic · pure logic helpers (lib/ pure functions)
        ↓ imports only
INFRASTRUCTURE LAYER services/ · repositories/ · transformers/ · integrations/supabase/ ·
                     data/ (datasets) · store/ (localStorage demo DB) · external providers ·
                     lib/api · lib/demoAuth · lib/maps · map providers
```

**Rules:**
1. UI (Presentation) never imports Infrastructure directly — no `store/`, `data/`, `repositories/`, `integrations/`, `services/` from `components/` or `pages/`.
2. Standard access path: **UI → hooks/contexts (Application) → services/repositories (Infrastructure)**. Components consume hook APIs; data developers change infrastructure without touching UI.
3. Domain may import Infrastructure (it owns pure rules, not storage) — currently `lib/` pure helpers are the domain-adjacent utility seam.
4. No upward imports anywhere (verified: already true today).
5. Provider seams (`ImageProvider`, `OfferProvider`, `PlaceProvider`) are the sanctioned read-only boundaries — they sit behind hook adapters per rule 1.
6. Business rules live in Domain, never in JSX/CSS.

**The established adapter pattern (already proven in this codebase):**
`hooks/useUsers.ts` is a thin re-export: `export { useUsers } from '../store/demoDb'` with a doc comment stating the swap contract. Every new adapter follows this exact pattern.

---

## 2. CURRENT-STATE LEAK INVENTORY (verified 2026-08-18)

### Components (8 files) — presentation → infrastructure
| File | Direct import | Used symbol(s) |
|---|---|---|
| `components/WriteReview.tsx` | `store/demoDb` | `uid` |
| | `services/reviewService` | review CRUD ops |
| `components/RewardsWallet.tsx` | `store/demoDb` | `useRewards`, `tokenBalance` |
| | `data/rewards` | `REWARD_CATALOGUE` |
| `components/Navbar.tsx` | `data/restaurants` | `restaurants` (raw lookup) |
| `components/RestaurantCard.tsx` | `repositories/OfferProvider` | `getOffersForRestaurant` |
| `components/RestaurantImage.tsx` | `repositories/ImageProvider` | `imageProvider` |
| `components/DiscoveryBuilder.tsx` | `services/taxonomyService` | `CUISINES`, `NEIGHBORHOODS` |
| `components/CompareTray.tsx` | `services/restaurantService` | `getAllSync` |
| `components/GoogleRefreshButton.tsx` | `services/googleDataService` | `getGoogleRefreshMeta`, `refreshGoogleSummary`, `subscribeGoogleRefresh` |

### Pages (6 files) — page → infrastructure
| File | Direct import | Notes |
|---|---|---|
| `pages/ExecutiveAdminPage.tsx` | `data/restaurants`, `store/demoDb`, `data/demoAccounts` | heaviest page-level access |
| `pages/RestaurantAdminPage.tsx` | `data/restaurants`, `store/demoDb` | |
| `pages/HomePage.tsx` | `data/collections` | static seed |
| `pages/LoginPage.tsx` | `data/demoAccounts` | static seed |
| `pages/ProfilePage.tsx` | `store/demoDb` | |
| `pages/RestaurantPage.tsx` | `store/demoDb` | |

### Already clean (do NOT touch)
- No upward imports anywhere.
- `hooks/useUsers.ts`, `hooks/useRestaurants.ts`, `hooks/useLiveGoogle.ts`, `hooks/useGeolocation.ts` already follow the adapter pattern.
- `GoogleRefreshButton`'s only other import is `domain/liveGoogle` (type — allowed).

---

## 3. EXACT MIGRATION SEQUENCE

Each step is its own small commit on `chore/layer-cleanup` (branched from `development`). After every step: TypeScript + lint + tests green. No step deletes or moves anything; every step is individually revertible.

| Step | Action | Files touched | Gate |
|---|---|---|---|
| 0 | Branch `chore/layer-cleanup` from `development` | — | clean baseline |
| 1 | Extract `uid` into `lib/uid.ts`; `store/demoDb.ts` re-imports from it (public API unchanged) | +`lib/uid.ts`, ~`store/demoDb.ts` | tsc + lint + tests |
| 2 | Add all adapter hooks (additive, zero consumers) — see §4 | +13 files in `hooks/` | tsc + lint + tests |
| 3 | Re-point the 8 component leaks (grouped: 1 commit per hook group) | 8 components | gate after each group |
| 4 | Re-point the 6 page leaks (1 commit per page) | 6 pages | gate after each page |
| 5 | Grep verification: zero `components/` or `pages/` imports of `store/`, `data/`, `repositories/`, `integrations/`, `services/` | — | grep clean |
| 6 | Full battery: build + prerender, live preview (home, explore, restaurant detail, favorites, saved, login, profile, manage, admin, partners), console clean, no overflow, responsive spot check 320–1280 | — | all green |
| 7 | PR review → merge to `development` | — | history intact |
| 8 | **DEFERRED (separate approval):** physical reorg into `apps/web` + four-layer folders + removal of now-obsolete direct connections | later | later |

---

## 4. FILE-BY-FILE CHANGE PLAN

### Step 1 — pure utility
- **New `lib/uid.ts`:** `export function uid(): string` (body moved verbatim from `demoDb`). `demoDb` imports it back so every existing consumer is untouched.

### Step 2 — adapter hooks (all thin, pattern of `useUsers.ts`)
| New file | Re-exports (source) | Adapter for |
|---|---|---|
| `hooks/useSession.ts` | `useSession` (`store/demoDb`) | auth session snapshots |
| `hooks/useRewards.ts` | `useRewards`, `tokenBalance` (`store/demoDb`); `REWARD_CATALOGUE` (`data/rewards`) | RewardsWallet, ProfilePage |
| `hooks/useReviews.ts` | `useUserReviews` (`store/demoDb`); review CRUD (`services/reviewService`) | WriteReview, RestaurantPage, ExecutiveAdminPage |
| `hooks/useDrafts.ts` | `useRestaurantDrafts`, `useSuggestions` (`store/demoDb`) | ExecutiveAdminPage, RestaurantAdminPage |
| `hooks/useAdminOffers.ts` | `useAdminOffers` (`store/demoDb`) | ExecutiveAdminPage, RestaurantAdminPage |
| `hooks/useAccounts.ts` | `demoAccounts` (`data/demoAccounts`) | LoginPage, ExecutiveAdminPage |
| `hooks/useCollections.ts` | `collections` (`data/collections`) | HomePage |
| `hooks/useTaxonomy.ts` | `CUISINES`, `NEIGHBORHOODS` (`services/taxonomyService`) | DiscoveryBuilder |
| `hooks/useOffers.ts` | `getOffersForRestaurant` (`repositories/OfferProvider`) | RestaurantCard, pages |
| `hooks/useImages.ts` | `imageProvider` (`repositories/ImageProvider`) | RestaurantImage, pages |
| `hooks/useGoogleRefresh.ts` | `getGoogleRefreshMeta`, `refreshGoogleSummary`, `subscribeGoogleRefresh` (`services/googleDataService`) | GoogleRefreshButton |
| `hooks/useRestaurantData.ts` | sync restaurant accessor (`lib/api.getAllRestaurantsSync` — same source `useRestaurants` already uses) | CompareTray, ExecutiveAdminPage, RestaurantAdminPage |
| `hooks/useOwnerRestaurant.ts` | composite: `useSession` + sync restaurant lookup (find by `session.restaurantIds[0]`) — identical logic to Navbar's current inline lookup, via `getAllRestaurantsSync` (synchronous, so no loading-state change) | Navbar |

### Step 3 — component re-points (import-only edits)
| File | Change |
|---|---|
| `RewardsWallet.tsx` | `useRewards`, `tokenBalance`, `REWARD_CATALOGUE` → `../hooks/useRewards` |
| `WriteReview.tsx` | `uid` → `../lib/uid`; reviewService ops → `../hooks/useReviews` |
| `Navbar.tsx` | raw `restaurants.find(...)` → `useOwnerRestaurant()` from `../hooks/useOwnerRestaurant` |
| `RestaurantCard.tsx` | `getOffersForRestaurant` → `../hooks/useOffers` |
| `RestaurantImage.tsx` | `imageProvider` → `../hooks/useImages` |
| `DiscoveryBuilder.tsx` | `CUISINES`, `NEIGHBORHOODS` → `../hooks/useTaxonomy` |
| `CompareTray.tsx` | `restaurantService.getAllSync()` → `../hooks/useRestaurantData` |
| `GoogleRefreshButton.tsx` | 3 google symbols → `../hooks/useGoogleRefresh` |

### Step 4 — page re-points (import-only edits)
| File | Change |
|---|---|
| `ExecutiveAdminPage.tsx` | `store/demoDb` → hooks (`useSession`, `useDrafts`, `useAdminOffers`, `useReviews`, `useUsers`); `data/restaurants` → `useRestaurantData`; `data/demoAccounts` → `useAccounts` |
| `RestaurantAdminPage.tsx` | `store/demoDb` → hooks; `data/restaurants` → `useRestaurantData` |
| `HomePage.tsx` | `data/collections` → `useCollections` |
| `LoginPage.tsx` | `data/demoAccounts` → `useAccounts` |
| `ProfilePage.tsx` | `store/demoDb` → hooks (`useSession`, `useRewards`, …) |
| `RestaurantPage.tsx` | `store/demoDb` → hooks (`useReviews`, `useRewards`, …) |

**Every edit is an import re-point plus, at most, a one-line call-site adjustment. No business logic, no JSX structure, no product behavior changes.**

---

## 5. DEPENDENCY RISKS

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| 1 | **Navbar timing change** — if `useOwnerRestaurant` used the async `useRestaurants`, the owner-venue lookup could briefly be empty. | Medium | Hook uses the **synchronous** `getAllRestaurantsSync` (the same source `useRestaurants` already seeds from) → identical timing; verified at Step 3 gate + live check of the owner navbar |
| 2 | **Hook re-export drift** — an adapter could drift from the store's API over time. | Low | Adapters are one-line re-exports (pattern of `useUsers.ts`); the store remains the single source; Step 5 grep + tests catch drift |
| 3 | **Cyclic imports** — if `lib/uid.ts` is imported by `demoDb` while `demoDb` consumers import `lib/uid`. | Very low | `lib/uid` imports nothing from the app; verified no cycle (same check as existing `useUsers` pattern) |
| 4 | **Mass-edit regression** — 14 re-pointed files could introduce a typo'd import path. | Low | One commit per group/page; tsc after each; every adapter is exercised by its consumer's tests |
| 5 | **Sanctioned seams removed too aggressively** — `RestaurantImage`/`RestaurantCard` provider seams are read-only boundaries. | Low | They are re-pointed, not removed; `OfferProvider`/`ImageProvider` themselves stay untouched |
| 6 | **Vercel/deploy** — unaffected in this pass (no moves, no config changes). | None | N/A |

---

## 6. TESTING CHECKPOINTS

1. **After Step 1:** `npm run lint` + `npx tsc -b --noEmit` (or `npm test`) — `uid` extraction changes nothing observable.
2. **After Step 2 (adapters added):** full test suite still green (no consumers yet — pure addition).
3. **After each Step 3 group:** tsc + lint + tests; live-spot-check the affected component (e.g., RewardsWallet after its re-point).
4. **After each Step 4 page:** tsc + lint + tests; load the page live.
5. **Step 5 gate (grep):**
   `grep -rn "from '\.\./\(store\|data\|repositories\|integrations\|services\)" src/components src/pages` → **zero matches**.
6. **Step 6 full battery:** `npm run build` (tsc + vite + prerender), `npm test`, `npm run lint`; live preview of home, Explore, restaurant detail, favorites, saved, login, profile, `/manage`, `/admin`, partners; console clean; no horizontal overflow; responsive spot check (320 / 375 / 390 / 430 / 768 / 1024 / 1280).
7. **Regression proof:** confirm preserved behaviors — website-CTA gating, "Not listed" pricing, empty meal types, favourites/saved/login/profile, role-based nav (guest/customer/owner/admin), draft→approval flow, Compare tray, Google refresh.

---

## 7. ROLLBACK STRATEGY

- **Per-step rollback:** each step is its own commit; revert = `git revert <commit>` or `git checkout development -- <files>`. Adapters are additive, so removing them is non-destructive; re-points are single-file, so reverting restores the exact original import.
- **Composite-hook failure (risk #1):** if `useOwnerRestaurant` changes Navbar behavior, revert only that re-point — the adapter file can remain unused until fixed.
- **Full rollback:** `git checkout development` restores the exact baseline `e47e7d3`. Nothing is deleted or moved, so there is zero data loss risk in this pass.
- **Branch hygiene:** all work on `chore/layer-cleanup`; `development` and `main` are untouched until PR approval.

---

## 8. WHAT THIS PASS DOES NOT DO

- No `git mv`, no deletions, no folder renames (deferred to the physical reorg — separate approval).
- No database logic, schema, tables, RLS, or Supabase changes.
- No rewrite of services/repositories/business logic; no new features; no product-behavior change.
- No introduction of new dependencies or tooling.
- No change to the design system, routes, or verified QA fixes.

**STOP — awaiting founder approval of this execution plan before implementation begins.**
