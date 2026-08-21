# KHABO KOTHAY — Google Review Highlights: Execution Plan (206 Restaurants)

Status: REVISED after Batch 001 source-reachability audit (see `GOOGLE_REVIEW_HIGHLIGHTS_PROCESS_AUDIT.md`).
No DB/UI changes. Data collection is the only blocking dependency.

---

## 1. What AI agents can reliably automate

| Task | Tool | Input | Output | Confidence |
|---|---|---|---|---|
| Restaurant ranking | AI + live DB query | 206 restaurants, pilot coverage list | Ordered pool excluding covered rows | ✅ High |
| Batch manifest scaffolding | AI | 206-restaurant ranked pool, placeIds, UUIDs | `manifest.json` with 20 restaurants, zero `reviews` | ✅ High |
| Branch-deduplication | AI | Seed names, placeIds | Watchlist of chain-branch pairs (e.g. Herfy ×2, BK ×2) | ✅ High |
| Per-restaurant QA template | AI | manifest + batch scope | `qa_report.md` with 20 × 3 decision slots | ✅ High |
| Pre-import validation | `import_review_samples.js` (dry-run) | `manifest.json` | Error list (missing restaurant, blank attribution, duplicate, non-Google source) | ✅ High |
| Import execution | `import_review_samples.js --apply` | Validated manifest + service-role keys | DB rows + import report | ✅ High |
| Post-import verification | AI + DB queries | Live `review_samples` table | Row count, FK resolution, anon read, anon write blocked | ✅ High |
| Report writing | AI | Script output, verification results | `REVIEW_SAMPLES_IMPORT_REPORT.md` | ✅ High |
| Lint/test/build | MCP tools | Working tree | 289 pass · 0 lint errors · 219/219 build | ✅ High |

**Net effect:** AI handles ~60% of the work (data prep, validation, execution, verification). It
**cannot** retrieve attributable review text or make APPROVED/HOLD/REJECT decisions without sources.

---

## 2. What requires Google Places API / browser access / human verification

| Task | Dependency | Why AI cannot do it |
|---|---|---|
| Retrieve review text | **Google Places API** or **browser** (Google Maps, Wanderlog, Trip.com, restaurantguru) | Automated webfetch in this environment is blocked for all real sources; top-rated.online is reachable but unsuitable |
| Confirm reviewer name/date/rating | **Google Maps page** or **Places API** `reviews` endpoint | Attribution metadata is only available on live Google pages or via API; aggregators in scope require browser |
| Confirm Google-origin | **Live source page** with attribution metadata | Must see "from Google" or Places API `author_name`; unreachable sources cannot be verified |
| Branch verification on live maps | **Browser** with address/placeId cross-check | placeId matches seed data, but aggregator page branch matching requires loading the live page |
| Classify HIGH/MEDIUM/LOW usefulness | **Human reading** | Requires judgment about what a diner needs to know |
| APPROVED/HOLD/REJECT decision | **Human + live source** | AI cannot fabricate attribution; unverifiable = REJECT; borderline = HOLD; both require source access |
| Spot-check verbatim fidelity | **Human comparison** | Must read source + collected text side-by-side |

---

## 3. Data format for import-ready batches

Unchanged from SOP V1. Each batch `manifest.json`:

```json
{
  "dataset": "GOOGLE_REVIEW_HIGHLIGHTS_BATCH_<nn> — <scope>",
  "approved_on": "YYYY-MM-DD",
  "count": <number>,
  "reviews": [
    {
      "restaurant_id": "<UUID>",
      "restaurant_name": "<string>",
      "source": "Google",
      "source_url": "<URL where review was verified>",
      "attribution": "<reviewer display name — required, non-blank>",
      "observed_at": "YYYY-MM-DD",
      "review_text": "<verbatim text — never rewritten or truncated>"
    }
  ]
}
```

**Hard constraints enforced by import script:**
- `restaurant_id` must exist in live `restaurants` table
- `source === 'Google'` (exact string)
- `attribution` non-blank (trimmed)
- `review_text` non-blank (trimmed)
- No duplicate keys: `(restaurant_id, attribution, review_text lowercased)` within file or against live table
- `review_text` stored byte-for-byte; no rewriting, no summarising, no truncation

---

## 4. Execution phases for 206 restaurants

