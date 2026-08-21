# REVIEW INTELLIGENCE — AUDIT & ARCHITECTURE RESEARCH

**Status:** Research + architecture audit only. No code, no tables, no migrations, no UI, no scraping.
**Date:** 2026-08-19
**Scope:** Design the future "What people say" section — repeated customer-experience patterns — kept strictly separate from Discovery Facts ("Did you know?") and verified facts.

> Guiding rule (unchanged from all prior trust work): **evidence → extraction → structured pattern**. Never "AI imagination → user-facing claim". What people say is a *derived signal* with confidence + evidence, never a verified fact, and must remain visually and semantically separate from the verified layer (price/location/menu) and the editorial layer ("Did you know?").

---

## 1. Current data situation

### 1.1 Review-related tables (live DB, measured 2026-08-19)

| Table | Rows | Fields | Public read | Purpose |
|---|---|---|---|---|
| `review_signals` | **206** (GOOGLE) | `restaurant_id`, `source`, `rating` (0–5), `review_count`, `observed_at` | ✅ SELECT (RLS `public_read`, USING true) | External reputation summary: Google rating + review count. Covers **206/206** restaurants. |
| `review_samples` | **0** | `restaurant_id`, `source`, `source_url`, `review_text`, `attribution`, `observed_at`, `created_at` | ❌ none (RLS enabled, no policy; grants service_role only) | Designed exactly for review **text** — **empty today**. |
| `user_reviews` | **0** | `restaurant_id`, `user_id`, `rating`, `review_text`, `created_at` | ✅ SELECT (RLS enabled, **no policy** → returns `[]`) | Khabo Kothay community reviews — empty (auth not wired). |
| `restaurant_tags` | **0** | `restaurant_id`, `tag_name` | ✅ SELECT | Community tags — empty. |

### 1.2 Repository / service / hook support

| Layer | File | Status |
|---|---|---|
| Query | `src/integrations/supabase/queries.ts` | `selectReviewSignalsForRestaurant(s)`, `selectReviewSamplesForRestaurant`, `selectUserReviewsForRestaurant(s)` all exist |
| Transformer | `src/transformers/review.ts` | `mapReviewSignal` (external), `aggregateKhaboReviews`, `mapUserReviewRows` (community) — separation enforced |
| Repository | `src/repositories/reviewRepository.ts` | Community reviews only; external signals live on the restaurant transformer |
| Service | `src/services/reviewService.ts` | KK community reviews only |
| Hook | `src/hooks/useReviews.ts` | Adapter seam for user reviews + moderation |

**Gap:** `selectReviewSamplesForRestaurant` exists but **nothing calls it** — there is no repository/service/hook/UI for review *samples* (text). It is a dormant seam awaiting data.

### 1.3 Existing UI placeholders

- **"Why people like it"** (`RestaurantSignals.tsx` + `RestaurantPage.tsx`): renders `khabo.signals` + `khabo.tags`. In production both are **empty arrays** (`mapKhaboBlock` hardcodes `signals: []`, `tags: []`; `restaurant_tags` table is 0 rows), so the section currently **hides** (`hasCommunityContent` false). The component is built and ready (icon + strength bar + source labels) but has no data source today.
- **Google rating row** (header): renders `review_signals` via `mapGoogleBlock` — live and correct (206/206).
- **"Khabo Kothay reviews"** section: community reviews — empty in production (auth pending), shows an honest empty-state message.
- **No "What people say" section exists anywhere** in UI or docs — it is a reserved future slot.

### 1.4 Summary: what exists vs what is missing

**Exists:** Google rating + count for all restaurants; a dormant `review_samples` table with the exact schema review-text needs; an unused query; a built-but-empty "Why people like it" signal UI; strong architectural separation already in place.

**Missing:** review **text** (0 rows everywhere); any ingestion path; theme/sentiment extraction; confidence modeling; any "What people say" UI.

---

## 2. Feasibility research

### 2.1 Sources of review text

