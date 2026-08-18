# KHABO KOTHAY — DATABASE SCHEMA MIGRATION RESULT

**Branch:** `chore/repository-restructure` · **Date:** 2026-08-18
**Status:** ⚠️ **MIGRATION NOT EXECUTED — DDL NOT AVAILABLE IN THIS ENVIRONMENT (STEP 2B).** Pre-flight verification complete; exact SQL provided below for the Supabase Dashboard SQL Editor. Waiting for founder execution.

---

## 1. EXECUTION METHOD (STEP 1 — capability check)

Checked all available DDL execution paths. **None available**:

| Method | Result |
|---|---|
| `supabase` CLI | not installed |
| `psql` / `pg_isready` / `pg_dump` | not on PATH |
| `pg` npm driver (direct PostgreSQL) | not installed |
| Supabase project link (`config.toml`) | none exists |
| DB connection string / password | **not present** anywhere (only `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `database/.env` — REST-only, cannot run DDL) |
| Management/Personal Access Token | none present |
| RPC function (`exec_sql`-style) | **none** exposed by the live project (verified twice via OpenAPI spec) |

**Blocker confirmed:** this environment holds REST-level credentials only; PostgREST cannot execute `ALTER TYPE` / `ALTER TABLE`. The migration must be run by the founder in the Supabase Dashboard SQL Editor (or via DB-level access).

## 2. EXACT SQL TO RUN (STEP 2B) — paste into Supabase Dashboard → SQL Editor → Run

```sql
BEGIN;

ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'UNVERIFIED';
ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'NEEDS_REVIEW';

ALTER TABLE price_observations
    ADD COLUMN IF NOT EXISTS raw_price TEXT,
    ADD COLUMN IF NOT EXISTS verification_status verification_status NOT NULL DEFAULT 'UNVERIFIED';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_observations'
      AND column_name = 'verification_status' AND udt_name = 'text'
  ) THEN
    ALTER TABLE price_observations
      ALTER COLUMN verification_status TYPE verification_status
      USING verification_status::verification_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_observations'
      AND column_name = 'verification_status' AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE price_observations
      ALTER COLUMN verification_status SET DEFAULT 'UNVERIFIED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_observations'
      AND column_name = 'verification_status' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE price_observations
      ALTER COLUMN verification_status SET NOT NULL;
  END IF;
END $$;

COMMIT;
```

> The full file `database/schema/migrations/PROPOSED_1_2_price_verification_contract.sql` is identical (alias seed INSERTs are commented-out reference only). The SQL above is the executable core.

**Tables affected:** `price_observations` (columns) + enum type `verification_status` (shared type — only extended, no data touched; `verification_records` unaffected).

## 3. EXPECTED BEFORE / AFTER

| Item | BEFORE (live, verified) | AFTER (expected) |
|---|---|---|
| `verification_status` enum | 6 values (UNKNOWN, SOURCE_VERIFIED, RESTAURANT_CONFIRMED, KK_VERIFIED, STALE, CONFLICTING) | **8 values** (+ UNVERIFIED, NEEDS_REVIEW) |
| `price_observations.verification_status` | TEXT, nullable, no default | enum type, **NOT NULL**, DEFAULT **'UNVERIFIED'** |
| `price_observations.raw_price` | TEXT (populated) | TEXT (unchanged) |
| restaurants / menus / menu_items / price_observations | 10 / 10 / 1,080 / 1,080 | **unchanged** (no data loss) |
| Live status values | UNVERIFIED 1,079 · NEEDS_REVIEW 1 | **preserved 1:1** (both are valid enum members post-extension) |

## 4. VERIFICATION RESULTS (pre-flight, read-only)

- Connectivity: ✅ HTTP 200 (project `jmtpqznzfaoklpdmldnc.supabase.co`).
- Enum (before): ✅ 6 values confirmed via `verification_records.status`.
- Column state (before): ✅ `raw_price` TEXT + `verification_status` TEXT confirmed on `price_observations`.
- Row counts (before): ✅ restaurants 10 · menus 10 · menu_items 1,080 · price_observations 1,080 (`UNVERIFIED` 1,079 / `NEEDS_REVIEW` 1).
- **No data written, no DDL attempted, no import, no regeneration, no frontend change.**

Post-migration verification I will run the moment the founder confirms execution (or grants DDL access):
1. `price_observations` schema (columns + types + default + NOT NULL)
2. enum 8 values
3. row counts unchanged (10 / 1,080 / 1,080)

## 5. ROLLBACK APPROACH

- **Migration is additive and value-preserving.** The enum gains two values (cannot be dropped while referenced — they are harmless to keep); the column conversion is a lossless cast (all 1,080 values verified valid).
- Full revert (if ever needed):
  ```sql
  ALTER TABLE price_observations
    ALTER COLUMN verification_status TYPE text USING verification_status::text,
    ALTER COLUMN verification_status DROP DEFAULT,
    ALTER COLUMN verification_status DROP NOT NULL;
  ```
  Row data is preserved as text; nothing is deleted.

## 6. NEXT RECOMMENDED STEP

1. **Founder:** run the SQL above in the Supabase Dashboard SQL Editor (or grant DB-level access — `supabase link` + DB password / connection string).
2. **Then I verify** the live schema via REST (enum 8 values; `verification_status` enum type, NOT NULL, default `'UNVERIFIED'`; counts 10 / 1,080 / 1,080).
3. **Then** plan the FULL_IMPORT_v2 import (separate approval — **not performed**).

**STOP after schema verification, as instructed.**
