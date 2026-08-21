# KHABO KOTHAY — Google Review Highlights: Recommended Research Workflow

**Created:** 2026-08-19
**Context:** Based on process audit findings from batch 001 execution
**Status:** RECOMMENDATION — for founder review and approval

---

## 1. Overview

This document recommends a practical workflow for collecting Google review highlights
for Khabo Kothay restaurants, based on lessons learned from the pilot and batch 001.

**Key insight:** AI coding agents cannot reliably collect Google reviews autonomously.
The workflow must separate human data collection from AI data processing.

---

## 2. Recommended Workflow

### Phase 1: Batch Planning (AI-Assisted)

**Who:** AI assistant + Founder
**Goal:** Select restaurants and prepare collection targets

**Steps:**
1. AI analyzes restaurant database to identify high-value targets:
   - Restaurants with high Google review counts
   - Restaurants missing from pilot coverage
   - Cuisine variety for rollout demonstration
2. AI generates batch manifest with:
   - Restaurant names, IDs, placeIds
   - Review counts and ratings
   - Branch verification watchlist
3. Founder reviews and approves batch scope

**Output:** `batch_XXX_<scope>/manifest.json` (structure only, no reviews)

---

### Phase 2: Human Data Collection

**Who:** Human data provider (founder, team member, or contractor)
**Goal:** Collect verbatim Google review data from verified sources

**Steps:**
1. For each restaurant in the batch:
   a. Open Google Maps → search for restaurant name + location
   b. Verify the placeId matches the batch manifest
   c. Read Google reviews → select up to 3 detailed, decision-useful reviews
   d. Copy verbatim text (typos, emojis, Bangla preserved exactly)
   e. Record: reviewer name, date, rating, review text, source URL

2. Provide raw data in structured format:
   ```json
   {
     "restaurant_name": "Meat Theory",
     "reviews": [
       {
         "reviewer_name": "John D",
         "rating": 5,
         "date": "2025-11-15",
         "text": "Verbatim review text here...",
         "source_url": "https://maps.google.com/..."
       }
     ]
   }
   ```

**Acceptable sources (in order of preference):**
1. Google Maps directly (most reliable)
2. Wanderlog.com (trusted aggregator)
3. restaurantguru.com (trusted aggregator)
4. Trip.com (trusted aggregator)

**NOT acceptable:**
- AI-generated reviews
- Rewritten/summarized reviews
- Third-party reviews presented as Google reviews
- Reviews without verifiable attribution

**Output:** Raw review data in JSON/text/spreadsheet format

---

### Phase 3: AI Data Processing

**Who:** AI assistant
**Goal:** Process raw data into import-ready format

**Steps:**
1. Receive raw review data from human data provider
2. Validate restaurant UUIDs against live database
3. Check for duplicates against existing review_samples
4. Verify all required fields are present
5. Classify reviews as APPROVED / HOLD / REJECT per acceptance rules
6. Build manifest.json with correct schema
7. Build qa_report.md with classification decisions
8. Run dry-run import validation
9. Present manifest + qa_report for human review

**Classification rules:**
- **APPROVED:** Correct branch, Google-origin confirmed, verbatim text, attribution present
- **HOLD:** Uncertain attribution/source, needs manual verification
- **REJECT:** Wrong branch, generic/unhelpful, cannot confirm Google origin, suspected AI text

**Output:**
- `batch_XXX_<scope>/manifest.json` (with reviews)
- `batch_XXX_<scope>/qa_report.md` (with classifications)

---

### Phase 4: Human Final Approval

**Who:** Human approver (founder)
**Goal:** Verify accuracy and approve import

**Steps:**
1. Review manifest.json and qa_report.md
2. Spot-check review text accuracy against source:
   - Verify a sample of reviews against Google Maps/aggregator
   - Check for any AI-generated or rewritten text
   - Verify branch identity (placeId)
3. Approve or reject the batch
4. Authorize service-role import execution

**Output:** Approved batch ready for import

---

### Phase 5: Import and Verification

**Who:** AI assistant (after explicit approval)
**Goal:** Import approved reviews and verify results

**Steps:**
1. Run `node import_review_samples.js --apply` (after explicit approval)
2. Verify post-import results:
   - Row count matches batch
   - All rows resolve to restaurants
   - Anon read returns the rows
   - Anon write still blocked
3. Write import report
4. Notify founder of completion

**Output:**
- Imported review_samples rows
- `REVIEW_SAMPLES_IMPORT_REPORT.md`

---

## 3. Raw Data Collection Templates

### Template A: Simple Text Format

