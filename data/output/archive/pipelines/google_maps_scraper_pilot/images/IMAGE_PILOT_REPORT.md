# Image Micro-Pilot Results

## Executive Summary

**Result: RED** — Not viable in current environment

## Test Configuration
- **Tool**: gosom/google-maps-scraper (built from source v0.0.0-20260806090911-4676350a5bfd+dirty)
- **Mode Tested**: Fast mode only (standard mode completely broken)
- **Queries Tested**: 5 target restaurants
- **Image Field**: `images` (data point #26 in scraper schema)

## Results Summary

| Mode | Jobs Attempted | Jobs Succeeded | Images Extracted | Status |
|------|----------------|----------------|------------------|--------|
| Fast mode | 7 | 7 | 0 | ⚠️ SUCCESS BUT NO OUTPUT |

## Test Details

### Fast Mode Test
```bash
-fast-mode -geo "23.7806,90.4188" -depth 1 -exit-on-inactivity 5m -c 1
```

### Queries Tested
1. Seasonal Tastes (via search query)
2. Almjlis Arabian Restaurant
3. Gulshan banani
4. The New Gulshan Plaza Restaurant
5. Chef's Table - Gulshan 2
6. cafe in gulshan dhaka (generic)
7. restaurant in gulshan dhaka (generic)

### Results
- **Jobs Succeeded**: 7/7 (status: "success")
- **Images Extracted**: 0
- **Output**: `null` for all queries (JSON), empty CSV
- **Image URLs**: None extracted

## Image Extraction Capabilities Tested

| Capability | Tested | Result |
|------------|--------|--------|
| `images` field (data point #26) | Yes | ❌ No data |
| Image URLs accessible | N/A | Not tested |
| Images correspond to correct restaurant | N/A | Not tested |
| Duplicate URLs | N/A | Not tested |
| Thumbnail vs full-size | N/A | Not tested |
| URL expiration | N/A | Not tested |
| Download success | N/A | Not tested |
| ≥3 distinct images per restaurant | N/A | Not tested |

## Per-Restaurant Results

| Restaurant | Place ID | Images Found | Unique | Accessible | Identity Verified |
|------------|----------|--------------|--------|------------|-------------------|
| Seasonal Tastes | ChIJnZL9x7XHVTcRjmRUVqzzp2s | 0 | 0 | N/A | N/A |
| Almjlis Arabian Restaurant | ChIJNYCUDQDHVTcRbZ-EG2mgl3o | 0 | 0 | N/A | N/A |
| Gulshan banani | ChIJserEPgDHVTcRxjCuwNRSbc8 | 0 | 0 | N/A | N/A |
| The New Gulshan Plaza Restaurant | ChIJ7_UxHafHVTcRHWbnbvsqFfk | 0 | 0 | N/A | N/A |
| Chef's Table - Gulshan 2 | ChIJaUObm0LHVTcRKSVUsPI3CbE | 0 | 0 | N/A | N/A |

## Google Maps Blocking/Interference

Same as review pilot - standard mode fails with "unexpected page type", fast mode loads but extracts nothing.

## URL Persistence Findings

Not applicable - no image URLs extracted to test.

## Identity Verification Findings

Not applicable - no data extracted to verify.

## Root Cause

Same as review pilot: **Fast mode loads pages successfully but extracts zero data fields**, including the `images` field (data point #26).

## Classification

**IMAGE RESULT: RED** — Not viable in current environment

**Main Limitation**: Fast mode loads pages but extracts zero data fields including `images`.

**Next Action**: Same as review pilot - wait for upstream fix or use alternative approach.