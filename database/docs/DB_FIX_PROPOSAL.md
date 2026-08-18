# KHABO KOTHAY — DATABASE FOUNDATION FIX PROPOSAL

**Source:** `DATABASE_QA_REPORT.md` (verdict: NOT READY — two blockers)
**Status:** PROPOSAL ONLY — nothing applied, nothing regenerated, no Supabase access, no frontend changes.
**Scope:** schema contract · verification_status design · menu identity alignment · migration plan.

---

## 0. BLOCKERS BEING ADDRESSED

| # | Blocker | Fix proposed here |
|---|---|---|
| F1 | `price_observations` CSV carries `raw_price` + `verification_status`; schema v1.1 has neither | §1 schema change (additive only — provenance preserved) |
| F2 | Pipeline states `UNVERIFIED` / `NEEDS_REVIEW` not in `verification_status` enum | §2 enum extension |
| F3 | 82 real dish rows (9 restaurants) dropped; 75/206 restaurants have empty menus | §3 alias mapping via existing `restaurant_aliases` table |

---

## 1. SCHEMA CONTRACT — `price_observations` (F1)

### Current (approved v1.1, `KHABO_KOTHAY_DATABASE_FOUNDATION_v1_1_FINAL_MIGRATION.sql`)

```sql
CREATE TABLE price_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    price DECIMAL,
    currency TEXT DEFAULT 'BDT',
    source_id UUID REFERENCES restaurant_sources(id) ON DELETE RESTRICT,
    observed_at TIMESTAMP DEFAULT NOW()
);
```

### What the generator + importers already produce

CSV header: `id, menu_item_id, price, currency, raw_price, source_id, observed_at, verification_status`
- `raw_price` — original source string (e.g. `"from Tk 190"`, `"1,200"`) — provenance, never discarded
- `verification_status` — `UNVERIFIED` (4,201 rows) / `NEEDS_REVIEW` (33 rows, price NULL, ambiguous extraction)

Both importers reference these columns (`import_to_supabase.js` inserts CSV rows verbatim; `execute_import.js` selects them), so the schema must grow, not the pipeline shrink.

### Proposed (additive only — **no provenance loss**)

```sql
ALTER TABLE price_observations
    ADD COLUMN raw_price TEXT,
    ADD COLUMN verification_status verification_status NOT NULL DEFAULT 'UNVERIFIED';
```

- `raw_price` keeps the exact source string for auditability and later re-parse.
- `verification_status` reuses the (extended) enum from §2; `price` stays nullable — `NEEDS_REVIEW` rows keep `price = NULL` by design.
- `UNIQUE(menu_item_id)` is intentionally **not** proposed: multiple observations per item (different sources/dates) are part of the approved model.

---

## 2. VERIFICATION_STATUS DESIGN (F2)

### Current states

| Layer | States |
|---|---|
| Pipeline (generator) | `UNVERIFIED` (4,201) · `NEEDS_REVIEW` (33) |
| Database enum v1.1 | `UNKNOWN` · `SOURCE_VERIFIED` · `RESTAURANT_CONFIRMED` · `KK_VERIFIED` · `STALE` · `CONFLICTING` |
| Frontend type (`database.types.ts`) | identical to the v1.1 enum (6 values) |

### Proposed enum (extend — do not replace)

```sql
CREATE TYPE verification_status AS ENUM (
    'UNKNOWN',             -- no state asserted (unchanged)
    'UNVERIFIED',          -- NEW: machine-extracted, awaiting review (import default)
    'NEEDS_REVIEW',        -- NEW: extraction flagged ambiguity; human review required
    'SOURCE_VERIFIED',     -- unchanged
    'RESTAURANT_CONFIRMED',-- unchanged
    'KK_VERIFIED',         -- unchanged
    'STALE',               -- unchanged
    'CONFLICTING'          -- unchanged
);
```

> NOTE: this is the *proposed* enum definition; the approved migration file is not edited in this phase. The actual applied change would be `ALTER TYPE verification_status ADD VALUE 'UNVERIFIED'; ALTER TYPE verification_status ADD VALUE 'NEEDS_REVIEW';` (Postgres 12+).

