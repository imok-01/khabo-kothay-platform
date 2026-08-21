# GOSOM/Google-Maps-Scraper Cleanup Report

## Experiment Status: OFFICIALLY REJECTED

The gosom/google-maps-scraper micro-pilot (5 restaurants) has been **officially rejected** due to fundamental incompatibility with current Google Maps page structure.

## What Was Removed

| Item | Path | Size | Reason |
|------|------|------|--------|
| Cloned repository | `google-maps-scraper/` | ~100 MB | Experiment rejected |
| Compiled binary | `google-maps-scraper.exe` | 60.8 MB | Experiment rejected |
| Playwright browser cache (v1.61.1) | `C:\Users\USER\AppData\Local\ms-playwright-go\1.61.1` | ~200 MB | Specific to gosom experiment |
| Scraper raw/processed outputs | `data/output/google_maps_scraper_pilot/reviews/raw`, `reviews/processed`, `images/raw`, `images/processed` | ~0 MB | Empty outputs from failed experiment |
| Temporary test files | `google-maps-scraper/test_single.txt`, `review_input*.txt` | ~1 KB | Experiment artifacts |

## What Was Retained

| Item | Path | Reason |
|------|------|--------|
| Final pilot report | `data/output/google_maps_scraper_pilot/GOOGLE_MAPS_SCRAPER_5_RESTAURANT_FINAL_REPORT.md` | Historical evidence of experiment failure |
| Review pilot report | `data/output/google_maps_scraper_pilot/reviews/REVIEW_PILOT_REPORT.md` | Detailed technical findings |
| Image pilot report | `data/output/google_maps_scraper_pilot/images/IMAGE_PILOT_REPORT.md` | Detailed technical findings |
| Phase 0-1 summary | `data/output/google_maps_scraper_pilot/reports/PHASE_0_1_SUMMARY.md` | Environment documentation |
| Pilot targets | `data/output/google_maps_scraper_pilot/pilot_targets.csv` | Reusable target list for future pilots |
| Review pilot input files | `review_input*.txt` | Reusable test inputs |
| Go installation | `C:\Program Files\Go\` | Required by other KK components |
| Playwright v1.57.0 cache | `C:\Users\USER\AppData\Local\ms-playwright-go\1.57.0` | May be used by other KK components |
| Playwright v1.62.1 (npm) | Global npm package | Used by KK project |
| Node.js / npm | Global | KK project dependency |

## What Was NOT Removed (By Design)

- **Go 1.26.7** — May be needed by other KK components
- **Playwright (npm)** — KK project dependency
- **Playwright v1.57.0 cache** — Pre-existing, may be used elsewhere
- **Node.js / npm** — KK project dependency
- **Historical reports** — Preserved as experiment evidence

## Confirmation: KK Production Code Unchanged

✅ **No KK production application code was modified**
- No changes to `src/`, `src/data/`, `src/pages/`, `src/components/`
- No changes to database schema (`supabase/`, `database/`)
- No changes to application configuration
- No changes to frontend/backend code
- No database writes or schema modifications

## Cleanup Verification

```
Removed:
✓ google-maps-scraper/ (entire repository)
✓ google-maps-scraper.exe (60.8 MB binary)
✓ Playwright v1.61.1 cache (~200 MB)
✓ Scraper raw/processed output directories
✓ Temporary test files

Retained (historical evidence):
✓ GOOGLE_MAPS_SCRAPER_5_RESTAURANT_FINAL_REPORT.md
✓ REVIEW_PILOT_REPORT.md
✓ IMAGE_PILOT_REPORT.md
✓ PHASE_0_1_SUMMARY.md
✓ pilot_targets.csv (reusable)

Preserved (KK dependencies):
✓ Go 1.26.7
✓ Playwright v1.57.0 cache
✓ Playwright npm package v1.62.1
✓ Node.js v24.17.0
```

## Experiment Summary (for Historical Record)

**GOSOM/Google-Maps-Scraper v0.0.0-20260806090911-4676350a5bfd+dirty**

| Metric | Result |
|--------|--------|
| Standard mode (default) | ❌ All 35 jobs failed: "unexpected page type" |
| Fast mode (`-fast-mode -geo`) | ⚠️ 28/28 jobs succeeded but extracted **zero data** |
| Reviews extracted | 0 |
| Images extracted | 0 |
| Business data extracted | 0 |
| Classification | **RED** — Not viable |

**Root Cause**: Standard mode URL format (`google.com/maps/search/...`) incompatible with current Google Maps. Fast mode uses different URL format (`maps.google.com/search` with `pb` parameter) that loads but extracts no data fields.

## Next Experiment

**G Maps Extractor API** — Testing as replacement for both review and image extraction.

---

*Cleanup completed: 2026-08-20*  
*Experiment: gosom/google-maps-scraper micro-pilot (REJECTED)*  
*Next: G Maps Extractor API micro-pilot*