### Phase 0 — Pre-flight (AI, no human needed)
- [x] Finalise restaurant selection criteria (V2 SOP agreed: high-traffic first, exclude pilot-covered)
- [x] Rank all 206 restaurants by Google review count (source: `src/data/restaurants.ts` seed + live DB)
- [x] Exclude 10 pilot-covered restaurants + 2 unavailable cases
- [x] Build ranked candidate pool (196 eligible restaurants)
- [x] Generate batch manifests (20 restaurants each), saved to `database/pipelines/review-samples/batches/`

### Phase 1 — Source access setup (human task, one-time)
Required before any collection can proceed:

- **Minimum viable:** a human opens a browser window with the following tabs per restaurant batch:
  1. Google Maps → search `placeId`
  2. Google Maps → "All reviews" page (copies text + attribution)
  3. Wanderlog / Trip.com / restaurantguru (if available) as secondary sources
- **Better:** Google Places API key with `fields=reviews` access — returns `author_name`, `text`, `rating`,
  `time`, `relative_time_description` for up to 5 reviews per place per request.
- **Constraint:** the API key must be scoped to the Khabo Kothay project and stored in `database/.env` (not
  committed). It must not bypass Google's terms of service.

### Phase 2 — Human collection (browser or API, per restaurant)
For each of up to 206 restaurants:

1. Open Google Maps / Places API for the restaurant's `placeId`.
2. Identify the exact branch (address matches seed data).
3. Copy up to 3 reviews that meet SOP V2 §4 (detailed, decision-useful, attributed, verbose enough).
4. For each: record reviewer name, date, rating (if shown), exact text, placeholder source URL.
5. Classify APPROVED / HOLD / REJECT per SOP V2.
6. Mark `manifest.json` entry as collected or 0-highlights.

**Time estimate:** if a human works from Google Maps directly, ~5–10 minutes per restaurant with 3 reviews
= ~15–35 hours total for 206 restaurants. Google Places API could cut this dramatically.

### Phase 3 — AI pre-import validation (automated, per batch)
- Run `node import_review_samples.js` dry-run against the manifest.
- Fix reported errors (missing fields, blanks, duplicates).
- Run QA checklist (§9 of SOP).
- Present import report for human approval.

### Phase 4 — Human approval → AI import execution
- Human signs off on the batch + import report.
- AI runs `--apply` via service role.
- AI runs post-import verification (row count, FK, anon read, anon write blocked).
- AI writes `REVIEW_SAMPLES_IMPORT_REPORT.md`.

### Phase 5 — Proceed to next batch
- Never merge batches without re-running validation.
- Repeat Phases 2–4.

---

## 5. Human-effort minimisation

1. **API-first**: if Google Places API is available, collection is fastest (structured JSON, no copy-paste).
2. **60/40 split**: AI handles ranking, manifest scaffolding, deduplication, import validation, and
   execution. Human copies reviews and makes entry-level classification decisions.
3. **Batch size**: 20 restaurants per batch is manageable in one browser session (~2–4 focused hours).
4. **0-highlight tolerance**: restaurants with no usable reviews are marked 0 and skipped — no wasted
   effort padding.
5. **HOLD queue**: borderline items (anonymous aggregator snippets) are batched and revisited in a
   second pass over Google Maps, not blocking the main APPROVED pipeline.

---

## 6. Batch 001 decision

**Decision: PAUSE collection · change source strategy · keep prep.**

- **Evidence:** 100% REJECT/HOLD/0 result from the only reachable source (top-rated.online — anonymous,
  paraphrased, branch-mismatched). No attributable Google review text retrieved for any of the 20 target
  restaurants via automated tools.
- **Action:** keep `batch_001_gulshan-banani-high-volume/` intact; mark collection as `WAITING_FOR_VIABLE_SOURCE`.
- **Resume trigger:** (a) Google Places API key, or (b) confirmed browser/manual research capability.
- **If API is available:** resume immediately; the restaurant selection, placeIds, and manifest are
  already correct and reusable.
- **If manual browser is the only option:** start with the highest-review-count restaurants first
  (Herfy Gulshan, Takeout Banani, Meat Theory) to validate the workflow before committing to all 20.

---

## 7. Constraints (unchanged)

Manual research only, no scraping, no AI-generated reviews, no rewriting of review text, no fake
attribution. AI automation is limited to data prep, validation, and import execution — never to review
invention or unattributed text import.