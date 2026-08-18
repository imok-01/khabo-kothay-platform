# KHABO KOTHAY — DATABASE FOUNDATION FIX RESULT

**Phase:** Execution (approved fixes only) · **Branch:** `chore/repository-restructure`
**Status:** VALIDATED — **no Supabase import performed** (per instructions). Stop point reached.

---

## 1. CHANGES APPLIED

### A. Schema contract (prepared — NOT applied to Supabase)
`database/schema/migrations/PROPOSED_1_2_price_verification_contract.sql` was reviewed against founder decision #1 and **already matches exactly — no update required**:
- `price_observations` += `raw_price TEXT`, `verification_status verification_status NOT NULL DEFAULT 'UNVERIFIED'` (provenance preserved — original source strings like `"Tk 494 / Tk 549"` are retained in `raw_price`).
- `verification_status` enum += `UNVERIFIED`, `NEEDS_REVIEW` (existing 6 values unchanged).
- File remains **NOT APPLIED / NOT EXECUTED** — pending separate founder approval to run against Supabase.

### B. Alias system (implemented)
- `database/imports/source/restaurant_menu_aliases.csv` is the source of truth (8 rows: 6 active + 2 founder-approved branch-qualified, both no-ops).
- `generate_full_package.js` now:
  1. Loads the alias CSV (quoted-field aware; exact normalized-name match only — **no fuzzy matching**).
  2. **Fails loudly** if an alias target does not resolve to a known identity (verified in practice: a malformed CSV row was caught on first run and fixed).
  3. Applies aliases **only to menu-source names that do not already match** an identity (recovery path) — already-matched source names are reported as NO-OP and never reassigned.
  4. Supports versioned output via `--output <dir>` (default remains `imports/full` → v1 behavior preserved).
  5. Reports per-alias recovery in the validation block.

## 2. FILES MODIFIED

| File | Change |
|---|---|
| `database/pipelines/generators/generate_full_package.js` | alias loading + alias-aware matching + versioned output + alias recovery report (logic addition only; existing behavior unchanged when no alias applies) |
| `database/imports/source/restaurant_menu_aliases.csv` | approved alias mapping (8 rows, corrected quoting) |
| `database/imports/KHABO_KOTHAY_FULL_IMPORT_v2/` | **new** v2 package (9 CSVs) — v1 (`imports/full/`) untouched (verified: no git diff) |
| `database/DATABASE_FOUNDATION_FIX_RESULT.md` | this report |

## 3. BEFORE vs AFTER COUNTS

| Entity | v1 (`imports/full`) | v2 (`imports/KHABO_KOTHAY_FULL_IMPORT_v2`) | Δ |
|---|---|---|---|
| restaurants | 206 | 206 | 0 |
| restaurant_sources | 206 | 206 | 0 |
| restaurant_attributes | 751 | 751 | 0 |
| review_signals | 206 | 206 | 0 |
| menus | 206 | 206 | 0 |
| **menu_items** | **4,234** | **4,278** | **+44** |
| **price_observations** | **4,234** | **4,278** | **+44** |
| image_references | 206 | 206 | 0 |
| review_samples | 0 (header-only) | 0 (header-only) | 0 |

> Founder projection was “4,234 → ~4,316” (based on all 82 recoverable rows). Actual = **4,278 (+44)** because: 30 American Burger + 4 Mezzan + 1 O' Play rows stay excluded by the founder's own decisions (§5), and 3 of the 6 active alias source names (Kebabzz, Lakeshore, Crowne Plaza) contain only blank stub rows — attributed but contributing 0 real dishes. This is the honest, evidence-based outcome; nothing was guessed.

## 4. ALIAS RECOVERY TABLE (from v2 run output)

