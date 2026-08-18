# KHABO KOTHAY — REPOSITORY RESTRUCTURE PLAN (PENDING APPROVAL)

**Status:** PROPOSED — no files moved. Approval required before execution.
**Branch:** `chore/repository-restructure` (from `chore/layer-cleanup` @ `1acfc1c`, which carries the accepted layer cleanup).
**Baseline recorded:** tests **200/200** · build **219/219 prerendered, 0 fallback, 0 failed** · git clean.

---

## 1. SCOPE OF THIS PHASE

1. **apps/web migration** — move the entire frontend app into `apps/web/` as one unit.
2. **database workspace integration** — organize the database reference artifacts and data pipeline into `database/`.
3. **docs organization** — create `docs/` with `architecture/`, `database/`, `product/`, `decisions/`.
4. **scripts organization** — build tooling stays with the app; pipeline tooling moves to `database/pipelines/`; root `scripts/` reserved.

**ANTIGRAVITY BOUNDARY (do not touch — ever):**
- Supabase schema, tables, enums, constraints (the migration SQL is **move-only, never edited**)
- Import logic (generators/validators: **move + path-update only, never edit logic**)
- Generated data (`src/data/restaurants.ts`, `src/data/collections.ts`: never regenerated unless a parity check proves byte-identical output)
- Database/product decisions (import source of truth, UUID relationships, validation criteria)

---

## 2. TARGET ARCHITECTURE

```
khabo-kothay/
├── apps/
│   ├── web/                     ← ENTIRE current app moved as ONE unit (see §3 Phase B)
│   └── admin/                   ← reserved (README stub only)
├── backend/                     ← reserved (README stub only)
├── database/
│   ├── schema/migrations/       ← approved SQL (filename unchanged)
│   ├── imports/source/          ← XLSX + dhaka-raw.json
│   ├── pipelines/generators/    ← generate-dhaka-data.mjs (paths updated, logic untouched)
│   └── docs/                    ← technical spec docx + database context README
├── packages/                    ← reserved (README stub only)
├── docs/
│   ├── architecture/            ← audit + migration + execution + this plan
│   ├── database/                ← (future database docs)
│   ├── product/                 ← (future product docs)
│   └── decisions/               ← (future ADRs)
├── scripts/                     ← reserved (repo-level tooling, empty)
├── README.md                    ← rewritten: repo overview + pointer to apps/web
└── .gitignore                   ← root-level (OS/editor noise)
```

**Non-negotiable invariants:** every step keeps the app buildable (`npm run build` = tsc + vite + prerender); `prerender.mjs` stays inside the app package; all moves use `git mv`; nothing is deleted.

---

## 3. EXACT MOVEMENT PLAN

### Phase A — database workspace (LOW risk; app code untouched)
| Current | New | Reason / action |
|---|---|---|
| `KHABO_KOTHAY_DATABASE_FOUNDATION_v1_1_FINAL_MIGRATION.sql` | `database/schema/migrations/` (same name) | Approved schema, move-only |
| `KHABO_KOTHAY_DATABASE_FOUNDATION_v1_1_TECHNICAL_SPECIFICATION.docx` | `database/docs/` | Spec with database docs |
| `KK_DATABASE_CONTEXT_README.md` | `database/docs/` | Update relative refs to `../schema/migrations/…` |
| `Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx` | `database/imports/source/` | Source dataset input |
| `dhaka-raw.json` | `database/imports/source/` | Raw input |
| `scripts/generate-dhaka-data.mjs` | `database/pipelines/generators/` | **Move + update paths in ONE commit:** XLSX → `../../imports/source/…`; outputs → `../../apps/web/src/data/restaurants.ts` + `collections.ts`; then re-run and **diff the committed output — must be byte-identical**. Logic untouched. |
| `scripts/extract-demo-reference.mjs` | stays with app → `apps/web/scripts/` | Coupled to app test fixtures; one-shot utility |

### Phase B — apps/web migration (the risky step)
| Current | New | Reason |
|---|---|---|
| `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.oxlintrc.json`, `.env.example`, `public/`, `src/`, `vercel.json`, `.gitignore`, `scripts/prerender.mjs` | `apps/web/` (same relative layout) | One unit; all imports relative (verified), prerender is `__dirname`-relative → safe |
| `README.md` | rewrite: root `README.md` (overview) + new `apps/web/README.md` (app detail) | Current README is stale (pre-refactor) |
| Vercel | Root Directory → `apps/web` (dashboard) | **Founder action required** |

### Phase C — docs + reserved scaffolding
| Action | Reason |
|---|---|
| `ARCHITECTURE_AUDIT_REPORT.md`, `MIGRATION_PLAN.md`, `EXECUTION_PLAN.md`, `RESTRUCTURE_PLAN.md` → `docs/architecture/` | Canonical home |
| Root `.gitignore` (OS/editor noise); app rules stay in `apps/web/.gitignore` | Pattern coverage preserved |
| `apps/admin/`, `backend/`, `packages/` README stubs | Reserve structure, no code |

