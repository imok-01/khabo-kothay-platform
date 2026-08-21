# AI Restaurant Insights Pilot — Architecture Audit & Design

**Status:** Design phase only — no code, no migrations, no data import, no deploy.
**Date:** 2026-08-19
**Scope:** Validate whether Khabo Kothay's existing data can safely power AI-generated restaurant insights, and specify how.

> Guiding rule (unchanged from the trust work): **only "Evidence → AI extraction → structured insight"**; never "AI imagination → user-facing claim". Insights are derived signals, not verified facts, and stay visually and semantically separate from the verified facts the app already shows.

---

## 1. Architecture Audit

### 1.1 Where evidence lives today (live DB, measured 2026-08-19)

| Source table | Rows | What it holds | Usable for AI insights? |
|---|---|---|---|
| `restaurants` | 206 | name, address, area (20/206), city (202/206), lat/lng (206/206), **description 0/206**, website 0, phone 0 | Partial — identity + location only |
| `restaurant_attributes` | ~1,500 | `category` 206, `opening_hours` 202, `service_options` 196, `price_range` 147, `cuisines` 99, `signatureDishes` 70, `mealTypes` 44 | **Primary structured evidence** (key→JSON value) |
| `menus` + `menu_items` | 206 menus / 134 with items / 4,278 items | dish names + canonical categories | **Primary menu evidence** (concentration, dishes) |
| `price_observations` | 4,278 | parsed price per menu item (+ raw_price, verification_status) | Price positioning evidence |
| `review_signals` | 206 (GOOGLE) | rating (0–5) + review_count | Popularity/trust evidence |
| `review_samples` | **0** | review **text** | ❌ Empty — no review-text to mine today |
| `verification_records` | **0** | field-level trust status | Schema ready, unused |
| `restaurant_tags` | **0** | community tags | ❌ Empty |
| `user_reviews` | **0** | user reviews | ❌ Empty |

### 1.2 Key audit findings

1. **The only real evidence for "what this place serves" is structured + menu data.** 99 restaurants have `cuisines`, 70 have `signatureDishes`, 134 have menu items (4,278 total). That is enough to generate *some* high-confidence insights for a subset — not all 206.
2. **There is no review text.** `review_samples` (the schema table designed exactly for review text) is empty. Sentiment-style insights ("people love the kacchi") are **impossible today** and must not be fabricated.
3. **Menu category data is the strongest untapped signal.** e.g. Sultan's Dine's 7 items are 100% `Biryani`; Herfy's menu is 19/39 `Burgers`; Laughing Buddha is 13/30 `Rice & Noodles` with premium Thai dishes. Canonicalization already exists (`database/pipelines/enrichment/menu_category_map.json`, 445 source categories → canonical).
4. **Categories are not always truthful.** Pizzaburg Gulshan's top menu category is `Korean` (23 items) — but sampled items are drinks ("Vanilla Iced Latte"). An AI that reads category names naively would say "Korean food". Evidence aggregation must operate on **items**, not raw category strings.
5. **`review_signals` (206/206, Google rating + count) is reliable but coarse.** It supports trust framing ("4.3★ from 11,814 Google reviews") but nothing about *what* to order.
6. **`verification_records` + the `VerificationStatus` enum already model "fact vs. status" separation** — the correct pattern for insights is the same shape: `value` + `status` + `source` kept apart. Note the live enum lacks `SOURCE_CONFIRMED` (found in the enrichment diff report) — any new status enum must be created fresh to avoid the same drift.
7. **`description`, website, phone are all empty.** Any insight must avoid inventing them.
8. **Frontend consumption seams already exist:** `queries.ts` fetches attributes/review_signals/review_samples via `inChunks`; `mapRestaurantRows` / `mapVerificationStatuses` in `transformers/restaurant.ts` map rows → domain. New insight data plugs into the same seam.

### 1.3 What is NOT reusable as-is

