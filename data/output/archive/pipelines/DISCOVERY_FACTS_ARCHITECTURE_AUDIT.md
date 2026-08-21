# KHABO KOTHAY — DISCOVERY FACTS DATABASE ARCHITECTURE AUDIT

**Status:** Audit + design only. No code, no migration, no UI change, no data import.
**Date:** 2026-08-19
**Predecessor:** `DISCOVERY_FACTS_PILOT.md` and `DISCOVERY_FACTS_FINAL_PILOT.md` (26 publishable facts across 10 venues).

---

## 1. Current Architecture Audit

### 1.1 Schema (as deployed: v1.1 foundation + v1.2 price contract + RLS)
| Table | Status | Role | Reuse for Discovery Facts |
|---|---|---|---|
| `verification_records` | exists, 0 rows | Field-level trust layer: `field_name`, `field_value` JSONB, `status` (8-value enum incl. `SOURCE_VERIFIED`, `NEEDS_REVIEW`), `verification_source`, `verified_at`. RLS **denies anon read** | **The trust vocabulary to mirror.** Not the table to store facts in (facts are whole claims, not field values) |
| `price_observations` | 4,278 rows | Machine-extracted price with `raw_price` + `verification_status` default `UNVERIFIED` | Existing "extract → flag → human review" workflow pattern |
| `image_references` | 206 rows, all PENDING | `status` enum `ACTIVE/PENDING/REJECTED/ARCHIVED`; UI deliberately shows **ACTIVE+PENDING** (approved decision), REJECTED/ARCHIVED filtered | Status-gated display precedent |
| `change_requests` / `audit_logs` | schema only | Change-request + audit infrastructure, RLS-denied, unused | Available later for reviewer actions; not needed in v1 |
| `restaurant_sources` | exists | `source_type` ('google','website','facebook','delivery-platform'), `source_identifier` (Place ID), `source_url` | Canonical source vocabulary — facts should align with it |
| `restaurant_attributes` / `restaurant_tags` | active | key/value JSONB + tags; public read | Proven-fact store — **not** for research facts (would conflate verified vs researched) |
| `review_samples` | 0 rows | Review-text storage, RLS-denied | Not relevant to facts |

### 1.2 Repository & read patterns
- Every data domain has `interface + mock + Supabase impl`, selected by `isSupabaseConfigured()` (see `imageRepository.ts`).
- `queries.ts` = per-table fetch functions (`selectXForRestaurant(id)` via `.eq('restaurant_id', id)`); `inChunks`/`inPages` for bulk.
- Transformers (`transformers/*.ts`) map rows → domain. `mapVerificationStatuses` deliberately keeps status OFF the domain `Restaurant` ("information and confidence stay separate").
- **Seam for facts:** a `discoveryFactRepository` + `selectDiscoveryFactsForRestaurant(id)` + `mapDiscoveryFactRows` — same shape as images/verification.

### 1.3 Admin & approval patterns (what exists today)
- **No admin UI.** Approval today is founder-in-the-loop:
  - Pipelines run with `--apply` only after a human reviews a diff report (`enrich_intelligence.js`: dry-run default → `ENRICHMENT_DIFF_REPORT.md` → apply).
  - Status enums gate display (ImageStatus ACTIVE+PENDING; VerificationStatus `UNVERIFIED`/`NEEDS_REVIEW` = "flagged for human").
  - RLS keeps review-facing tables private while discovery tables are public (`public_read USING (true)` on 10 tables; user/trust tables have no policy).
- **Key gaps for facts:** (a) no table yet where a *reviewed text claim* lives; (b) all existing public-read policies are `USING (true)` — a facts table **must not** follow that, or DRAFT/REJECTED facts would leak publicly.

---

## 2. Database Design Recommendation

### 2.1 Verdict on the proposed fields

| Proposed field | Required? | Recommendation |
|---|---|---|
| `restaurant_id` | ✅ | Keep — FK `restaurants(id)` |
| `fact_text` | ✅ | Keep — the claim, human-written, presentational only |
| `fact_type` | ✅ | Keep — enum `(history, experience, concept, location, identity, other)` matching the pilot taxonomy |
| `confidence` | ✅ | Keep — enum `(HIGH, MEDIUM, LOW)`; **do not** overload `verification_status` (that is workflow, this is evidence strength) |
| `source_type` | ✅ | Keep — controlled vocab aligned to `restaurant_sources.source_type` + press/official/instagram/review-platform/owner/kk-db |
| `source_reference` | ✅ | Keep — URL or exact reference (e.g. "TBS 2021, URL") |
| `status` | ✅ | Keep — workflow enum `(DRAFT, REVIEW, APPROVED, REJECTED, ARCHIVED)`; **Public = `APPROVED` only** |
| `priority` | ❌ | **Remove** — subjective, global, drifts. Replace with per-restaurant `sort_order smallint default 0` if curators need manual ordering (or just order by `fact_type` + `approved_at`) |
| `verified_at` | ✅ | Keep — rename intent to "last fact-checked" (`verified_at`) |
| `created_at` | ✅ | Keep |