---

## 4. RISK ASSESSMENT

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **Vercel Root Directory** — deploys break until the dashboard points at `apps/web` | **HIGH** | Founder dashboard change; test deploy after Phase B; until then `development` deploys from the old root |
| 2 | **Prerender path** — breaks if `scripts/` is separated from the app | **HIGH (if mishandled)** | Plan keeps `prerender.mjs` inside `apps/web/scripts/`; never a root `scripts/` |
| 3 | **Generator cross-boundary** — XLSX input + `src/data` outputs must both be re-pointed in one commit | MEDIUM | Move source data + generator together; re-run; byte-diff committed output |
| 4 | **ANTIGRAVITY overlap** — this repo's `generate-dhaka-data.mjs` may be superseded by the separate workspace's validated pipelines | MEDIUM | **Open question (§7)**: confirm whether the script is reference-only here before moving; move-only either way |
| 5 | **`.vercel` link** — gitignored; fresh clones have no link | MEDIUM | `vercel link` in `apps/web/` after move |
| 6 | **Context README refs** | LOW | Updated in the same commit as the move |
| 7 | **Preview/run-doc cwd** | LOW | `.freebuff/run.md` updated (dev server runs from `apps/web/`) |
| 8 | **Git history** | LOW | `git mv` preserves history |

---

## 5. ROLLBACK PLAN

- **Per-phase rollback:** each phase is its own commit on `chore/repository-restructure`. Revert = `git revert <commit>` (a reverse `git mv` restores every path; nothing is ever deleted).
- **Generator parity gate:** if the re-run is not byte-identical, Phase A is rolled back before anything else proceeds.
- **Vercel:** the Root Directory change stays staged until the test deploy is verified; rollback = revert the dashboard setting (one click).
- **Full rollback:** `git checkout chore/layer-cleanup` (baseline `1acfc1c` with the recorded green build/test state) — the restructure branch is a pure move, so reverting is lossless.
- **Zero data risk:** no database/schema/import-logic edits at any point; `src/data/*` regeneration is only allowed to prove parity and is rolled back if it differs.

---

## 6. VERIFICATION GATES

1. After Phase A: generator output byte-identical; `npm test` + `npm run lint` still green (app untouched).
2. After Phase B: `cd apps/web && npm run build` (tsc + vite + prerender) + `npm test` + `npm run lint` all green.
3. After Phase B: Vercel Root Directory set → test deploy → production URL renders, routes work.
4. After Phase C: `git mv` clean; tree matches target; README accurate.
5. Full battery: 200+ tests, 219/219 prerender, live preview (home/explore/restaurant/manage/admin/login), responsive spot check, console clean, 0px overflow.

---

## 7. DATABASE WORKSPACE INTEGRATION — ANTIGRAVITY (verified inventory 2026-08-18)

**Source:** `C:\Users\USER\Downloads\DATABASE CREATION (ANTIGRAVITY)` — a separate, validated workspace, **not yet inside the repo**. It is a Node/Python pipeline package (package.json: supabase-js, adm-zip, csv-parser, dotenv, exceljs, mammoth, xlsx). **No `.sql` files live here** — the approved migration SQL resides in the repo and stays canonical at `database/schema/migrations/`.

### 7.1 Current inventory (verified)

