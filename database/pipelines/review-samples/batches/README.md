# Review Samples — Batch Collection Structure (V2)

This folder holds the manual research output for the Google Review Highlights
rollout. One subfolder per batch. No scraping, no AI-generated reviews, no
rewriting, no fake attribution — everything here is hand-collected and verified
per `GOOGLE_REVIEW_HIGHLIGHTS_SOP_V2.md`.

**V2 Update:** This workflow now explicitly separates responsibilities:
- **Human data provider:** Collects raw Google review data from verified sources
- **AI assistant:** Processes data into import-ready format
- **Human approver:** Reviews and approves final import

See `GOOGLE_REVIEW_HIGHLIGHTS_SOP_V2.md` §2 for complete role definitions.

## Layout

```
batches/
  README.md
  batch_template.json          <- copy me per batch
  batch_001_<scope>/           <- one folder per batch
    manifest.json              <- required: the import-ready dataset
    qa_report.md               <- required: per-review APPROVED/HOLD/REJECT decisions
    verification_log.md        <- recommended: placeId / source checks for each entry
```

## Naming

- Folder: `batch_001_<short-scope>` (e.g. `batch_001_gulshan-2`), zero-padded and
  sequential.
- Manifest: `manifest.json` (keep this exact filename — import tooling points at it).
- A batch is complete only when BOTH `manifest.json` and `qa_report.md` exist.

## Per-batch workflow (V2 — Role-Separated)

### Phase 1: Batch Planning (AI-Assisted)
1. AI analyzes restaurant database to identify high-value targets
2. AI generates batch manifest structure (no reviews yet)
3. Founder reviews and approves batch scope

### Phase 2: Human Data Collection
4. **Human data provider** researches each restaurant:
   - Opens Google Maps or trusted aggregator
   - Verifies branch/place identity (placeId match)
   - Selects up to 3 detailed, decision-useful reviews
   - Copies verbatim text (typos, emojis, Bangla preserved)
   - Records: reviewer name, date, rating, review text, source URL
5. **Human data provider** provides raw review data in structured format

### Phase 3: AI Data Processing
6. **AI assistant** processes raw data:
   - Validates restaurant UUIDs against live database
   - Checks for duplicates against existing review_samples
   - Classifies reviews as APPROVED / HOLD / REJECT
   - Builds manifest.json with correct schema
   - Builds qa_report.md with classification decisions
7. **AI assistant** runs dry-run import validation
8. **AI assistant** presents manifest + qa_report for human review

### Phase 4: Human Final Approval
9. **Human approver** reviews manifest + qa_report:
   - Spot-checks review text accuracy against source
   - Verifies branch identity (placeId)
   - Approves or rejects the batch
10. **Human approver** authorizes service-role import execution

### Phase 5: Import and Verification
11. **AI assistant** runs `--apply` import (after explicit approval)
12. **AI assistant** runs post-import verification
13. **AI assistant** writes import report

## manifest.json schema

Exactly matches the pilot file contract used by the import script:

- `dataset`: free-text label (e.g. "GOOGLE_REVIEW_HIGHLIGHTS_FINAL_QA.md — APPROVED only")
- `approved_on`: ISO date the batch QA passed
- `count`: number of entries in `reviews`
- `reviews[]`:
  - `restaurant_id` — UUID from the live `restaurants` table (required)
  - `restaurant_name` — display name at collection time (informational)
  - `source` — must be `"Google"`
  - `source_url` — aggregator/Google page where the review was verified
  - `attribution` — real reviewer display name (non-blank, required)
  - `observed_at` — ISO date of the review where known; otherwise the collection date
  - `review_text` — byte-for-byte verbatim review text (typos/emojis/Bangla preserved)

## Example

`batch_template.json` in this folder is the canonical starting point — copy it,
rename to `manifest.json`, and fill per restaurant.

## Import contract notes

- The import script validates: `restaurant_id` exists live, `source === 'Google'`,
  no duplicate keys (restaurant_id, attribution, trimmed-lowercase review_text)
  within the file and against the live `review_samples` table.
- `attribution` is mandatory; anonymous aggregator text goes to HOLD, never here.
- `review_text` is never rewritten or shortened.