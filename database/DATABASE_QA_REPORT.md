# KHABO KOTHAY — DATABASE FOUNDATION QA REPORT

**Phase:** Database Foundation Verification (post-ANTIGRAVITY integration, commit `74fdb75`)
**Date:** Audit-only phase. No schema, data, or application changes were made.
**Verdict: NOT READY** — two concrete blockers must be resolved before the FULL import (see §6).

---

## 1. EXECUTIVE SUMMARY

The `database/` workspace is structurally sound, self-contained, and reproducible:

- **Identity layer is fully verified.** 206 restaurants, 206 sources, 206 menus, 206 review signals, 206 images, 751 attributes, **4,234 menu items, 4,234 price observations**. Zero duplicate UUIDs, zero duplicate Google Place IDs, zero orphan rows across every FK relationship, and all 10 pilot restaurant UUIDs are identical between the pilot and full packages.
- **Pipeline is deterministic.** Re-running the full generator from its new location regenerates byte-identical CSVs (`git diff` empty). No logic was changed during migration.
- **Security is clean.** No `.env` tracked, no real Supabase keys/tokens anywhere, `.gitignore` covers `node_modules`, `.env*`, `dist`, `.vercel`.

However, the QA uncovered **two genuine blockers** that the existing validators do not catch:

1. **Schema/CSV mismatch on `price_observations`** — the import package carries `raw_price` and `verification_status` columns that do **not exist** in the approved schema v1.1 table, and the `verification_status` enum has no `UNVERIFIED` / `NEEDS_REVIEW` values. A live insert will be rejected by Postgres.
2. **Menu coverage gap** — 75 of 206 restaurants have **zero menu items** in the full package, and 82 real dish rows (9 restaurants) were dropped because the menu source uses different restaurant-name variants than the identity source. The generator warns about only 10 of the 75 affected restaurants and still reports `READY`.

---

## 2. PASSED CHECKS

| # | Check | Result |
|---|---|---|
| 1 | `database/` tree structure (docs / imports / pipelines / schema) | ✅ PASS — all expected folders present, no misplaced files |
| 2 | Source of truth — `imports/source/` holds exactly the 2 canonical XLSX (identity + menu extraction); no duplicates | ✅ PASS |
| 3 | Restaurant identity count (full package) | ✅ PASS — 206 |
| 4 | restaurant_sources | ✅ PASS — 206 |
| 5 | menus | ✅ PASS — 206 |
| 6 | menu_items | ✅ PASS — **4,234** (matches expectation; see §5) |
| 7 | price_observations | ✅ PASS — **4,234** (1:1 with menu_items; matches expectation) |
| 8 | Duplicate restaurant UUIDs | ✅ PASS — 0 |
| 9 | Duplicate Google Place IDs | ✅ PASS — 0 |
| 10 | FK integrity: sources/attributes/signals/menus/items/prices/images → parents | ✅ PASS — 0 orphans in every relationship |
| 11 | Duplicate menu_item / price_observation IDs | ✅ PASS — 0 |
| 12 | Pilot ↔ full UUID consistency | ✅ PASS — 10/10 pilot restaurant UUIDs identical |
| 13 | Generator determinism (re-run from new location) | ✅ PASS — byte-identical output (`git diff` empty) |
| 14 | Pipeline script load/paths (8 scripts, `require` + run) | ✅ PASS — no hardcoded absolute paths remain, all load and run from `database/` |
| 15 | Validator smoke (`final_validation.js`) | ✅ PASS |
| 16 | Security: no `.env` committed, no real tokens in tracked files, `.gitignore` coverage | ✅ PASS |
| 17 | CSV columns match schema — restaurants, restaurant_sources, restaurant_attributes, menus, menu_items, image_references, review_signals, review_samples | ✅ PASS (nullable columns omitted by design, defaults apply) |
| 18 | Enum value validity — `menu_status='ACTIVE'`, `image_status='PENDING'` | ✅ PASS |
| 19 | Pilot package counts (corrected) | ✅ PASS — **10 restaurants / 1,080 items / 1,080 prices** (the earlier “9 / 1,079” was a `wc -l` trailing-newline artifact) |
| 20 | Review signals rating constraint (0–5) | ✅ PASS |

**Also verified:** ambiguous/string prices are handled safely — 33 price observations stored with `price = NULL` and flagged `NEEDS_REVIEW` rather than guessed; 0 rows have a dish present but a blank price; every dish in the package has a 1:1 price observation.

---

## 3. FAILED CHECKS

| # | Check | Result | Detail |
|---|---|---|---|
| F1 | `price_observations` CSV columns vs schema table | ❌ FAIL | CSV has `raw_price` + `verification_status`; schema v1.1 `price_observations` has neither. Importers reference both columns (`import_to_supabase.js` maps CSV rows verbatim; `execute_import.js` selects them). A live insert will fail with “column does not exist”. |
| F2 | `verification_status` enum values | ❌ FAIL (if F1 is fixed by adding the column) | Generator writes `UNVERIFIED` (4,201 rows) and `NEEDS_REVIEW` (33 rows). Schema enum `verification_status` only allows `UNKNOWN, SOURCE_VERIFIED, RESTAURANT_CONFIRMED, KK_VERIFIED, STALE, CONFLICTING`. |
| F3 | Menu coverage completeness | ❌ FAIL (data) | 75/206 restaurants have **zero menu items** in the full package (see §5). The generator’s console warning lists only 10 of them, and the `IMPORT READINESS` verdict does not gate on menu coverage. |