**Fields to add**
- `evidence_note text` — the exact quote/snippet backing the fact (fast reviewer verification, anti-fabrication control).
- `approved_by uuid` FK `user_profiles(id)` — audit (nullable until approved).
- `published_at timestamptz` — when it became public (new-facts surfacing, unpublish timing).
- `source_restaurant_source_id uuid` FK `restaurant_sources(id)` nullable — optional link to canonical sources later.
- `updated_at timestamptz`.

### 2.2 Separate evidence table?
**No — not in v1.** Each fact row is its own evidence claim: `source_type + source_reference + evidence_note + confidence` fully supports review and display, and keeps the approve-gate auditable in one row. A `fact_evidence` join table would only earn its complexity when multi-source-per-fact curation is required (multiple URLs strengthening one fact). Defer; if it happens, split `source_reference` into a `fact_evidence(fact_id, source_type, source_reference, evidence_note)` and keep `restaurant_discovery_facts` as the head.

### 2.3 Final schema proposal

```sql
-- Design only — NOT executed. Migration v1.3 (proposed).
create type fact_type as enum ('history', 'experience', 'concept', 'location', 'identity', 'other');
create type fact_confidence as enum ('HIGH', 'MEDIUM', 'LOW');
create type fact_status as enum ('DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

create table restaurant_discovery_facts (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  fact_text      text not null,
  fact_type      fact_type not null,
  confidence     fact_confidence not null,
  source_type    text not null,      -- controlled vocab, aligned to restaurant_sources + press/official/instagram/review-platform/owner/kk-db
  source_reference text not null,    -- URL or exact document reference
  evidence_note  text,               -- exact supporting quote/snippet for the reviewer
  status         fact_status not null default 'DRAFT',
  sort_order     smallint not null default 0,
  verified_at    timestamptz,
  approved_by    uuid references user_profiles(id),
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (restaurant_id, fact_text)
);
create index idx_facts_restaurant on restaurant_discovery_facts(restaurant_id);
create index idx_facts_status    on restaurant_discovery_facts(status);
create index idx_facts_published on restaurant_discovery_facts(published_at);

-- Hard guards (approve-gate):
-- 1) APPROVED requires source + confidence + verification.
alter table restaurant_discovery_facts
  add constraint fact_approved_requires_evidence
  check (status <> 'APPROVED'
         or (source_reference is not null and char_length(trim(source_reference)) > 0));

-- 2) RLS: PUBLIC READ = APPROVED ONLY (unlike every other discovery table).
alter table restaurant_discovery_facts enable row level security;
create policy public_read_approved on restaurant_discovery_facts
  for select to anon, authenticated using (status = 'APPROVED');
grant select on restaurant_discovery_facts to anon, authenticated;

-- Editorial queue (no new table — a filtered read).
create view fact_review_queue as
  select * from restaurant_discovery_facts
  where status in ('DRAFT', 'REVIEW')
  order by created_at;
```

**Why the RLS policy matters:** every existing public table uses `public_read USING (true)`. For facts this would leak DRAFT/REJECTED content. The `status = 'APPROVED'` policy is the single most important difference and must be called out in the migration.

---

## 3. Recommended Workflow

```
Research ──▶ Draft ──▶ Review ──▶ Approved ──▶ Public
             │          │           │            │
   off-DB     │          │           │            │
  (press,     │   status=DRAFT  status=REVIEW  status=APPROVED   status=APPROVED
  official,   │   + evidence    (in queue;    (+ verified_at,    (+ published_at
  reviews)    │   captured)     reviewer)      + approved_by)     + RLS shows row)
```

1. **Research** (off-DB, human): find evidence (press, official site/FB/IG, corroborated reviews). Record candidate fact + source_reference + evidence_note + confidence + fact_type.
2. **Draft** → insert `status='DRAFT'`. No public exposure (RLS).
3. **Review** → set `status='REVIEW'`; appears in `fact_review_queue`. Reviewer checks: evidence exists, no banned marketing words, no cuisine/menu/rating repetition, language rules.
4. **Approved** → `status='APPROVED'`, `verified_at=now()`, `approved_by=...`.
5. **Public** → row satisfies `status='APPROVED'` RLS policy; `published_at` set; rendered in the "Why consider this place" slot.

Reject path: `status='REJECTED'` (kept for audit, never shown). Later edits re-open the row as `DRAFT`/`REVIEW`.

**Write access:** anon/authenticated = SELECT only. Inserts/updates via service-role pipeline or a future staff-authenticated admin route (the `change_requests`/`audit_logs` tables already exist for that phase).

