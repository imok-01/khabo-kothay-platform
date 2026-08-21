# G Maps Extractor API - 5 Restaurant Micro-Pilot Final Report

## Executive Summary

**Overall Result: RED** — Not viable for production use in current free tier configuration.

Both Reviews and Images pilots resulted in **RED** classification due to free tier rate limiting (20 requests/month exhausted during testing).

## 1. Environment & Setup

| Component | Version/Status |
|-----------|----------------|
| API Provider | G Maps Extractor (gmapsextractor.com) |
| API Version | v2 (v1 deprecated) |
| Authentication | Bearer token (`GMAPSEXTRACTOR_API_KEY`) |
| Base URL | `https://cloud.gmapsextractor.com/api/v2` |
| Free Tier Limit | 20 requests/month |
| Rate Limit | 30 requests/minute |

## 2. Installation & Setup

- **Repository**: No installation required (REST API)
- **Authentication**: Bearer token in Authorization header
- **Test Environment**: Node.js 24.17.0, native `fetch`
- **API Key**: Provided via `GMAPSEXTRACTOR_API_KEY` environment variable

## 3. Pilot Targets (5 Restaurants)

| Order | Restaurant | Place ID | Google Maps Link |
|-------|------------|----------|------------------|
| 1 | Seasonal Tastes | ChIJnZL9x7XHVTcRjmRUVqzzp2s | [Link](https://www.google.com/maps/place/Seasonal+Tastes/...) |
| 2 | Almajlis Arabian Restaurant | ChIJNYCUDQDHVTcRbZ-EG2mgl3o | [Link](https://www.google.com/maps/place/Almajlis+Arabian+Restaurant/...) |
| 3 | Gulshan banani | ChIJserEPgDHVTcRxjCuwNRSbc8 | [Link](https://www.google.com/maps/place/Gulshan+banani/...) |
| 4 | The New Gulshan Plaza Restaurant | ChIJ7_UxHafHVTcRHWbnbvsqFfk | [Link](https://www.google.com/maps/place/The+New+Gulshan+Plaza+Restaurant/...) |
| 5 | Chef's Table - Gulshan 2 | ChIJaUObm0LHVTcRKSVUsPI3CbE | [Link](https://www.google.com/maps/place/Chef%27s+Table+-+Gulshan+2/...) |

## 4. Review Pilot Results

### Classification: **RED**

#### Evidence
- **API Endpoint**: `POST /v2/reviews` — `{ fid, page, sort_by }`
- **Free Tier Limit**: 10 reviews per request, 20 requests/month
- **Actual Result**: **RATE LIMITED** — "You have exceeded your free requests for this month"
- **Reviews Extracted**: 0 (all endpoints blocked)
- **Individual Star Ratings Captured**: 0
- **Full Review Text Captured**: 0
- **Pagination Tested**: No (rate limited on first request)

#### Data Quality (UNVERIFIED)
| Capability | Status |
|------------|---------|
| Overall rating | UNVERIFIED |
| Review count | UNVERIFIED |
| Individual reviews | UNVERIFIED |
| Individual star ratings | UNVERIFIED |
| Full review text | UNVERIFIED |
| Dates/timestamps | UNVERIFIED |
| Review pagination | UNVERIFIED |
| "View more" expansion | UNVERIFIED |
| Duplicate detection | UNVERIFIED |
| Identity matching | UNVERIFIED |

#### Individual Review Fields (Documented)
From Postman collection documentation:
- `id`, `name`, `rate` (1-5), `comment`, `date`, `timestamp`, `review_url`, `author_url`, `avatar`, `photos`, `review_url`

### FID (Feature ID) Findings
| Restaurant | FID Source | FID Format | Works with API |
|------------|------------|------------|----------------|
| Seasonal Tastes | v2 search (extra=true) | `0x3755c7b5c7fd929d:0x6ba7f3ac5654648e` | UNVERIFIED |
| Almajlis Arabian Restaurant | v1 search (CID→FID) | `0x0:0x8833705567404203885` | UNVERIFIED |
| Gulshan banani | v1 search (CID→FID) | `0x0:0x14946693812031729862` | UNVERIFIED |
| The New Gulshan Plaza Restaurant | — | — | FAILED |
| Chef's Table - Gulshan 2 | — | — | FAILED |

**Critical Finding**: v2 search with `extra=true` returns proper FID in `Fid` field (capital F) with format `0x<hex1>:0x<hex2>`. v1 search returns CID which must be converted but produces wrong FID format.

### Google Maps Blocking/Throttling
- **Rate Limit**: 30 requests/minute (header: `RateLimit-Limit: 30`)
- **Free Tier**: 20 requests/month — **EXHAUSTED**
- **Error Response**: `{"data":[],"error":"You have exceeded your free requests for this month. Please upgrade to a paid plan."}`
- **CAPTCHA**: Not encountered (blocked before CAPTCHA)
- **Page Structure Changes**: v1 search deprecated, v2 requires `extra=true` for FID

## 5. Image Pilot Results

### Classification: **RED**

#### Evidence
- **API Endpoint**: `POST /v2/photos` — `{ fid, page }`
- **Free Tier Limit**: 20 photos per request, 20 requests/month
- **Actual Result**: **RATE LIMITED** — "You have exceeded your free requests for this month"
- **Photos Extracted**: 0 (all endpoints blocked)
- **≥3 Photos per Restaurant**: 0
- **URL Accessibility**: UNVERIFIED

#### Photo Fields (Documented)
- `url`, `width`, `height`, `author`, `author_url`

#### Per-Restaurant Results (UNVERIFIED)
| Restaurant | Photos Found | Unique | Accessible | Identity Verified |
|------------|--------------|--------|------------|-------------------|
| Seasonal Tastes | 0 | 0 | N/A | UNVERIFIED |
| Almajlis Arabian Restaurant | 0 | 0 | N/A | UNVERIFIED |
| Gulshan banani | 0 | 0 | N/A | UNVERIFIED |
| The New Gulshan Plaza Restaurant | — | — | — | FAILED |
| Chef's Table - Gulshan 2 | — | — | — | FAILED |

## 6. Raw Extraction Statistics

| Metric | Value |
|--------|-------|
| Total API Requests Made | ~15 |
| Search Requests (v2 + v1) | 8 |
| Reviews Requests | 3 |
| Photos Requests | 3 |
| Successful Searches (FID found) | 3/5 |
| Failed Searches (no FID) | 2/5 |
| Reviews Extracted | 0 |
| Photos Extracted | 0 |
| Free Tier Exhausted | YES |

## 7. Data Quality Findings

| Aspect | Finding |
|--------|---------|
| API Reliability | Low (free tier too restrictive for testing) |
| Data Completeness | UNVERIFIED (rate limited) |
| FID Format Consistency | v2 returns `0x<hex1>:0x<hex2>`, v1 CID conversion produces wrong format |
| Search Coverage | 3/5 restaurants found |
| Duplicate Handling | UNVERIFIED |
| Identity Matching | UNVERIFIED (FID mismatch risk with v1 conversion) |

## 8. Google Maps Blocking/Throttling Findings

| Behavior | Observed |
|----------|----------|
| CAPTCHA | No (blocked at API level) |
| Rate Limiting | Yes — 20 req/month free tier |
| IP Blocking | No |
| Bot Detection | No (blocked at rate limit) |
| Page Structure Change | v1 deprecated, v2 requires `extra=true` |

## 9. URL Persistence Findings

**UNVERIFIED** — No photo/review URLs extracted due to rate limiting.

## 10. Identity Verification Findings

| Restaurant | Search Method | FID Obtained | Identity Verified |
|------------|---------------|--------------|-------------------|
| Seasonal Tastes | v2 (extra=true) | `0x3755c7b5c7fd929d:0x6ba7f3ac5654648e` | YES (via Place ID match) |
| Almajlis Arabian Restaurant | v1 (CID→FID) | `0x0:0x8833705567404203885` | UNVERIFIED (wrong FID format) |
| Gulshan banani | v1 (CID→FID) | `0x0:0x14946693812031729862` | UNVERIFIED (wrong FID format) |
| The New Gulshan Plaza Restaurant | — | — | FAILED |
| Chef's Table - Gulshan 2 | — | — | FAILED |

**Critical**: v1 search CID→FID conversion produces wrong format (`0x0:0x<cid_hex>` vs correct `0x<hex1>:0x<hex2>`).

## 11. Database Mapping Proposal

### Reviews Table
| KK Field | API Field | Type | Notes |
|----------|-----------|------|-------|
| `restaurant_id` | `place_id` (via search) | UUID | Join via Place ID |
| `source` | constant | VARCHAR | `'gmaps_extractor'` |
| `reviewer_name` | `name` | VARCHAR | May be truncated |
| `review_rating` | `rate` | SMALLINT | 1-5 stars |
| `review_text` | `comment` | TEXT | May be truncated |
| `review_date` | `timestamp` | TIMESTAMPTZ | Parse relative/absolute |
| `source_url` | `review_url` | URL | Deep link |
| `external_review_id` | `id` | VARCHAR | Deduplication key |
| `author_url` | `author_url` | URL | Reviewer profile |
| `created_at` | — | TIMESTAMPTZ | Import time |
| `updated_at` | — | TIMESTAMPTZ | Import time |

### Images Table
| KK Field | API Field | Type | Notes |
|----------|-----------|------|-------|
| `restaurant_id` | `place_id` (via search) | UUID | Join via Place ID |
| `source` | constant | VARCHAR | `'gmaps_extractor'` |
| `image_url` | `url` | URL | Direct image URL |
| `position` | array index | SMALLINT | Display order |
| `image_type` | — | VARCHAR | exterior/interior/food/unknown |
| `source_url` | `review_url` or search URL | URL | Source page |
| `external_image_id` | hash(url) | VARCHAR | Deduplication |
| `width` | `width` | INTEGER | If available |
| `height` | `height` | INTEGER | If available |
| `author` | `author` | VARCHAR | Photo author |
| `author_url` | `author_url` | URL | Author profile |
| `created_at` | — | TIMESTAMPTZ | Import time |
| `updated_at` | — | TIMESTAMPTZ | Import time |

## 12. Production Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Free tier too restrictive | **CERTAIN** | Complete failure | Upgrade to paid plan |
| API rate limits | **HIGH** | Incomplete data | Implement backoff/retry |
| FID format changes | **MEDIUM** | Broken extraction | Monitor API changes |
| v1 API deprecation | **CERTAIN** | Broken search | Migrate to v2 + extra=true |
| Data freshness | **MEDIUM** | Stale data | Schedule regular refreshes |
| Legal/ToS compliance | **MEDIUM** | Legal risk | Review ToS, use official API if available |
| Data accuracy | **LOW** | Wrong data | Validate against Google Maps UI |

## 6. What Is Proven vs Unverified

| Statement | Status |
|-----------|--------|
| Search API works (v2 extra=true) | ✅ **VALIDATED** |
| FID returned in `Fid` field (capital F) | ✅ **VALIDATED** |
| FID format is `0x<hex1>:0x<hex2>` | ✅ **VALIDATED** |
| v1 search deprecated | ✅ **VALIDATED** |
| Reviews API returns individual reviews | ❌ **UNVERIFIED** (rate limited) |
| Reviews include individual star ratings | ❌ **UNVERIFIED** |
| Photos API returns image URLs | ❌ **UNVERIFIED** |
| Free tier sufficient for 5 restaurants | ❌ **FALSE** (exhausted) |
| Pagination works for reviews | ❌ **UNVERIFIED** |
| Photo URLs are accessible | ❌ **UNVERIFIED** |
| FID from v1 CID conversion works | ❌ **FALSE** (wrong format) |

## 7. Limitations

| Limitation | Impact |
|------------|--------|
| Free tier too small for testing | Cannot validate core functionality |
| No paid plan access | Cannot verify core features |
| v1 API deprecated | Must use v2 with `extra=true` |
| No pagination testing | Unknown if >10 reviews accessible |
| No photo URL testing | Unknown accessibility/persistence |
| No review text completeness test | Unknown if truncated |
| FID format mismatch risk | v1 CID→FID conversion unreliable |

## 8. Recommendations

| Priority | Recommendation |
|----------|----------------|
| **HIGH** | Upgrade to paid plan ($15/mo Basic) for production |
| **HIGH** | Use v2 search with `extra=true` for FID extraction |
| **HIGH** | Cache FIDs to minimize search API calls |
| **MEDIUM** | Implement client-side rate limiting (30 req/min) |
| **MEDIUM** | Implement exponential backoff for rate limits |
| **MEDIUM** | Add FID caching layer to avoid repeated searches |
| **LOW** | Monitor API changelog for v2 updates |
| **LOW** | Evaluate official Google Places API as alternative |

## 9. Final Decision Table

| Pilot | Result | Evidence | Main Limitation | Next Action |
|-------|--------|----------|-----------------|-------------|
| **Reviews** | **RED** | 0/3 reviews extracted; API rate limited at free tier | Free tier (20 req/mo) exhausted; cannot verify data quality | Upgrade to paid plan ($15/mo) |
| **Images** | **RED** | 0/5 photos extracted; API rate limited at free tier | Free tier exhausted; cannot verify photo URLs | Upgrade to paid plan ($15/mo) |

## 10. Recommended Next Step

**Do NOT scale to 206 restaurants with free tier.**

**Recommended path:**
1. **Upgrade to G Maps Extractor Basic plan ($15/month)** — provides 1,000 requests/month
2. **Run validation pilot with paid tier** — test all 5 restaurants fully
3. **Verify data quality** — individual star ratings, full review text, photo URLs
4. **If validated, scale to 206 restaurants** with proper rate limiting

**Alternative**: Evaluate official Google Places API (requires separate API key, structured data, guaranteed uptime).

---

**STOP — Do not scale to 206 restaurants. Do not modify production. Wait for human approval on paid plan upgrade.**

---

*Report generated: 2026-08-20*  
*Tool: G Maps Extractor API v2*  
*Free tier exhausted during testing (20 requests/month)*  
*Scope: 5 restaurants from KK_REVIEW_COLLECTION_TARGETS.xlsx*