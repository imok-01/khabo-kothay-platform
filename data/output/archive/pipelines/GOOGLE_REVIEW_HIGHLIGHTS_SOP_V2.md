# KHABO KOTHAY — Google Review Highlights: Collection SOP (V2)

Status: STANDARD OPERATING PROCEDURE — for the review-collection rollout.
Version: V2 (updated 2026-08-19 to reflect role separation discovered during batch 001)
Scope: Manual data collection + AI-assisted processing + human final approval.
Related artifacts:
- `GOOGLE_REVIEW_HIGHLIGHTS_PILOT.md` — the pilot source of truth (verbatim text, attribution, source URLs).
- `GOOGLE_REVIEW_HIGHLIGHTS_FINAL_QA.md` — the approved/rejected/hold classification for the pilot.
- `database/pipelines/review-samples/` — approved JSON data + import script + reports.
- `database/pipelines/review-samples/batches/` — batch collection structure for the rollout.

---

## 1. Purpose

Populate the `review_samples` table with small, hand-picked sets of **real, verbatim Google reviews** for
Khabo Kothay restaurant pages, so the "Google review highlights" section shows authentic, decision-useful
customer opinions. This is NOT a full-scraping rollout: it is a curated, human-verified enrichment of the
highest-value venues first.

Scope boundary: this SOP covers review **collection, verification, and import readiness only**. Database
imports run under separate approval and only via the service role; UI stays untouched.

---

## 2. Role Separation (V2 Update)

### Important Context

During batch 001 execution, we discovered that AI coding/repository agents cannot reliably perform
autonomous Google review collection. Testing across multiple agents (DeepSeek V4 Flash, mimo-v2.5)
revealed consistent limitations:

- **Cannot browse Google Maps** — no direct browser access
- **Cannot reliably search aggregators** — web search tools may return zero results
- **Cannot verify branch identity** — requires seeing the actual Google Maps page
- **Cannot guarantee verbatim accuracy** — the SOP requires "byte-for-byte verbatim" text
- **Cannot extract reviewer names/dates** — requires reliable text extraction from live pages

**Therefore, this SOP now explicitly separates responsibilities into three roles:**

### Role 1: HUMAN / VERIFIED DATA PROVIDER

**Responsibility:** Collect raw Google review data from verified sources.

**Tasks:**
- Browse Google Maps directly for each target restaurant
- Verify restaurant branch/place identity (placeId match)
- Select up to 3 detailed, decision-useful reviews
- Copy verbatim review text (typos, emojis, Bangla preserved exactly)
- Record: reviewer name, date, rating, review text
- Note the source URL (Google Maps or aggregator like Wanderlog)
- Provide raw data to AI for processing

**Acceptable sources:**
- Google Maps directly (preferred)
- Wanderlog.com (trusted aggregator, used in pilot)
- restaurantguru.com (trusted aggregator, used in pilot)
- Trip.com (trusted aggregator)

**NOT acceptable:**
- AI-generated reviews
- Rewritten/summarized reviews
- Third-party reviews presented as Google reviews
- Reviews without verifiable attribution

### Role 2: AI / DATA PROCESSING ASSISTANT

**Responsibility:** Process raw review data into import-ready format.

**Tasks:**
- Validate restaurant UUIDs against live database
- Check for duplicates against existing review_samples
- Verify all required fields are present
- Classify reviews as APPROVED / HOLD / REJECT per acceptance rules
- Build manifest.json with correct schema
- Build qa_report.md with classification decisions
- Run dry-run import validation
- Prepare documentation for human review

**NOT responsible for:**
- Collecting review text (requires human verification)
- Verifying branch identity (requires human verification)
- Making final import approval decisions

**Optional capability (when environment supports it):**
- AI-assisted research using web search and URL reading
- This is classified as "UNVERIFIED" until the AI can demonstrate reliable access to Google Maps/aggregators

### Role 3: HUMAN / FINAL APPROVER

**Responsibility:** Review and approve final import.

**Tasks:**
- Review manifest.json and qa_report.md
- Verify review text accuracy (spot-check against source)
- Verify branch identity (spot-check placeId)
- Approve or reject the batch for import
- Authorize service-role import execution
- Verify post-import results

---

## 3. Selection Criteria

Per restaurant, collect up to **3** Google-origin review excerpts. Prefer reviews that:

