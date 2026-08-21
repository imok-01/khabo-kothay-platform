# KHABO KOTHAY — Google Review Highlights: Collection SOP (V2)

Status: STANDARD OPERATING PROCEDURE — revised after Batch 001 source-reachability audit.
Scope: manual research only. No scraping, no AI-generated reviews, no rewriting of review text, no fake attribution.
Related artifacts:
- `GOOGLE_REVIEW_HIGHLIGHTS_PILOT.md` — the pilot source of truth (verbatim text, attribution, source URLs).
- `GOOGLE_REVIEW_HIGHLIGHTS_FINAL_QA.md` — the approved/rejected/hold classification for the pilot.
- `GOOGLE_REVIEW_HIGHLIGHTS_EXECUTION_PLAN.md` — the 206-restaurant rollout strategy.
- `GOOGLE_REVIEW_HIGHLIGHTS_PROCESS_AUDIT.md` — Batch 001 collection audit findings.
- `database/pipelines/review-samples/` — approved JSON data + import script + reports.
- `database/pipelines/review-samples/batches/` — batch collection structure for the rollout.

---

## 1. Purpose

Populate the `review_samples` table with small, hand-picked sets of **real, verbatim Google reviews** for
Khabo Kothay restaurant pages, so the "Google review highlights" section shows authentic, decision-useful
customer opinions. This is NOT a full-scraping rollout: it is a curated, human-verified enrichment of
the dataset.

Scope boundary: this SOP covers review **collection, verification, and import readiness only**.
Database imports run under separate approval and only via the service role; UI stays untouched.

---

## 2. Selection criteria

Per restaurant, collect up to **3** Google-origin review excerpts. Prefer reviews that:

1. Are **detailed** — mention specific dishes, service behaviour, prices, ambiance, or a concrete experience.
2. Are **decision-useful** — a reader can infer what to order, whether it is worth the price, how busy it is,
   or what kind of group it suits.
3. Show **variety of tone** — a strongly positive pick plus a balanced ("X great, Y not so much") pick gives a
   credible mix. Do not cherry-pick only glowing reviews when balanced detail exists.
