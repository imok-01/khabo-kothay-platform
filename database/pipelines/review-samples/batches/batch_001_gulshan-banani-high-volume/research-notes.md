# Batch 001 — Research Notes

Scope: Gulshan/Banani high-volume venues.
Status: SELECTION COMPLETE — collection NOT STARTED (per instruction: no review collection yet).
SOP: `GOOGLE_REVIEW_HIGHLIGHTS_SOP_V1.md` (approved).

## Selection method

1. Pulled the full live restaurant list (206 restaurants in `restaurants`).
2. Excluded the 8 venues already carrying imported `review_samples` from the pilot:
   Sultan's Dine Gulshan Branch, Chef's Table - Gulshan 2, Woodhouse Grill Banani,
   Pizzaburg Gulshan, Chillox Banani, Jatra Biroti, Fish & Co. (Gulshan 1), Kacchi Bhai - Gulshan
   (also excluded Handi Gulshan — approved count 0, and Ankur Healing — unavailable case).
3. Ranked the remaining venues by Google review count (from the seed `reviewCount`).
4. Took the top 20, with one substitution for diversity: dropped the second fast-food
   branch Burger King Gulshan 2 (higher Burger King Banani already selected) and replaced it
   with Thai Emerald (Thai) to keep cuisine variety alongside Pizza Guy (Italian) and
   Nawab Chatga (Bengali) / Salam's Kitchen (Bangladeshi).
5. Verified every pick resolves to a live DB row (20/20 matched by name → UUID) and has a
   Google `placeId` (20/20 present).

## Reason for batch selection

- **High traffic first**: every pick has ≥ 3,090 Google reviews (range 3,090 – 9,237),
  meaning genuine review depth to find up to 3 quality highlights per venue. These are the
  venues users are most likely to look up, so the highlights give the most value.
- **Pilot continuity**: picks are all in Gulshan/Banani — the app's current coverage area —
  and none collide with the pilot's imported set.
- **Venue variety**: fast food, steakhouse, buffet, Bangladeshi/Bengali, Italian, Thai,
  dessert — so the rollout demonstrates highlights across the site, not just one segment.
- **0-highlight tolerance**: venues that fail the quality threshold (e.g. mostly generic
  reviews) will be recorded as unavailable rather than padded — consistent with pilot
  precedent (Handi, Ankur Healing).

## Ranked pool considered (top 25 by review count, excluding pilot-covered)

