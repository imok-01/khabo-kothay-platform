# KHABO KOTHAY — DATABASE ACCESS REQUIREMENTS

**Branch:** `chore/repository-restructure` · **Date:** 2026-08-18
**Type:** Analysis only. No migrations, no schema changes, no imports, no secrets exposed.

---

## 1. CURRENT CAPABILITY (what is possible today)

Configured and verified (`database/.env`, gitignored, not tracked):
- `SUPABASE_URL` ✅ · `SUPABASE_SERVICE_ROLE_KEY` ✅
- Project `jmtpqznzfaoklpdmldnc.supabase.co` reachable (REST 200); all 19 tables readable.

| Operation | Status | Mechanism |
|---|---|---|
| Read any table / schema introspection | ✅ VERIFIED | REST (OpenAPI spec + `SELECT`) |
| **Controlled imports** (INSERT/UPDATE) | ✅ AVAILABLE | `supabase-js` REST insert — exactly what `execute_import.js` / `import_to_supabase.js` already use (verified: `.from(table).insert(batch)`) |
| Verification / row-count checks | ✅ AVAILABLE | REST |
| **Schema migrations (DDL)** | ❌ **BLOCKED** | `ALTER TYPE` / `ALTER TABLE` cannot run over PostgREST; no CLI/psql/connection string/RPC in this environment |

**Conclusion:** of the three goal operations, only **migrations** are blocked. Imports and verification already work with the current credentials. The minimum missing capability is **DDL execution** — nothing else.

## 2. MISSING CAPABILITY — exact requirement

- **Missing:** ability to execute SQL DDL (and general SQL) against the project.
- **Why:** the one approved migration (`PROPOSED_1_2_price_verification_contract.sql`) and all future versioned migrations require `ALTER TYPE` / `ALTER TABLE`. REST credentials cannot do this.
- **Minimum sufficient solution:** any one of the three options below. Do **not** request the others at this stage.

## 3. OPTIONS COMPARISON

| | **Option A — Database URL / PostgreSQL connection** | **Option B — Supabase CLI** | **Option C — Supabase Dashboard (manual)** |
|---|---|---|---|
| What is needed | Postgres **connection string** (host + port + **DB password**) → `DATABASE_URL` | Install `supabase` CLI (global) + **interactive `supabase login`** (browser) + `supabase link --project-ref` + **DB password** | Nothing to share — founder pastes SQL and clicks Run |
| Effort | 1 line in `database/.env`; I execute migrations directly | Heaviest: install + interactive auth + link; then `supabase db push` (versioned workflow) | ~1 minute per migration |
| Automation | ✅ Full (scripted migrations) | ✅ Full + versioned migration history | ❌ Manual each time |
| Blast radius | DB password = broad Postgres access (postgres role) — use SSL + keep gitignored | Scoped via CLI + project link; still needs DB password for link | Zero credential exposure |
| Best for | Single-operator automation right now | Multi-developer team, repeatable versioned migrations | One-off / rare migrations |

## 4. RECOMMENDED SOLUTION (Khabo Kothay, current stage)

**Immediate (now): Option C** — the single pending migration is already written and reviewed; the founder runs it in the **Supabase Dashboard → SQL Editor** (~1 minute, zero credentials shared). No additional access requested.

**Automation path (when the founder wants me to execute migrations directly): Option A** — one `DATABASE_URL` connection string placed in `database/.env` (gitignored). Simplest professional setup for a single-operator workflow: it unlocks scripted migrations with no CLI install and no interactive login.

**Defer Option B** until there is a real multi-developer migration workflow (versioned `supabase db push`), to avoid installing a global CLI + interactive browser auth now.

**Security precautions (all options):**
- Credentials live **only** in `database/.env` — gitignored (verified) and never in `src/` (frontend untouched).
- Use the connection string with **SSL** (`?sslmode=require`); prefer the **pooler** host for connection reuse.
- Treat the DB password and service-role key as secrets: rotate if ever shared; never printed/logged.
- Migrations are reviewed before execution (SQL shown, before/after + rollback documented — see `DATABASE_SCHEMA_MIGRATION_RESULT.md`).

## 5. FOUNDER ACTION REQUIRED

| Path | Action |
|---|---|
| **Option C (recommended now)** | Run the SQL in `DATABASE_SCHEMA_MIGRATION_RESULT.md` §2 (or paste `PROPOSED_1_2_price_verification_contract.sql`) in the Supabase Dashboard SQL Editor; tell me when done and I verify the live schema via REST. |
| **Option A (automation)** | Provide the Postgres **connection string** (from Dashboard → Project Settings → Database, "Connection string" with the DB password); I will add `DATABASE_URL=…` to `database/.env` (gitignored) and use it **only** for approved migrations. |
| **Option B (optional, later)** | Install the Supabase CLI + `supabase login` + `supabase link` (interactive, founder-side). |

**STOP after analysis — nothing was migrated, modified, imported, or exposed.**
