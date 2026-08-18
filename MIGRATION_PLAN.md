# KHABO KOTHAY — MIGRATION PLAN (PENDING APPROVAL)

**Status:** PROPOSED — no files moved yet. Execution begins only after founder approval.
**Baseline:** `development` branch @ `e47e7d3`, clean tree.

---

## 1. TARGET ARCHITECTURE

```
khabo-kothay/                        ← repository root (git)
│
├── apps/
│   ├── web/                         ← the ENTIRE current frontend, moved as one unit
│   │                                 (package.json, src/, public/, index.html, configs,
│   │                                  vercel.json, scripts/prerender.mjs, .env.example)
│   │   └── src/                     ← internally re-organized into the 3-layer standard (§2)
│   └── admin/                       ← RESERVED (future internal dashboard) — README stub only
│
├── backend/                         ← RESERVED (future API/auth/services) — README stub only
│
├── database/
│   ├── schema/
│   │   └── migrations/              ← approved SQL migration (file kept, name unchanged)
│   ├── imports/
│   │   └── source/                  ← XLSX source dataset + dhaka-raw.json
│   ├── pipelines/
│   │   └── generators/              ← generate-dhaka-data.mjs (path updates required)
│   └── docs/                        ← technical spec docx + database context README
│
├── packages/                        ← RESERVED (future types/ui/utils) — README stub only
│
├── docs/
│   ├── architecture/                ← this audit + migration plan (moved here post-approval)
│   ├── database/
│   ├── product/
│   └── decisions/
│
├── scripts/                         ← RESERVED for future repo-level tooling (empty)
│
├── README.md                        ← rewritten: repo overview + pointer to apps/web
└── .gitignore                       ← root-level (OS/editor noise) — app rules live in apps/web/
```

**Non-negotiable invariants:**
- The app must keep working after every step (`npm run build` includes tsc + vite + prerender).
- `prerender.mjs` **stays inside the app package** — it is build tooling, not a database pipeline.
- Approved database work is **moved, never edited**: schema, tables, UUIDs, import pipeline.
- All moves use `git mv` (history preserved). No deletions of tracked content.

---

## 2. APPS/WEB INTERNAL LAYERING STANDARD (founder approval — four layers)

`apps/web/src/` is organized into four layers with a strict, one-directional dependency rule:

```
PRESENTATION LAYER   pages/ · components/ · design system (css) · visual states · presentation helpers
        ↓  imports only
APPLICATION LAYER    hooks/ · context/ · user workflows · state coordination
        ↓  imports only
DOMAIN LAYER         domain/ · business entities · types · business rules ·
                     recommendation logic · pure logic helpers
        ↓  imports only
INFRASTRUCTURE LAYER services/ · repositories/ · transformers/ · integrations/supabase/ ·
                     data/ (datasets) · store/ (localStorage demo DB) · external providers ·
                     lib/api · lib/demoAuth · lib/maps · map providers
```

**Rules (the contract UI devs, backend devs, database engineers and AI agents all code against):**
1. **UI never touches Infrastructure directly.** `components/` and `pages/` may not import from `store/`, `data/`, `repositories/`, `integrations/`, or `services/`.
2. **Standard access path:** UI → hooks/contexts (Application) → services/repositories (Infrastructure). Components consume hook APIs (e.g. `useRestaurants`, `useRewards`); data developers change infrastructure without touching UI.
3. **No upward imports.** Domain, Application and Infrastructure never import from `components/` or `pages/` (verified: already true today).
4. **Domain = entities, types and business rules only** — pure functions, no React, no storage, no network.
5. **Provider seams** (`ImageProvider`, `OfferProvider`, `PlaceProvider`) are the sanctioned read-only boundaries — they sit behind hook adapters per rule 1.
6. **Business rules live in Domain**, never in JSX/CSS.
7. **Established adapter pattern:** thin re-export hooks (e.g. `hooks/useUsers.ts` → `export { useUsers } from '../store/demoDb'`) are the migration vehicle — full file-by-file plan in `EXECUTION_PLAN.md`.

Why: UI developers, backend developers, database engineers and AI agents work independently — the UI depends on stable hook signatures, and data internals (mock localStorage today, Supabase later) are swappable without touching presentation.

---

## 3. CURRENT LAYER-LEAK AUDIT (verified 2026-08-18)

