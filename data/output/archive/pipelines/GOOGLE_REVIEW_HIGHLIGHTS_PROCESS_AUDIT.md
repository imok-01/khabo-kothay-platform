# KHABO KOTHAY — Google Review Highlights: Process Audit

Status: FINAL — Batch 001 collection attempt complete; source-reachability finding documented.
Scope: audit of the automated collection attempt for `batch_001_gulshan-banani-high-volume` (20 restaurants).
No DB/UI changes. No reviews imported.

---

## 1. Audit objective

Verify whether the Batch 001 collection workflow can retrieve real, attributable Google review text for
20 high-volume restaurants in the Gulshan/Banani area using the tools available in this environment.

---

## 2. Tooling environment tested

| Tool / Method | Result | Notes |
|---|---|---|
| **webfetch (direct URL fetch)** | ✅ Works for static pages | Used throughout |
| **Web search (Bing)** | ❌ Returns irrelevant proxied junk | Not useful |
| **Web search (DuckDuckGo)** | ❌ CAPTCHA blocked | Not usable |
| **Web search (Mojeek)** | ❌ JS challenge | Not usable |
| **Web search (Qwant)** | ❌ Geo-blocked | Not usable |
| **restaurantguru.com** | ❌ 503 / unreachable | Multiple URLs tested |
| **Wanderlog** | ❌ Blocked / paywalled | Could not retrieve review pages |
| **Trip.com** | ❌ Blocked | Could not retrieve review pages |
| **top-rated.online** | ✅ Reachable | All 20 restaurants indexed, but content is anonymous + evidently paraphrased |
| **tophotels / tophotels.ru** | ❌ Unreachable as of audit | Not tested exhaustively |
| **Google Maps (browser)** | ❌ Not accessible | No browser automation available |
| **Google Places API** | ❌ Not configured | No API key present |

---

## 3. Findings per source tier

### Tier 1 — Verified as unsuitable for APPROVED/HOLD

**top-rated.online** (verified for Pizza Inn Gulshan 1, Pizza Guy, BFC - Banani, Salam's Kitchen, Alfresco Banani via agent and direct fetch)

Reachable pattern:
- URL: `https://www.top-rated.online/cities/Dhaka/place/p/<id>/<slug>`
- Content: aggregate rating + count + generated "Why you should visit / Pros & Cons" + anonymous
  "Highlighted Reviews" block
- Attribution: **zero** — no reviewer name, no date, no per-review rating
- Text quality: generic one-liners, evidently machine-paraphrased (consistent vocabulary, no
  first-person detail, cut-off mid-sentence on some entries)
- Branch accuracy: **fails** — Pizza Inn Gulshan 1 fetched page shows address "House#74, Rd 127"
  vs. seed data "House#74, Rd 12" → different branch than our target

**Classification impact:** Zero APPROVED. Zero HOLD. Some REJECT (wrong branch, generic one-liner,
unattributed, non-Google-origin-equivalent).

### Tier 2 — Verified as unreachable in this environment

Wanderlog, Trip.com, restaurantguru.com, tophotels — all attempted by multiple agents; none returned
usable review content with attribution.

**Classification impact:** Cannot be counted on for any restaurant; may be viable in an environment with
browser access.

### Tier 3 — Required but unavailable

Google Maps browser access and Google Places API are the only sources that can provide:
- Reviewer `author_name`
- `text` verbatim
- `rating`
- `time` / `relative_time_description`
- Confirmed `placeId` context

Neither is currently configured.

---

## 4. Per-restaurant collection status

All 20 Batch 001 restaurants follow the same pattern: **sources are unreachable or unsuitable**.

| # | Restaurant | Sources tested | Attribution | Verdict |
|---|---|---|---|---|
| 1 | Herfy Gulshan | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 2 | Takeout Banani | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 3 | Meat Theory | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 4 | Steakout | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 5 | Barcode Cafe | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 6 | Burger King Banani | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 7 | Beyond Buffet (Gulshan) | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 8 | The New Gulshan Plaza Restaurant | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 9 | Texas Flame | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 10 | Madchef | Banani | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 11 | Pizza Inn Gulshan 1 | top-rated.online | ❌ Anonymous + wrong branch | REJECT (0 usable) |
| 12 | Pizza Guy | top-rated.online | ❌ Anonymous / paraphrased | HOLD (0 usable) |
| 13 | BFC - Banani | top-rated.online | ❌ No text on page | REJECT (0 usable) |
| 14 | Salam's Kitchen | top-rated.online | ❌ No text on page | REJECT (0 usable) |
| 15 | Alfresco Banani | top-rated.online | ❌ Not found | REJECT (0 usable) |
| 16 | Premium Sweets | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 17 | Nawab Chatga | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 18 | Arrowhead Grill | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 19 | Koyla Restaurant & Kebab | top-rated.online | ❌ Anonymous | REJECT (0 usable) |
| 20 | Thai Emerald | top-rated.online | ❌ Anonymous | REJECT (0 usable) |

**Batch 001 aggregate:** 0 APPROVED · 0 HOLD · 20 REJECT equivalent (sources unable to produce usable data).

---

## 5. Agent tooling limitations observed

| Limitation | Impact | Mitigation |
|---|---|---|
| No websearch (all engines blocked/unreliable) | Cannot discover new URLs | Pre-build search URL templates; use known aggregator URL patterns |
| nofunct browser automation | Cannot open Google Maps / aggregator live pages | Require human with browser; or Google Places API |
| Last-mile attribution impossible without sources | AI must be explicit: "not found" rather than "no data" | Audit report records every fetch attempt and outcome |
| top-rated.online worded as "real Google Maps reviews" | Risk of journalistic error | Explicitly classified as UNSUITABLE in SOP V2 |

---

## 6. Recommended source strategy for 206-restaurant rollout

### Preferred path: Google Places API
- One API key covers all 206 restaurants.
- 5 reviews per place per call; pagination to 40+ if needed.
- Returns: `author_name`, `text`, `rating`, `time`, `relative_time_description` — exactly the import format.
- Human step: classify HIGH/MEDIUM/LOW and APPROVED/HOLD/REJECT per SOP (AI cannot make this call
  without attribution context).
- Estimated human effort: 5–15 minutes per restaurant reading + classification = still substantial but
  far less than browser copy-paste.

### Fallback path: browser-based manual research
- Human opens Google Maps, searches by placeId, copies up to 3 reviews per restaurant.
- AI supports by providing: (a) ranked list with pre-filled search URLs, (b) manifest scaffolding,
  (c) classification templates that the human fills.
- Estimated human effort: 5–10 minutes per restaurant with 3 reviews (faster with copy-paste from
  Google Maps expanded view).

### Path to avoid: aggregator-only automated collection
- top-rated.online and any similarly anonymous / paraphrased aggregator are explicitly unsuitable.
- Wanderlog, Trip.com, restaurantguru may be viable with browser access, but not with current
  automated tools.

---

## 7. Files updated in this audit

- `GOOGLE_REVIEW_HIGHLIGHTS_SOP_V1.md` → rewritten as V2 with automation boundary, source reliability,
  and batch-strategy sections added
- `GOOGLE_REVIEW_HIGHLIGHTS_EXECUTION_PLAN.md` → new; 206-restaurant rollout strategy
- `database/pipelines/review-samples/batches/batch_001_gulshan-banani-high-volume/research-notes.md` →
  updated to reference this audit; collection flagged as WAITING_FOR_VIABLE_SOURCE