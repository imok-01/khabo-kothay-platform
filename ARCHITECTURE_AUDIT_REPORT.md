# KHABO KOTHAY — ARCHITECTURE AUDIT REPORT

**Date:** 2026-08-18
**Baseline verified:** `development` branch, clean working tree, commit `e47e7d3` (`KK v1.0 - role based architecture and restaurant workflow foundation`).
**Scope:** Read-only audit. No files moved, no code changed, nothing deleted.

---

## 1. CURRENT REPOSITORY TREE (tracked — 178 files)

The entire project lives in a single package at `khabo-kothay/`. There is no monorepo, no workspace tooling, no backend server, and no separate docs/database folder.

```
khabo-kothay/                                  ← single app package (project root for Vercel)
├── package.json / package-lock.json           ← React 19 · Vite 8 · TS 6 · React Router 7
│                                                leaflet · lucide-react · @supabase/supabase-js
├── index.html                                 ← app shell (serves /src/main.tsx)
├── vite.config.ts                             ← react plugin + leaflet SSR stub (for prerender)
├── vitest.config.ts / tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .oxlintrc.json / .env.example / .gitignore
├── vercel.json                                ← rewrites all routes → index.html (SPA shell)
│
├── public/                                    ← favicon.svg, icons.svg
├── scripts/                                   ← BUILD + DATA PIPELINE scripts (mixed)
│   ├── prerender.mjs                          ← BUILD: SSR-prerenders all routes at build time
│   ├── generate-dhaka-data.mjs                ← PIPELINE: XLSX (206 rows) → src/data/*.ts
│   └── extract-demo-reference.mjs             ← ONE-SHOT: recovered old demo dataset → test fixture
│
├── src/                                       ← ENTIRE FRONTEND (all client-side)
│   ├── main.tsx / App.tsx / server-entry.tsx  ← entry + routes + SSR entry for prerender
│   ├── index.css / phase3.css / editorial.css ← design tokens + layers
│   ├── types.ts
│   ├── components/   (27)  Navbar, Footer, MobileNav, RestaurantCard, MatchIndicator,
│   │                         MenuSection, AdminLayout, RequireRole, MapView, CompareTray, …
│   ├── pages/        (12)  Home, Explore, Restaurant, Favorites, Saved, Login, Profile,
│   │                         RestaurantAdmin, ExecutiveAdmin, Partners×5, InfoPages, NotFound
│   ├── context/      (5)   Auth, Favorites, Saved, RecentlyViewed, Compare
│   ├── hooks/        (4)   useRestaurants, useRestaurant(user), useLiveGoogle, useGeolocation
│   ├── services/     (11)  restaurant, menu, favorites, savedRestaurants, review, user,
│   │                         recommendation, taxonomy, image, googleData + googlePlacesClient
│   ├── repositories/ (10)  restaurant, menu, favorite, savedRestaurant, review, user,
│   │                         image + ImageProvider, PlaceProvider, OfferProvider
│   ├── transformers/ (5)   restaurant, menu, review, user, image
│   ├── integrations/supabase/  client.ts · database.types.ts · queries.ts (29 typed queries)
│   ├── domain/       (10)  place, menu, auth, rewards, offers, recommendation, intelligence, …
│   ├── data/         (8 + demo/)  restaurants.ts (206 real Dhaka venues), collections, menus,
│   │                         images, intelligence, offers, rewards, demoAccounts + demo/ (fixtures)
│   ├── store/        demoDb.ts      ← reactive localStorage demo DB (sessions, drafts, menus…)
│   ├── lib/          (20 + __tests__)  api, demoAuth, nlSearch, filter, geo, maps, ratings,
│   │                         photos, preferences, recommendations, menu, restaurantDraft,
│   │                         priceIntelligence, rewards, usePageTitle, …
│   ├── map/          (6)   MapProvider (Google ⇄ Leaflet runtime switch), surfaces, areas, refit
│   └── test/         setup.ts        ← in-memory localStorage for Vitest
│
├── KHABO_KOTHAY_DATABASE_FOUNDATION_v1_1_FINAL_MIGRATION.sql   ← APPROVED schema (19 tables)
├── KHABO_KOTHAY_DATABASE_FOUNDATION_v1_1_TECHNICAL_SPECIFICATION.docx  ← APPROVED spec
├── KK_DATABASE_CONTEXT_README.md        ← boundaries doc (frontend-prep instructions)
├── README.md                            ← project readme (STALE — see §5)
│
├── Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx  ← SOURCE dataset (206 records)
├── dhaka-raw.json                       ← raw scrape (~226 KB)
│
├── dist/          ← IGNORED build output
├── node_modules/  ← IGNORED
└── .vercel/       ← IGNORED (contains Vercel link metadata + local secrets)
```

---

## 2. CLASSIFICATION OF EVERY IMPORTANT FOLDER / FILE

