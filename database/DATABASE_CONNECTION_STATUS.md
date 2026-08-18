# KHABO KOTHAY — DATABASE CONNECTION STATUS

**Branch:** `chore/repository-restructure` · **Date:** 2026-08-18
**Scope:** connection setup + read-only verification only. **No migration, no import, no DDL, no regeneration performed.**

## 1. CONNECTION RESULT

**✅ SUCCESSFUL** — the database workspace is connected to Supabase.

- Configuration file: `database/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — copied from the local ANTIGRAVITY credentials).
- REST root probe: HTTP **200**.
- Accessible project: **`jmtpqznzfaoklpdmldnc.supabase.co`**
- Credential safety: values **never printed/committed**; `database/.env` confirmed **gitignored** and **not tracked** (`git check-ignore` + `git ls-files` verified); no `.env` anywhere under `src/` — the frontend is unaffected.

## 2. READABLE SCHEMA

All **19 tables** of the approved v1.1 schema are readable via REST:

`audit_logs, change_requests, favorites, image_references, menu_items, menus, price_observations, restaurant_aliases, restaurant_attributes, restaurant_sources, restaurant_tags, restaurants, review_samples, review_signals, roles, saved_restaurants, user_profiles, user_reviews, verification_records`

(20 REST paths incl. the root/composite path.)

## 3. CURRENT ROW COUNTS (live pilot data)

| Table | Rows |
|---|---|
| restaurants | 10 |
| restaurant_sources | 10 |
| menus | 10 |
| menu_items | 1,080 |
| price_observations | 1,080 |
| image_references | 10 |

These are the **pilot import** rows. `price_observations` carries `raw_price` (populated) and `verification_status` (TEXT; `UNVERIFIED` 1,079 / `NEEDS_REVIEW` 1) — matching the earlier migration pre-flight findings. Counts unchanged — **no data was written**.

## 4. NEXT RECOMMENDED STEP

1. **Apply the approved schema migration** (`database/schema/migrations/PROPOSED_1_2_price_verification_contract.sql`) — founder action: Supabase Dashboard → SQL Editor → paste → Run (or grant DB-level access for me to apply). This extends `verification_status` to 8 values and reconciles the live TEXT column to the enum contract.
2. **Verify post-migration schema** (I can re-check via REST immediately: enum 8 values, column type/NOT NULL/default, row counts unchanged at 1,080).
3. **Then plan the FULL_IMPORT_v2 import** (separate approval; not performed).

**STOP — connection verified, nothing modified.**
