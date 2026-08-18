# DATABASE INTELLIGENCE ENRICHMENT PLAN (PHASE 2)

**Project:** Khabo Kothay
**Date:** 2026-08-18
**Status:** PROPOSAL — awaiting approval. No live writes performed.
**Basis:** DATABASE_INTELLIGENCE_AUDIT.md (measured findings only).

---

## 1. PRINCIPLES

1. **No new schema.** Provenance uses the existing `verification_records` table (field_name, field_value JSONB, status, verification_source, verified_at) — the spec's designed trust layer. The frontend transformer already has `mapVerificationStatuses` as its connection point.
2. **Frontend untouched.** `restaurant_attributes.attribute_value` stays in the exact shape the frontend already reads (`cuisines`/`mealTypes`/`vibes`/`signatureDishes` as JSON arrays, `opening_hours`/`budget` etc. as strings). No component or transformer change.
3. **Evidence only.** Every new value is derived from the identity spreadsheet, the menu extraction file, or the live DB — never inferred ("premium ⇒ luxury" style guessing is forbidden).
4. **No deletes, no overwrites of stronger values.** Upsert only; skip when a value already exists with equal/higher verification.
5. **Dry-run first.** The pipeline writes nothing until run with `--apply`; default is a full diff report.

---

## 2. PROPOSED PIPELINE

New script: `database/pipelines/enrichment/enrich_intelligence.js`

```
identity spreadsheet + menu extraction + live DB
        │
        ▼
  MATCH restaurants (exact normalized name → stableId; alias CSV as fallback)
        │
        ▼
  BUILD enrichment rows (see §4)
        │
        ├─ restaurant_attributes  (cuisines / mealTypes / vibes / signatureDishes)
        ├─ verification_records  (provenance per attribute)
        ├─ restaurants           (description, area, city — only where evidence)
        └─ menu_items            (category normalization)
        │
        ▼
  DRY-RUN diff report  →  approved  →  --apply (safe upserts)
```

Modes:
- `node enrich_intelligence.js` → dry-run (prints planned inserts/updates, writes nothing)
- `node enrich_intelligence.js --apply` → performs the upserts (only after approval)

---

## 3. FILES TO CHANGE

| File | Action | Purpose |
|---|---|---|
| `database/pipelines/enrichment/enrich_intelligence.js` | **NEW** | Main enrichment pipeline (dry-run + apply) |
| `database/pipelines/enrichment/menu_category_map.json` | **NEW** | Curated 445 → canonical menu-category normalization map |
| `database/pipelines/enrichment/ENRICHMENT_REPORT.md` | **NEW** (output) | Before/after + confidence distribution after run |
| `database/DATABASE_INTELLIGENCE_AUDIT.md` | unchanged | Source of truth for the gaps |
| Frontend / schema / importers / generators | **NOT touched** | — |

---

## 4. ENRICHMENT SCOPE (evidence-based)

### 4.1 `restaurant_attributes` — new discovery keys

| attribute_key | Source of evidence | How derived | Confidence | verification_status |
|---|---|---|---|---|
| `cuisines` | identity `Category` column | Map the ~37 venue/cuisine values (Chinese, Thai, Japanese, Italian, Korean, Bangladeshi, Turkish, Middle Eastern, Mexican, Lebanese, Cantonese, Portuguese, Indian, Bengali, Sushi, Pizza, Steak, Seafood, Fast Food…) into a canonical cuisine list. `"Restaurant"` (89) and non-cuisine venue types (Buffet, Food court, Cafe…) yield **no** cuisine — honest gap. | HIGH (Google category) | SOURCE_VERIFIED |
| `mealTypes` | menu extraction `Category Name` | A restaurant gets `Breakfast`/`Lunch`/`Dinner`/`Dessert`/`Snacks` only when its menu has a matching category (measured: breakfast 5, brunch 3, lunch 3, dinner 1, dessert 29, snacks 11; union 43 restaurants). Values restricted to the frontend's controlled vocabulary. | MEDIUM (menu text) | SOURCE_VERIFIED |
| `vibes` | none available | **No evidence** → NOT populated. Stays empty (honest) until external review signals exist. | — | — |
| `occasion` / `dietary` | none available | **No evidence** → NOT populated. | — | — |
| `signatureDishes` | menu extraction | Dishes under menu categories explicitly named `Popular` / `Signature` / `Chef's special` / `Most popular` (measured: 68 restaurants have such a section). Only menu items in those sections qualify. | MEDIUM (menu text) | SOURCE_VERIFIED |

