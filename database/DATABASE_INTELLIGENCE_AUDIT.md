# DATABASE INTELLIGENCE AUDIT

**Project:** Khabo Kothay — Restaurant Intelligence Enrichment (PHASE 1 · Audit only)
**Date:** 2026-08-18
**Scope:** Compare live Supabase dataset against the approved source spreadsheets and identify every intelligence gap.
**Rule honored:** No writes. No schema changes. No fabrication. Every number below was measured from the live database or the source files.

---

## 1. RESTAURANT IDENTITY COVERAGE

### 1.1 Source spreadsheet (Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx — 206 rows)

| Field | Coverage |
|---|---|
| Restaurant name | 206 / 206 |
| Google Place ID | 206 / 206 |
| Google Maps link | 206 / 206 |
| Google rating | 206 / 206 |
| Google review count | 206 / 206 |
| Category | 206 / 206 |
| Address | 202 / 206 |
| Opening status / hours | 202 / 206 |
| Service options | 196 / 206 |
| Price range | 147 / 206 |
| Order online link | 130 / 206 |
| Google photo link | 206 / 206 |
| Latitude / Longitude | 206 / 206 |
| Source page | 206 / 206 |

> **Note:** The spreadsheet has **no** Website column and **no** Phone column. It never contained real restaurant websites or phone numbers. The "Order online link" values are **Google searchviewer redirects** (e.g. `https://www.google.com/searchviewer/42?cvd=...`), NOT real order platforms or websites — they must never be presented as a verified website.

### 1.2 Live database (restaurants table — 206 rows)

| Field | Coverage |
|---|---|
| name | 206 / 206 |
| address | 202 / 206 |
| latitude / longitude | 206 / 206 |
| description | **0 / 206** |
| city | **0 / 206** |
| area | **0 / 206** |
| phone | **0 / 206** |
| website | **0 / 206** |

### 1.3 Where the Google identity data actually lives (relational, correct)

The spreadsheet's Google fields were NOT dropped — they were stored relationally rather than on the `restaurants` row:

| Data | Table | Coverage |
|---|---|---|
| Google rating + review count | `review_signals` | 206 / 206 (rating 4.0+, **zero below 3.5**, zero null) |
| Google Place ID + Maps URL | `restaurant_sources` (GOOGLE_PLACES, `source_identifier`, `source_url`) | 206 / 206 |
| Google photo | `image_references` | 206 / 206 (all `PENDING`) |
| Category / hours / services / price range | `restaurant_attributes` | 206 / 202 / 196 / 147 |

**Conclusion:** Identity data is present but **fragmented across 4 tables** and **not all surfaced by the frontend**. The `restaurants` row itself is bare (no description, city, area, phone, website).

---

## 2. DISCOVERY INTELLIGENCE COVERAGE

### 2.1 Attribute keys present in `restaurant_attributes` (751 rows)

| attribute_key | Rows |
|---|---|
| category | 206 |
| opening_hours | 202 |
| service_options | 196 |
| price_range | 147 |
| **cuisine** | **0** |
| **meal_type** | **0** |
| **occasion** | **0** |
| **vibe** | **0** |
| **dietary** | **0** |

**The entire discovery-intelligence layer is absent.** There is no cuisine, meal type, occasion, vibe, or dietary data anywhere in the database.

### 2.2 What `category` actually contains (NOT cuisine)

The `category` attribute is **venue type**, not cuisine:
- `"Restaurant"` × 89, `"Fast Food"` × 12, `"Chinese"` × 10, `"Steak"` × 7, `"Italian"` × 7, `"Buffet"` × 6, `"Japanese"` × 6, `"Thai"` × 6, `"Indian"` × 6, `"Asian"` × 6, `"Bangladeshi"` × 6, etc.

This is why the Explore **cuisine filter returns zero results** — the data genuinely has no cuisine attribute, and the UI honestly reports "No matches found."

### 2.3 Data-quality artifacts (import-time)

- **Literal quote characters** are stored in `attribute_value` for category, price_range, and opening_hours (e.g. `"Restaurant"`, `"৳200–400"`, `"Closes soon 12 am · Opens 6:30 am S"`). The frontend strips these, but the raw DB values are not clean.
- **price_range:** 147 rows, **23 raw string values** (e.g. `৳200–400`, `৳400–1,400`, `৳2,000+`) — no normalized bands.
- **opening_hours:** prose snippets, **not structured** (no parsed open/close times).

---

## 3. MENU INTELLIGENCE

### 3.1 Row reconciliation (source → DB)

| Stage | Rows |
|---|---|
| Source file (KK_Actual_Menu_Extraction_FINAL_206.xlsx) | 4,382 |
| − Placeholder rows (empty Dish Name, no price/category) | −70 |
| = Valid rows | 4,312 |
| − Excluded by founder decision (American Burger 30 + Mezzan 4 — ambiguous, not in alias map) | −34 |
| **= DB (`menu_items`)** | **4,278** ✓ |