- The existing `deriveIntelligence` (`src/lib/intelligence.ts`) mixes derived signals into the verified domain `Restaurant`. For the pilot, insights must live **out of** that domain path until approved (same reason `mapVerificationStatuses` is deliberately not attached to `Restaurant`).
- `enrich_intelligence.js` is a good *pattern* (dry-run default, `--apply` flag, evidence-only, no deletes) to mirror for the insight generation script.

---

## 2. Recommended Schema

Decision: **new tables**, not an `ai_insights` attribute key. Attributes hold *verified facts*; insights are *derived signals* with confidence + evidence. Mixing them would let a hallucinated insight masquerade as a verified fact in the existing trust UI.

```sql
-- Migration: v1.3 (proposed, NOT created)
create type insight_confidence as enum ('HIGH', 'MEDIUM', 'LOW');
create type insight_status   as enum ('DRAFT', 'APPROVED', 'REJECTED', 'ARCHIVED');

create table restaurant_ai_insights (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  insight_key   text not null,             -- stable machine key, e.g. 'menu_concentration.biryani'
  insight_label text not null,             -- human string, controlled-vocab friendly
  supporting_text text,                    -- evidence-backed sentence (optional, must cite)
  confidence    insight_confidence not null,
  status        insight_status not null default 'DRAFT',
  model_version text,                      -- e.g. 'rule-v1' (deterministic) or 'llm-v1'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (restaurant_id, insight_key)
);

create table insight_evidence (
  id             uuid primary key default gen_random_uuid(),
  insight_id     uuid not null references restaurant_ai_insights(id) on delete cascade,
  evidence_type  text not null,   -- menu_item_count | menu_category | cuisine | signature_dish | review_signal | price_observation
  evidence_source text not null,  -- table reference, e.g. 'menu_items.category'
  evidence_ref   text,            -- the value, e.g. 'Biryani'
  evidence_count int,             -- items/records counted
  raw_json       jsonb            -- raw evidence snapshot (defensible)
);
create index idx_insights_restaurant on restaurant_ai_insights(restaurant_id);
create index idx_insights_status    on restaurant_ai_insights(status);
create index idx_insight_evidence   on insight_evidence(insight_id);
```

**Design points**
- `insight_key` dedupes: `(restaurant_id, insight_key)` unique — re-runs upsert, never duplicate.
- `insight_evidence` rows make every insight **auditable**: a DRAFT with zero evidence rows is deleted, not shipped.
- `status` gates the UI: only `APPROVED` renders to users (same "approved decision" pattern already used for images).
- Confidence is per-insight, never per-table. HIGH today may degrade as data ages.
- Deterministic rule-based generation is the v1 "model" (`rule-v1`); LLM only later, offline, dry-run (mirror `enrich_intelligence.js`).
- `review_samples` (empty) stays the future home for review text; no review-based insight until it is populated.

---

## 3. Evidence Rules & Confidence

Every insight requires ≥1 `insight_evidence` row. Zero evidence → **abstain** (no row, no UI). An insight is a *transformation* of evidence (count/aggregate/paraphrase), never invented specifics (no hours, phone, price, or dish that has no row).

| Confidence | Rule (all must hold) | Example |
|---|---|---|
| **HIGH** | Structured attribute (`cuisines`/`signatureDishes`) AND menu corroboration, OR menu concentration ≥ 60% of items in one canonical category (≥5 items) | Sultan's Dine: 7/7 Biryani |
| **MEDIUM** | Menu-only inference (concentration or dish vocabulary) without attribute corroboration, or attribute-only without menu corroboration | Cielo Rooftop: Tom Yum/Penang/Basil → pan-Asian-influenced (no `cuisines` attr) |
| **LOW** | Name-implied or single-item or stale-signal evidence only | Koyla: "Kebab" in the name, 0 menu items |
| **ABSTAIN** | No evidence at all | Chef's Table Gulshan 2 (rating-only) |

**Hard rules**
1. Abstain over invent: never emit an insight with no evidence.
2. No sentiment without `review_samples` text (0 rows today → feature is out of scope).
3. Category names are hints, not facts — aggregate **items**; a 23-item "Korean" category of drinks must resolve to "large coffee/drink menu", never "Korean food".
4. LOW insights may exist for humans in the admin queue but are **never auto-rendered**.
5. Confidence never auto-upgrades to "verified fact" in the UI; verified facts and insights stay visually distinct.