### State lifecycle

```
UNVERIFIED ──review──▶ SOURCE_VERIFIED ──▶ RESTAURANT_CONFIRMED ──▶ KK_VERIFIED
     │                        │
     └──▶ NEEDS_REVIEW ◀──────┘ (ambiguous extraction → human review → verified / CONFLICTING)
UNKNOWN = no state asserted   ·   STALE = previously verified, data aged
```

- `UNVERIFIED` is the honest import default for machine-extracted prices (per the rule UNKNOWN ≠ TRUE, but the distinction "extracted, not reviewed" vs "no state" matters operationally).
- `NEEDS_REVIEW` preserves the review signal that currently would be lost if mapped to `UNKNOWN` (the 33 ambiguous-price rows must stay visible to reviewers).

### Required sync (when the schema lands — NOT in this phase)

`src/integrations/supabase/database.types.ts` — add `'UNVERIFIED' | 'NEEDS_REVIEW'` to the `VerificationStatus` union so the frontend type matches the applied DB enum.

---

## 3. MENU IDENTITY ALIGNMENT (F3)

### 3.1 The dropped rows — exact facts

- 4,382 source menu rows → 148 dropped → 4,234 kept (package matches exactly).
- 66 of the 148 are **blank-dish stub rows** (70 total stubs across 69 restaurants; ~1 stub row each, no dish/price/category content). No real data lost; these venues have no extracted menu in the source.
- **82 of the 148 are real dishes** with prices, dropped because the menu-source restaurant name does not normalize-match an identity name.

### 3.2 Alias evidence (source-verified, per restaurant)

Matching: normalized name + token containment against the identity set (206 deduped). No aliases invented — every candidate below is a name contained in the identity source file.

| # | Menu-source name | Rows | Identity candidate(s) | Evidence | Confidence |
|---|---|---|---|---|---|
| 1 | Waffle Up | 14 | **Waffle Up - Banani** | unique token containment; candidate has zero menus | HIGH (1:1) |
| 2 | Hungry Rooster | 19 | **Hungry Rooster - Banani** | unique token containment; candidate has zero menus | HIGH (1:1) |
| 3 | Attin Arabian | 11 | **Attin Arabian Restaurant** | unique token containment; candidate has zero menus | HIGH (1:1) |
| 4 | Kebabzz | 1 | **Kebabzz Banani** | unique token containment; candidate has zero menus | HIGH (1:1) |
| 5 | Lakeshore Suites / Seven Spices | 1 | **Lakeshore Suites** | token containment (source ⊃ identity); candidate has zero menus | HIGH (1:1) |
| 6 | Crowne Plaza Dhaka Gulshan | 1 | **Crowne Plaza Dhaka Gulshan Crowne Plaza Dhaka Gulshan** | token containment; NOTE identity name itself is duplicated text (data-quality item) | HIGH (1:1) |
| 7 | O' Play | 1 | **O' Play Restaurant** | unique token containment; candidate **already has menu items** (source contains both name forms) — alias merges 1 extra dish | MEDIUM (source-internal inconsistency; likely same venue) |
| 8 | American Burger | 30 | **American Burger Banani** **OR** American Burger \| Gulshan 2 | two identity candidates, both score equal; menu source has no address/place-id to disambiguate | **AMBIGUOUS — founder decision required** |
| 9 | Mezzan | 4 | **Mezzan Haile Aiun, Dhaka** **OR** Mezzan Haile Aiun, Gulshan | two identity candidates; “Mezzan Haile Aiun, Gulshan” already has menus | **AMBIGUOUS — founder decision required** |

**Total affected rows: 82** (30 + 19 + 14 + 11 + 4 + 1 + 1 + 1 + 1).

### 3.3 Restaurants with NO menu data in source (not alias-fixable)

