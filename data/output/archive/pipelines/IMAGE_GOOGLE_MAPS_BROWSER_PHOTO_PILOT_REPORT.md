# IMAGE GOOGLE MAPS BROWSER PHOTO PILOT REPORT

**Date:** 2026-08-20
**Pilot Size:** 5 restaurants
**Classification:** 🟡 YELLOW — Method works but needs refinement

---

## 1. EXECUTIVE SUMMARY

Google Maps photos **can** be collected through Playwright-controlled Chromium browser sessions. The method successfully:
- Opens Google Maps without CAPTCHA blocking
- Searches for restaurants by name
- Navigates to the correct place page
- Verifies restaurant identity (4/5 verified)
- Extracts Google-hosted image URLs from the Photos section

**However**, the method currently yields only 1-3 images per restaurant depending on how many photos Google Maps displays. One restaurant (Bamboo Shoot Gulshan) achieved full 3-image coverage, while others got 1 image each.

---

## 2. BROWSER MECHANISM

| Property | Value |
|----------|-------|
| Browser | Playwright Chromium |
| Mode | Visible (non-headless) |
| Automation flags | `--disable-blink-features=AutomationControlled` |
| Real user browser? | ❌ No — Playwright-controlled Chromium |
| Google Maps loaded? | ✅ Yes — no CAPTCHA detected |
| Photos section accessible? | ✅ Yes — via "Photos" button click |

---

## 3. RESTAURANT-LEVEL RESULTS

| # | Restaurant | Identity | Place ID | Images | Coverage |
|---|-----------|----------|----------|--------|----------|
| 1 | Alfresco Banani | ✅ (2/2) | `0x3755c70deb283103:0xc748ef315ea10517` | 1 | PARTIAL |
| 2 | Al-Amar Lebanese Cuisine Gulshan | ❌ (0/4) | — | 0 | FAILED |
| 3 | Aaheli Kabab and Chinese Restaurant | ✅ (5/5) | `0x3755c70e991c0c77:0x9fa67b93281f7043` | 1 | PARTIAL |
| 4 | Bahar | ✅ (1/1) | `0x3755c7894ba49dfd:0x6caf90a7f39c67ae` | 1 | PARTIAL |
| 5 | Bamboo Shoot Gulshan | ✅ (3/3) | `0x3755c7a1bce90fc3:0x7edd08f9123d1698` | 3 | SUCCESS |

### Coverage Summary
- **3-image coverage: 20%** (1/5)
- **2+ image coverage: 20%** (1/5)
- **1+ image coverage: 80%** (4/5)
- **Identity verified: 80%** (4/5)

---

## 4. EXTRACTED IMAGES

### Alfresco Banani (1 image)
```
[1] https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlqm...=w86-h114-k-no
```

### Aaheli Kabab (1 image)
```
[1] https://lh3.googleusercontent.com/gps-cs-s/AHRPTWngV...=w86-h114-k-no
```

### Bahar (1 image)
```
[1] https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlzI...=w86-h114-k-no
```

### Bamboo Shoot Gulshan (3 images)
```
[1] https://lh3.googleusercontent.com/gps-cs-s/AHRPTWn8e...=w203-h152-k-no
[2] https://lh3.googleusercontent.com/gps-cs-s/AHRPTWl96...=w203-h152-k-no
[3] https://lh3.googleusercontent.com/a-/ALV-UjUqx...=w414-h552-k-no
```

---

## 5. WHY SOME RESTAURANTS GOT FEWER IMAGES

| Restaurant | Issue |
|------------|-------|
| Alfresco Banani | Only 1 Google image visible in Photos panel |
| Al-Amar | Page didn't load properly (identity not verified) |
| Aaheli Kabab | Only 1 Google image visible in Photos panel |
| Bahar | Only 1 Google image visible in Photos panel |
| Bamboo Shoot | 5 images found, 3 selected |

**Root cause:** Google Maps shows a limited number of photos in the sidebar/panel. Some restaurants have more user-contributed photos than others. The "See all photos" button exists but may not always load additional images.

---

## 6. TECHNICAL ANALYSIS

### What Works ✅
1. Playwright Chromium can access Google Maps without CAPTCHA
2. Search-by-name navigates to the correct restaurant
3. Identity verification works (name matching)
4. Google-hosted image URLs are extractable from the DOM
5. Fresh context per restaurant prevents state pollution

### What Needs Improvement ⚠️
1. **Photo count varies** — some restaurants only show 1-2 photos in the panel
2. **"See all photos" consistency** — the Photos section doesn't always load fully
3. **Image quality** — many images are small thumbnails (86x114)
4. **Full-size retrieval** — clicking photos to get larger versions is inconsistent

