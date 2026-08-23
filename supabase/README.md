# Supabase Schema — Source of Truth

This file documents the single source of truth for database schema and the
known drift, so future migrations are applied consistently.

## Authoritative migration location

`supabase/migrations/` is the directory consumed by the Supabase CLI and
represents the **applied** schema history (discovery facts, review queue
security, grant hardening, review samples read). Treat this directory as the
source of truth for what is live.

## Secondary / proposal location (DO NOT apply blindly)

`database/schema/migrations/` holds:

- `KHABO_KOTHAY_DATABASE_FOUNDATION_v1_1_FINAL_MIGRATION.sql` — foundational
  schema snapshot.
- `RLS_PUBLIC_READ.sql` — row-level-security policy.
- `PROPOSED_1_2` … `PROPOSED_1_6` — **proposed, NOT executed** migrations.

The `PROPOSED_*` files are design proposals, not applied history. Do not run
them as part of a normal migrate; promote a proposal into `supabase/migrations/`
only after review and with a real migration timestamp.

## Known drift (gated — requires DB access, do not fix in app code)

- `PROPOSED_1_6_add_address_display_to_restaurants.sql` is **unexecuted**, yet
  `address_display` appears in the generated `src/integrations/supabase/
  database.types.ts` (line 73) and is read by `src/transformers/restaurant.ts`
  (line 294) and `src/pages/RestaurantPage.tsx` (line 191).

  Resolution requires a deliberate decision: either execute the
  `address_display` migration against the target database (via Supabase CLI /
  migration run), or remove the column from the generated types and the
  transformer. **This is a schema-change decision and must not be made inside
  the application code.** Flagged for the next schema-ownership session.

## Rules

1. One migration directory of record: `supabase/migrations/`.
2. Never create ad-hoc `.sql` files outside the agreed workflow.
3. Regenerate `database.types.ts` only from the applied database, not from
   unexecuted proposals.
4. Keep the generated types and the applied migrations in lockstep.
