# Pipeline Cleanup Audit Report

Generated: 2026-08-20

## Phase 1: Audit Before Deleting

### A. gosom/google-maps-scraper
| Item | Path | Classification | Action |
|------|------|----------------|--------|
| Cloned repository | `google-maps-scraper/` | REMOVE | Already deleted in previous cleanup |
| Compiled binary | `google-maps-scraper.exe` | REMOVE | Already deleted |
| Playwright v1.61.1 cache | `C:\Users\USER\AppData\Local\ms-playwright-go\1.61.1` | REMOVE | Already deleted |
| Pilot outputs | `data/output/google_maps_scraper_pilot/` | ARCHIVE | Preserve as historical evidence |

### B. Restaurant Guru extraction
| Item | Path | Classification | Action |
|------|------|----------------|--------|
| No active scripts found | — | REMOVE | Already not present |

### C. G Maps Extractor API
| Item | Path | Classification | Action |
|------|------|----------------|--------|
| Pilot targets | `data/output/gmaps_extractor_pilot/pilot_targets.csv` | ARCHIVE | Preserve |
| API docs notes | `data/output/gmaps_extractor_pilot/API_DOCUMENTATION_NOTES.md` | ARCHIVE | Preserve |
| Setup status | `data/output/gmaps_extractor_pilot/SETUP_STATUS.md` | ARCHIVE | Preserve |
| Pilot scripts | `run_gmaps_pilot*.cjs`, `run_gmaps_pilot.mjs` | REMOVE | Test scripts |
| Test scripts | `test_*.cjs`, `test_*.json` | REMOVE | Test artifacts |
| Pilot outputs | `data/output/gmaps_extractor_pilot/` | ARCHIVE | Move to archive |

### D. Playwright-based Google Maps photo scraping pilots
| Item | Path | Classification | Action |
|------|------|----------------|--------|
| Browser pilots | `database/pipelines/images/google_maps_browser_photo_pilot.js` | REMOVE | Failed experiment |
| Playwright MCP | `@playwright/mcp` in package.json | KEEP | Used by production |
| Playwright | `playwright` in package.json | KEEP | Used by production |
| Browser photo pilot reports | `IMAGE_GOOGLE_MAPS_BROWSER_PHOTO_PILOT_REPORT.md` | ARCHIVE | Preserve |

### E. Browser-based Google Maps review scraping pilots
| Item | Path | Classification | Action |
|------|------|----------------|--------|
| Review collection pilot | `data/output/review_collection_pilot/` | ARCHIVE | Preserve |
| Pilot scripts | `pilot_review_scraper.cjs` | REMOVE | Test script |
| Aggregator pilot | `aggregator-pilot.cjs`, `aggregator_pilot_results.json` | REMOVE | Failed experiment |

### F. Other failed review/image scraping experiments
| Item | Path | Classification | Action |
|------|------|----------------|--------|
| Image collection pilots | `image_collection_pilot*.json`, `IMAGE_COLLECTION_*.md` | ARCHIVE | Preserve |
| Image extraction micro-pilots | `image_extraction_micro_pilot.json`, `IMAGE_EXTRACTION_MICRO_PILOT_REPORT.md` | ARCHIVE | Preserve |
| Image gallery pilot | `image_gallery_pilot.json`, `image_gallery_pilot_report.md` | ARCHIVE | Preserve |
| Image coverage pilot | `IMAGE_COVERAGE_PILOT_REPORT.md`, `image_coverage_pilot.json` | ARCHIVE | Preserve |
| Image validation | `IMAGE_COLLECTION_VALIDATION_REPORT.md` | ARCHIVE | Preserve |
| Google Maps browser photo pilot | `IMAGE_GOOGLE_MAPS_BROWSER_PHOTO_PILOT_REPORT.md` | ARCHIVE | Preserve |
| Google Places image pilot | `IMAGE_GOOGLE_PLACES_PILOT_REPORT.md` | ARCHIVE | Preserve |
| Google Review Highlights pilots | `GOOGLE_REVIEW_HIGHLIGHTS_*.md` | ARCHIVE | Preserve |
| Review samples plans | `REVIEW_SAMPLES_V1_PLAN.md`, `REVIEW_INTELLIGENCE_AUDIT.md` | ARCHIVE | Preserve |
| Review segments | `review-segments.json` | KEEP | May be used by production |
| Pilot validation | `database/imports/pilot/` | KEEP | Production pipeline |

