# KHABO KOTHAY — DATABASE LIVE IMPORT READINESS REPORT

**Branch:** `chore/repository-restructure` · **Date:** 2026-08-18
**Mode:** Read-only verification. **No import, no writes, no data changes, no regeneration.**

---

## 1. CONNECTION ✅

- REST **200** — project `jmtpqznzfaoklpdmldnc.supabase.co` reachable; **19 tables** exposed.

## 2. LIVE SCHEMA vs DATABASE SCHEMA FILES ✅ (migration confirmed applied)

- **`verification_status` enum (live): 8 values** — `UNKNOWN, SOURCE_VERIFIED, RESTAURANT_CONFIRMED, KK_VERIFIED, STALE, CONFLICTING, UNVERIFIED, NEEDS_REVIEW`. ✅ matches the approved v1.2 contract.
- **`price_observations` (live):** `id, menu_item_id, price, currency, source_id, observed_at, raw_price, verification_status`.
  - `verification_status` → **enum type** (`public.verification_status`), **NOT NULL** (in required set), **DEFAULT 'UNVERIFIED'** ✅
  - `raw_price` TEXT ✅
- **All 19 tables compared** against `KHABO_KOTHAY_DATABASE_FOUNDATION_v1_1_FINAL_MIGRATION.sql` + the v1.2 delta: **✅ 19/19 column sets match — zero mismatches.**

## 3. FULL_IMPORT_v2 CSV COLUMNS vs LIVE TABLES ✅

All 9 CSVs in `imports/KHABO_KOTHAY_FULL_IMPORT_v2/` map cleanly:

| CSV → table | Result |
|---|---|
| 01 restaurants · 02 restaurant_sources · 03 restaurant_attributes · 04 review_signals · 05 menus · 06 menu_items · 07 price_observations · 08 image_references | ✅ no extra columns, no missing required columns |
| 09 review_samples | ✅ no extra columns; note: header-only (0 rows) so the missing `id` column is non-blocking (no inserts) |

`price_observations` CSV carries `raw_price` + `verification_status` with values `UNVERIFIED`/`NEEDS_REVIEW` — **now valid** against the live 8-value enum. `restaurants.status` omitted by design (application-owned, table default `UNKNOWN`). `menus.title` NULL (nullable). All good.

## 4. IMPORT SCRIPT COMPATIBILITY ⚠️

| Check | Result |
|---|---|
| Import mechanism | REST `insert` via supabase-js (service-role) — compatible with the live project |
| `IMPORT_DIR` | ❌ **Both importers hardcode `imports/pilot`** (`execute_import.js`, `import_to_supabase.js`) — would import the PILOT package, not v2 |
| Conflict handling | ❌ **No `onConflict` / `upsert` / `delete` logic** in either importer — plain INSERT only |
| Entity coverage | `execute_import.js` 8 tables · `import_to_supabase.js` 9 tables (incl. review_samples) |

## 5. BLOCKERS BEFORE FULL IMPORT

| # | Blocker | Severity | Resolution options (founder decision) |
|---|---|---|---|
| B1 | **Import target directory** — importers point at `imports/pilot`, not `imports/KHABO_KOTHAY_FULL_IMPORT_v2` | BLOCKING | Parameterize `IMPORT_DIR` (like the generator's `--output`) and run against v2 |
| B2 | **Pilot-data conflicts** — the live DB already contains the pilot (10 restaurants / 10 menus / 1,080 items / 1,080 prices) with the **same deterministic UUIDs** as v2; plain INSERT will fail with duplicate-key on those rows across every entity table (restaurants, sources, attributes, signals, menus, items, prices, images) | BLOCKING | (a) `onConflict` upsert on id; (b) ordered pilot teardown (children-first — FKs are `ON DELETE RESTRICT`); (c) full import into a fresh/empty DB |

**Non-blocking notes:** `review_samples` CSV is header-only (no inserts); `restaurants.status` uses table default; v2 `verification_status` values are now valid enum members.

## 6. RECOMMENDATION

- **Schema contract: READY.** CSV↔table alignment is clean; migration applied correctly.
- **Import execution: NOT READY until B1 + B2 are resolved.** Recommend:
  1. Parameterize `IMPORT_DIR` (mirror the generator's `--output` pattern).
  2. Founder chooses the pilot-conflict strategy (upsert vs teardown vs fresh DB) — this is an operational/data decision, not something to guess.
  3. Run a **dry-run** with row-count gates (expect 206 / 206 / 751 / 206 / 206 / 4,278 / 4,278 / 206) before any live insert.

**STOP — report only; nothing was imported, written, or changed.**