**Already clean:** no upward imports anywhere; 10 components already consume `lib/` pure helpers; services → repositories → transformers → source layering exists and is complete.

**Leaks to fix during the apps/web preparation** (presentation → data layer direct imports):

| File | Imports directly | Violation |
|---|---|---|
| `components/WriteReview.tsx` | `store/demoDb` (`uid`), `services/reviewService` | component → storage + business |
| `components/RewardsWallet.tsx` | `store/demoDb` (`tokenBalance`, `useRewards`), `data/rewards` | component → localStorage + dataset |
| `components/Navbar.tsx` | `data/restaurants` (raw array lookup) | component → raw dataset |
| `components/RestaurantCard.tsx` | `repositories/OfferProvider` | component → repository (sanctioned seam; prefer hook) |
| `components/RestaurantImage.tsx` | `repositories/ImageProvider` | provider seam — acceptable, keep |
| `components/DiscoveryBuilder.tsx` | `services/taxonomyService` | component → service (move behind hook) |
| `components/CompareTray.tsx` | `services/restaurantService` | component → service (move behind hook) |
| `components/GoogleRefreshButton.tsx` | `services/googleDataService` | component → service |
| Pages (6: ExecutiveAdmin, RestaurantAdmin, Home, Login, Profile, Restaurant) | `store/demoDb` + `data/*` | page → storage/dataset |

**Fix pattern (small, safe, non-breaking):** add thin feature hooks (`useRewards`, `useReviews`, `useTaxonomy`, `useOffers`, `useOwnerVenue`, …) that wrap the existing services/repositories; re-point the leaking imports; **no logic changes**; tests + build green after each move. Read-only stateless provider seams may stay as-is.

---

## 4. EXACT FILE MOVEMENT LIST

### Phase A — Database + data pipeline + docs (LOW risk; no app code touched)

| Current location | New location | Reason |
|---|---|---|
| `KHABO_KOTHAY_DATABASE_FOUNDATION_v1_1_FINAL_MIGRATION.sql` | `database/schema/migrations/` (same filename) | Approved schema becomes the database layer's single source of truth; filename kept to avoid breaking the context README reference |
| `KHABO_KOTHAY_DATABASE_FOUNDATION_v1_1_TECHNICAL_SPECIFICATION.docx` | `database/docs/` | Spec belongs with database documentation |
| `KK_DATABASE_CONTEXT_README.md` | `database/docs/` (update relative refs to `../schema/migrations/…`) | Database-scoped boundaries doc |
| `Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx` | `database/imports/source/` | Source dataset input |
| `dhaka-raw.json` | `database/imports/source/` | Raw source input |
| `scripts/generate-dhaka-data.mjs` | `database/pipelines/generators/` | CSV/data generation + import workflow (per founder direction). **Update in the same commit:** XLSX path → `../../imports/source/…`; output paths → `../../apps/web/src/data/restaurants.ts` + `collections.ts`; re-run and diff committed output to prove parity |

### Phase B — Frontend app move + layer cleanup (the only genuinely risky step)

| Current location | New location | Reason |
|---|---|---|
| `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.oxlintrc.json`, `.env.example`, `public/`, `src/`, `vercel.json`, `.gitignore` | `apps/web/` (same relative layout) | Move the app as ONE unit; all imports are relative (verified), so nothing inside changes |
| `scripts/prerender.mjs` | `apps/web/scripts/` | **Must stay with the app** (`PROJECT_ROOT` is `__dirname`-relative; `package.json` calls `node scripts/prerender.mjs`) |
| `scripts/extract-demo-reference.mjs` | `apps/web/scripts/` | Coupled to app test fixtures; flag as one-shot (candidate for archive later) |
| **Layer cleanup (§3)** — add adapter hooks; re-point leaking component/page imports; keep provider seams — **full file-by-file plan in `EXECUTION_PLAN.md`** | `apps/web/src/hooks/*` (+ re-pointed imports) | Enforces the approved four-layer standard; no logic changes, no new features |
| `README.md` | rewritten: root `README.md` (repo overview) + new `apps/web/README.md` (app details) | Current README is stale (describes the pre-refactor 29-mock architecture); rewrite while moving |

### Phase C — Docs + reserved scaffolding