### What Blocks Scaling 🔴
1. **Variable photo availability** — not all restaurants have 3+ Google photos
2. **Image size** — default thumbnails are too small for production use
3. **URL expiry** — Google Maps photo URLs are temporary, not permanent

---

## 7. STORAGE POLICY ANALYSIS

| Question | Answer |
|----------|--------|
| Can KK permanently store photo URLs? | ❌ No — URLs expire |
| Can KK download and re-host images? | ⚠️ Requires Google ToS review |
| Are photo resource names stable? | ✅ Yes — can be stored |
| Does KK need to re-fetch dynamically? | ✅ Yes — unless downloading |
| Attribution required? | ✅ Yes — author name + Maps link |

### Critical Finding
Google Maps `lh3.googleusercontent.com` URLs contain expiry parameters (`=w86-h114-k-no`). These URLs are **temporary** and will stop working after a period. The `photoResourceName` (e.g., `places/ChIJ.../photos/AIza...`) is stable, but requires the Places API to convert to a usable image URL.

**This means:** KK cannot simply store the `lh3.googleusercontent.com` URLs as permanent image references. Either:
- (a) Re-fetch URLs dynamically (requires API key or browser session)
- (b) Download and cache images (requires ToS compliance review)
- (c) Use the Places Photos API (requires API key)

---

## 8. SCALABILITY ASSESSMENT

| Factor | Rating | Notes |
|--------|--------|-------|
| Browser access | ✅ GREEN | Playwright works reliably |
| Identity verification | ✅ GREEN | 4/5 verified |
| Photo discovery | 🟡 YELLOW | 1-3 images per restaurant |
| Image quality | 🟡 YELLOW | Thumbnails need size negotiation |
| URL permanence | 🔴 RED | URLs expire — not permanent |
| Automation | 🟡 YELLOW | Works but needs error handling |
| Speed | 🟡 YELLOW | ~15s per restaurant |
| Scalability to 206 | 🟡 YELLOW | Feasible but URLs need storage strategy |

---

## 9. ANSWERS TO CRITICAL QUESTIONS

### A. Can we FIND 3 images?
**Partially.** 1/5 restaurants got 3 images. Others got 1. The method finds images, but Google Maps doesn't always show enough.

### B. Can we IDENTIFY them correctly?
**Yes.** 4/5 restaurants were identity-verified. Place IDs were extracted.

### C. Can we CAPTURE a usable reference?
**Yes, but URLs expire.** The `lh3.googleusercontent.com` URLs work immediately but are not permanent.

### D. Can KK legally/technically DISPLAY them?
**Requires ToS review.** Google Maps photos have attribution requirements and usage restrictions. Cannot assume permanent hosting is permitted.

### E. Can the process be repeated for 206 restaurants?
**Technically yes, but:**
- Variable photo availability (some restaurants have few Google photos)
- URL expiry requires dynamic re-fetching or download-and-cache
- ~15s per restaurant = ~50 minutes for 206 restaurants
- Error handling needed for restaurants that fail to load

---

## 10. RECOMMENDATION

### Classification: 🟡 YELLOW

**The browser method works but has important limitations.**

### For Production Use

1. **Short-term:** Use Playwright to collect photo references for priority restaurants, but store the `photoResourceName` (not the temporary URL) and re-fetch when needed.

2. **Medium-term:** Implement a server-side proxy that:
   - Stores `photoResourceName` per restaurant
   - Fetches fresh image URLs on demand via Places Photos API
   - Caches results with appropriate TTL

3. **Long-term:** If Google Places API key is obtained, use the official API for reliable, scalable photo retrieval with proper attribution.

### Do NOT Scale to 206 Yet

The pilot shows the method works, but the URL expiry issue means a simple "collect URLs and store" approach won't work. A storage strategy must be decided first.

---

## 11. FILES CREATED

| File | Purpose |
|------|---------|
| `database/pipelines/images/google_maps_browser_photo_pilot.json` | Structured pilot results |
| `IMAGE_GOOGLE_MAPS_BROWSER_PHOTO_PILOT_REPORT.md` | This report |
| `database/pipelines/images/test_robust_flow.js` | Test script (v2) |
| `database/pipelines/images/test_improved_flow.js` | Test script (v3) |

---

## 12. NO PRODUCTION MODIFICATIONS

**No KK application, database, or frontend files were modified.** This is a research/validation pilot only.