| Item | Role | Secrets? |
|---|---|---|
| `.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) | Runtime creds for importers | **YES — never commit** |
| `.env.example` | Safe template | no |
| 2 docx (foundation spec v1.1, data-import enrichment mapping v1.0) | Database specifications | no |
| `KK_Actual_Menu_Extraction_FINAL_206.xlsx` + `Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx` | Source datasets (menu extraction + restaurants) | no |
| `KHABO_KOTHAY_PILOT_IMPORT_v1/` (9 preview CSVs + validation xlsx + readiness md) | **Generated pilot package** | no |
| `KHABO_KOTHAY_FULL_IMPORT_v1/` (9 preview CSVs) | **Generated full package** | no |
| `pilot_validation.json` | Validation output | no |
| Generators: `generate_pilot_package.js`, `generate_full_package.js`, `build_pilot_package.py`, `inspect_sources.py` | CSV/package generation | no |
| Validators: `build_validation_report.mjs`, `final_validation.js`, `check_full_columns.js`, `check_part3_foundation.js`, `test_columns.js` | Validation/QA | no |
| Importers: `import_to_supabase.js`, `execute_import.js`, `apply_restaurant_update.js`, `preview_restaurant_update.js`, `check_rpc.js` | Supabase import/update | no (creds via dotenv) |
| `package.json` + `package-lock.json`, `node_modules` | Pipeline tooling (Node); python/pandas needed by `.py` scripts | no |

### 7.2 Proposed mapping (old → new)

| ANTIGRAVITY (old) | Repo (new) | Notes |
|---|---|---|
| 2 spec docx | `database/docs/` | One canonical copy — the repo-root copies are deduped (§8.3) |
| `KK_Actual_Menu_Extraction_FINAL_206.xlsx`, `Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx` | `database/imports/source/` | Dedupe the restaurants XLSX that also lives in the repo root |
| `KHABO_KOTHAY_PILOT_IMPORT_v1/` (+ `pilot_validation.json`) | `database/imports/pilot/` | Generated artifacts — move-only |
| `KHABO_KOTHAY_FULL_IMPORT_v1/` | `database/imports/full/` | Generated artifacts — move-only |
| 4 generator scripts | `database/pipelines/generators/` | Path updates only, no logic |
| 5 validator scripts | `database/pipelines/validators/` | Path updates only, no logic |
| 5 importer scripts | `database/pipelines/importers/` | dotenv + CWD-relative — .env handled at runtime, never committed |
| `package.json`, `package-lock.json` | `database/` (pipeline package root) | Reinstall node_modules after move |
| `.env.example` | `database/.env.example` | `.env` is never committed (repo `.gitignore` covers `.env*`) |
| `node_modules` | not moved (reinstalled) | gitignored |
| *(repo)* `KHABO_KOTHAY_DATABASE_FOUNDATION_v1_1_FINAL_MIGRATION.sql` | `database/schema/migrations/` | Approved schema, move-only |
| *(repo)* `dhaka-raw.json` | `database/imports/source/` | |
| *(repo)* `scripts/generate-dhaka-data.mjs` | `database/pipelines/generators/` | Frontend-data generator; path updates + parity gate |
| *(repo)* `KK_DATABASE_CONTEXT_README.md` | `database/docs/` | Relative refs updated |

### 7.3 Path-dependency risks (verified)

1. **`build_validation_report.mjs` has a hardcoded absolute path** (`C:\Users\USER\Documents\Codex\2026-08-16\supabase-version`) — breaks after the move. **Decision required:** fix the path constant (a path update, not logic) or treat the script as one-off/reference and leave it.
2. **Generators read XLSX and write packages via CWD-relative paths** (`./KHABO_KOTHAY_*_v1`) — after the move they must be re-pointed to `../imports/source/` and `../imports/` (path-only edits).
3. **dotenv**: importers load `.env` from CWD — after the move, `.env` must exist at `database/` (copied, never committed; documented in the run doc).
4. **Python scripts** (`build_pilot_package.py`, `inspect_sources.py`) require python + pandas — no requirements file; environment dependency, flagged.
5. **`check_part3_foundation.js` reads a missing `spec_foundation.txt`** — non-functional as-is; move for completeness, mark one-off.
6. **node_modules / package install** — pipeline package reinstalled at `database/` after the move.

### 7.4 Recommended migration order (Antigravity integration)

1. **Pre-flight:** confirm dedupe decisions (§8.3) + the `build_validation_report.mjs` path decision; snapshot the ANTIGRAVITY folder (the repo will hold the canonical copy; originals removed only after verification).
2. **Copy-in (no path deps):** docs → `database/docs/`, source XLSX → `database/imports/source/`, pilot/full packages → `database/imports/`.
3. **Pipeline code:** scripts + `package.json`/`package-lock.json` → `database/` + `pipelines/*/`; reinstall node_modules; path-update the generators.
4. **Importer wiring:** `.env` copied to `database/` (gitignored); importer scripts path-checked (CWD root).
5. **Repo-side moves:** SQL → `database/schema/migrations/`; `dhaka-raw.json`/XLSX → `database/imports/source/`; `generate-dhaka-data.mjs` → `database/pipelines/generators/` (re-point + **byte-parity gate**); context README → `database/docs/`.
6. **Verification:** `git mv` clean; app `npm test`/`npm run build` green (untouched); pipeline smoke — run one generator/validator dry-run from the new location to prove the scripts still work.

---

## 8. OPEN DECISIONS FOR THE FOUNDER

1. **ANTIGRAVITY source-of-truth:** the separate workspace owns the canonical import pipeline. This repo's `generate-dhaka-data.mjs` (XLSX → `src/data/*.ts` for the FRONTEND) is a different, frontend-facing generator — both are kept; confirm the parity gate applies only to the frontend generator.
2. **`build_validation_report.mjs` hardcoded path** — fix the path constant (path-only edit) or treat as one-off/reference?
3. **Deduplication:** `Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx` and the v1.1 spec docx exist in both ANTIGRAVITY and the repo root — confirm a single canonical copy at `database/imports/source/` + `database/docs/`, with repo-root copies removed (originals preserved until verified).
4. **ANTIGRAVITY originals:** after copy-in + verification, may the external `DATABASE CREATION (ANTIGRAVITY)` folder be removed, or kept as-is outside the repo?
5. **Vercel Root Directory change** — confirm you will make it (or approve me to run `vercel link` + a test deploy in `apps/web/` after Phase B).
6. **Reserved scaffolding** — create `apps/admin/`, `backend/`, `packages/` stubs now or defer?
7. **README rewrite** — approved as part of Phase C?

**STOP — awaiting founder approval. No files moved; branch `chore/repository-restructure` is clean at the recorded baseline.**
