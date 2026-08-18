# KHABO KOTHAY — Final Pilot Import Readiness Report

**Package Identifier**: `KHABO_KOTHAY_PILOT_IMPORT_v1`  
**Phase**: Final Data Preparation & Validation (Pre-Supabase Import)  
**Database Architecture Foundation**: v1.1 Technical Specification (0 schema changes, 0 new tables, 0 relationship modifications)  
**Final Supabase Import Status**: **READY FOR SUPABASE PILOT IMPORT (FOUNDER-APPROVED PACKAGE)**

---

## 1. Summary of Approved Founder Decisions Implemented

1. **Review Samples Policy (`PENDING FUTURE REVIEW COLLECTION`)**:
   - `09_review_samples_preview.csv` is structure-ready (header-only, 0 rows).
   - No synthetic or invented review text has been added.
   - Initial pilot dataset proceeds with verified quantitative review signals (`review_signals`: rating and review count) while qualitative review samples remain queued for future collection.

2. **Price History Architecture**:
   - The database model dynamically sources the current menu price from the latest valid observation in `price_observations`.
   - No duplicate current price fields are created on `menu_items`.
   - Every observation record preserves: observation UUID (`id`), dish relationship (`menu_item_id`), price value in `BDT` (`price`, `currency`), raw source price string (`raw_price`), source reference (`source_id`), timestamp (`observed_at`), and verification state (`verification_status`).

3. **Handi (Gulshan Branch) Ambiguous Price Handling**:
   - **Dish**: `Combo - 1` (Category: `Combo`)
   - **Raw Source Price**: `"Tk 494 / Tk 549"`
   - **Handling**: Exactly **ONE** price observation record is maintained.
   - **Stored Numeric Price**: `NULL` (preserves uncertainty; numeric price is not guessed or polluted).
   - **Raw Source Price**: `"Tk 494 / Tk 549"`
   - **Verification Status**: `NEEDS_REVIEW`
   - **Candidates Recorded for Reference**: Candidate 1 (`494 BDT`), Candidate 2 (`549 BDT`).

---

## 2. Package Record Counts & File Manifest

| # | File Name | Target Table | Records | Status |
|---|---|---|---|---|
| 01 | `01_restaurants_preview.csv` | `restaurants` | **10** | Complete & Validated |
| 02 | `02_restaurant_sources_preview.csv` | `restaurant_sources` | **10** | Complete & Validated |
| 03 | `03_restaurant_attributes_preview.csv` | `restaurant_attributes` | **36** | Complete & Validated |
| 04 | `04_review_signals_preview.csv` | `review_signals` | **10** | Complete & Validated |
| 05 | `05_menus_preview.csv` | `menus` | **10** | Complete & Validated |
| 06 | `06_menu_items_preview.csv` | `menu_items` | **1,080** | Complete & Validated |
| 07 | `07_price_observations_preview.csv` | `price_observations` | **1,080** | Complete (1,079 parsed prices + 1 ambiguous price stored as `NULL` with `NEEDS_REVIEW`) |
| 08 | `08_image_references_preview.csv` | `image_references` | **10** | Complete (`PENDING` status) |
| 09 | `09_review_samples_preview.csv` | `review_samples` | **0** | Header-only (Pending Collection) |
| 10 | `10_import_validation_report.xlsx` | *Validation Report* | **8 Sheets** | Complete & Formatted |

---

## 3. Entity Relationship & Foreign Key Verification

All foreign keys use deterministic UUID v5 namespace resolution rooted in canonical restaurant identities:

| Foreign Key Relationship | Broken Count | Validation Status |
|---|---|---|
| `restaurant_sources.restaurant_id -> restaurants.id` | 0 | **PASS (10/10)** |
| `restaurant_attributes.restaurant_id -> restaurants.id` | 0 | **PASS (36/36)** |
| `review_signals.restaurant_id -> restaurants.id` | 0 | **PASS (10/10)** |
| `menus.restaurant_id -> restaurants.id` | 0 | **PASS (10/10)** |
| `menu_items.menu_id -> menus.id` | 0 | **PASS (1,080/1,080)** |
| `price_observations.menu_item_id -> menu_items.id` | 0 | **PASS (1,080/1,080)** |
| `image_references.restaurant_id -> restaurants.id` | 0 | **PASS (10/10)** |

---

## 4. Supabase Pilot Import Handoff Summary

The preparation phase is complete. The import package contains:
- 10 uniquely resolved restaurants
- 10 active menu containers
- 1,080 dishes across all 10 pilot restaurants
- 1,080 price observations tracking historical observation data, raw strings, and verification status
- 36 restaurant attributes
- 10 external source records
- 10 review signals
- 10 image references
- Structure-ready review samples schema

All rules, policies, and founder decisions are fully implemented without database schema modifications.