---

## 4. Pilot Restaurants (8) — live evidence

Selected for a spread: famous / average / weak-data, all with the actual rows pulled today.

| # | Restaurant | Reviews | Evidence found | Target insight | Est. conf. |
|---|---|---|---|---|---|
| 1 | Sultan's Dine Gulshan | 4.3 / 11,814 | 7/7 items `Biryani` (+tehari); `cuisines=Bangladeshi`; price ৳200–600 | Kacchi-biryani specialist; value price point | HIGH |
| 2 | Herfy Gulshan | 4.3 / 9,237 | 8 signature dishes (burgers, fried chicken, wraps); 19/39 `Burgers`; `cuisines=Fast Food` | Burger + fried-chicken counter; drive-through | HIGH |
| 3 | Pizzaburg Gulshan | 4.8 / 5,877 | 14 `Pizza` items (Mac & Cheese, Four Flavors…), 8 `Burgers`; **23-item `Korean` = drinks** | Pizza + burger menu; big coffee/drink menu | HIGH (pizza) / MEDIUM (drinks) |
| 4 | Jatra Biroti | 4.1 / 4,357 | 6 signature platters (Dal Puri, Luchi+Alur Dom, Letka Khichuri…); 31 items; `mealTypes=Snacks`; `cuisines=Bengali` | Bengali street-platter house; lassi bar | HIGH |
| 5 | Laughing Buddha | 4.4 / 1,301 | 13/30 `Rice & Noodles` (Pad Thai, Khao Soi, Tom Yum fried rice); `cuisines=Thai`; price ৳2,000+ | Premium Thai; noodles + coconut-lemongrass curries | MEDIUM–HIGH |
| 6 | Cielo Rooftop Banani | 4.1 / 1,464 | 42 items, no `cuisines`: Set Menu (Seafood Platter), Tom Yum/Tom Kha soups, Penang/Basil/Bangkok chicken, Calamari in Tom Yum paste | Rooftop with pan-Asian-influenced menu (menu-only inference) | MEDIUM |
| 7 | Koyla Restaurant & Kebab | 4.2 / 3,100 | 0 menu items, no cuisines/signatures; "Kebab" only in name | "Kebab house per name — unverified" | LOW (abstain from menu claims) |
| 8 | Chef's Table - Gulshan 2 | 4.5 / 10,260 | Rating + count only; 0 menu, no cuisines | No cuisine insight; trust fact only (4.5★/10,260) | ABSTAIN |