### A. FRONTEND (the live application)
| Path | Role | Verdict |
|---|---|---|
| `src/` (all subfolders) | The entire React application: components, pages, contexts, hooks, services, repositories, transformers, domain models, data modules, store, map providers | **Move as one unit** — all imports are relative (verified: zero `src/`-prefixed imports, zero tsconfig path aliases), so a wholesale move is import-safe |
| `index.html`, `public/` | App shell + static assets | Move with app |
| `package.json`, `package-lock.json` | Single app package; scripts: `dev`, `build` (`tsc -b && vite build && node scripts/prerender.mjs`), `test`, `lint`, `preview` | Move with app |
| `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `.oxlintrc.json`, `.env.example` | Build/type/lint/env config. No root-absolute references (verified). | Move with app |
| `vercel.json` | SPA rewrite rules | Move with app — **but see Vercel dependency in §4** |
| `scripts/prerender.mjs` | Build-time SSR prerenderer. Computes `PROJECT_ROOT = path.resolve(__dirname, '..')` | **Must stay inside the app package** (`apps/web/scripts/`) — it is part of the frontend build, not a database pipeline |
| `src/integrations/supabase/` | Client-side Supabase SDK layer: lazy client, typed queries (29), type mirror of the approved schema | Frontend (browser) — NOT a backend. Stays in the app |
| `src/services/googlePlacesClient.ts` | Client-side Google Places wrapper | Frontend. Stays in the app |

### B. BACKEND CANDIDATES
| Path | Role | Verdict |
|---|---|---|
| *(none exists)* | There is **no Node server, no API routes, no server-side auth**. `services/`, `repositories/`, `integrations/supabase/` all execute in the browser. | `backend/` should be created as a **reserved empty** structure for future work — nothing to move today |

### C. DATABASE
| Path | Role | Verdict |
|---|---|---|
| `KHABO_KOTHAY_DATABASE_FOUNDATION_v1_1_FINAL_MIGRATION.sql` | **Approved** schema: 19 tables (restaurants, sources, aliases, attributes, tags, verification_records, menus, menu_items, price_observations, image_references, review_samples, review_signals, user_profiles, favorites, user_reviews, roles, saved_restaurants, change_requests, audit_logs). Reference artifact only — no runtime import. | → `database/schema/migrations/` |
| `KHABO_KOTHAY_DATABASE_FOUNDATION_v1_1_TECHNICAL_SPECIFICATION.docx` | **Approved** design spec (binary). | → `database/docs/` (or `docs/database/`) |
| `KK_DATABASE_CONTEXT_README.md` | Boundaries/context doc. References the SQL + docx by filename (relative refs must be updated after any move). | → `database/docs/` |
| `src/integrations/supabase/database.types.ts` | Hand-written TS mirror of the approved schema | Stays in the app (runtime type source) |

### D. DATA PIPELINE
| Path | Role | Verdict |
|---|---|---|
| `scripts/generate-dhaka-data.mjs` | Reads the XLSX (206 records), **writes** `src/data/restaurants.ts` + `src/data/collections.ts` (committed so runtime never needs the spreadsheet). Uses `xlsx` (extraneous dev dep). | → `database/pipelines/generators/` — **path updates required** (§4, dep #4) |
| `Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx` | Source dataset (input to the generator) | → `database/imports/source/` |
| `dhaka-raw.json` | Raw scrape (~226 KB, input) | → `database/imports/source/` |
| `scripts/extract-demo-reference.mjs` | One-shot recovery utility: extracted the old demo dataset from a prior dist bundle into `src/data/demo/demo-restaurants.ts` (used ONLY as a test fixture) | Keep with the app (`apps/web/scripts/`) — it is coupled to app test fixtures; flag as one-shot/redundant |

### E. DOCUMENTATION
| Path | Role | Verdict |
|---|---|---|
| `README.md` | 139-line product readme | **STALE** — describes the pre-refactor architecture (29 mock Kolkata restaurants, `lib/api.ts` as repository, no services/repositories/transformers/integrations). Needs a rewrite regardless of any move. |
| `KK_DATABASE_CONTEXT_README.md` | See C above | → `database/docs/` |
| Spec docx | See C above | → `database/docs/` |
| *(none)* | No `docs/`, no ADRs, no architecture notes | `docs/` to be created |

### F. UNUSED / TEMPORARY (identified — NOT deleted)
| Path | Note |
|---|---|
| `dist/`, `node_modules/` | Ignored build/runtime artifacts |
| `.vercel/` | Ignored. Contains `project.json` (org/project id) and `.env.production.local` (**contains `VERCEL_OIDC_TOKEN` — never commit**). Already excluded by `.gitignore`. |
| `scripts/extract-demo-reference.mjs` | One-shot utility; kept for reproducibility, low ongoing value |
| `src/data/demo/demo-restaurants.ts` | Test fixture only (behaviour tests) |
| `README.md` staleness | Documentation debt (HIGH for onboarding clarity, LOW for runtime) |
| `package.json` → `xlsx` | Reported as extraneous dev dependency (used only by the manual generator) |

---

## 3. KEY VERIFIED COUPLING FACTS

1. **All `src/` imports are relative** — no `src/`-prefixed imports, no tsconfig `paths` aliases, no Vite root-absolute references. A wholesale app move breaks nothing at the import level.
2. **`scripts/prerender.mjs`** derives its project root from its own file location (`path.resolve(__dirname, '..')`). Safe **only if** `scripts/` (this file) moves together with the app.
3. **`package.json`** invokes the prerenderer as `node scripts/prerender.mjs` — relative to the package root; intact if the app moves as one unit.
4. **`generate-dhaka-data.mjs`** is a cross-boundary script: it reads a database-source artifact (XLSX) and **writes into the frontend** (`src/data/*.ts`). This is the one pipeline→frontend write dependency that must stay explicit.
5. **Vercel** treats `khabo-kothay/` as the project root (`.vercel/project.json` links it; `vercel.json` lives there). Moving the app changes the deployment root (§4, dependency #1).
6. **`index.html`** references `/src/main.tsx` (relative to app root — fine after move).
7. **SQL migration** has no runtime consumer — it is a reference artifact; moving it is safe (only the context README references it by filename).

---

## 4. MIGRATION RISKS (preliminary)

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **Vercel Root Directory** — moving the app to `apps/web/` requires a Vercel dashboard setting change (`Root Directory: apps/web`) or production deploys break | **HIGH** | Founder/dashboard action; verify with a test deploy after the move |
| 2 | `.vercel/` link (org/project ids) is gitignored — a fresh clone has no link | MEDIUM | Re-run `vercel link` inside `apps/web/` after the move |
| 3 | `prerender.mjs` path logic breaks if `scripts/` is separated from the app | **HIGH** (if mishandled) | Keep prerender inside the app package; never move it to a root `scripts/` |
| 4 | `generate-dhaka-data.mjs` XLSX + output paths break if pipeline, source data, or app move independently | MEDIUM | Move source data + generator together; update both paths in one commit; re-run generator and diff the committed output |
| 5 | `KK_DATABASE_CONTEXT_README.md` filename references to SQL/docx | LOW | Update relative references in the same commit |
| 6 | Preview/run-doc workflow (`cwd`, dev-server path) | LOW | Update `.freebuff/run.md` / launch commands after move |
| 7 | README staleness | LOW (runtime) / MEDIUM (onboarding) | Rewrite as part of the docs phase |
| 8 | Git history | LOW | Use `git mv` for every move to preserve history |
| 9 | Workspace tooling temptation | LOW | **Do not** introduce npm/pnpm workspaces yet — `apps/web` stays a self-contained package; monorepo tooling is a later decision |

---

## 5. FRONTEND LAYER-SEPARATION AUDIT (founder requirement: UI / feature / data layers)

**Standard (adopted — MIGRATION_PLAN.md §2):** four layers — Presentation (`pages/` `components/` css) → Application (`hooks/` `context/`) → Domain (`domain/` pure logic) → Infrastructure (`services/` `repositories/` `transformers/` `integrations/` `data/` `store/`). UI may never import Infrastructure directly; the standard access path is UI → hooks → services → repositories → source.

**Verified clean:** no upward imports anywhere (lib/services/repositories/store never import components/pages); 10 components already consume `lib/` pure helpers; the services → repositories → transformers → source chain is complete.

**Verified leaks (presentation → data layer):**
- `components/WriteReview.tsx` → `store/demoDb` + `services/reviewService`
- `components/RewardsWallet.tsx` → `store/demoDb` + `data/rewards`
- `components/Navbar.tsx` → `data/restaurants` (raw dataset lookup)
- `components/RestaurantCard.tsx` → `repositories/OfferProvider`; `components/RestaurantImage.tsx` → `repositories/ImageProvider` (read-only provider seams — sanctioned, may stay)
- `components/DiscoveryBuilder.tsx` → `services/taxonomyService`; `components/CompareTray.tsx` → `services/restaurantService`; `components/GoogleRefreshButton.tsx` → `services/googleDataService`
- Pages (6): ExecutiveAdmin, RestaurantAdmin, Home, Login, Profile, Restaurant → `store/demoDb` + `data/*`

**Fix (planned, not executed):** thin adapter hooks (pattern of `hooks/useUsers.ts`) wrapping the existing services/store/repositories, then re-point the imports — no logic changes. Full file-by-file plan: `EXECUTION_PLAN.md` (approved with conditions; awaiting final sign-off).

---

## 6. AUDIT CONCLUSIONS

- **The code layer is unusually clean for a move:** relative imports everywhere, no path aliases, prerender rooted at its own directory, generator inputs/outputs fully documented. The physical restructure is safe *if* the app moves as one unit and Vercel is reconfigured.
- **The real risk is operational, not code:** Vercel Root Directory + re-link (§4 #1/#2) and the cross-boundary generator (#4).
- **Documentation is the weakest layer:** `README.md` is stale (describes the pre-refactor 29-restaurant mock architecture, not the current 206-venue service/repository architecture); no `docs/` exists.
- **Nothing is genuinely "backend" today:** all services/repositories/integrations run in the browser; `backend/` is a reserved future structure.

---

*This report was produced read-only. No files were modified. See `MIGRATION_PLAN.md` for the proposed movement map — awaiting founder approval before any execution.*