The 70 placeholder rows represent 69 restaurants with menu rows but empty dish names (Seasonal Tastes, Chef's Table, Woodhouse Grill, MANZO, etc.) — these are extraction gaps, not import failures.

### 3.2 Menu coverage

- `menus` rows: 206 / 206 (every restaurant has a menu record)
- **Menus with items: 134 / 206 (65%)**
- **Menus with zero items: 72 / 206** — including restaurants that DO have rows in the source file (Seasonal Tastes, Chef's Table, Woodhouse, MANZO, Oro, Hello Dhaka…). These are genuine extraction gaps where only placeholder rows exist.
- Item count: 4,278, **100% named**, **0% described** (all item descriptions null)
- Category: **137 distinct raw category strings** + **863 items with NULL category** (unstandardized)

### 3.3 Price coverage

- `price_observations`: 4,278 (one per item), **raw_price present on 100%**
- Verification status: **4,245 UNVERIFIED (99.2%)** + **33 NEEDS_REVIEW** (ambiguous raw prices, e.g. ranges like "৳200-400" that could not be resolved to a single number)
- No `VERIFIED` prices exist yet.

---

## 4. RECOMMENDATION READINESS

### 4.1 What the recommendation engine currently has (signals)

| Signal | Status |
|---|---|
| Google rating + review count | ✅ 206/206 |
| Distance / location | ✅ 206/206 (lat/lng) |
| Category (venue type) | ⚠️ partial value |
| Cuisine | ❌ absent |
| Meal type | ❌ absent |
| Vibe / occasion / dietary | ❌ absent |
| Popular dishes | ❌ absent (no item descriptions, no dish-level signals) |

### 4.2 Frontend impact of the gaps

| Feature | Current behavior | Root cause |
|---|---|---|
| Explore cuisine filter | "No matches found" | no cuisine attribute |
| Search "biryani" | "No matches found" | no meal-type/cuisine linkage (biryani items DO exist in menus, but nothing maps them to a discoverable cuisine) |
| Browse-by-cuisine (homepage) | empty/limited | no cuisine data |
| Recommendations | score computed from rating/distance only; anonymous sessions cluster at 0% | no preference signals + no cuisine/meal-type signals |
| Restaurant page "About" | honest "being verified" | description = 0/206 |
| "Why people like it" | empty | no review/signal text, no descriptions |
| Website CTA | correctly hidden | no verified websites exist (correct per data-honesty rule) |

---

## 5. HIGHEST-VALUE MISSING DATA (ranked)

1. **Cuisine** — the single biggest gap. Kills the primary Explore filter, homepage Browse-by-cuisine, and search-by-cuisine. The source `category` column holds venue-type, so this needs real curation (Google Places categories + the proven alias approach).
2. **Meal type / vibe / occasion / dietary** — search "biryani" finds nothing despite biryani items existing; these unlock search, filters, and recommendation signals.
3. **Item descriptions** — 0%; needed for menu quality and "popular dishes" signals.
4. **Normalized price bands** — 23 raw price_range strings; needed for the Budget/Max-cost filters.
5. **Structured opening hours** — prose only; needed for "open now" and hours display.
6. **Restaurant descriptions** — 0/206; restaurant pages show empty "About".
7. **Image verification** — all 206 PENDING; frontend correctly shows them under pending handling but none are VERIFIED.

---

## 6. RECOMMENDATION FOR PHASE 2 (no code yet)

- **Reuse existing tables** — no new schema required for the core gaps:
  - `restaurant_attributes` already supports arbitrary `attribute_key` → add `cuisine`, `meal_type`, `vibe`, `occasion`, `dietary`, `popular_dishes` rows (each with provenance).
  - `restaurants.description` exists (0/206) → populate via curated content only.
  - `menu_items` has a `category` column → standardize 137 → canonical set and backfill 863 NULLs.
  - `price_observations.verification_status` → VERIFIED path for curated prices (raw_price already preserved).
- **Fix the quote artifact** in `attribute_value` during enrichment (strip literal quotes).
- **Do NOT** create a website/phone column from the spreadsheet — it has no real values; order-online links are Google redirects and must stay out of the verified-website path.
- **Provenance:** every enrichment row must carry source, source_url, collected date, confidence (HIGH/MEDIUM/LOW), and verification status (VERIFIED / SOURCE_CONFIRMED / NEEDS_REVIEW / CANDIDATE).

---

## 7. DATA CONFIDENCE FRAMEWORK (to apply in Phase 3)

| Level | Meaning | Example |
|---|---|---|
| HIGH | Google official / verified source | Google Places category, address, rating |
| MEDIUM | Multiple consistent customer signals | repeated review mentions of "good for families" |
| LOW | Single mention / uncertain | one review mentions a dish |
| Status: VERIFIED / SOURCE_CONFIRMED / NEEDS_REVIEW / CANDIDATE | | |

**Never** derive a fact by inference ("premium restaurant ⇒ luxury", "burger place ⇒ date-night"). Only store what a source actually states.

---

## 8. AUDIT SIGN-OFF

- **Identity:** data present but fragmented across 4 tables; `restaurants` row bare (0 description/city/area/phone/website).
- **Discovery intelligence:** **completely absent** (0 cuisine/meal-type/vibe/occasion/dietary rows) — the #1 blocker for filters, search, and recommendations.
- **Menu:** 134/206 with items, 72 empty (genuine extraction gaps), 0% described, 137 unstandardized categories, 863 NULL category, 99.2% prices UNVERIFIED.
- **No fabrication performed.** Every figure above is measured.
- **Phase 2 next:** enrichment plan (schema reuse, provenance, alias-based matching, no destructive imports). Awaiting approval.