### 4.2 `restaurants` table

| Field | Source | Action |
|---|---|---|
| `description` | none | **Not populated** — no source text exists anywhere. Honest empty until curated content (the audit's manual-collection item). |
| `area` | address text | Set only when the address explicitly contains a known Dhaka area (measured: 20/206 addresses name an area like Gulshan/Banani). Others stay NULL. |
| `city` | dataset scope | Set `Dhaka` where area/address is present and the dataset is Dhaka-scoped; only for rows currently NULL. |

### 4.3 `menu_items` — category normalization

- Curated map (~445 distinct → ~40 canonical): e.g. `Appetizer`/`Appetizers`/`Starters`/`Starter` → `Starters`; `Soups`/`Soup` → `Soup`; `Dessert`/`Desserts` → `Dessert`; `Pizza`/`Gourmet Pizza`/`Classic Pizza` → `Pizza`; etc.
- Only exact/listed mappings apply. **863 items with NULL category stay NULL** (no guessing).
- This powers the menu grouping and future dish-level search without inventing taxonomy.

### 4.4 Provenance (every enrichment row)

For each new/modified attribute, one `verification_records` row:
- `field_name` = attribute key (`cuisines`, `mealTypes`, …)
- `field_value` = the stored value (JSONB)
- `status` = `SOURCE_VERIFIED`
- `verification_source` = `GOOGLE_PLACES` or `MENU_EXTRACTION`
- `verified_at` = run timestamp

---

## 5. EXPECTED DATABASE IMPACT (dry-run will confirm exact counts)

| Table | Approx. new/modified rows |
|---|---|
| `restaurant_attributes` | ~100–130 new rows (cuisines ~90–110, mealTypes ~43, signatureDishes ~68) |
| `verification_records` | ~1 per enriched attribute (~200–250) |
| `restaurants` | ~20 `area` updates, ~200 `city` updates (NULL→Dhaka) |
| `menu_items` | ~3,400 `category` normalization updates (exact-match only) |

**No deletes. No ID changes. No overwrites of stronger values. No schema change.**

---

## 6. EXECUTION ORDER (after approval)

1. Write `menu_category_map.json` (curated from the 445 measured categories).
2. Write `enrich_intelligence.js` with dry-run default.
3. Run dry-run → produce `ENRICHMENT_REPORT.md` diff (rows to insert/update).
4. Founder reviews diff → `--apply`.
5. Re-run the coverage queries from the audit to confirm before/after numbers.

---

## 7. WHAT IS DELIBERATELY NOT DONE

- **No fabrication:** vibes/occasion/dietary/descriptions stay empty — no source evidence exists.
- **No schema change:** provenance lives in existing `verification_records`.
- **No frontend change:** attribute shapes already match what the UI reads.
- **No destructive import:** upsert-only, deterministic IDs, no deletes.
- **No "order online" links** promoted as websites (they are Google searchviewer redirects).
- **No image verification** (all 206 remain PENDING; separate task).
- **No price VERIFIED promotion** (33 NEEDS_REVIEW stay as-is; 4,245 UNVERIFIED stay).

---

## 8. DECISION NEEDED FROM FOUNDER

1. Approve the cuisine mapping derived from Google `Category` values (list shown in dry-run before apply).
2. Approve `city = 'Dhaka'` backfill for NULL rows (dataset is Dhaka-scoped).
3. Approve signature-dish rule: only items under menu sections explicitly named Popular/Signature/Chef's special.
4. Confirm `verification_status` value `SOURCE_VERIFIED` for these enrichment rows (vs `NEEDS_REVIEW`).