| Action | Reason |
|---|---|
| `ARCHITECTURE_AUDIT_REPORT.md` → `docs/architecture/` | Canonical home |
| `MIGRATION_PLAN.md` → `docs/architecture/` | Canonical home |
| Create `apps/admin/`, `backend/`, `packages/` with short README stubs (no code) | Reserve the structure without implying commitments |
| Root `.gitignore` (OS/editor noise only); app `.gitignore` lives in `apps/web/` | Pattern coverage preserved (`node_modules`, `dist`, `.env.*`, `.vercel`) |

---

## 5. DEPENDENCIES THAT MAY BREAK

1. **Vercel deployment (HIGH).** Today Vercel's project root is `khabo-kothay/`. After Phase B the Root Directory must be set to `apps/web` in the Vercel dashboard, and `vercel link` must be re-run (`.vercel/` is gitignored). Until that happens, `vercel deploy` deploys the wrong root. → **Founder dashboard action required.**
2. **Prerender build (HIGH if mishandled).** Only safe if `prerender.mjs` moves with the app — guaranteed by the plan.
3. **Data generator (MEDIUM).** `generate-dhaka-data.mjs` crosses the boundary (reads `database/imports/source/`, writes `apps/web/src/data/`). Both paths updated in one commit + re-run + diff of committed output.
4. **Layer cleanup (MEDIUM).** Re-pointing imports must preserve runtime behavior — mitigated by thin hooks wrapping existing services and a test/build gate after each move.
5. **Context README references (LOW).** Filename references to SQL/docx updated in the same commit as the moves.
6. **Preview/run workflow (LOW).** Dev-server cwd changes to `apps/web/`; `.freebuff/run.md` updated.
7. **Git history (LOW).** `git mv` preserves it; the only commit is `e47e7d3`, so even a rewrite would be cheap — but `git mv` avoids the question.
8. **No CI exists** — nothing to update there. No workspace tooling is introduced.

---

## 6. EXECUTION SEQUENCE (each phase ends with a verification gate)

| Step | Action | Gate |
|---|---|---|
| 0 | Snapshot: `git status` clean on `development`; branch `chore/architecture-reorg` from it | — |
| 1 | **Phase A** — move database artifacts, source data, generator (+ path updates); re-run generator; diff output | `git mv` clean; generator output byte-identical |
| 2 | **Phase B (move)** — `git mv` the app unit into `apps/web/` | `npm run build` (tsc + vite + prerender), `npm test`, `npm run lint` all green |
| 3 | **Phase B (layer cleanup)** — add feature hooks; re-point §3 leaks; keep provider seams | Same gate green after each hook migration |
| 4 | **Vercel ops** — set Root Directory `apps/web`; `vercel link`; test deploy | Production URL renders; routes work |
| 5 | **Phase C** — docs moves, root README rewrite, reserved stubs, root gitignore | README accurate; tree matches target |
| 6 | Full battery: TypeScript, lint, 200+ tests, build + prerender, live preview (home/explore/restaurant/manage/admin/login), 320–1280 responsive, console clean, no overflow | All green |
| 7 | Commit on the feature branch; PR/review; merge to `development` | History intact |

**Sequencing rationale:** Phase A and C never touch app code (safe to do immediately). Phase B is isolated behind its own gate and the Vercel dashboard change — it is the only step that can break production deploys, so it is gated on founder confirmation of the Root Directory change. The layer cleanup rides inside Phase B so it lands on the new structure once, rather than churning the current tree twice.

---

## 7. OPEN DECISIONS FOR THE FOUNDER

1. **App move now or later?** Recommended: Phase A + C now; Phase B (app → `apps/web/` + layer cleanup) as an immediately following, separately gated step — the code is provably move-safe, but it changes the Vercel deployment root, which only you can change in the dashboard.
2. **`README.md` rewrite** — approved as part of Phase C (it is currently stale and would be rewritten even without the reorg)?
3. **Reserved scaffolding** (`apps/admin/`, `backend/`, `packages/` README stubs) — create now, or defer until each is actually needed?
4. **`extract-demo-reference.mjs`** — keep (reproducibility) or archive (it is one-shot)?
5. **Layer-cleanup depth** — fix all §3 leaks (recommended) or only the storage/dataset ones (WriteReview, RewardsWallet, Navbar, pages), leaving sanctioned provider seams untouched?

**STOP — awaiting founder approval. No files beyond the two reports have been changed.**