### G. Temporary pilot outputs
| Item | Path | Classification | Action |
|------|------|----------------|--------|
| Pilot scripts | `run_*.cjs`, `run_*.mjs`, `pilot_*.cjs` | REMOVE | Root-level test scripts |
| Test files | `test_*.cjs`, `test_*.json`, `test_*.mjs` | REMOVE | Test artifacts |
| Extract scripts | `extract-images.cjs` | REMOVE | Test artifact |
| Find scripts | `find_restaurant.cjs` | REMOVE | Test artifact |
| Rank temp | `rank-temp.cjs` | REMOVE | Test artifact |
| Simple test | `simple-test.png` | REMOVE | Test artifact |
| PILOT-REPORT.md | Root level | ARCHIVE | Move to archive |

### H. Scraper-specific dependencies
| Dependency | In package.json | Classification | Action |
|------------|-----------------|----------------|--------|
| `@playwright/mcp` | Yes | KEEP | Production dependency |
| `playwright` | Yes | KEEP | Production dependency |
| `xlsx` | Yes | KEEP | Used for data imports |
| `@types/google.maps` | Yes (dev) | KEEP | Google Places types |

### I. Research tools
| Item | Path | Classification | Action |
|------|------|----------------|--------|
| Google review collector | `research-tools/google-review-collector/` | REMOVE | Failed experiment |

### J. Production Google Places Client (KEEP)
| File | Purpose | Classification |
|------|---------|----------------|
| `src/services/googlePlacesClient.ts` | Official Google Places API (New) client | KEEP - Production |
| `src/services/googleDataService.ts` | Data service using Google Places | KEEP - Production |
| `src/domain/liveGoogle.ts` | Domain types for live Google data | KEEP - Production |
| `src/hooks/useLiveGoogle.ts` | Hook for live Google data | KEEP - Production |
| `src/hooks/useGoogleRefresh.ts` | Hook for refresh | KEEP - Production |

### K. Database/Import pipelines (KEEP - Production)
| Path | Purpose |
|------|---------|
| `database/imports/` | Production import pipelines |
| `database/pipelines/` | Production pipelines |
| `database/migrations/` | Database migrations |

---

## Summary: Files to Remove

### Root-level test scripts (REMOVE):
- `aggregator-pilot.cjs`
- `aggregator_pilot_results.json`
- `extract-images.cjs`
- `find_restaurant.cjs`
- `pilot_review_scraper.cjs`
- `run_gmaps_pilot.cjs`
- `run_gmaps_pilot.mjs`
- `run_gmaps_pilot_v2.cjs`
- `run_pilot.cjs`
- `run_pilot.mjs`
- `extract_images.cjs` (if exists)
- `find_restaurant.cjs` (if exists)
- `rank-temp.cjs`
- `simple-test.png`
- `test_*.cjs`, `test_*.json`, `test_*.mjs`
- `check-chrome.js`
- `pilot_review_scraper.cjs`

### Research tools (REMOVE):
- `research-tools/google-review-collector/`

### Database experimental pipelines (REMOVE):
- `database/pipelines/images/google_maps_browser_photo_pilot.js`
- `database/pipelines/images/google_places_photo_pilot.json`
- `database/pipelines/images/image_coverage_pilot.json`
- `database/pipelines/images/multi_source_pilot.js`
- `database/pipelines/images/pilot_checkpoint.json`
- `database/pipelines/images/pilot_progress.log`
- `database/pipelines/review-samples/import_review_samples.js`
- `database/pipelines/review-samples/pilot_review_samples_ap...`
- `database/pipelines/review-samples/REVIEW_SAMPLES_IMPORT_R...`
- `database/pipelines/generators/build_pilot_package.py`
- `database/pipelines/generators/generate_pilot_package.js`
- `database/pipelines/discovery-facts/pilot_facts.json`
- `database/pipelines/discovery-facts/_research/full_review_...`
- `database/pipelines/discovery-facts/_research/generate_rev...`
- `database/pipelines/discovery-facts/_research/review_signa...`