---

## 4. UNKNOWNS REQUIRING DECISION

| # | Unknown | Who decides | Options |
|---|---|---|---|
| U1 | Should `price_observations` gain `raw_price` + `verification_status` (with enum extension), or should the generator/importers drop those columns? | Founder + schema owner | (a) Extend schema — preserves price provenance and the NEEDS_REVIEW safety mechanism (recommended); (b) strip columns — loses provenance, keeps schema v1.1 untouched |
| U2 | How should the 82 dish rows (9 restaurants) whose menu-source name differs from the identity name be handled? | Founder + data owner | (a) Build a name-alias mapping (schema already has `restaurant_aliases`) and re-run the generator; (b) accept partial menu coverage for those 9 venues for v1 |
| U3 | Are the 65 restaurants whose menu-source rows are **blank stubs** (no dish/price/category — 70 rows total, mostly 1 stub row each) expected to have menus later, or are they genuinely menu-less venues? | Founder + data owner | Affects whether the 75 empty menus are a v1 acceptance criterion or a later enrichment item |
| U4 | `menus.title` is `NULL` for all 206 rows and `menus.source_id` is `NULL` — acceptable placeholder, or must menus carry a title/source before import? | Founder | Cosmetic/data-completeness; not import-blocking |

---

## 5. MENU COUNT DISCREPANCY INVESTIGATION (4,234 vs 4,382)

**FACT — the difference is fully explained and reproducible.** No guessing.

- Menu extraction source (`KK_Actual_Menu_Extraction_FINAL_206.xlsx`): **4,382 rows** across **205 distinct restaurant names**.
- The full generator keeps every row whose `Restaurant Name` (normalized: lowercase, non-alphanumeric stripped) matches an identity restaurant, and whose `Dish Name` is non-blank.
- Dropped rows = **148**:
  - **82 rows** — the menu-source restaurant name does not match any identity restaurant name after normalization. These are **real dishes** (all have prices) belonging to 9 venues whose names differ between the two source files:
    | Menu-source name | Rows | Identity counterpart (has zero menus) |
    |---|---|---|
    | American Burger | 30 | American Burger Banani (data ambiguous vs “American Burger \| Gulshan 2”) |
    | Hungry Rooster | 19 | Hungry Rooster - Banani |
    | Waffle Up | 14 | Waffle Up - Banani |
    | Attin Arabian | 11 | Attin Arabian Restaurant |
    | Mezzan | 4 | Mezzan Haile Aiun, Dhaka |
    | O' Play | 1 | O' Play Restaurant |
    | Crowne Plaza Dhaka Gulshan | 1 | Crowne Plaza Dhaka Gulshan Crowne Plaza Dhaka Gulshan |
    | Kebabzz | 1 | Kebabzz Banani |
    | Lakeshore Suites / Seven Spices | 1 | Lakeshore Suites |
  - **66 rows** — blank dish-name rows within name-matched restaurants (carry no dish/price/category content; no real data lost).
- `4,382 − 82 − 66 = 4,234` ✅ — exactly the package count.

**Consequences (all fact-verified):**
- **131/206** restaurants have menu items in the package.
- **75/206** have zero menu items, split:
  - **65** — name-matched but their menu-source rows are blank stubs (70 stub rows total, e.g., Seasonal Tastes, Pan Tao Thai Cuisine, Tehari Baba, QD's). No real content exists for them in the source.
  - **10** — no name match in the menu source at all. **9 of these 10 have real dish data present in the source under a variant name** (the 82 rows above); ~1–2 are genuinely absent (e.g., Fish & Co. (Gulshan 1), Boithok — variant attribution is ambiguous without a name-alias map).
- The generator’s own console output warns about the 10 no-match restaurants but **still prints `IMPORT READINESS: READY`** — readiness does not account for menu coverage.

**Classification:** this is a **DATA ALIGNMENT problem** between the two source files, surfaced (not caused) by the generator’s strict exact-normalized-name matching. It is not a random bug: behavior is deterministic and consistent with the pilot.

---

## 6. IMPORT READINESS RECOMMENDATION

### Classification: **NOT READY**

The structure, identity layer, relationships, and pipeline are sound, but two items must be resolved before the FULL import:

1. **F1/F2 — `price_observations` schema alignment (blocking, technical).** The import package and importers assume `raw_price` and `verification_status` exist on `price_observations`; the approved schema v1.1 does not have them, and the enum lacks `UNVERIFIED`/`NEEDS_REVIEW`. Resolve via U1 (recommended: extend the schema + enum) **or** strip the columns from generator + importers in one commit. Either way, re-run the generator and re-verify counts.
2. **F3 — menu coverage decision (blocking, data).** Decide U2 (name-alias mapping for the 9 variant restaurants — the schema already has `restaurant_aliases`) and U3 (are the 65 blank-stub restaurants expected to have menus?). Until decided, the full package silently ships 75/206 restaurants with empty menus.

**Not blocking:** U4 (menus.title/source_id), the 33 `NEEDS_REVIEW` prices (by design), the 12 rows with dish-but-no-category, 4 restaurants missing address.

**Pipeline is safe to re-run at any time** — generation is deterministic and writes only to `database/imports/`. No Supabase connection, no `.env`, and no live import were used or touched during this audit.