---

## 4. Future Onboarding Workflow (new restaurants)

```
Owner / data-team submission ──▶ Fact collection ──▶ Approval ──▶ Publish
        │                             │                  │            │
  intake form: restaurant       1. Auto-ingest from     Reviewer     status=
  + optional "discovery          public sources (press, verifies:     APPROVED
  facts" fields. ALWAYS          official pages) →      upgrade       + RLS
  created as DRAFT with          DRAFT facts,           confidence    public
  source_type='owner',           confidence assigned    or REJECT.
  confidence='LOW'.              by evidence strength.  Owner claims
        │                             │                 never pass
        └── Rule: owner-submitted facts are NEVER        unverified.
            auto-approved. They start LOW and must be
            verified against an external source.
```

Rules that keep this trustworthy at scale:
- Owner submission is `source_type='owner'` + `confidence='LOW'` by construction — cannot reach `APPROVED` without a reviewer replacing the source with external evidence.
- New restaurants start with **zero** facts. Public section only appears once ≥1 fact is APPROVED. No placeholder text, no generic filler.
- The existing `restaurant_sources` row (created at intake) becomes the join target for `source_restaurant_source_id` when a fact traces to that source.

---

## 5. Scaling from 206 without fake/generic content

1. **Abstain is the product.** Not every venue gets facts. Pilot projection: **40–55% of the 206** have a publishable fact; the rest show no facts section. Forcing content for the other 45–60% is the only way to "fake" it — and it is refused by design.
2. **Editorial, not generated.** No AI text generation anywhere in the pipeline. Facts are written and verified by humans; the DB only stores, gates, and displays. This is the strongest anti-fake control.
3. **Rollout by evidence tier** (not by restaurant count):
   - Tier 1: the 10 pilot venues (26 approved facts) → seed the live layer.
   - Tier 2: venues with a detectable press/official/social footprint (~65% of 206) → research in batches, each batch a dry-run diff report (mirror `enrich_intelligence.js`: `facts_pipeline.js --dry-run` → report → `--apply`).
   - Tier 3: remaining venues → only if new public evidence appears.
4. **Hard gates baked into the schema**: `APPROVED` requires `source_reference` (CHECK constraint); `status='APPROVED'` RLS for public read; `source_type='owner'` forces LOW; `(restaurant_id, fact_text)` dedupes. No fact can appear publicly without a citation and a human approval.
5. **Refresh discipline**: `verified_at` per fact; time-sensitive facts (hours, "since N years") get a review cycle; stale → `ARCHIVED`, never silently kept.

---

## 6. Risks

| Risk | Detail | Mitigation |
|---|---|---|
| **Public leak of unreviewed facts** | Copying the existing `public_read USING (true)` pattern would expose DRAFT/REJECTED claims | `status='APPROVED'` RLS policy — called out explicitly in the migration |
| Fabrication / misattribution | The two pilot failures came from aggregator/SEO bios (Nawab lineage, "12×14 ft cafe") | `source_reference` required for APPROVED; `evidence_note` quote; LOW never public; reviewer re-verifies |
| Marketing origin stories pass as fact | Self-published "since the Nawabs…" claims | `source_type='owner'`/low-grade sources are LOW and blocked from APPROVED without external evidence |
| Marketing-word drift into fact text | "best / famous / premium" creep | Review step checks language rules; `fact_review_queue` surfaces all text |
| Time-sensitive facts decay | Hours, weekly pastrami, "opened X years ago" | `verified_at` + refresh cycle; `ARCHIVED` on stale |
| Enum proliferation | `verification_status` vs `confidence` vs `status` overlap | Documented semantics: verification=trust of data fields, confidence=strength of fact evidence, status=workflow. Never reuse one for another |
| No admin UI → SQL-only review | Human error in bulk status flips | `fact_review_queue` view + dry-run pipeline; low write frequency in v1 makes SQL review acceptable |
| Scope creep to "fill all 206" | The real fake-content risk | Stated editorial policy: abstain by default, tiered rollout, approve-gate. The pipeline refuses to fabricate by construction |

---

## 7. Recommendation

**Proceed with the design above** as migration v1.3, phased:
- **Phase A (schema):** `restaurant_discovery_facts` + enums + `APPROVED`-only RLS + CHECK constraint + `fact_review_queue` view. No data.
- **Phase B (seeding):** `facts_pipeline.js` (dry-run default) importing the 26 pilot-approved facts with their sources; human approves; `--apply`.
- **Phase C (read path):** `discoveryFactRepository` + `selectDiscoveryFactsForRestaurant` + transformer, rendering approved facts in the "Why consider this place" slot (repurposed "Good to know"), abstaining when zero facts.
- **Not now:** admin UI (low write frequency justifies SQL review), `fact_evidence` split table, AI generation, owner-self-approval, or forcing facts for all 206.