4. Are **recent** where possible — prefer reviews within ~12 months, but older detailed reviews are acceptable
   when they are the best available (pilot precedent: Chef's Table Nov 2024).

Prioritise restaurants by value: high traffic, well-known venues, or venues with low third-party coverage
first. Venues with very few Google reviews (< ~20) are expected to yield 0 usable samples and are documented
as unavailable cases.

---

## 3. Verified source reliability (updated V2 finding)

Not all aggregator sources are equal. This document reflects what is **currently reachable and usable**:

| Source | Reachable via automated tools | Attributed text (name/date/rating) | Verbatim fidelity | Verdict |
|---|---|---|---|---|
| **Google Maps (browser)** | ❌ (no browser automation) | ✅ (full) | ✅ (verbatim) | **Primary source — human/browser only** |
| **Wanderlog** | ❌ (blocked/paywalled as of audit) | ✅ | ✅ | **Secondary — requires browser/manual** |
| **Trip.com** | ❌ (blocked) | ✅ | ✅ | **Secondary — requires browser/manual** |
| **restaurantguru.com** | ❌ (503/unreachable as of audit) | ✅ | Mixed | **Secondary — requires browser/manual** |
| **top-rated.online / TOP-RATED.ONLINE** | ✅ (webfetch reachable) | ❌ (all anonymous) | ❌ (evidently paraphrased/machine-generated) | **UNSUITABLE for APPROVED/HOLD — REJECT all** |
| **tophotels / tophotels.ru** | ❌ (as of audit) | Mixed | Mixed | **Unverified — use only if full attribution confirmed** |

**Consequence:** With current tooling (no browser automation, no working websearch, no API access), zero
reviews can be APPROVED. AI agents can do data prep, validation, and report generation, but **human
intervention or Google Places API access is required to retrieve attributable review text**.

---

## 4. Acceptance rules (APPROVED)

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

## 5. Rejection rules (REJECT)

Reject a review if any of the following is true:

- **Wrong branch** — belongs to another location of the chain (e.g. Pizzaburg Mirpur vs Gulshan; Handi
  Dhanmondi vs Gulshan; Kacchi Bhai Puran Dhaka vs Gulshan). This was a recurring pilot trap.
- **Generic / unhelpful** — one-line praise with no content, e.g. "Awesome place to dine out with friends &
  family." (pilot precedent: rejected).
- **Cannot confirm Google origin** — text appears nowhere as a Google-attributed review, or the source page
  is clearly synthesised/aggregated or paraphrased (top-rated.online falls in this category).
- **Unattributed** — no reviewer name or identifiable handle (top-rated.online "Highlighted Reviews" are
  anonymous; treat as HOLD, never APPROVED).
- **Suspected AI / rewritten / summarised text** — any indication the text was paraphrased or machine-written.
- **Duplicate** — identical (restaurant, attribution, text) already present in `review_samples` or elsewhere
  in the same batch.
- **Fake/placeholder attribution** — attribution that cannot be tied to a real reviewer display name.

---

## 6. Branch verification process

This is the highest-risk step. For every candidate review:

1. Identify the restaurant row and its Google `placeId` (`src/data/restaurants.ts` → `google.placeId`).
2. Confirm the aggregator page is for the **same place ID** — Wanderlog place pages expose `placeId`
   (`ChIJ…`) and an address. Match against the row.
3. When the aggregator page shows a different branch (name variant, different address/neighbourhood, or a
   `placeId` that differs), EXCLUDE the page. Do not use it even if the chain name matches.
4. If the review text itself names a branch ("Handi in Gulshan", "Chillox in Banani"), that is supporting
   evidence — but not sufficient alone; the page/place ID must also match.
5. Record the verified `placeId` and the source URL in the batch entry.

---

## 7. Attribution requirements

- **Reviewer name** is mandatory for import (pilot validation enforces non-blank `attribution`).
- If an aggregator shows the text without a name (pilot: top-rated.online), the entry goes to **HOLD** —
  never import unattributed text. It must be verified against Google Maps (name, rating, date) before import.
- Do not invent a name, username, or handle to satisfy the field.
- The displayed "Google" label is fixed by the UI; the stored `source` must be `Google` and `source_url`
  must be the aggregator/Google page where the review was verified.

---

## 8. Maximum highlights per restaurant

- **Up to 3** per restaurant (UI renders `slice(0, 3)`).
- A restaurant with 1–2 high-quality reviews is fine — do not pad to 3 with weak filler.
- A restaurant with 0 usable reviews is documented as an unavailable case and gets the empty state.

---

## 9. QA checklist

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

## 10. Import checklist

The import itself is a separate, approval-gated step (service role only — anon has SELECT-only RLS):

- [ ] Batch JSON validated by dry-run (`node import_review_samples.js`) with **0 errors**.
- [ ] `--apply` run only after explicit approval.
- [ ] Post-import verification: row count matches the batch; all rows resolve to restaurants; anon read
      returns the rows; anon write still blocked (`permission denied for table review_samples`).
- [ ] Import report (`REVIEW_SAMPLES_IMPORT_REPORT.md`) written and reviewed.
- [ ] No DB schema changes, no UI changes.

---

## 11. Automation vs. human boundary (V2 addition)

This section documents what AI tooling can and cannot reliably do in this environment.

### What AI agents CAN automate reliably

- **Dataset curation**: rank restaurants by review count/frequency, mark already-imported restaurants,
  build the candidate pool.
- **Branch-deduplication**: match chain branches via name/address similarity and flag duplicates.
- **Manifest generation**: create the batch `manifest.json` with restaurant_id, restaurant_name, placeId,
  review count, and rating from the seed data.
- **Research scaffolding**: build the `qa_report.md` per-restaurant decision templates.
- **Pre-import validation**: dry-run the import script, parse errors, validate required fields,
  detect duplicates within the batch and against live `review_samples`.
- **Import execution**: run `--apply` via service role after human approval (script is deterministic and
  validated).
- **Post-import verification**: confirm row count, FK resolution, anon read, anon write blocked.
- **Report generation**: write `REVIEW_SAMPLES_IMPORT_REPORT.md` from script output.
- **Lint/test/build verification**: run `npm test`, `npm run lint`, `npm run build` after any change.

### What requires Google Places API / browser access / human verification

- **Retrieving review text**: actual Google Maps review content is only accessible via (a) a browser logged
  into Google Maps, (b) the Google Places API `reviews` endpoint, or (c) a web page that mirrors Google
  reviews with attributable text (Wanderlog, Trip.com, restaurantguru when reachable). As of the V2 audit,
  only top-rated.online is reachable via automated webfetch, and it is unsuitable (anonymous, paraphrased).
- **Attribution confirmation**: reviewer name, date, and rating are only reliably available from
  Google Maps, the Places API, or a directly-verifiable aggregator page. AI tools in this environment cannot
  reach these sources.
- **Google-origin confirmation**: confirming a review comes from Google Maps requires seeing the page's
  attribution metadata (Wanderlog "from Google", Trip.com review card, Places API `author_name` field).
  AI tools cannot verify this without source access.
- **Branch verification on live maps**: while placeId matching can be done against seed data, confirming an
  aggregator page corresponds to the correct branch requires opening the live page. top-rated.online can
  sometimes mismatch branches (as shown in V2 audit for Pizza Inn Gulshan 1 Rd 127 vs Rd 12).
- **Decision-usefulness classification**: requires reading the review and judging whether it helps a diner
  make a decision (dish, price, ambiance, service). This is a human judgment call.
- **Spot-checking verbatim fidelity**: only a human reading the source page and the collected text can confirm
  character-for-character accuracy.

### Data format for import-ready batches

The import contract is stable and already enforced by `import_review_samples.js`. Each batch `manifest.json`
must contain:

```json
{
  "dataset": "<label>",
  "approved_on": "YYYY-MM-DD",
  "count": <number>,
  "reviews": [
    {
      "restaurant_id": "<UUID>",
      "restaurant_name": "<string>",
      "source": "Google",
      "source_url": "<URL where review was verified>",
      "attribution": "<reviewer display name — non-blank, required>",
      "observed_at": "YYYY-MM-DD",
      "review_text": "<verbatim text — never rewritten or truncated>"
    }
  ]
}
```

Constraints: `restaurant_id` must exist in live `restaurants`, `source === 'Google'`,
`attribution` non-blank, `review_text` non-blank, no duplicate keys, no duplicate against live table.

---

## 12. Human-effort minimisation strategy

1. **AI pre-population**: for every restaurant in the batch, the AI generates the restaurant_id,
   restaurant_name, placeId, address, review count, rating, and a branch-verification watchlist. The human
   researcher only needs to fill in the review text, attribution, date, rating, source URL, and classification.
2. **Ranked, not random**: batches are ordered by review count (high → low), so the human gets maximum
   yield early and can stop early if needed.
3. **Pre-filled source URL templates**: the AI can pre-build search URLs (Google Maps place search, known
   aggregator paths) so the human opens the right page directly.
4. **One-pass target**: aim for ≤ 3 per restaurant, not exhaustive collection. The human spends focused time
   per venue, not broad searching.
5. **Verification queue for HOLD**: uncertain items are logged and batch-processed later (e.g. a second pass
   on Google Maps for anonymous aggregator snippets), not blocking the main APPROVED flow.

---

## 13. Batch strategy recommendation

**Batch 001: PAUSE collection · change source strategy · keep prep.**

- **Why pause:** As of the V2 audit, no automated tool can reach an attributable Google-review source.
  Continuing to "collect" via top-rated.online would only produce REJECT/HOLD entries, wasting effort and
  creating false signal.
- **What changes:** collection must switch to either (a) Google Places API access, or (b) a human with
  browser access to Google Maps and the confirmed aggregator sites.
- **What stays:** the restaurant selection, manifest scaffolding, and research notes are all correct and
  reusable. The batch folder is preserved.
- **Trigger to resume:** Google Places API key, or a confirmed browser/manual research window.

---

## 14. Constraints (unchanged)

Manual research only, no scraping, no AI-generated reviews, no rewriting of review text, no fake
attribution. Batch-scale automation is limited to data prep, validation, and import execution.