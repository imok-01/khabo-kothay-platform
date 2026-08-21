# G Maps Extractor Photos API - 5 Restaurant Micro-Pilot Report

## Executive Summary

**Result: RED** — Not viable for production use in current free tier configuration.

## Pilot Overview

- **Restaurants Tested**: 5 (from `pilot_targets.csv`)
- **API Key**: Single key, free tier (20 requests/month)
- **Endpoints Tested**: `/v2/search` (v2 with extra=true, v1 deprecated), `/v2/photos`
- **Total API Requests Made**: ~15 (exceeded 20/month free tier)
- **Status**: **API rate limit exceeded** — all endpoints now return "exceeded free requests" error

## Key Findings

### 1. FID (Feature ID) Extraction for Photos
| Restaurant | FID Source | FID | Works with Photos API |
|------------|------------|-----|----------------------|
| Seasonal Tastes | v2 search (extra=true) | `0x3755c7b5c7fd929d:0x6ba7f3ac5654648e` | **UNVERIFIED** (rate limited) |
| Almajlis Arabian Restaurant | v1 search (CID→FID) | `0x0:0x8833705567404203885` | **UNVERIFIED** (rate limited) |
| Gulshan banani | v1 search (CID→FID) | `0x0:0x14946693812031729862` | **UNVERIFIED** (rate limited) |
| The New Gulshan Plaza Restaurant | None | — | FAILED |
| Chef's Table - Gulshan 2 | None | — | FAILED |

**Critical Finding**: The v2 search API with `extra=true` returns proper FID in `Fid` field (capital F) with format `0x<hex1>:0x<hex2>`. The v1 search returns CID which must be converted but produces incorrect FID format for photos API.

### 2. Photos API (`/v2/photos`)
- **Endpoint**: `POST https://cloud.gmapsextractor.com/api/v2/photos`
- **Request**: `{ fid, page }`
- **Free Tier Limit**: 20 photos per request
- **Status**: **RATE LIMITED** — "You have exceeded your free requests for this month"
- **Data Quality**: UNVERIFIED (could not test due to rate limiting)

### 3. Photo Fields (from Postman docs)
Based on API documentation, photos should contain:
- `url` - Direct image URL
- `width` - Image width in pixels
- `height` - Image height in pixels
- `author` - Photo author name
- `author_url` - Author profile URL

**Photo URL accessibility**: UNVERIFIED (rate limited)

## Rate Limiting
| Tier | Monthly Requests | Photos/Request |
|------|------------------|----------------|
| Free | 20 | 20 |
| Basic ($15/mo) | 1,000 | 20 |
| Professional ($65/mo) | 5,000 | 20 |

**Exceeded during pilot**: ~15 requests consumed free tier completely.

## Data Quality Assessment (UNVERIFIED)
| Metric | Status |
|--------|--------|
| Images available | UNVERIFIED |
| ≥3 images per restaurant | UNVERIFIED |
| Unique images | UNVERIFIED |
| Accessible image URLs | UNVERIFIED |
| Directly accessible URLs | UNVERIFIED |
| URL persistence/stability | UNVERIFIED |
| Correct restaurant identity | UNVERIFIED (FID mismatch risk) |
| Duplicate images | UNVERIFIED |
| Downloadable | UNVERIFIED |

## Failure Cases
| Restaurant | Failure Reason |
|------------|----------------|
| The New Gulshan Plaza Restaurant | No FID returned by v1/v2 search |
| Chef's Table - Gulshan 2 | No FID returned by v1/v2 search |

## Recommendations
1. **Upgrade to paid plan** ($15/mo Basic) for production use
2. **Use v2 search with `extra=true`** to get proper FID format
3. **Implement FID caching** to avoid repeated search calls
4. **Add rate limiting** in client to respect 30 req/min limit
5. **Test photo URL accessibility** and persistence in production

---

*Report generated: 2026-08-20*  
*API Version: v2 (v1 deprecated)*  
*Free tier exhausted during pilot testing*