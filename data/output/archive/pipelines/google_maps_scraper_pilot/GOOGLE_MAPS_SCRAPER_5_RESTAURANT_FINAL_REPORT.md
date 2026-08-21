# Google Maps Scraper 5-Restaurant Micro-Pilot Final Report

## 1. Environment

| Component | Version | Status |
|-----------|---------|--------|
| Node.js | v24.17.0 | ✓ Available |
| Playwright | v1.62.1 | ✓ Available |
| Go | 1.26.7 | ✓ Installed (via winget) |
| Docker | Not installed | ❌ Not available |
| gosom/google-maps-scraper | v0.0.0-20260806090911-4676350a5bfd+dirty | ✓ Built from source |

## 2. Installation Result

- **Method**: Built from source (Go 1.26.7)
- **Binary**: `google-maps-scraper.exe` (60.8 MB)
- **Playwright browsers**: Auto-downloaded on first run (Chromium 1228)
- **Build command**: `go build` in cloned repository
- **Dependencies**: All downloaded successfully (100+ modules)

## 3. Repository/Version/Commit

| Field | Value |
|-------|-------|
| Repository | https://github.com/gosom/google-maps-scraper |
| Commit | 4676350a5bfd (dirty) |
| Version | v0.0.0-20260806090911-4676350a5bfd+dirty |
| Build Date | 2026-08-20 |
| Go Version | 1.26.7 |

## 4. Exact 5 Restaurants Tested