1. Herfy Gulshan — 9,237 — ChIJlT29NYPHVTcRbdqfrfAL_mE — SELECTED
2. Takeout Banani — 5,940 — ChIJD-LJDhLHVTcRlRlxntfUiYg — SELECTED
3. Meat Theory — 5,643 — ChIJj6TJHu7HVTcR5Qa18Wv6AWI — SELECTED (0-sample in pilot QA)
4. Steakout — 4,780 — ChIJB58cVtDHVTcRl3C30z6ctsY — SELECTED
5. Barcode Cafe — 4,649 — ChIJCa-cr5zHVTcR70Ud7EriuUk — SELECTED
6. Burger King Banani — 4,334 — ChIJcTdhSwzHVTcRtn8ew90MPXQ — SELECTED
7. Beyond Buffet (Gulshan) — 4,196 — ChIJ2Vv6YHzHVTcRLP4-fOtV4xE — SELECTED
8. The New Gulshan Plaza Restaurant — 4,149 — ChIJ7_UxHafHVTcRHWbnbvsqFfk — SELECTED
9. Texas Flame — 4,045 — ChIJGel-pgfHVTcROlcZ5WYFsTo — SELECTED
10. Madchef | Banani — 3,997 — ChIJr7jnoA7HVTcRno2Ggd8gvrQ — SELECTED
11. Pizza Inn Gulshan 1 — 3,605 — ChIJ52qDzOfHVTcR4YQgBGNcpYU — SELECTED
12. Pizza Guy — 3,528 — ChIJV9UU4kzGVTcROaDLsxtjwik — SELECTED
13. BFC - Banani — 3,471 — ChIJcZ0_hgvHVTcRSoIDyC6I5Ag — SELECTED
14. Salam's Kitchen — 3,429 — ChIJbWyeJAzHVTcRWJS3lPCkmd0 — SELECTED
15. Alfresco Banani — 3,302 — ChIJAzEo6w3HVTcRFwWhXjHvSMc — SELECTED
16. Premium Sweets — 3,244 — ChIJRYAR053HVTcRrJh-Urd6SRI — SELECTED
17. Nawab Chatga — 3,159 — ChIJKUoKnp7HVTcRGb4g4dIN0Mw — SELECTED
18. Arrowhead Grill — 3,102 — ChIJVVQsB1jHVTcRm0J5sy9ghQw — SELECTED
19. Koyla Restaurant & Kebab — 3,100 — ChIJSVP68njHVTcRiUdOw6HN7w0 — SELECTED
20. Thai Emerald — 3,090 — ChIJyS_C95zHVTcRma-MxvTQ-OQ — SELECTED (replaces Burger King Gulshan 2 for variety)
21. Tree House — 2,935 — (dropped, below threshold)
22. Yum Cha District — 2,886 — (dropped)
23. Koreana Restaurant — 2,855 — (dropped)
24. Sajna Restaurant — 2,782 — (dropped)
25. The Atrium Restaurant — 2,774 — (dropped)

## Branch verification watchlist (for the collection phase)

- Herfy Gulshan vs Herfy - Banani (different place IDs — verify which page each review belongs to).
- Burger King Banani vs Burger King | Gulshan 2 (chain — verify branch).
- Pizza Inn Gulshan 1 (chain with multiple Dhaka branches — verify branch).
- Nawab Chatga (Chittagong-origin name — verify the Gulshan/Banani branch page).
- Takeout Banani vs Takeout Gulshan (distinct venues).

## Collection audit result (2026-08-20)

**Outcome: PAUSED — zero APPROVED reviews retrievable with current tooling.**

Automated collection was attempted on 2026-08-20 using websearch + webfetch across all known
Google-review aggregators. Only `top-rated.online` was reachable, and its content is:
- All anonymous (no reviewer name, date, or rating)
- Evidently paraphrased / machine-generated
- Branch-inaccurate (Pizza Inn Gulshan 1 fetched page showed address Rd 127 vs. seed Rd 12)

Result: 0 APPROVED, 0 HOLD, 20 REJECT (sources unable to produce attributable Google review text).

See `GOOGLE_REVIEW_HIGHLIGHTS_PROCESS_AUDIT.md` for full findings.

**Resume trigger:** Google Places API key, or confirmed browser/manual research access. The manifest
JSON and per-restaurant research scaffolding are already correct and reusable.

## Collection plan (orbital — awaiting viable source)

**V2 Update:** AI collection was attempted but failed (web search returned zero results, cannot browse Google Maps).
See `GOOGLE_REVIEW_HIGHLIGHTS_SOP_V2.md` for the updated workflow with role separation.

**Current status:** AWAITING HUMAN DATA COLLECTION

Per venue: ≤ 3 highlights, verbatim text, reviewer attribution, source URL, Google placeId
confirmed. Sources: Google-attributed aggregators (Wanderlog, Trip.com, restaurantguru.com,
top-rated.online) or hand-copied Google Maps text. Every candidate goes through the
SOP QA checklist (Approved / Hold / Reject) before entering `manifest.json.reviews`.

Expected outcome: 20 venues × up to 3 = up to 60 candidate excerpts; a venue may end up
with 0 if no review meets the quality threshold.

**Next step:** Human data provider must collect raw review data per `GOOGLE_REVIEW_HIGHLIGHTS_RESEARCH_WORKFLOW.md`.