| Identity | Reason | Action |
|---|---|---|
| Fish & Co. (Gulshan 1) | no menu-source name matches (only “Great Britain Fish n Chips” exists) | future menu collection |
| Boithok | no menu-source name matches at all | future menu collection |
| 65 venues (blank stubs) | source contains only blank placeholder rows (70 stubs total, e.g., Seasonal Tastes, Pan Tao Thai Cuisine, Tehari Baba, QD's) | collection decision (see §6, decision D3) |

### 3.4 Proposed mechanism (no schema change needed)

The `restaurant_aliases` table already exists (`restaurant_id`, `alias_name`, UNIQUE(restaurant_id, alias_name)). Two options:

- **Option A (recommended): generator-side alias input.** Add a small source-controlled mapping file `database/imports/source/restaurant_menu_aliases.csv` (`menu_source_name, restaurant_name`) that the generator consults when matching menu rows. Keeps the pipeline self-contained, no DB dependency at generation time, byte-identical behavior for everything else.
- **Option B: DB seed after import.** Populate `restaurant_aliases` from the approved mapping and re-import menus later. Requires an import round-trip; slower.

Proposed alias INSERTs (Option B equivalent) are included in the proposed SQL file for reference — **gated on founder approval** (ambiguous rows #8/#9 excluded until decided).

---

## 4. AFFECTED ROWS SUMMARY

| Dataset | Today | After fix (projected) |
|---|---|---|
| menu_items (full) | 4,234 | ~4,316 (+82 aliased rows, subject to dedup review) |
| price_observations (full) | 4,234 | ~4,316 (1:1 with items) |
| restaurants with menus | 131 / 206 | ~139–140 / 206 (8 aliased zero-menu identities + O' Play merge) |
| restaurants with empty menus | 75 / 206 | ~67 / 206 (65 blank stubs + Fish & Co. + Boithok) |
| price status (if enum applied) | UNVERIFIED 4,201 · NEEDS_REVIEW 33 | unchanged counts, valid enum values |

---

## 5. MIGRATION PLAN (ordered, gated — nothing runs without approval)

1. **[FOUNDER GATE]** Approve this proposal: schema additions (§1), enum extension (§2), alias mapping incl. decisions on American Burger + Mezzan (§3.2 #8/#9, §6 D1/D2).
2. **Schema change (separate migration, no data import):** apply `PROPOSED_1_2_price_verification_contract.sql` to the Supabase project. Verify `\d price_observations` shows the two new columns and the enum has 8 values.
3. **Contract check:** confirm generator output already conforms (it does — the CSV already carries both columns) and importers map them (they do). No generator logic change for F1/F2.
4. **Alias implementation (per §3.4 decision):** create the alias mapping input (Option A) or seed INSERTs (Option B). Only approved, unambiguous rows (#1–#7) first; #8/#9 only after D1/D2.
5. **[FOUNDER GATE] Regeneration:** re-run the full generator → re-verify counts (projected §4), FK integrity, determinism (byte-diff vs baseline), and the QA checklist from `DATABASE_QA_REPORT.md`.
6. **Sync:** update `database.types.ts` `VerificationStatus` (+ spec docx if it lists price_observations columns) in the same change as the applied migration.
7. **Final gate:** full import still NOT performed — awaiting separate founder approval.

**Explicitly NOT in this phase:** Supabase import, frontend behavior changes, architecture moves, edits to the approved v1.1 migration file.

---

## 6. OPEN DECISIONS

| # | Decision | Options | Blocks |
|---|---|---|---|
| D1 | American Burger (30 rows) attribution | (a) all → American Burger Banani; (b) all → American Burger \| Gulshan 2; (c) split by dish-name analysis (manual) | rows #8 |
| D2 | Mezzan (4 rows) attribution | (a) all → Mezzan Haile Aiun, Dhaka; (b) all → Mezzan Haile Aiun, Gulshan | rows #9 |
| D3 | 65 blank-stub venues: menus expected for v1? | (a) accept empty menus for v1; (b) schedule collection | F3 residual |
| D4 | O' Play merge (1 row into an identity that already has menus) | accept / reject | rows #7 |
| D5 | Crowne Plaza identity name duplication (“…Gulshan Crowne Plaza Dhaka Gulshan”) | fix identity name vs keep as-is (separate data-quality item) | none (menu fix independent) |