This set proves the range the pilot needs: 4 HIGH, 2 MEDIUM, 1 LOW, 1 ABSTAIN — and both a category-name trap (Pizzaburg) and a zero-evidence honest fallback (Chef's Table).

---

## 5. Sample Outputs (grounded in the pulled evidence)

> Format below is the proposed UI copy. Each line maps 1:1 to evidence rows.

**Sultan's Dine — Gulshan Branch**
- Chip: "Kacchi biryani specialist" (HIGH) — *evidence: 7/7 menu items in Biryani category; cuisines: Bangladeshi*
- Chip: "Value: ৳200–600 for a plate" (HIGH) — *evidence: price_range attr; 4,278-row price_observations corroboration available*
- Trust line (existing): "4.3★ from 11,814 Google reviews"

**Pizzaburg Gulshan**
- Chip: "Pizza + burgers, with a big coffee/drink menu" (HIGH) — *evidence: 14 Pizza + 8 Burgers items; 23-item drink category (items are lattes/iced drinks, category label 'Korean' is a name-trap and is NOT reported as cuisine)*
- Trust line: "4.8★ from 5,877 Google reviews"

**Laughing Buddha**
- Chip: "Premium Thai — Pad Thai, Khao Soi & coconut-lemongrass curries" (MEDIUM–HIGH) — *evidence: 13/30 Rice & Noodles items incl. Pad Thai, Khao Soi, Tom Yum Fried Rice; cuisines: Thai; price ৳2,000+*

**Cielo Rooftop Banani**
- Chip: "Pan-Asian-influenced menu — Tom Yum, Penang & basil chicken, calamari in Tom Yum paste" (MEDIUM) — *evidence: menu items only; no cuisines attribute — displayed with a "derived from menu" marker, never in the verified-facts block*

**Koyla Restaurant & Kebab**
- Chip (LOW, admin-only): "Name suggests kebab house — no menu evidence yet" → **not rendered to users**

**Chef's Table - Gulshan 2**
- No insight chips. Only the existing trust fact "4.5★ from 10,260 Google reviews". **Abstain is the correct product behavior.**

---

## 6. UI Recommendation

1. **New section, not a re-label.** Add "AI insights (derived from menu)" as a chip group *below* the verified "Good to know"/About facts in `RestaurantPage.tsx`. Verified facts and insights never share a block.
2. **Confidence affordance:** each chip carries a dot (● HIGH / ◐ MEDIUM / ○ LOW) + tooltip "AI-generated from menu data — may be outdated". LOW chips are hidden by default (admin/flag only).
3. **Evidence link:** tooltip lists the evidence ("14 of 49 menu items are pizza") — no invented claims.
4. **Feedback loop:** "Report a problem" on any chip → flags the insight for admin review → status `REJECTED`/`ARCHIVED`.
5. **Flag-gated:** feature behind an env flag; CompareTray gets an insight column only after pilot accuracy passes review.
6. **Zero-evidence venues show nothing** (no "AI thinks…" placeholder).

Consumption path (reuse existing seams): fetch `restaurant_ai_insights` + `insight_evidence` via `inChunks` pattern in `queries.ts` → map in a new transformer alongside `mapVerificationStatuses` → render approved insights only.

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Hallucinated specifics (hours/phone/dishes that don't exist) | Evidence-only rule; abstain default; `supporting_text` must cite; approval gate |
| Category-name traps ("Korean" = drinks) | Aggregate menu **items**, not raw category labels; rely on `menu_category_map.json` canonicalization |
| Stale menus → wrong "specialty" | Confidence decay + `updated_at`; re-run pipeline on menu change; "may be outdated" tooltip |
| Review-sentiment temptation with 0 `review_samples` | Feature explicitly out of scope until review text exists |
| Enum drift (live enum missing `SOURCE_CONFIRMED`, as found in enrichment diff) | New enums created fresh in one migration; pipeline parameterized like `enrich_intelligence.js` |
| LLM cost/latency/unpredictability | v1 is deterministic rule aggregation (`rule-v1`); LLM only for label phrasing, offline batch, dry-run |
| Duplicate/stale insights | `(restaurant_id, insight_key)` unique; upsert-only; no deletes of evidence during a run |
| Users trusting insights as fact | Confidence dots + "derived" marker + separate section + approval-only rendering |

---

## 8. Recommendation

**Proceed — as a phased pilot, deterministic-first.**

- **Go for:** Phase 1 = rule-based evidence aggregation (SQL/TS, no LLM) over the 8 pilot venues, generating HIGH insights only, into the new tables (still gated behind approval). This is low-risk: it reuses the canonical category map, the `enrich_intelligence.js` dry-run pattern, and the existing fetch/transform seams, and changes **zero** user-facing code until a human approves rows.
- **Modify before scale:** do not run sentiment or LLM-label phases until (a) pilot review shows ≥90% of HIGH insights survive human approval, and (b) `review_samples` is populated if review-derived content is ever wanted.
- **Don't build now:** LLM-only insight generation without evidence rows, auto-rendered LOW insights, and any review-sentiment feature (0 review texts exist).

**Deliverables deferred to Phase 1 (code):** migration v1.3 (2 tables + 2 enums), a `generate-insights.cjs` pipeline with `--dry-run` default (mirroring `enrich_intelligence.js`), and a flagged UI section. None of this is started — this document is the design gate.