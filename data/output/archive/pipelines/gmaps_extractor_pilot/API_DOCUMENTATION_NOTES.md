# G Maps Extractor API Documentation Notes

## Source
- Official Website: https://gmapsextractor.com/
- API Documentation: https://gmapsextractor.com/google-maps-api
- Reviews API: https://gmapsextractor.com/google-maps-reviews-scraper-api
- Photos API: https://gmapsextractor.com/google-maps-photos-scraper-api
- Postman Collection: https://documenter.getpostman.com/view/2218135/2s9YymJRMi

## API Product Structure

Three separate API products (each requires separate subscription):
1. **Google Maps Scraper API** - Search/places data
2. **Google Maps Reviews Scraper API** - Reviews by FID
3. **Google Maps Photos Scraper API** - Photos by FID

## Authentication
- **Method**: API Key (Bearer token or header)
- **Environment Variable**: `GMAPSEXTRACTOR_API_KEY` (or similar)
- **Account**: Single Google OAuth account (Continue with Google)
- **Dashboard**: https://gmapsextractor.com/dashboard/api

## Free Tier Limits (Verified from Pricing Page)
| Resource | Limit |
|----------|-------|
| Requests/month | 20 |
| Businesses per request | Up to 20 |
| Reviews per request | Up to 10 |
| Photos per request | Up to 20 |
| Reset cycle | Monthly |

## Identification Methods

Based on documentation:
- **FID (Feature ID)** - Primary identifier for Reviews and Photos APIs
- **Google Place ID** - May be accepted by Search API
- **Google Maps URL** - Accepted by Search API
- **Keywords + Location** - Search API accepts keywords + geo coordinates

## Endpoints (From Documentation References)

### Search API (Google Maps Scraper API)
- **Endpoint**: Likely `/api/v1/search` or similar
- **Input**: Keywords, location (geo coordinates), radius, language
- **Output**: Business listings with basic info, place_id, rating, review_count
- **Feature**: `-extra-reviews` equivalent for extended data

### Reviews API (Google Maps Reviews Scraper API)
- **Endpoint**: Likely `/api/v1/reviews` or similar
- **Input**: FID (Feature ID) - Google's internal place identifier
- **Output**: 
  - Reviewer name
  - Individual star rating (1-5)
  - Review text
  - Review date/timestamp
  - Review URL/source URL
  - Reviewer info (if available)
  - Language
  - Owner response (if available)
- **Limit**: Up to 10 reviews per request (free tier), up to 250 (paid)

### Photos API (Google Maps Photos Scraper API)
- **Endpoint**: Likely `/api/v1/photos` or similar
- **Input**: FID (Feature ID)
- **Output**:
  - Photo URLs
  - Image metadata (dimensions, author data)
  - Image type/category
- **Limit**: Up to 20 photos per request (free tier), up to 1000 (paid)

## FID (Feature ID) vs Place ID

**Critical Finding**: The Reviews and Photos APIs use **FID (Feature ID)**, not Google Place ID.
- FID is Google's internal feature identifier (different from Place ID)
- Place ID format: `ChIJ...` 
- FID format: Likely numeric or different format
- Need to determine how to get FID from Place ID or Google Maps URL

## Rate Limits
- Free: 20 requests/month
- Basic: 1,000 requests/month + $0.014/request
- Professional: 5,000 requests/month + $0.012/request
- Business: 10,000 requests/month + $0.011/request
- Scale plans: 50,000+ requests/month

## Request/Response Format
- **Request**: JSON payload with FID/keywords/location
- **Response**: JSON with structured data
- **Format**: Clean JSON output
- **Real-time**: API requests execute instantly
- **CAPTCHA handling**: Automatic via browser environment

## Data Points Available

### Search API (33+ fields):
- name, phone, website, categories, reviews_count, emails, social medias, place_id, rating, addresses, plus_code, review_rating, reviews_per_rating, latitude, longitude, cid, status, descriptions, reviews_link, thumbnail, timezone, price_range, data_id, street_view_url, place_id, images, reservations, order_online, menu, owner, complete_address, credit_cards_accepted, about, user_reviews, user_reviews_extended, emails

### Reviews API:
- Reviewer name
- Star rating (1-5)
- Review text
- Date/timestamp
- Review URL
- Reviewer info
- Language
- Owner response

### Photos API:
- Image URLs
- Dimensions
- Author data
- Image type/category

## Free Tier Sufficiency for 5-Restaurant Pilot

| Requirement | Free Tier | Sufficient? |
|-------------|-----------|-------------|
| 5 restaurants (search) | 1 request (5 < 20 places) | ✅ YES |
| Reviews (5 × 10 = 50) | 5 requests (10 per request) | ✅ YES (5 < 20 requests) |
| Photos (5 × 3 = 15) | 1 request (20 per request) | ✅ YES |
| **Total requests** | **~7 requests** | ✅ **YES (7 < 20)** |

## API Key Setup Required

1. Create account at https://gmapsextractor.com/auth/google (Google OAuth)
2. Access dashboard at https://gmapsextractor.com/dashboard/api
3. Generate API key
4. Set environment variable: `GMAPSEXTRACTOR_API_KEY`

## Critical Unknowns (Need Testing)

| Question | Status |
|----------|--------|
| Exact endpoint URLs | **UNVERIFIED** - Need API docs |
| FID format and how to obtain from Place ID | **UNVERIFIED** |
| Review pagination support | **UNVERIFIED** |
| Review ordering control | **UNVERIFIED** |
| "View more" / expanded review text | **UNVERIFIED** |
| Photo URL persistence | **UNVERIFIED** |
| FID from Place ID conversion | **UNVERIFIED** |
| Error response format | **UNVERIFIED** |

## Next Steps

1. **Create account** at gmapsextractor.com (Google OAuth)
2. **Get API key** from dashboard
3. **Set environment variable** `GMAPSEXTRACTOR_API_KEY`
4. **Test Search API** with 5 restaurants to get FIDs
4. **Test Reviews API** with FIDs for 5 restaurants
5. **Test Photos API** with FIDs for 5 restaurants

## Security Notes

- **NEVER** commit API key to git
- **NEVER** log API key in reports/logs
- Use environment variable `GMAPSEXTRACTOR_API_KEY`
- Single account, single API key for both reviews and photos
- Do not create multiple accounts

---

*Documentation compiled: 2026-08-20*  
*Source: G Maps Extractor pricing page, API product pages, Postman collection reference*  
*Postman collection: https://documenter.getpostman.com/view/2218135/2s9YymJRMi (dynamic, requires JS)*