# Review Highlights Preview — Safe Implementation Plan

**Checkpoint:** `preview/customer-highlights` branch from `chore/repository-restructure` @ `c0ef528`
**Domains:** Production `khabo-kothay.vercel.app` / Dev `khabo-kothay-dev.vercel.app` — **DO NOT BREAK**

## Scope (ONLY)
Connect existing `review_samples` (623 rows, service_role imported) to `RestaurantPage` profile.
No schema, auth, images, menus, address, maps, deployment changes.

## Goal UI
- Keep all existing sections unchanged
- Add new section `Customer Highlights` (max 3 reviews)
- Per review: reviewer name (`attribution`), verbatim `review_text`, `source=Google` pill
- No ratings shown, no rating calc, no Google rating/count mutation

## Data Rules
- Use existing query seam `queries.selectReviewSamplesForRestaurant` `src/integrations/supabase/queries.ts:364`
- Resolve route id → UUID via `resolveRestaurantUuid` (slug → UUID) same as discoveryFacts
- Filter strictly by `restaurant_id` — no cross leakage
- Mock/prerender: empty (no highlights) — mirrors discoveryFacts pattern

## Safety
- Checkpoint: branch `preview/customer-highlights` (revert = `git checkout chore/repository-restructure; git branch -D preview/customer-highlights`)
- Isolated files (removable):
  - `src/hooks/useReviewSamples.ts` (new)
  - `src/services/reviewSamplesService.ts` (new)
  - `src/repositories/reviewSamplesRepository.ts` (new)
  - `src/components/CustomerHighlights.tsx` (new)
  - 1-line import + JSX in `src/pages/RestaurantPage.tsx` (feature-flagged)
- Feature flag: `const REVIEW_HIGHLIGHTS_ENABLED = true` in `CustomerHighlights.tsx` + `VITE_ENABLE_REVIEW_HIGHLIGHTS` env toggle (default on, `false` hides section entirely). No refactoring of unrelated files.
- No `package.json` dependency changes, no migration, no `database/` writes during UI.

## Implementation Steps
1. Create repository/service/hook mirroring `discoveryFacts` pattern (copy, rename, 15 lines each)
2. Create `CustomerHighlights` component — loading → empty → error states, max 3, source pill, no rating
3. Wire into `RestaurantPage.tsx` after `Khabo Kothay reviews` section, before `Google reviews` section, guarded by flag
4. Verify `npm run build` + `npm test` (vitest) green in branch
5. QA 10 restaurants locally (`vite dev` + Supabase) — check correct reviews, no leakage, images/menus/auth unaffected
6. If build green, push to `preview/customer-highlights` for Vercel Preview on dev domain only; production unchanged until merge approval

## QA Checklist (10 pages)
- Seasonal Tastes, Almajlis, Kiva Han, Woodhouse Grill Banani, Sushi Samurai, Jatra Biroti, Herfy Gulshan, Takeout Banani, Chef's Table Gulshan 2, Fish & Co.
- For each: correct 3 (or 0/2) reviews, correct attribution, `Google` pill, no duplicate, page loads <2s, gallery/menus/auth untouched
- Cross-check: open 2 restaurants in 2 tabs, ensure no review set swaps

## Risks & Mitigations
- **RISK:** Supabase not configured → hook returns empty (safe, section hidden)
- **RISK:** Large `review_samples` fetch → batched? Single `eq(restaurant_id)` per page, 3 rows, negligible
- **RISK:** Prerender build fetch → returns empty (mock), no hydration mismatch
- **RISK:** Branch pollutes prod → Vercel Preview only, prod `main`/`chore/repository-restructure` unaffected until explicit PR merge

## Rollback
- `git checkout chore/repository-restructure` + delete branch → instant revert; or set `VITE_ENABLE_REVIEW_HIGHLIGHTS=false` in Vercel env.