| Order | Place ID | Restaurant Name | Google Maps Link |
|-------|----------|-----------------|------------------|
| 1 | ChIJnZL9x7XHVTcRjmRUVqzzp2s | Seasonal Tastes | [View](https://www.google.com/maps/place/Seasonal+Tastes/data=!4m7!3m6!1s0x3755c7b5c7fd929d:0x6ba7f3ac5654648e!8m2!3d23.7933656!4d90.4146485!16s%2Fg%2F11fkn0mzrx!19sChIJnZL9x7XHVTcRjmRUVqzzp2s?authuser=0&hl=en&rclk=1) |
| 2 | ChIJNYCUDQDHVTcRbZ-EG2mgl3o | Almjlis Arabian Restaurant \| مطعم المجلس العربي | [View](https://www.google.com/maps/place/Almajlis+Arabian+Restaurant+%7C+%D9%85%D8%B7%D8%B9%D9%85+%D8%A7%D9%84%D9%85%D8%AC%D9%84%D8%B3+%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%E2%80%AD/data=!4m7!3m6!1s0x3755c7000d948035:0x7a97a0691b849f6d!8m2!3d23.7952571!4d90.4130772!16s%2Fg%2F11y9b6v1tn!19sChIJNYCUDQDHVTcRbZ-EG2mgl3o?authuser=0&hl=en&rclk=1) |
| 3 | ChIJserEPgDHVTcRxjCuwNRSbc8 | Gulshan banani | [View](https://www.google.com/maps/place/Gulshan+banani/data=!4m7!3m6!1s0x3755c7003ec4eab1:0xcf6d52d4c0ae30c6!8m2!3d23.7936205!4d90.4066004!16s%2Fg%2F11zbdmmh9r!19sChIJserEPgDHVTcRxjCuwNRSbc8?authuser=0&hl=en&rclk=1) |
| 4 | ChIJ7_UxHafHVTcRHWbnbvsqFfk | The New Gulshan Plaza Restaurant | [View](https://www.google.com/maps/place/The+New+Gulshan+Plaza+Restaurant/data=!4m7!3m6!1s0x3755c7a71d31f5ef:0xf9152afb6ee7661d!8m2!3d23.7936503!4d90.4143306!16s%2Fg%2F11c6v4zyys!19sChIJ7_UxHafHVTcRHWbnbvsqFfk?authuser=0&hl=en&rclk=1) |
| 5 | ChIJaUObm0LHVTcRKSVUsPI3CbE | Chef's Table - Gulshan 2 | [View](https://www.google.com/maps/place/Chef%27s+Table+-+Gulshan+2/data=!4m7!3m6!1s0x3755c7429b9b4369:0xb10937f2b0542529!8m2!3d23.7957308!4d90.4149481!16s%2Fg%2F11f7bgg1tf!19sChIJaUObm0LHVTcRKSVUsPI3CbE?authuser=0&hl=en&rclk=1) |

## 5. Review Pilot Result

### Classification: **RED** — Not viable in current environment

### Evidence
- **35 standard mode jobs attempted** → **0 succeeded**
- **14 fast mode jobs attempted** → **14 succeeded but 0 data extracted**

### Raw Extraction Statistics
| Mode | Jobs | Succeeded | Failed | Data Rows | Reviews Extracted |
|------|------|-----------|--------|-----------|-------------------|
| Standard | 35 | 0 | 35 | 0 | 0 |
| Fast | 14 | 14 | 0 | 0 (null) | 0 |

### Data Quality Findings
- **Reviews extracted**: 0
- **Individual star ratings captured**: 0
- **Full review text captured**: 0
- **Review timestamps captured**: 0
- **Extended reviews (`-extra-reviews`)**: Tested, 0 results
- **Truncated reviews expanded**: Not tested (no data)
- **Identity mismatches**: N/A (no data)

### Google Maps Blocking/Throttling
| Indicator | Status |
|-----------|---------|
| CAPTCHA | Not directly observed |
| Throttling | Not observed |
| Bot detection | **STRONGLY SUSPECTED** (malformed URLs, immediate failures) |
| Page structure change | **CONFIRMED** (unexpected page type) |

## 6. Image Pilot Result

### Classification: **RED** — Not viable in current environment

### Evidence
- **14 fast mode jobs attempted** → **14 succeeded but 0 images extracted**

### Raw Extraction Statistics
| Mode | Jobs | Succeeded | Failed | Images Extracted |
|------|------|-----------|--------|------------------|
| Fast | 14 | 14 | 0 | 0 |

### Per-Restaurant Image Results
| Restaurant | Images Found | Unique | Accessible | Identity Verified |
|------------|--------------|--------|------------|-------------------|
| Seasonal Tastes | 0 | 0 | N/A | N/A |
| Almjlis Arabian Restaurant | 0 | 0 | N/A | N/A |
| Gulshan banani | 0 | 0 | N/A | N/A |
| The New Gulshan Plaza Restaurant | 0 | 0 | N/A | N/A |
| Chef's Table - Gulshan 2 | 0 | 0 | N/A | N/A |

## 7. Raw Extraction Statistics (Combined)

| Metric | Value |
|--------|-------|
| Total jobs attempted | 49 |
| Jobs succeeded (standard) | 0 |
| Jobs succeeded (fast) | 28 |
| Jobs failed | 35 |
| Total reviews extracted | 0 |
| Total images extracted | 0 |
| Total data rows (JSON) | 0 |
| Total data rows (CSV) | 0 |

## 8. Data Quality Findings

| Aspect | Finding |
|--------|---------|
| Completeness | 0% - Zero data extracted |
| Accuracy | N/A - No data to verify |
| Consistency | N/A - No data |
| Identity matching | N/A - No data |
| Duplicates | N/A - No data |
| Schema compliance | N/A - No data |

## 9. Google Maps Blocking/Throttling Findings

| Behavior | Observed | Evidence |
|----------|----------|----------|
| CAPTCHA | Not directly seen | Jobs fail before CAPTCHA would appear |
| Rate limiting | Not observed | Failures are immediate |
| IP blocking | Not confirmed | Fresh browser contexts each job |
| Bot detection | **HIGHLY LIKELY** | Malformed URLs (`%00`), immediate failures |
| Page structure change | **CONFIRMED** | "unexpected page type" errors |

## 10. URL Persistence Findings

**Not applicable** — No image URLs or review URLs extracted to test persistence.

## 11. Identity Verification Findings

**Not applicable** — Zero data extracted, cannot verify restaurant identity matching.

## 12. Database Mapping Proposal

### Reviews Mapping (If Extraction Worked)

| KK Field | Scraper Field | Type | Notes |
|----------|---------------|------|-------|
| `restaurant_id` | `place_id` / `cid` | UUID/String | Map via KK's place_id lookup |
| `source` | Constant: "google_maps_scraper" | String | Fixed value |
| `reviewer_name` | `user_reviews[i].author` | String | May be truncated |
| `review_rating` | `user_reviews[i].rating` | Integer (1-5) | Star rating |
| `review_text` | `user_reviews[i].text` | Text | May be truncated |
| `review_date` | `user_reviews[i].timestamp` | Timestamp | Relative or absolute |
| `source_url` | `reviews_link` + `#review` | URL | Deep link if available |
| `external_review_id` | `user_reviews[i].id` | String | If available |
| `created_at` | `now()` | Timestamp | Import timestamp |
| `updated_at` | `now()` | Timestamp | Import timestamp |

### Images Mapping (If Extraction Worked)

| KK Field | Scraper Field | Type | Notes |
|----------|---------------|------|-------|
| `restaurant_id` | `place_id` / `cid` | UUID/String | Map via KK's place_id lookup |
| `source` | Constant: "google_maps_scraper" | String | Fixed value |
| `image_url` | `images[i]` | URL | Direct image URL |
| `position` | Array index | Integer | Display order |
| `image_type` | Derived/Constant | Enum | exterior/interior/food/unknown |
| `source_url` | `link` | URL | Google Maps place URL |
| `external_image_id` | Hash of URL | String | Deduplication key |
| `created_at` | `now()` | Timestamp | Import timestamp |
| `updated_at` | `now()` | Timestamp | Import timestamp |

## 13. Production Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scraper breaks on Google Maps updates | **HIGH** | Complete failure | Monitor upstream, have fallback |
| Google blocks automated access | **HIGH** | Complete failure | Use official API, proxies |
| Data quality issues | Medium | Wrong data in KK | Validation layer |
| Legal/ToS violation | Medium | Legal risk | Use official API |
| Rate limiting | Medium | Incomplete scrapes | Proxy rotation, delays |
| Data freshness | Medium | Stale data | Scheduled re-scrapes |

## 14. What Is Proven

| Statement | Status |
|-----------|--------|
| gosom/google-maps-scraper standard mode works | ❌ **FALSE** - All jobs fail |
| gosom/google-maps-scraper fast mode loads pages | ✅ **TRUE** - 28/28 jobs succeed |
| gosom/google-maps-scraper extracts reviews | ❌ **FALSE** - Zero extracted |
| gosom/google-maps-scraper extracts images | ❌ **FALSE** - Zero extracted |
| Fast mode produces extractable data | ❌ **FALSE** - Returns null |
| Standard mode works with Google Maps URLs | ❌ **FALSE** - All fail |

## 15. What Remains Unverified

| Capability | Status |
|------------|--------|
| Review extraction with `-extra-reviews` | **UNVERIFIED** - No data to test |
| Truncated review expansion | **UNVERIFIED** |
| Review pagination (>21 reviews) | **UNVERIFIED** |
| Image URL accessibility | **UNVERIFIED** |
| Image URL persistence | **UNVERIFIED** |
| Proxy support | **UNVERIFIED** |
| LeadsDB integration | **UNVERIFIED** |
| PostgreSQL output | **UNVERIFIED** |
| Web UI mode | **UNVERIFIED** |
| REST API mode | **UNVERIFIED** |

## 16. Recommendation for Next Pilot

### Immediate Actions
1. **Do NOT scale** to 206 restaurants — current tooling is non-functional
2. **Do NOT modify** KK production database or application code
3. **Archive** pilot outputs for reference

### Recommended Paths Forward

| Option | Feasibility | Timeline | Notes |
|--------|-------------|----------|-------|
| Wait for upstream scraper fix | Low control | Unknown | Watch repo for updates |
| Implement custom Playwright extraction | Medium | 2-4 weeks | Full control, but maintenance burden |
| Use official Google Places API | **HIGH** | 1-2 weeks | Requires API key, structured data |
| Human-assisted manual collection | High | Immediate | For pilot data only |
| Partner with data provider (Scrap.io, SerpApi) | High | 1 week | Paid, reliable |

### Recommended Decision

**Use official Google Places API** for production review/image collection. It provides:
- Structured, reliable review data with ratings, text, timestamps
- Official image URLs with proper licensing
- Guaranteed uptime and support
- Compliance with Google ToS

**If API key unavailable**: Implement custom Playwright extraction targeting specific review/image selectors, with proxy rotation and rate limiting.

## 17. Decision Table

| Pilot | Result | Evidence | Main Limitation | Next Action |
|-------|--------|----------|-----------------|-------------|
| **Reviews** | **RED** | 0/35 standard jobs succeeded; 14/14 fast mode jobs succeed but extract 0 reviews | Scraper standard mode broken (unexpected page type); fast mode loads but extracts no data | Use Google Places API or custom Playwright extraction |
| **Images** | **RED** | 14/14 fast mode jobs succeed but extract 0 images; 0 images extracted | Same as reviews - fast mode loads but extracts no data fields | Same as reviews |

## 18. Final Determination

**OVERALL TECHNICAL RECOMMENDATION**: **Neither viable** in current environment with gosom/google-maps-scraper v0.0.0-20260806090911.

The scraper's standard mode is fundamentally incompatible with current Google Maps page structure ("unexpected page type" errors). Fast mode loads pages but extracts zero data fields. No reviews, no images, no business data can be extracted.

**DO NOT SCALE TO 206 RESTAURANTS. DO NOT MODIFY PRODUCTION. DO NOT CLAIM GREEN WITHOUT EVIDENCE.**

**Human approval required before any further investment in this tooling path.**

---

*Report generated: 2026-08-20*  
*Tool: gosom/google-maps-scraper v0.0.0-20260806090911-4676350a5bfd+dirty*  
*Environment: Windows, Go 1.26.7, Playwright 1.62.1, Chromium 1228*  
*Scope: 5 restaurants from KK_REVIEW_COLLECTION_TARGETS.xlsx*