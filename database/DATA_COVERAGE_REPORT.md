# DATA COVERAGE REPORT — Khabo Kothay Supabase Dataset

**Date:** 2026-08-18
**Scope:** Read-only audit of the live Supabase dataset (FULL_IMPORT_v2, applied after migration v1.2).
**Method:** Paginated REST queries against every table; all counts verified against full row sets (no 1000-row caps).

---

## 1. Restaurant Coverage

| Dimension | Coverage | Notes |
|---|---|---|
| **Total restaurants** | **206** | `restaurants` |
| With menu record | 206 / 206 (100%) | `menus` row exists for every restaurant, all `status = ACTIVE` |
| **With menu items** | **134 / 206 (65%)** | 72 restaurants have a menu record but zero items |
| With priced items | 133 / 206 (65%) | 4,278 `price_observations`; ~1 restaurant's items lack prices |
| With image reference | 206 / 206 (100%) | `image_references`, all `GOOGLE / PENDING` |
| With Google rating | 206 / 206 (100%) | `review_signals`, all have `rating > 0` and `review_count > 0` |
| With ≥1 attribute | 206 / 206 (100%) | `restaurant_attributes`, 751 rows total |
| With source record | 206 / 206 (100%) | `restaurant_sources`, all `GOOGLE_PLACES` |

### Rating distribution (review_signals)

| Band | Count |
|---|---|
| 4.5+ | 34 |
| 4.0 – 4.49 | 159 |
| 3.5 – 3.99 | 13 |
| below 3.5 | 0 |
| none | 0 |

Ratings are complete but heavily right-skewed: 94% of restaurants rate 4.0+. There are **zero** restaurants rated below 3.5 — the dataset carries no negative-rating signal at all.

---

## 2. Attribute Coverage

`restaurant_attributes` — 751 rows across 4 attribute keys:

| Attribute key | Restaurants | Notes |
|---|---|---|
| `category` | 206 (100%) | **NOT cuisine.** Mostly venue-type "Restaurant" (89) plus real types: Fast Food (12), Chinese (10), Steak (7), Italian (7), Buffet (6), Japanese (6), Thai (6), Indian (6), Bangladeshi (6), Asian (6), Pizza (6), Turkish (5), Bengali (3), Korean (3), etc. |
| `opening_hours` | 202 (98%) | Free-text Google snippet (e.g. `Closes soon 12 am · Opens 6:30 am S…`), **not structured hours** |
| `service_options` | 196 (95%) | Free-text list (e.g. `Dine-in, Drive-through, No-contact delivery`) |
| `price_range` | 147 (71%) | **23 distinct raw strings** (e.g. `৳200–400`, `৳400–1,400`, `৳2,000+`, `৳1–200`) — inconsistent buckets, not normalized |

### Attribute keys that DO NOT exist

| Attribute | Status |
|---|---|
| **cuisine** | ❌ absent (0 rows) |
| **meal_type** | ❌ absent (0 rows) |
| **vibe** | ❌ absent (0 rows) |
| **occasion** | ❌ absent (0 rows) |
| **dietary** | ❌ absent (0 rows) |

The frontend currently surfaces cuisine/meal-type/vibe filters from a taxonomy, but **0 of 206 restaurants carry any of these attributes** — every such filter honestly returns "No matches found". This is a **data gap**, not a code bug.

---

## 3. Menu Coverage

| Classification | Restaurants | Definition |
|---|---|---|
| **Full/rich menu** | ~66 | ≥ 66 items per menu (p90), multi-category |
| **Partial menu** | ~68 | 1 – 65 items per menu |
| **No menu** | 72 (35%) | menu record exists, zero items |
| Extraction failed / unknown | 0 | no record-level failure flag exists |

### Menu item statistics (4,278 items)

| Metric | Value |
|---|---|
| Items per menu — p10 / p50 / p90 / max | 9 / 23 / 66 / 152 |
| Item name present | 4,278 / 4,278 (100%, zero empty) |
| **Item description present** | **0 / 4,278 (0%)** — `description` is `null` on every item |
| Distinct category strings | **446** — heavily unstandardized (`Appetizer` vs `Appetizers`, `Soup` vs `Soup & Salad`, `Rice` vs `Rice & Curry`) |
| Top categories | Popular (229), Appetizer (188), Chicken (118), Rice (117), Soup (116), Pizza (85), Beef (82) |

### Price observations (4,278)

| Dimension | Value |
|---|---|
| Verification status | **4,245 UNVERIFIED (99.2%)** · 33 NEEDS_REVIEW (0.8%) |
| Price column | present (verified working — e.g. Bistro-E Hummus ৳450) |
| raw_price | present per v1.2 migration |

---

## 4. Highest-Value Missing Data

Ranked by impact on user experience:

1. **Cuisine attribute (critical).** No cuisine data exists. Explore's most-used discovery filter and the homepage's "Browse by cuisine" section render empty or misleading (the `category` key holds venue type, not cuisine). This is the single largest UX gap.
2. **Meal type + vibe (high).** Filters exist in the UI taxonomy but 0 restaurants carry them; Search by "biryani" finds nothing even though biryani-type items exist in menu names — because no mapping links menu content to meal types.
3. **Menu item descriptions (high).** 0% of items have descriptions. Detail pages show name + price only; the product cannot communicate "what's in a dish" — the biggest menu-page weakness.
4. **Normalized price_range (medium).** 23 inconsistent bucket strings. Frontend already avoids deriving budget tiers from them (honest "Not listed"), but a single normalized band (৳/$$/$$$) would enable filterable budget UX.
5. **Structured opening hours (medium).** `opening_hours` is a Google prose snippet, not machine-readable hours — "open now" logic cannot be built on it.
6. **Image status (low-medium).** All 206 images are `PENDING`; the frontend already renders them per the approved status-handling decision. Full `ACTIVE` verification is a manual/operator workflow, not urgent.
7. **Negative review signal (low).** No restaurant rated < 3.5; "needs improvement" sections will always be empty.

---

## 5. Recommendations

### Should be manually collected (curated, source-backed)
- **Cuisine per restaurant** — assign from the source dataset (Google Places categories exist per restaurant; needs a curator to resolve `Restaurant` → real cuisine).
- **Meal types** — small controlled vocabulary (breakfast/lunch/dinner/snacks/dessert) mapped to existing menu categories + item names; alias system already proven (`restaurant_menu_aliases.csv`).
- **Item descriptions** — manual enrichment for the top ~50 restaurants' popular items only; do not attempt 4,278 at once.
- **Image verification** — operator flips `PENDING → ACTIVE` after visual check.

### Should be automated
- **Category standardization** — 446 raw strings → canonical set via string mapping (e.g. `Appetizer(s) → Starters`); pure code, no new data needed.
- **Normalized price bands** — parse the 23 `price_range` strings into one `$$`-style tier; safe because values already exist (only normalization, no invention).
- **Meal-type inference** — from item names + categories (e.g. "Coffee" category → Cafe/breakfast), reviewed before write.

### Should NOT be built yet
- **Structured hours parsing** — the prose snippets are too inconsistent; wait for a structured source.
- **User reviews / social proof** — no schema or data pipeline exists; out of scope.
- **Recommendation-reason generation** — would fabricate explanations; current honest "personalization signal" presentation is correct.
- **Negative-rating curation** — dataset simply lacks sub-4.0 restaurants; not fixable by engineering.

---

## 6. No-Change Confirmation

This audit made **zero changes**: no schema, no imports, no frontend, no recommendation logic. All numbers above are direct reads from the live database.
