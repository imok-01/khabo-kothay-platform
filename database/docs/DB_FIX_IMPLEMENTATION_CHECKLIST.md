# KHABO KOTHAY — DB FOUNDATION FIX: FINAL IMPLEMENTATION CHECKLIST

**Status:** APPROVED DIRECTION (founder) — PREPARATION ONLY. Nothing applied, nothing regenerated, no Supabase access.
**Prepared artifacts (this phase):**
- `database/schema/migrations/PROPOSED_1_2_price_verification_contract.sql` (NOT APPLIED)
- `database/imports/source/restaurant_menu_aliases.csv` (6 HIGH-confidence aliases; ambiguous rows excluded)

---

## 1. MIGRATION STEPS (apply only after founder approval)

| # | Step | Command / artifact | Gate |
|---|---|---|---|
| M1 | Confirm working tree clean + branch | `git status --short` on `chore/repository-restructure` | clean |
| M2 | Copy the proposal SQL into the Supabase SQL editor (or run via `psql`/`supabase db push` as a NEW migration file — do NOT edit the approved v1.1 file) | `PROPOSED_1_2_price_verification_contract.sql` | founder approval |
| M3 | Apply the migration (enum `ALTER TYPE ... ADD VALUE` ×2, then `ALTER TABLE price_observations` ×2) | runs inside one `BEGIN/COMMIT` | success, no errors |
| M4 | Verify schema contract | `\d price_observations` → `raw_price TEXT` + `verification_status verification_status NOT NULL DEFAULT 'UNVERIFIED'`; `SELECT enum_range(NULL::verification_status)` → 8 values incl. `UNVERIFIED`, `NEEDS_REVIEW` | both match |
| M5 | Verify no data was touched | `SELECT count(*) FROM price_observations;` → 0 | 0 rows |
| M6 | Sync frontend type (same change set) | `src/integrations/supabase/database.types.ts`: add `'UNVERIFIED' | 'NEEDS_REVIEW'` to `VerificationStatus` | tsc clean |

## 2. ALIAS INSERTION STEPS (generator-side, Option A — approved)

| # | Step | Detail | Gate |
|---|---|---|---|
| A1 | Keep `restaurant_menu_aliases.csv` as the single source of truth (6 rows, HIGH only) | columns: `restaurant_id, restaurant_name, source_alias, confidence, evidence` | file reviewed |
| A2 | Add alias-aware matching to `generate_full_package.js` (and pilot generator for parity) | when a menu row's `Restaurant Name` does not normalize-match an identity name, look it up in the alias file by `source_alias` (normalized) → attribute to `restaurant_id`; log every alias hit | code review |
| A3 | Load-time validation | fail loudly if a `source_alias` maps to an unknown `restaurant_id` or duplicates an existing match | no silent fallback |
| A4 | Ambiguous rows stay unmapped | American Burger (30), Mezzan (4), O' Play (1) must remain in the existing dropped/warned set until D1/D2/D4 are decided | no aliases added |

## 3. REGENERATION STEPS (only after founder approval — NOT now)

| # | Step | Expected | Gate |
|---|---|---|---|
| R1 | Re-run full generator from `database/` | `node pipelines/generators/generate_full_package.js` | approval |
| R2 | Verify menu_items / price_observations | ~4,234 + 82 = **4,316** (subject to dedup review) | counts match projection |
| R3 | Verify per-restaurant coverage | restaurants with menus: 131 → ~139–140; empty menus: 75 → ~67 (65 blank stubs + Fish & Co. + Boithok) | matches projection |
| R4 | Verify determinism | regenerate twice → byte-identical CSVs; `git diff` clean | identical |
| R5 | Confirm no other rows changed | diff of all 9 CSVs vs baseline shows only the aliased menu/price rows | scoped diff |

## 4. VALIDATION STEPS (post-regeneration)

| # | Check | Command | Expect |
|---|---|---|---|
| V1 | Row counts | QA script / generator output | 206 / 206 / 206 / 4,316 / 4,316 / 751 / 206 / 206 |
| V2 | Identity integrity | generator validation block | 0 dup UUIDs, 0 dup place IDs, 0 dup names |
| V3 | FK integrity | generator validation block | 0 orphans across all 7 relationships |
| V4 | Pilot UUID consistency | generator validation block | 10/10 identical |
| V5 | Alias attribution | per-alias row count vs CSV — verify each alias landed on its restaurant (6 aliases → 47 rows: 14+19+11+1+1+1) | 1:1 match |
| V6 | Ambiguous rows still flagged | 30 + 4 + 1 rows still reported as unmatched | unchanged |
| V7 | Price status | 4,201 `UNVERIFIED` + 33 `NEEDS_REVIEW` | unchanged counts |
| V8 | `final_validation.js` | `node pipelines/validators/final_validation.js` | PASS |
| V9 | Security | `git grep` no tokens, `.env` untracked | clean |

> V5 note: the 6 HIGH aliases account for 47 rows (Waffle Up 14 + Hungry Rooster 19 + Attin Arabian 11 + Kebabzz 1 + Lakeshore 1 + Crowne Plaza 1). The remaining 35 (American Burger 30 + Mezzan 4 + O' Play 1) stay unmatched pending decisions.

## 5. ROLLBACK PLAN

| Layer | Rollback |
|---|---|
| Migration | New values are additive: `ALTER TABLE price_observations DROP COLUMN raw_price, DROP COLUMN verification_status;` and drop `UNVERIFIED`/`NEEDS_REVIEW` from the enum only if no rows use them (enum values cannot be removed if referenced — safe path: keep enum values, they are harmless). Full revert = restore the v1.1 migration state. |
| Alias file | Delete `restaurant_menu_aliases.csv` → generator falls back to exact-name matching (pre-fix behavior, byte-identical to current package). |
| Generator code | Revert the alias-aware commit (`git revert`) — changes are isolated to the generator + alias file; no data-layer impact. |
| Regenerated packages | `git checkout -- database/imports/full` restores the current 4,234 baseline (deterministic regeneration also makes re-run cheap). |
| Supabase data | No import in this phase → nothing to roll back in the database beyond the schema DDL above. |

**Guardrail:** every step above stops at the founder gates (M1, M2, R1). Nothing in this checklist executes automatically.

## 6. DECISIONS STILL OPEN (block completion of the full fix)

- D1 — American Burger (30 rows): Banani vs Gulshan 2
- D2 — Mezzan (4 rows): Haile Aiun Dhaka vs Gulshan
- D4 — O' Play (1 row): accept merge into O' Play Restaurant (MEDIUM confidence)
- D3 — 65 blank-stub venues: v1 menu collection expectation
- D5 — Crowne Plaza identity name duplication (data-quality, independent)