| Source alias | Target restaurant | Rows attributed | Real dishes recovered |
|---|---|---|---|
| Waffle Up | Waffle Up - Banani | 14 | **14** |
| Hungry Rooster | Hungry Rooster - Banani | 19 | **19** |
| Attin Arabian | Attin Arabian Restaurant | 11 | **11** |
| Kebabzz | Kebabzz Banani | 1 | 0 (blank stub) |
| Lakeshore Suites / Seven Spices | Lakeshore Suites | 1 | 0 (blank stub) |
| Crowne Plaza Dhaka Gulshan | Crowne Plaza Dhaka Gulshan Crowne Plaza Dhaka Gulshan | 1 | 0 (blank stub) |
| Mezzan Haile Aiun, Gulshan | Mezzan Haile Aiun, Dhaka | — | NO-OP (source name already matched to identity “Mezzan Haile Aiun, Gulshan”; **not reassigned** — no wrong links) |
| American Burger \| Gulshan 2 | American Burger \| Gulshan 2 | — | NO-OP (source name already matched to this identity; not reassigned) |
| **Total** | | **47 attributed** | **44 real menu items** |

Restaurants with menus: **131 → 137** (Waffle Up - Banani, Hungry Rooster - Banani, Attin Arabian Restaurant gain items; the other 3 aliased targets have menu rows with 0 items).

## 5. REMAINING UNRESOLVED CASES (unchanged, by design — UNKNOWN ≠ TRUE)

| Case | Rows | Status |
|---|---|---|
| American Burger (unqualified) | 30 | Excluded — no branch evidence (founder #4) |
| Mezzan (unqualified) | 4 | Excluded — no branch evidence (founder #4) |
| O' Play | 1 | Excluded (founder #4) |
| Fish & Co. (Gulshan 1) | — | No menu data in source under any name |
| Boithok | — | No menu data in source under any name |
| 65 venues (blank stubs) | 70 stub rows | No real menu content in source — no fake menus created |
| American Burger Banani / Mezzan Haile Aiun, Dhaka | — | Remain menu-less (branch-qualified aliases were no-ops; unqualified names correctly unassigned) |

## 6. VALIDATION RESULTS

| Check | Result |
|---|---|
| 1. Restaurant count remains 206 | ✅ PASS |
| 2. menu_items 4,234 → 4,278 (net +44; see §3 note) | ✅ PASS (evidence-based; not the 4,316 projection) |
| 3. price_observations == menu_items (4,278 = 4,278, 1:1) | ✅ PASS |
| 4. No orphan records (all 7 FK relationships, independent re-check) | ✅ PASS — 0 orphans |
| 5. UUID consistency — 0 duplicate restaurant/place/item/price IDs; 10/10 pilot UUIDs identical to pilot package | ✅ PASS |
| 6. Alias attribution report | ✅ §4 |
| 7. Ambiguous cases excluded (American Burger, Mezzan, O' Play not mapped; no-menu list = Fish & Co., Boithok, American Burger Banani, Mezzan Haile Aiun Dhaka) | ✅ PASS |
| 8. Deterministic generation — two runs produce identical output (all 9 CSVs md5-identical) | ✅ PASS |
| Extra: price status — UNVERIFIED 4,245 (was 4,201), NEEDS_REVIEW 33 (unchanged, valid states) | ✅ PASS |
| Extra: fail-loud alias validation exercised (malformed CSV caught on first run) | ✅ PASS |
| v1 package integrity — `imports/full/` byte-identical, no git diff | ✅ PASS |

## 7. IMPORT READINESS STATUS

**Package layer: READY WITH CONDITIONS. No import performed.**

- The v2 package fully matches the approved schema contract (price_observations carries `raw_price` + `verification_status`; enum values `UNVERIFIED`/`NEEDS_REVIEW` used).
- Conditions before any import:
  1. Apply the proposed migration to Supabase (`PROPOSED_1_2_price_verification_contract.sql`) — separate founder approval.
  2. Decide the 4 remaining menu-less cases (Fish & Co., Boithok, American Burger Banani, Mezzan Haile Aiun Dhaka) and the 65 blank-stub venues (collection vs v1 acceptance).
  3. Optionally resolve D5 (Crowne Plaza duplicated identity name — data-quality, independent of import).

**STOP reached as instructed — no Supabase import, no frontend changes, no architecture moves.**