1. Are **detailed** — mention specific dishes, service behaviour, prices, ambiance, or a concrete experience.
2. Are **decision-useful** — a reader can infer what to order, whether it is worth the price, how busy it is,
   or what kind of group it suits.
3. Show **variety of tone** — a strongly positive pick plus a balanced ("X great, Y not so much") pick gives a
   credible mix. Do not cherry-pick only glowing reviews when balanced detail exists.
4. Are **recent** where possible — prefer reviews within ~12 months, but older detailed reviews are acceptable
   when they are the best available (pilot precedent: Chef's Table Nov 2024).

Prioritise restaurants by value: high traffic, well-known venues, or venues with low third-party coverage
first. Venues with very few Google reviews (< ~50) are expected to yield 0 usable samples and are documented
as unavailable cases.

---

## 4. Acceptance Rules (APPROVED)

A review is approved for import ONLY when **all** hold:

- **Correct branch** — the review belongs to the exact restaurant row (verified by Google `placeId`, address,
  or explicit branch name in the review text / listing).
- **Google-origin confirmed** — the text is a real Google Maps review reproduced verbatim by a public
  aggregator that links back to Google (Wanderlog, Trip.com, restaurantguru.com, top-rated.online) OR copied
  directly from Google Maps by a human.
- **Attribution present** — at minimum a reviewer name (or display name). Rating and date are strongly
  preferred but not strictly required.
- **Verbose enough** — enough specific content to be decision-useful (not a bare one-liner).
- **Original text preserved** — typos, emojis, punctuation, and Bangla characters kept exactly as written.

If rating and/or date are known from the aggregator, record them in the QA/import note; do not invent them.

---

## 5. Rejection Rules (REJECT)

Reject a review if any of the following is true:

- **Wrong branch** — belongs to another location of the chain (e.g. Pizzaburg Mirpur vs Gulshan; Handi
  Dhanmondi vs Gulshan; Kacchi Bhai Puran Dhaka vs Gulshan). This was a recurring pilot trap.
- **Generic / unhelpful** — one-line praise with no content, e.g. "Awesome place to dine out with friends &
  family." (pilot precedent: rejected).
- **Cannot confirm Google origin** — text appears nowhere as a Google-attributed review, or the aggregator
  page is clearly synthesised/aggregated rather than a real review.
- **Suspected AI / rewritten / summarised text** — any indication the text was paraphrased or machine-written.
- **Duplicate** — identical (restaurant, attribution, text) already present in `review_samples` or elsewhere
  in the same batch.
- **Fake/placeholder attribution** — attribution that cannot be tied to a real reviewer display name.

---

## 6. Branch Verification Process

This is the highest-risk step. **Requires human verification.**

For every candidate review:

1. Identify the restaurant row and its Google `placeId` (from `restaurants` + `restaurant_sources` tables).
2. Confirm the aggregator page is for the **same place ID** — Wanderlog place pages expose `placeId`
   (`ChIJ…`) and an address. Match against the row.
3. When the aggregator page shows a different branch (name variant, different address/neighbourhood, or a
   `placeId` that differs), EXCLUDE the page. Do not use it even if the chain name matches.
4. If the review text itself names a branch ("Handi in Gulshan", "Chillox in Banani"), that is supporting
   evidence — but not sufficient alone; the page/place ID must also match.
5. Record the verified `placeId` and the source URL in the batch entry.

**Branch verification watchlist (known high-risk chains):**
- Herfy Gulshan vs Herfy Banani (different place IDs)
- Burger King Banani vs Burger King Gulshan 2 (chain)
- Pizza Inn Gulshan 1 (multiple Dhaka branches)
- Nawab Chatga (Chittagong-origin name)
- Takeout Banani vs Takeout Gulshan (distinct venues)

---

## 7. Attribution Requirements

- **Reviewer name** is mandatory for import (pilot validation enforces non-blank `attribution`).
- If an aggregator shows the text without a name (pilot: top-rated.online), the entry goes to **HOLD** —
  never import unattributed text. It must be verified against Google Maps (name, rating, date) before import.
- Do not invent a name, username, or handle to satisfy the field.
- The displayed "Google" label is fixed by the UI; the stored `source` must be `Google` and `source_url`
  must be the aggregator/Google page where the review was verified.

---

## 8. Maximum Highlights Per Restaurant

- **Up to 3** per restaurant (UI renders `slice(0, 3)`).
- A restaurant with 1–2 high-quality reviews is fine — do not pad to 3 with weak filler.
- A restaurant with 0 usable reviews is documented as an unavailable case and gets the empty state.

---

## 9. QA Checklist

Before a batch is marked import-ready:

- [ ] Every entry has correct `restaurant_id` (UUID verified against live `restaurants` table).
- [ ] Every entry `source === 'Google'`.
- [ ] Branch verified per §6 for every entry (place ID match).
- [ ] Attribution non-blank; no invented names.
- [ ] Review text is byte-for-byte verbatim (spot-check a sample against the source page).
- [ ] No duplicates within the batch or against the live `review_samples` table.
- [ ] No technical/API status strings and no aggregator URLs leaked into UI-facing fields.
- [ ] Each entry classified APPROVED (HOLD entries removed or moved to a verification queue).
- [ ] Count per restaurant ≤ 3; total batch count matches the manifest.

---

## 10. Import Checklist

The import itself is a separate, approval-gated step (service role only — anon has SELECT-only RLS):

- [ ] Batch JSON validated by dry-run (`node import_review_samples.js`) with **0 errors**.
- [ ] `--apply` run only after explicit approval.
- [ ] Post-import verification: row count matches the batch; all rows resolve to restaurants; anon read
      returns the rows; anon write still blocked (`permission denied for table review_samples`).
- [ ] Import report (`REVIEW_SAMPLES_IMPORT_REPORT.md`) written and reviewed.
- [ ] No DB schema changes, no UI changes.

---

## 11. Batch Workflow (V2 — Role-Separated)

### Phase 1: HUMAN DATA COLLECTION

1. Create a batch manifest in `database/pipelines/review-samples/batches/<batch_id>/` (see the README).
2. **Human data provider** researches each restaurant:
   - Opens Google Maps or trusted aggregator
   - Verifies branch/place identity (placeId match)
   - Selects up to 3 detailed, decision-useful reviews
   - Copies verbatim text (typos, emojis, Bangla preserved)
   - Records: reviewer name, date, rating, review text, source URL
3. **Human data provider** provides raw review data in a structured format (JSON, spreadsheet, or text).

### Phase 2: AI DATA PROCESSING

4. **AI assistant** processes raw data:
   - Validates restaurant UUIDs against live database
   - Checks for duplicates against existing review_samples
   - Verifies all required fields are present
   - Classifies reviews as APPROVED / HOLD / REJECT per acceptance rules
   - Builds manifest.json with correct schema
   - Builds qa_report.md with classification decisions
5. **AI assistant** runs dry-run import validation.
6. **AI assistant** presents manifest + qa_report for human review.

### Phase 3: HUMAN FINAL APPROVAL

7. **Human approver** reviews manifest + qa_report:
   - Spot-checks review text accuracy against source
   - Verifies branch identity (placeId)
   - Approves or rejects the batch
8. **Human approver** authorizes service-role import execution.
9. **AI assistant** runs `--apply` import (after explicit approval).
10. **AI assistant** runs post-import verification.
11. **AI assistant** writes import report.

### Constraints Reaffirmed

- Manual research only for data collection (no scraping).
- No AI-generated reviews.
- No rewriting of review text.
- No fake attribution.
- Human approval required before import.

---

## 12. AI-Assisted Research (Optional — When Environment Supports It)

**Classification: UNVERIFIED until demonstrated reliable.**

In some environments, AI agents may have access to:
- Web search tools
- URL reading capabilities
- Google Maps or aggregator pages

When these capabilities are available and demonstrated reliable:

**AI CAN assist with:**
- Searching for restaurant pages on aggregators (Wanderlog, restaurantguru.com)
- Extracting review text from public aggregator pages
- Verifying placeId from aggregator URLs
- Cross-referencing multiple sources

**AI CANNOT replace human verification for:**
- Final branch identity confirmation
- Verbatim text accuracy guarantee
- Reviewer name/date extraction accuracy
- Source URL validity

**When AI assists with research:**
- All AI-collected data must be treated as "UNVERIFIED" until human spot-checks
- Human approver must verify a sample of AI-collected reviews against original sources
- AI collection is a time-saver, not a replacement for human oversight

---

## 13. Document History

| Version | Date | Changes |
|---------|------|---------|
| V1 | 2026-08-19 | Initial SOP |
| V2 | 2026-08-19 | Added role separation (Human/AI/Human Approver) based on batch 001 discovery that AI agents cannot reliably collect Google reviews autonomously |

---

*End of SOP V2.*