| Source | Feasibility | Reliability | Key limitations | Legal / API concerns |
|---|---|---|---|---|
| **Google Places API (New)** | **Only ToS-compliant programmatic option** | High for the 5 it returns | **Returns max 5 reviews per place** (sorted by "most helpful"); `review_text` + author attribution available; ~$17/1k Place Details (Pro tier); caching/storage restricted (see below) | Explicit attribution required (author name + link); Places content may not be cached long-term (only place IDs are exempt and storable indefinitely); must not be shown on a non-Google map |
| **Google Maps scraping (unofficial)** | Feasible technically (thousands of reviews) | High volume, unvetted | Anti-bot friction; volatile selectors; maintenance burden | **ToS §5(b) prohibits automated queries**; civil (not criminal) risk under `hiQ v. LinkedIn` / `Meta v. Bright Data`; SearchGuard bypass is active DMCA litigation — **out of scope for a production feature** |
| **Khabo Kothay community reviews** (`user_reviews`) | Future, once auth is wired | Own data, fully controllable | 0 rows today; volume will be tiny initially | None (own data) |
| **Partners / venue-supplied** | Future | Self-reported | Conflict of interest — venue-curated | Must be labelled as such |
| **Other platforms (Facebook, TripAdvisor, Zomato, Foodpanda)** | Manual research possible | Varies | No official API access typical; attribution + ToS per platform; Bangladeshi coverage uneven | Per-platform ToS; likely prohibited programmatic access — treat as **manual research sources only** |

### 2.2 Feasibility verdict

**Review text is collectable today only at low volume and only via Google Places API (5/place)** — that is enough to pilot *patterns* for a small set, not a full catalogue feature. High-volume text collection would require either (a) future community reviews, or (b) a managed scraping vendor — which introduces ToS/DMCA risk and should be an explicit, separately-approved decision.

Key constraint to design around: **the 5-review cap means "repeated pattern" detection has a small base.** Confidence rules (Section 4) must be honest about that — a pattern from ≤5 samples is at best MEDIUM confidence, and most often LOW/abstain.

### 2.3 Attribution & display requirements (from Google policy)

- Always credit the review author (name + profile link) when displaying text.
- Include Google attribution when showing Places content without a map.
- Do not persist Places content beyond what Google's caching terms allow; persist only place IDs.
- Never display Places review content on a non-Google map.

---

## 3. Review intelligence concept

### 3.1 What should be displayed (A)

- **Repeated positive themes** — e.g. "several reviewers mention the biryani being generously portioned" (evidence-linked).
- **Repeated complaints** — e.g. "multiple reviewers cite long waits at peak hours" (only when pattern is clear).
- **Repeated neutral/practical observations** — e.g. "reviewers note the rooftop seating", "several reviews mention card-only payment".
- **Unique customer observations** — only at HIGH confidence with strong evidence; otherwise abstain.
- Each item rendered as a *pattern*, not a quote, with: label, strength/confidence, evidence count, and a linked source.

### 3.2 What should NEVER be displayed (B)

- **Generic AI opinions** / invented summary sentences with no evidence link.
- **Single-review claims** presented as a pattern (only allowed as an explicitly-attributed quote, never as "people say").
- **Unsupported statements** — anything not backed by at least N independent reviews.
- **Merged claims** — never blend review-derived patterns into the verified facts layer ("Did you know?", price/location/menu, signature dishes).
- **Unattributed quotes** — any verbatim text must carry author + source attribution.
- **Venue/self-promotional content** disguised as customer sentiment.
- **Out-of-date sentiment** — no pattern older than a freshness window without re-verification.

### 3.3 Separation contract (unchanged from Discovery Facts work)

```
Verified information  → price / location / menu / hours        (header + menu sections)
Did you know?         → verified editorial discovery facts     (restaurant_discovery_facts)
What people say       → repeated customer-experience patterns  (FUTURE — review intelligence)
Signature dishes      → menu intelligence
```

"Did you know?" and "What people say" must never merge, and neither may feed the verified layer.

---

## 4. Confidence rules

Confidence is derived from **independent, attributable reviews**, not review count alone.

| Confidence | Rule (proposed) | Notes |
|---|---|---|
| **HIGH** | ≥5 independent reviews express the same theme AND no material counter-evidence in the reviewed sample | Strong, stable pattern; e.g. "portions are large" seen across many reviewers |
| **MEDIUM** | 3–4 independent reviews express the same theme | Repeated but smaller base; show with "based on a few reviews" framing |
| **LOW** | 1–2 reviews express the theme | **Not displayed as a pattern**; may surface only as an attributed single quote |
| **ABSTAIN** | <3 reviews, contradictory signals, or evidence base too small (e.g. Google 5-review cap on a restaurant with mixed sentiment) | No section / no item — honesty over coverage |

Additional rules:
- Theme must be **specific** (food, portion, wait time, seating, service, price, cleanliness), not generic ("great place").
- Confidence resets if the underlying sample is refreshed with materially different content.
- Every item carries `confidence` + `evidence_count` + `source` + `observed_at` in its data shape.

---

## 5. Recommended schema direction (design only — NOT created)