```
Restaurant: Meat Theory
Place ID: ChIJj6TJHu7HVTcR5Qa18Wv6AWI
Source: Google Maps

Review 1:
- Reviewer: John D
- Rating: 5/5
- Date: 2025-11-15
- Text: [verbatim review text]
- URL: https://maps.google.com/...

Review 2:
- Reviewer: Sarah M
- Rating: 4/5
- Date: 2025-10-20
- Text: [verbatim review text]
- URL: https://maps.google.com/...
```

### Template B: JSON Format

```json
{
  "restaurant_name": "Meat Theory",
  "restaurant_id": "932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7",
  "place_id": "ChIJj6TJHu7HVTcR5Qa18Wv6AWI",
  "reviews": [
    {
      "reviewer_name": "John D",
      "rating": 5,
      "date": "2025-11-15",
      "text": "Verbatim review text here...",
      "source_url": "https://maps.google.com/..."
    }
  ]
}
```

### Template C: Spreadsheet Columns

| restaurant_name | restaurant_id | place_id | reviewer_name | rating | date | review_text | source_url |
|-----------------|---------------|----------|---------------|--------|------|-------------|------------|
| Meat Theory | 932a72f8-... | ChIJj6TJHu7... | John D | 5 | 2025-11-15 | Verbatim text... | https://maps.google.com/... |

---

## 4. Quality Checklist for Human Data Providers

Before submitting raw data, verify:

- [ ] Each review is from Google Maps or a trusted aggregator
- [ ] The placeId matches the batch manifest
- [ ] Review text is verbatim (no rewriting, no summarizing)
- [ ] Reviewer name is present (no anonymous reviews)
- [ ] Review is detailed and decision-useful (not a one-liner)
- [ ] Review is recent where possible (within ~12 months preferred)
- [ ] No duplicate reviews within the same restaurant

---

## 5. AI Processing Checklist

Before presenting for human approval, verify:

- [ ] All restaurant UUIDs validated against live database
- [ ] No duplicates against existing review_samples
- [ ] All required fields present (restaurant_id, source, attribution, review_text)
- [ ] Source is "Google" for all entries
- [ ] Classification is correct per acceptance rules
- [ ] Manifest.json schema is valid
- [ ] Dry-run import passes with 0 errors

---

## 6. Time Estimates

| Phase | Estimated Time | Notes |
|-------|----------------|-------|
| Batch planning | 30-60 minutes | AI-assisted, founder approval needed |
| Human data collection | 2-4 hours per batch | 20 restaurants × 5-10 min each |
| AI data processing | 15-30 minutes | Automated with AI assistant |
| Human final approval | 30-60 minutes | Spot-checking required |
| Import and verification | 15-30 minutes | Automated with AI assistant |
| **Total per batch** | **3-6 hours** | Depends on data collection speed |

---

## 7. Scaling Recommendations

### For Small Batches (5-10 restaurants)
- Founder collects data directly
- AI processes and presents for approval
- Founder approves and authorizes import

### For Medium Batches (10-20 restaurants)
- Designate a human data provider
- AI processes and presents for approval
- Founder approves and authorizes import

### For Large Batches (20+ restaurants)
- Consider multiple data providers
- AI processes in parallel
- Founder reviews consolidated batch
- Authorize batch import

---

## 8. Future Enhancements (When Available)

### 8.1 AI-Assisted Research (Unverified Until Proven)

If AI agents gain reliable access to:
- Google Maps browsing
- Aggregator page reading
- Web search with consistent results

Then AI can assist with:
- Searching for restaurant pages on aggregators
- Extracting review text from public pages
- Verifying placeId from aggregator URLs

**Classification:** UNVERIFIED until demonstrated reliable
**Requirement:** Human spot-checks of AI-collected data

### 8.2 Automated Aggregator Monitoring

If aggregators provide RSS/API access:
- Monitor for new reviews
- Auto-flag detailed, decision-useful reviews
- Queue for human approval

### 8.3 Review Quality Scoring

If enough reviews are collected:
- Train a quality scorer to identify decision-useful reviews
- Auto-rank reviews by usefulness
- Suggest top candidates for human approval

---

## 9. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Reviews collected per batch | 40-60 (20 restaurants × 2-3) | Count in manifest |
| Approval rate | >70% | Approved / Total collected |
| Import success rate | 100% | Post-import verification |
| Review quality | Decision-useful | Spot-check against source |
| Branch accuracy | 100% | placeId verification |

---

## 10. Conclusion

The recommended workflow separates responsibilities clearly:

- **Human collects** → ensures data accuracy and verifiability
- **AI processes** → ensures efficiency and consistency
- **Human approves** → ensures quality and accountability

This hybrid approach leverages AI's processing speed while maintaining human oversight
for data quality — the best of both worlds.

---

*End of recommended workflow.*