### Root-level report files to archive:
- `PILOT-REPORT.md`
- `IMAGE_COLLECTION_VALIDATION_REPORT.md`
- `IMAGE_COLLECTION_PILOT_V2_REPORT.md`
- `IMAGE_COLLECTION_PILOT_V2_REPORT.md`
- `IMAGE_COLLECTION_REPORT.md`
- `image_gallery_pilot_report.md`
- `IMAGE_GALLERY_PILOT_REPORT.md`
- `IMAGE_GOOGLE_MAPS_BROWSER_PHOTO_PILOT_REPORT.md`
- `IMAGE_GOOGLE_PLACES_PILOT_REPORT.md`
- `IMAGE_COVERAGE_PILOT_REPORT.md`
- `IMAGE_EXTRACTION_MICRO_PILOT_REPORT.md`
- `image_extraction_micro_pilot.json`
- `image_gallery_pilot.json`
- `image_gallery_pilot_report.md`
- `image_collection_pilot.json`
- `image_collection_pilot_v2.json`
- `GOOGLE_REVIEW_HIGHLIGHTS_*.md` (multiple)
- `REVIEW_INTELLIGENCE_AUDIT.md`
- `REVIEW_SAMPLES_V1_PLAN.md`
- `AI_INSIGHTS_PILOT_DESIGN.md`
- `DISCOVERY_FACTS_PILOT.md`
- `DISCOVERY_FACTS_FINAL_PILOT.md`
- `DISCOVERY_FACTS_PROCESS_AUDIT.md` (if exists)
- `BATCH_001_PILOT_REPORT.md` (in research-tools)
- `PILOT-REPORT.md`

---

## Files to Archive (move to data/output/archive/pipelines/):
All pilot reports and outputs in `data/output/` related to failed experiments:
- `data/output/gmaps_extractor_pilot/`
- `data/output/google_maps_scraper_pilot/`
- `data/output/review_collection_pilot/`
- `data/output/image_collection_pilot/`
- `data/output/image_collection_pilot_v2/`
- etc.

---

## Files to KEEP (Production):
- All `src/` files except experimental test files
- `src/services/googlePlacesClient.ts` - Core Google Places client
- `src/services/googleDataService.ts`
- `src/domain/liveGoogle.ts`
- `src/hooks/useLiveGoogle.ts`
- `src/hooks/useGoogleRefresh.ts`
- `src/hooks/useReviewSamples.ts`
- `src/services/googleDataService.ts`
- `src/services/reviewService.ts`
- `src/services/reviewSamplesService.ts`
- `src/services/imageService.ts`
- `src/repositories/*`
- `src/components/`
- `src/hooks/useReviews.ts`
- `src/hooks/useImages.ts`
- `src/hooks/useReviewSamples.ts`
- `database/imports/` (production)
- `database/pipelines/` (production, except experimental)
- `database/migrations/`
- `supabase/`
- `package.json` dependencies (keep all current)

---

## Environment Variables to Clean
| Variable | Status |
|----------|--------|
| `GMAPSEXTRACTOR_API_KEY` | Remove from environment (not in .env) |
| `VITE_GOOGLE_MAPS_API_KEY` | KEEP (used by Google Places client fallback) |
| `VITE_GOOGLE_PLACES_API_KEY` | KEEP (expected for production) |
| `VITE_SUPABASE_URL` | KEEP |
| `VITE_SUPABASE_ANON_KEY` | KEEP |

---

## Next Steps
1. Remove root-level test scripts and artifacts
2. Remove experimental database pipelines
3. Remove research-tools directory
4. Archive all pilot outputs to `data/output/archive/pipelines/`
5. Move root-level reports to archive
6. Run typecheck, build, and tests to verify application safety