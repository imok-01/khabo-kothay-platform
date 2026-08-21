# REVIEW SAMPLES V1 — PLAN

**Status:** Plan only. No UI changes, no migrations, no AI summaries, no scraping.
**Date:** 2026-08-19
**Scope:** Display selected real customer reviews for restaurants, sourced from the existing `review_samples` table. NOT "What people say" intelligence (reserved for later, when richer review data is available).

> Guiding rule: **real reviews, real attribution, honest presentation.** Only store review text that a human curator selects from a real public source. Never rewrite reviews, never generate opinions, never invent themes.

**V2 Update:** See `GOOGLE_REVIEW_HIGHLIGHTS_SOP_V2.md` for the updated workflow with explicit role separation (Human Data Provider → AI Processing → Human Approval).

---

## 1. Audit — current review_samples database structure

### 1.1 Table exists ✅ (no schema change required)

`review_samples` already exists in `public` with exactly the fields Review Samples V1 needs:

| Column | Type | Null | Default | Purpose |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `restaurant_id` | uuid | NO | — | FK → `restaurants(id)` ON DELETE RESTRICT |
| `source` | text | YES | — | e.g. `GOOGLE` |
| `source_url` | text | YES | — | direct link to the review |
| `review_text` | text | YES | — | **original review text** |
| `attribution` | text | YES | — | author attribution (Google requires author credit) |
| `observed_at` | timestamp | YES | `now()` | when collected |
| `created_at` | timestamp | YES | `now()` | insert time |

- **Constraints:** PK on `id`; FK to `restaurants` (RESTRICT). No other constraints.
- **Indexes:** only the PK index. No index on `restaurant_id` (fine for pilot volume; noted for later).
- **RLS:** enabled (`relrowsecurity = true`), not forced. **Zero policies** → anonymous read blocked.
- **Grants:** `postgres` + `service_role` only (full DML). **No `anon`/`authenticated` grant** — this matches the hardened security posture (see Security Hardening Phase 1); any future public read must be an explicit, approved grant + policy.
- **Current rows:** **0.**

### 1.2 Repository support ✅ partial

- `src/integrations/supabase/queries.ts:364` — `selectReviewSamplesForRestaurant(restaurantId)` exists and reads `review_samples` via the client. **Not called by any repository/service/hook/UI today** (dormant seam).
- No `reviewSamplesRepository` / `reviewSamplesService` / hook exists.

### 1.3 Frontend support ❌ none

- No UI renders `review_samples`.
- The page already has a **separate "Google reviews" section** (`RestaurantPage.tsx:598`) that renders the *live Places-API snapshot* with author + "See review on Google" links. **That section is unchanged.**
- No "What people say" placeholder exists in the UI. Per instructions, none will be created in this phase — the section stays reserved. If a placeholder is ever added, the honest message is:
  > "Customer experience insights will appear here as more verified review data becomes available."

### 1.4 Verdict

The schema needs **zero changes**. Work = data collection + a small read path (repository/service/hook) + rendering. No migration required.

---

## 2. Review Samples workflow

### 2.1 Objective

Up to **3 useful reviews per restaurant**, stored in `review_samples`, displayed on the restaurant detail page as **selected real customer reviews** (label: "Selected reviews" or similar — UI decision deferred to the implementation phase).

### 2.2 Selection criteria — prefer

- Detailed reviews with a specific experience (what they ordered, portion, taste, service, ambience, location).
- Reviews containing decision-useful information (value for money, wait times, seating, parking, family suitability, halal status).
- Observations across food / service / ambience / location where possible.

### 2.3 Selection criteria — avoid

- Generic one-line praise ("Great food!").
- Unsupported summaries or aggregate claims.
- AI-rewritten opinions — **keep original review text verbatim**.
- Duplicate near-identical reviews (variety over repetition).

### 2.4 Attribution & sourcing rules

- Store the **original text** in `review_text`.
- Store `source` (e.g. `GOOGLE`), `source_url` (direct deep link), and `attribution` (author name where available) — Google policy requires crediting the author and linking the source when displaying review content.
- Prefer Google reviews (all 206 restaurants have a Google place ID and `mapsUri` already stored in `restaurant_sources`), which gives a compliant path to source URLs.
- **No scraping.** Manual/curated collection only for V1.

### 2.5 Collection/import plan (phase-gated, executed only after approval)

1. **Curate** — for the target set of restaurants, a human curator (or the founder, mirroring the Discovery Facts import process) selects up to 3 qualifying reviews per restaurant directly from public Google listings.
2. **Assemble** — a review dataset file (JSON) with `restaurant_id` (resolved from slug via the existing `resolveRestaurantUuid` pattern), `source`, `source_url`, `review_text`, `attribution`, `observed_at`.
3. **Import** — a one-off, dry-run-first import script (same discipline as `enrich_intelligence.js` / the Discovery Facts importer: default no-op, `--apply` to write, no deletes) inserting into `review_samples` via `service_role`.
4. **Verify** — count rows, confirm `restaurant_id` FK integrity, spot-check text fidelity (no rewrites), confirm RLS still blocks anonymous access.
5. **Publish** (separate approved step) — expose a read path and UI.

### 2.6 Read path (implementation phase, only after approval)

- `reviewSamplesRepository` (Supabase impl reads via `selectReviewSamplesForRestaurant`; mock returns `[]` — same honest-empty pattern as Discovery Facts).
- `reviewSamplesService` + hook mirroring `useDiscoveryFacts` (loading/ready/empty/error, no fabrication).
- Render up to 3 samples in the restaurant detail page with attribution + source link.
- **Security:** public read must be added as an explicit grant + `public_read`-style RLS policy in an approved migration (consistent with the hardening posture); samples remain non-public until then.

---

## 3. Future "What people say" section

- **Not implemented now.** Review intelligence needs large datasets; V1 ships only curated samples.
- No placeholder, no fake themes, no aggregation in this phase.
- `review_samples` (raw text) is the natural foundation for future theme extraction; `review_themes` (from the audit) remains the reserved direction.
- The honest placeholder message (if one is added later) is quoted in §1.3.

---

## 4. Google Reviews link

- **Unchanged.** The existing "Google reviews" section (`RestaurantPage.tsx:598`) keeps rendering the live Places-API snapshot with "See review on Google" links and the "View Google reviews" fallback link.
- Review Samples V1 is a **separate, curated** layer; it does not replace or modify the Google reviews section or `googleMapsReviewsUrl`.

---

## 5. Scope guardrails (this phase)

- ✅ Audit + data model confirmation + collection/import plan (delivered here).
- ⛔ No UI changes.
- ⛔ No migrations (schema already fits).
- ⛔ No AI summaries or theme generation.
- ⛔ No scraping.

---

## 6. Approval gates

1. **This plan** approved → curation + dataset assembly + dry-run import (data only, RLS untouched).
2. **Import verified** → approved read-path migration (grant + policy) + UI design → implementation.
3. Future → Review Intelligence ("What people say") as a separate approved program.

*Wait for approval before any implementation.*