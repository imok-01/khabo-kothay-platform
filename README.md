# Khabo Kothay BD — Where to Eat in Dhaka

A premium restaurant-discovery platform built with **React 19 + TypeScript + Vite**. It uses mock data for 29 restaurants across 8 neighbourhoods (currently demo Kolkata records — the real Dhaka dataset will replace them), served through a simulated async API so the UI exercises real loading, error and retry paths. Market configuration (city, currency) lives in `src/lib/market.ts`.

## Quick start

```bash
npm install
npm run dev        # dev server → http://localhost:5173
npm test           # run the unit test suite (Vitest)
npm run build      # typecheck + production build (code-split per page)
npm run lint       # oxlint
npm run preview    # serve the production build
```

## Features

- **Interactive discovery builder** — instead of a bare search box, the home hero is **simple by default and powerful when needed**: five primary decision controls — **Where / Cuisine / Budget / When / Vibe** (each a two-level label + value trigger with live match counts) — sit in one compact discovery bar, followed by a compact **Advanced** control. Advanced expands inline (no page jump) to reveal secondary constraints: **Craving** (structured specialty, preserved from earlier phases), **People** (1 / 2 / 3–4 / 5–8 / 9+ — a soft occasion signal, never fake table availability), **Diet**, **Dining** (dine-in / delivery — takeaway isn't in the data model, so it's not offered), **Distance** (within 1/3/5/10 km, only applied when the user shares a location, with an honest "Use my location" hint otherwise), **Availability** (open now / opening soon / open later, derived from recorded hours) and a compact **More preferences** row (Outdoor seating / Family friendly / Quiet — all structured metadata, never description keyword matching). Advanced never duplicates the five primaries; its selections are summarized as chips under the toggle so users don't reopen it to remember. A live match count updates with every pick, and "Find restaurants" carries the whole selection into the URL as structured parameters (e.g. `?location=Park+Street&partySize=2&availability=open&family=1`).
- **Natural-language search** — free text like *"biryani under ৳500 near Park Street tonight"* is still parsed into structured filters (cuisine, price cap in BDT, neighbourhood, meal, diet, delivery, outdoor, vibes, "near me" → distance sort) with a visible "Understood" row (`src/lib/nlSearch.ts`).
- **Explore with map/list sync** — on desktop the results list and an interactive map sit side by side; hovering a card highlights its marker and clicking a marker highlights (and scrolls to) the card, opening a compact preview with photo, rating, price, distance and CTA. On mobile it becomes a map/list toggle. The map is a **real, pan/zoom map**: markers stay synchronised with the filtered results, picking a neighbourhood centres the map on it (and a clear chip returns you to all Dhaka), panning away offers **"Search this area"** (filters the list and map to the visible region) and **"Re-centre"** (returns to the committed view).
- **Filters** — location, budget (per person), max cost for two, cuisine, meal type, diet (any / pure veg / non-veg), rating floor, open-now, outdoor seating, delivery, and 10 vibe filters, with 6 sort modes: relevance, rating, distance, price ↑/↓, popularity. Active filters show as dismissible chips; all state lives in the URL so results are shareable, refreshable and deep-linkable.
- **Distance & geolocation** — browser Geolocation API with haversine distances (`lib/geo.ts`), a hard timeout with graceful city-centre fallback, and per-card distances. Location access is strictly **opt-in**: nothing prompts for permission until you choose "Use my location"; denied/unavailable states degrade gracefully and never block browsing.
- **Open-now engine** — parses each venue's hours (incl. windows crossing midnight) and drives an "Open now" filter, card badges and the detail-page status.
- **Recommendation engine** — deterministic, weighted, explainable scoring (`services/recommendationService.ts`). The hero becomes a **structured dining intent** (`DiningIntent`: cuisine, specialty, location, budget, meal, vibe, diet, open-now); Explore ranks results by how well they satisfy that intent, then layers personal signals on top. The score is the share of active signals a restaurant satisfies, and every positive dimension becomes an explainable reason. Cards show a **match bar + percentage** with two honest modes: **"N% match for you"** (only when a real profile/favourites exist) vs **"N% match for your search"** (guest, intent-only) — hovering/clicking opens a "Why this matches you" popover listing exactly the signals that produced the number, each with its contribution share. With no intent and no personal data, cards show "Complete your profile for personalised matches" instead of a fake score. Plus smart **Surprise me** modes (any / nearby / under ৳500 / tonight).
- **Personalisation memory** — favourites, recently viewed and derived preferences (cuisines, budget, diet) live in `localStorage` behind a preference service, ready to swap for an authenticated backend.
- **Offers system** — typed offer data (`domain/offers.ts`) with discount, value, validity, terms and meal/time applicability, rendered on home ("Today's offers"), detail pages and cards; clearly labelled demo offers.
- **Editorial collections** — data-driven curated sets ("Best first dates in Kolkata", "Park Street classics", "Best biryani under ৳500", "Late-night Kolkata", "Quiet cafés to work from", "Old Kolkata legends", "Weekend family lunch", "Rainy-day comfort food") linking into filtered explore URLs.
- **Accounts & roles** — three clearly separated roles (`domain/auth.ts`): **user**, **restaurant_admin** (ownership-scoped: can only manage restaurants assigned to their account), and **executive** (platform-wide). Route guards (`RequireRole`) enforce boundaries in the UI and store functions take the owning user id, so hiding buttons is never the only boundary. Demo accounts are seeded (password `demo123`, see login page) with passwords hashed via Web Crypto — never plaintext, and clearly not production auth.
- **User profile** — profile page with a completion % computed from actually-completed fields (not hard-coded), a "Your food profile" identity panel derived from real preferences, editable food preferences (cuisines, budget, diet, neighbourhoods, interests) that feed discovery, activity-based badges (Food Explorer, Budget Hunter, Cuisine Explorer, Top Reviewer…), activity history, a **token ledger** (every movement is a transaction), and a **referral system** with a shareable code, invite tracking and a clearly-labelled simulated verification step (+30 tokens). The token balance in the profile header is a button that jumps straight into the rewards wallet.
- **Clean preference editing** — the Food preferences panel shows **only current selections** as removable chips (no tag wall), with compact `+ Add` buttons opening searchable multi-select pickers (`components/PreferencePicker.tsx`) and single-select popovers for budget/diet. Intentional limits are enforced in the data layer, not just the UI: **cuisines ≤ 5, preferred areas ≤ 3, food interests ≤ 3** — at the limit the Add button disables with a clear explanation, and the picker blocks further selection. Changes persist immediately and refresh-safe, the "How Khabo Kothay sees you" summary is generated from the actual structured preferences (updating live as you edit), and an empty profile shows an honest "You haven't told Khabo Kothay much yet" state. The profile-completion reward stays a one-time state transition — editing/re-saving preferences never re-grants it.
- **Rewards & wallet** — a full wallet experience (`RewardsWallet`): a seeded demo balance (100 tokens) for demo accounts, a **reward catalogue** of concrete demo rewards (৳50 OFF · 40 tokens, ৳100 OFF Biryani · 80, Free Beverage · 60, ৳150 OFF · 100, ৳200 OFF · 150 — each with minimum bill, applicability and validity), clear per-reward states (available / need more tokens / redeemed / used / expired), a **redemption confirmation dialog** that shows the resulting balance before deducting, generated demo coupon codes (e.g. `KK50-XXXX`) with expiry dates, a coupon list with mark-as-used/expired states, a "How to earn tokens" guide, and a demo-only **"Reset demo wallet"** that restores the starting balance (never available for non-demo accounts). The economy is enforced in the ledger, not the UI: the **profile-completion reward (+10) grants exactly once**, the **first-review reward (+20) grants exactly once**, favourites (+2) and new-cuisine discoveries (+5) are **capped**, and **redemptions are blocked when the balance is insufficient** — a token balance can never go negative. A negative demo balance from earlier sessions is repaired automatically at load.
- **User reviews** — signed-in users can write/edit/delete their own Khabo Kothay review on a restaurant page (rating, text, visited status, favourite dish); they appear merged into the review list marked "You", earn tokens on first submission, and are visible to the executive for moderation.
- **Compact, scannable menu** — the Menu section is designed for fast scanning, not endless scrolling (`components/MenuSection.tsx`): a **Signature pane of curated signature dishes opens by default** ("Popular picks worth knowing before you browse the full menu"), a **sticky category rail** (desktop) / horizontally scrollable rail (mobile) switches panes with live dish counts, and **dish search** works across all categories while preserving price + category + history entry points. Dish rows are compact: name, one/two-line description, current price, badges (Signature / Chef's pick / Unavailable) and a price-movement + "View price history" link. Signature is a structured flag (`isSignature` on `MenuItem`) — never inferred from dish names — and restaurant admins can mark/unmark dishes as signature in the menu manager.
- **Price intelligence** — the per-dish history modal is now a full price-intelligence view (`components/DishPriceHistory.tsx` + pure helpers in `lib/priceIntelligence.ts`): a **line graph plotting only actual recorded observations** (never interpolated or fabricated daily data), **1M / 3M / 6M / All range controls that disable when a period has too few observations**, summary metrics (**lowest / average / highest** computed from the visible record), the chronological observation list with source attribution ("Restaurant provided" etc.), an **honest interpretation generated from the data** ("Today's price is close to the recorded average", "Only 2 price observations are available…"), and the disclaimer *"Based on recorded observations. History may be incomplete."* Price edits by restaurant admins still append snapshots that flow straight into the graph and list. Restaurant pages also keep a small "Signature dishes" editorial block alongside the menu.
- **Offer ↔ price context** — offers can reference the dishes they involve (`dishNames` on the `Offer` type). On a restaurant page, each such offer shows "Price context — see what these dishes have actually cost" with per-dish buttons that open the same price-intelligence modal, plus the honest note that *price history gives context — it doesn't authenticate the offer*. The modal is page-owned so the menu and offers share one instance.
- **Restaurant admin panel** (`/manage`) — dashboard, profile editing through a **draft → submit → executive approval → published** workflow (never instantly public), photos placeholder, menu manager, offer creation (draft → submit → approval; only approved offers go public via the OfferProvider merge), reviews, and settings. Ownership is enforced — the Arsalan admin can never touch Bhojohori Manna's data.
- **Khabo Kothay executive panel** (`/admin`) — computed platform dashboard (restaurants, users, reviews, offers, attention items), restaurant list with draft approval/rejection, user overview with token balances, review moderation with flag/resolve, offer approvals, and a price-history view showing recorded observations and change signals across every dish.
- **Compare** — add up to 3 restaurants to a comparison tray and view a side-by-side table of rating, price, cuisine, location, hours, diet, amenities and reviews.
- **Restaurant detail pages** — photo gallery with thumbnails, lightbox (swipe/arrow keys/Escape), identity, rating & reviews, cuisine/meal/vibe chips, live open status, primary actions (reserve, directions, website, share, favourite), stats, about, signature dishes, offers, reviews, a "Know before you go" card, a **real Google Maps embed** showing exactly where the restaurant is (no card covering the map) with "Open in Google Maps" and "Directions" actions, and similar-restaurant recommendations.
- **Favourites & recently viewed** — heart to save (persisted), a favourites page with "Because you liked these" picks, and a recently-viewed row on home.
- **Structured restaurant intelligence** — every restaurant carries executive-approved recommendation metadata (`domain/intelligence.ts`): **specialties** (Biryani, Dosa, Pizza, Seafood…), **best for** occasions, **food characteristics** and **dining features** — a controlled vocabulary, seeded and curated for all 29 venues (`data/intelligence.ts`). The engine reads ONLY this structured layer: a restaurant whose description mentions biryani is never treated as a biryani specialist unless its approved metadata says so, and "quiet" only ever comes from structured attributes, never keyword matches. Restaurant admins can **suggest** attribute changes (a "Discovery tags" tab), but nothing a restaurant claims becomes recommendation metadata until an **executive approves it** in the Recommendations moderation tab — approved changes apply to live match scores immediately (`lib/intelligence.ts` merges seed + approved suggestions). This keeps the catalogue honest and gives a future backend a clean typed table to serve.
- **Dual-source restaurant data** — every restaurant carries two clearly separated datasets (`domain/place.ts`): an optional **Google block** (place ID, maps URI, rating, reviews, photos, contact — populated by a future Places API integration, never fabricated in demo mode) and the **Khabo Kothay block** (our own community rating, structured reviews with visit status, user photos, tags, editorial highlights, data-backed "why people like it" signals, and visit counts). Ratings are always source-labelled — a Google rating is never presented as a Khabo Kothay rating (`lib/ratings.ts`, `RatingSource`, `RestaurantSignals`).
- **Photo source hierarchy** — `lib/photos.ts` picks imagery per UI context (card / hero / gallery): real Google photos → Khabo Kothay community photos → curated demo placeholder imagery, and the lead photo's source is labelled in the UI ("Photos from Google Maps" / "Demo photos"). Components never reach into photo sources directly. Google photo references are resolved via the Place Photos API at render time — never stored locally.
- **Professional imagery** — every restaurant has curated Unsplash photography (interiors, dishes) via an **image abstraction** (`domain/images.ts` + `repositories/ImageProvider.ts`) carrying `imageUrl`, `thumbnailUrl`, alt and attribution metadata, so a real provider (backend, Mapbox, etc.) can replace it without touching any component. `RestaurantImage` has loading and monogram fallbacks.
- **Design system** — Newsreader (display) + Manrope (UI) type scale, warm-ivory/deep-green palette with restrained saffron + terracotta accents, consistent spacing/radius/shadow/motion tokens in `index.css`, and lucide-react icons throughout (no emoji-as-art). An **editorial redesign layer** (`editorial.css`, loaded last) refines the whole product into a premium editorial experience: a taller glass header with a rotated mark and underline-active links, a **mobile bottom navigation** (`components/MobileNav.tsx` — Discover / Explore / Saved / You-or-role), a large asymmetric hero with an elegant discovery instrument and a bordered stats row, a **card family** (featured two-column editorial card / standard / compact horizontal scroller card), asymmetric collection grids with a full-bleed first item, numbered dark-green "Why Khabo Kothay?" statement band, a deep-green footer, refined explore workspace (rounded toolbar + map frame), restaurant detail with cinematic gallery, identity-first profile, gradient rewards wallet, productivity-styled admin tables/tabs, polished empty/loading/error states, subtle page-in motion and full `prefers-reduced-motion` support. All pre-existing functionality, routes and contracts are untouched — the layer is strictly presentational.
- **Production plumbing** — simulated async data layer with skeleton loading, error/retry UI, a global error boundary, lazy-loaded code-split routes, per-page document titles, a skip link and focus-visible styles.
- **"Why Khabo Kothay?" homepage section** — a product-positioning section that explains the actual mechanisms rather than marketing fluff: personal matches, budget-honest discovery, price history, offer context, vibe-matched discovery and the personal food profile — each block maps to a feature that genuinely exists in the app.
- **Demo accounts** — sign in on `/login` with any of the seeded accounts (password `demo123`): `executive@khabokothay.in` (platform admin), `owner@arsalan.in` / `owner@bhojohori.in` (restaurant admins), `ananya@example.com` / `rahul@example.com` (users).
- **Map providers** — `map/MapProvider.tsx` picks the map implementation at runtime: the **Google Maps JavaScript API** when `VITE_GOOGLE_MAPS_API_KEY` is set (markers, sync, controls all work), otherwise a fully interactive **Leaflet + OpenStreetMap/CARTO** fallback that needs no key. Both implement the same `MapSurfaceProps` contract, so pages never know which provider is rendering. The restaurant detail page uses a **keyless Google Maps embed** for its single-place map. All destination links (`Directions`, `Open in Google Maps`) are built by `lib/maps.ts` from the restaurant entity — coordinates today, Google Place IDs later (`placeId` is already in the type).

## Project structure

```
src/
  data/
    restaurants.ts             # mock dataset (29 restaurants) + constants
    images.ts                  # per-restaurant photo sources (Unsplash, attributed)
    offers.ts                  # demo offer data
    collections.ts             # editorial collections
  domain/
    images.ts                  # RestaurantImageSource type + license metadata
    place.ts                   # ExternalPlaceData (Google) vs KhaboPlaceData split,
                               # reviews, signals, menu/price readiness types
    offers.ts                  # Offer types (seed + admin offers)
    auth.ts                    # roles (user / restaurant_admin / executive), profiles
    menu.ts                    # menu categories, dishes, price snapshots
    rewards.ts                 # token transactions, coupons, referrals, reward catalogue
                               # definitions + capped earning config
    recommendation.ts          # DiningIntent, MatchDimension/MatchReason, MatchResult,
                               # RecommendationContext, SurpriseMode
    intelligence.ts            # Specialty / BestFor / FoodCharacteristic / DiningFeature
                               # vocabularies + RestaurantIntelligence + suggestion type
  repositories/
    ImageProvider.ts           # image-source provider (swappable)
    OfferProvider.ts           # offer provider — merges seed + approved admin offers
    PlaceProvider.ts           # Google Places seam (demo provider returns null)
  store/
    demoDb.ts                  # reactive localStorage demo DB (users, session, menus,
                               # admin offers, user reviews, rewards, drafts, flags)
  data/
    demoAccounts.ts            # seeded demo accounts (executive, owners, users)
    rewards.ts                 # demo reward catalogue (5 concrete rewards)
    menus.ts                   # seed menus + price history, fallback generator
  context/
    AuthContext.tsx            # demo login/signup/session with role checks
  services/recommendationService.ts  # weighted intent+personal scoring, explainable
                                     # reasons, surprise picks, gems, trips
  data/
    intelligence.ts            # curated seed intelligence for all 29 restaurants
  lib/
    intelligence.ts            # effective metadata = seed + approved suggestions
  map/
    MapProvider.tsx            # runtime provider selector (Google ⇄ Leaflet)
    GoogleMapSurface.tsx       # Google Maps JS API surface (keyed)
    LeafletMapSurface.tsx      # Leaflet/OSM surface — no key required
    loadGoogleMaps.ts          # singleton script loader (env-keyed)
    areas.ts                   # neighbourhood centres, Dhaka bounds
    refit.ts                   # fit targets, viewport drift detection
  lib/
    api.ts                     # async repository with latency + cache
    filter.ts                  # pure, testable explore filtering (incl. open-now)
    openHours.ts               # hours parsing & isOpenNow evaluation
    nlSearch.ts                # natural-language query parser
    geo.ts                     # haversine distance
    maps.ts                    # Google Maps URL builders (place/directions/embed)
    ratings.ts                 # source-labelled rating rows (Google vs Khabo)
    photos.ts                  # context-aware photo selection (google → khabo → demo)
    preferences.ts             # preference memory (localStorage)
    recommendations.ts         # sorting helpers
    format.ts                  # currency / pluralisation helpers
    usePageTitle.ts            # per-page <title> hook
  hooks/                       # useRestaurants, useGeolocation
  context/                     # Favorites, RecentlyViewed, Compare, Auth (state)
  components/                  # Navbar, Footer, RestaurantCard, DiscoveryBuilder,
                               # QuickShortcuts, CompareTray, MapView, RestaurantImage,
                               # RatingSource, RestaurantSignals, RequireRole,
                               # MenuSection, WriteReview, Skeletons, …
  pages/                       # Home, Explore, Restaurant detail, Favourites, Login,
                               # Profile, Restaurant admin, Executive admin, 404
  index.css                    # design system & responsive styles
  phase3.css                   # Phase 3 styles (accounts, admin panels, menus)
src/lib/__tests__/             # Vitest suites
```

## Tests

`npm test` runs 155 unit tests covering the filtering logic (incl. open-now with an injected clock), open-hours parsing across midnight, the natural-language parser, haversine distance, Google Maps URL building (Place ID priority, origin handling, no key leakage), recommendation scoring/ranking (incl. distance & popularity), source-labelled ratings, context-aware photo selection (Google → Khabo → demo fallback), price-change derivation from recorded snapshots, price-intelligence helpers (range filtering, stats, chart points, honest interpretation), menu fallback generation, the advanced-intent scoring dimensions (party-size occasion signals, delivery, availability-from-hours), minutes-until-open for "opening soon / later", and the new structured filters (family-friendly, quiet, distance cap), profile-completion percentages, the token economy (once-only profile/first-review rewards, capped favourites and cuisine discovery, insufficient-balance blocking, redemption + coupon generation, demo wallet reset), food-identity and computed badges, the intelligence merge (seed + approved suggestions, provenance tracking), the recommendation scoring engine (intent ranking, personalisation effects, structured-metadata-only specialties/quiet matching, no fake personal scores, filter-refinement), and formatting helpers. A vitest setup file provides an in-memory `localStorage` so store-backed logic is testable.

## Configuration

Copy `.env.example` to `.env` and set `VITE_GOOGLE_MAPS_API_KEY` to enable the Google Maps JS API on the Explore map (markers, card↔map sync, search-this-area and re-centre all work there). Without a key the app automatically uses the Leaflet/OSM surface — fully interactive, no key needed. Keys are never committed (`.env` is gitignored).

## Notes

- Photography is sourced from Unsplash (public, attribution retained in `src/data/images.ts`) — a real provider can replace it via `RestaurantImageSource` without UI changes.
- The dataset, offers, reviews and prices are fictional demo data; offers and reviews are clearly labelled as demos. No Google rating, review or photo is ever fabricated — the `google` block stays absent until a real Places API integration (via `repositories/PlaceProvider.ts`) supplies it.
- Accounts, tokens, coupons and referrals are demo simulations: sessions live in localStorage, passwords are SHA-256 hashed but that is **not** production authentication, no OTP/SMS is actually sent, coupons are not redeemable in real restaurants, and price history is seed data — never presented as a complete or verified record. A real backend is required for authentication, authorization, storage, verification and any real-value rewards.
- `vercel.json` rewrites all routes to `index.html` so client-side routes (including `/manage` and `/admin`) survive a hard refresh or direct navigation on the deployed site.
- Future Google Places integration slots into the existing seams: the `google` block on the `Restaurant` type (`domain/place.ts`), `PlaceProvider` for fetching, `lib/photos.ts` for photo selection, `lib/ratings.ts` for source-labelled display, and `lib/maps.ts` for links. Google photo references are resolved through the official Place Photos API at render time and never stored locally (respecting Maps Platform caching/attribution terms).
