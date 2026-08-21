# Review Micro-Pilot Results

## Executive Summary

**Result: RED** — Not viable in current environment

## Test Configuration
- **Tool**: gosom/google-maps-scraper (built from source v0.0.0-20260806090911-4676350a5bfd+dirty)
- **Mode Tested**: Standard mode (default) and Fast mode (`-fast-mode -geo`)
- **Queries Tested**: 5 target restaurants + repo example queries
- **Output Format**: JSON and CSV

## Results Summary

| Mode | Jobs Attempted | Jobs Succeeded | Data Extracted | Status |
|------|----------------|----------------|----------------|--------|
| Standard (default) | 35 | 0 | None | ❌ FAILED |
| Fast mode (`-fast-mode -geo`) | 14 | 14 | None (null) | ⚠️ SUCCESS BUT NO OUTPUT |

## Standard Mode Failures

### Error: "unexpected page type"
All 35 standard mode jobs failed with this error:
```
error:"unexpected page type"
```

Tested configurations:
- Direct Google Maps place URLs (from pilot_targets.csv)
- Search queries (e.g., "Seasonal Tastes Gulshan Dhaka")
- Repo example queries ("cafe in athens", "restaurant in paris", etc.)
- With and without `-geo` coordinates
- With and without `-extra-reviews` flag
- Various depths and concurrency settings

### Error: JavaScript Runtime Error
When using `-geo` with simple queries:
```
playwright: TypeError: Cannot read properties of null (reading 'scrollHeight')
URL: https://www.google.com/maps/search/%00/@23.7806,90.4188,15z
```
Note the malformed URL with null character (`%00`).

## Fast Mode Results

### Jobs Succeed But No Data
All 14 fast mode jobs reported `"status":"success"` but produced **zero extractable data**:
- JSON output: `null` for each query (7 nulls per run)
- CSV output: Empty file (0 bytes)

### Fast Mode Configuration
```bash
-fast-mode -geo "23.7806,90.4188" -depth 1 -exit-on-inactivity 5m -c 1
```

### Fast Mode URL Format (Working)
```
https://maps.google.com/search?pb=!4m12!1m3!1d3826.902183192154!2d90.4188!3d23.7806!...
```
This differs from standard mode's `https://www.google.com/maps/search/...` format.

## Review Extraction Capabilities Tested

| Capability | Tested | Result |
|------------|--------|--------|
| `user_reviews` (basic) | Yes | ❌ No data |
| `user_reviews_extended` (`-extra-reviews`) | Yes | ❌ No data |
| `-extra-reviews` flag | Yes | ❌ No data |
| Individual star ratings | N/A | Not tested |
| Full review text | N/A | Not tested |
| Review timestamps | N/A | Not tested |
| Expanded/truncated reviews | N/A | Not tested |

## Google Maps Blocking/Interference

| Indicator | Observed |
|-----------|----------|
| CAPTCHA | Not directly observed |
| Throttling | Not observed (jobs fail immediately) |
| Redirects | Not observed |
| Bot detection | Likely (malformed URLs suggest bot detection) |
| Page structure changes | Likely (unexpected page type) |

## Data Quality Issues

1. **Zero reviews extracted** across all test configurations
2. **Zero images extracted** (not tested separately due to review failure)
3. **Identity verification impossible** - no data to verify
3. **No duplicate detection possible** - no data

## Root Cause Analysis

**FACT**: Standard mode URL format (`https://www.google.com/maps/search/...`) is incompatible with current Google Maps page structure.

**FACT**: Fast mode uses different URL format (`maps.google.com/search` with `pb` parameter) that loads successfully but extracts no data.

**VALIDATED**: The scraper version built from source (commit 4676350) has fundamental compatibility issues with current Google Maps.

**ASSUMPTION**: Google Maps has updated their page structure/selectors since the scraper was last updated.

**LIMITATION**: No working configuration found to extract reviews or images.

## Classification

**REVIEW RESULT: RED** — Not viable in current environment

**Main Limitation**: Scraper cannot extract any data from Google Maps in current configuration.

**Next Action**: 
1. Wait for upstream scraper update
2. Or use official Google Places API (requires API key)
3. Or implement custom Playwright-based extraction