Direction mirrors the proven Discovery Facts pattern (`value` + `status` + `source` kept apart), but as a **derived-signal** layer, never merged into `restaurant_discovery_facts`.

Proposed (for future approval):

- `review_themes` — one row per extracted, reviewed theme:
  - `restaurant_id`, `theme_key` (stable machine key, e.g. `portion.large`), `theme_label`, `polarity` (`POSITIVE`/`NEGATIVE`/`NEUTRAL`), `confidence` (HIGH/MEDIUM/LOW), `evidence_count`, `supporting_quote_ids` (references into samples), `status` (DRAFT/APPROVED/REJECTED/ARCHIVED), `verified_at`, `approved_by`, `published_at`.
- Reuse **`review_samples`** as the raw-review store (already has `review_text`, `attribution`, `source_url`, `source`, `observed_at`).
- Keep `review_signals` as the coarse aggregate (rating/count) — unchanged.
- New RLS: samples + themes are staff/service-role managed; a **published**/APPROVED themes view is the only public read path (same pattern as `public_read_approved` on discovery facts).

This direction is a recommendation for a future, separately-approved migration.

---

## 6. Research workflow (proposed)

1. **Collect** review text for pilot venues (Google Places API — 5/place; store in `review_samples` with attribution + source_url + observed_at). No scraping.
2. **Extract** candidate themes per venue (manual or assisted reading of the small sample — no generative "AI opinions"; extraction only).
3. **Validate** against confidence rules (Section 4); drop anything below MEDIUM or lacking independent support.
4. **Review queue** (editorial, same trust model as Discovery Facts): DRAFT → APPROVED → published.
5. **Publish** only APPROVED themes through a dedicated public read path.
6. **Audit** against the "never display" list (Section 3.2) before every publish round.

---

## 7. Pilot plan — 10 restaurants

Selected to span review-count tiers, cuisines, experiences, and data richness. All 206 have Google place IDs (verified) and review signals (verified).

| # | Restaurant | Review count | Rating | Cuisine/type | Tier | Notes |
|---|---|---|---|---|---|---|
| 1 | Sultan's Dine Gulshan Branch | 11,814 | 4.3 | Bangladeshi | HIGH | Largest base; famous biryani house |
| 2 | Woodhouse Grill Banani | 9,382 | 4.6 | Steakhouse | HIGH | High rating + steak focus |
| 3 | Pizzaburg Gulshan | 5,877 | 4.8 | Pizza | HIGH | Very high rating; already in Discovery Facts QA |
| 4 | Chillox Banani | 5,758 | 4.4 | Fast food / burgers | HIGH | Trendy fast-food, likely strong theme signals |
| 5 | Meat Theory | 5,643 | 4.8 | Steakhouse / fusion | HIGH | Rich Discovery Facts set (5 facts) — tests section coexistence |
| 6 | Yum Cha District | 2,886 | 4.4 | Chinese | MEDIUM | Mid-size base, dim-sum identity |
| 7 | Koreana Restaurant | 2,855 | 4.4 | Korean | MEDIUM | Distinct cuisine, small niche community |
| 8 | Fakhruddin Biriyani & Restaurant | 2,747 | 3.8 | Biryani | MEDIUM | **Lower rating** — tests honest negative-pattern handling |
| 9 | MOJA Korean Fusion Restaurant | 364 | 4.8 | Korean fusion | LOW | Tiny base — tests abstain/small-sample rules |
| 10 | Ciao Dhaka | 352 | 4.2 | Italian | LOW | Low base + already 3 Discovery Facts — tests coexistence |

Coverage: HIGH×5, MEDIUM×3, LOW×2; cuisines = Bangladeshi, Steakhouse×2, Pizza, Fast food, Chinese, Korean×2, Biryani, Italian; ratings from 3.8 to 4.8; includes venues with 0–5 Discovery Facts.

### Pilot objectives
- Verify the 5-review Google sample yields any MEDIUM+ themes in practice (likely only for HIGH-tier venues).
- Validate confidence rules against real samples (expect many abstains at LOW tiers).
- Confirm section coexistence with "Did you know?" and the verified layer with zero leakage.
- Produce a publish/abstain decision per venue as the acceptance test.

---

## 8. Deliverable notes

- This document contains **no code, no schema creation, no migrations, no data changes, no UI**.
- Next phase (Review Intelligence implementation) requires a separate approval with: migration proposal, ingestion plan, RLS/grants, and a UI design — consistent with how Discovery Facts was gated.
- The dormant seam (`selectReviewSamplesForRestaurant`, `review_samples` schema, `RestaurantSignals` UI) is intentionally left untouched pending that approval.