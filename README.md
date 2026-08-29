# Khabo Kothay — Where to Eat in Dhaka

A restaurant-discovery platform for Dhaka, built with **React 19 + TypeScript + Vite** on a
**Supabase** backend. The live catalogue covers **206 venues across Gulshan and Banani**, with
structured cuisine, budget, hours, coordinates, menus, price history, offers and reviews.

Discovery is intent-driven rather than keyword-driven: the home hero builds a structured
`DiningIntent`, and every match score, reason and filter is derived from approved structured
metadata — never inferred from free-text descriptions.

## Quick start

```bash
npm install
cp .env.example .env   # optional — see Configuration
npm run dev            # dev server → http://localhost:5173
npm test               # Vitest suite
npm run lint           # oxlint
npm run build          # typecheck → bundle → prerender
npm run preview        # serve the production build
```

## Configuration

Every environment variable is optional; `.env.example` documents each one. With none set, the
app runs fully offline against the bundled dataset and the keyless Leaflet/OpenStreetMap map.

| Variable | Effect when set |
| --- | --- |
| `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | Repositories read the live catalogue instead of the bundled dataset |
| `VITE_GOOGLE_MAPS_API_KEY` | Explore uses the Google Maps JS API instead of the Leaflet fallback |
| `VITE_GOOGLE_PLACES_API_KEY` | Enables live rating / review / hours refresh |
| `VITE_APP_ENV` | Environment marker read by the production safety guards |
| `VITE_DEV_AUTH_MOCK` | Shows the one-time code in the UI instead of sending an SMS (dev only) |
| `VITE_DEV_SIMULATION` | Layers the isolated KK Demo Restaurant onto a dev build (dev only) |

`.env` is gitignored; only the template is tracked. The anon key is a public client key — RLS
and table grants are what protect the data. A production build refuses to start if either
dev-only flag is enabled.

## Architecture

Data access runs through one seam. Every page and hook talks to a **repository**, and each
repository picks its source from `isSupabaseConfigured()` alone — Supabase when configured,
the bundled dataset otherwise. Rows are converted by pure **transformers** into the domain
types in `src/domain`, so no component ever sees a database shape.

```
pages / components
        ↓
hooks  ──►  services  ──►  repositories  ──►  integrations/supabase
                                │
                                └──►  data/  (bundled offline dataset)
                                          ↓
                                    transformers  ──►  domain types
```

Google and Khabo Kothay data stay separated all the way to the UI (`domain/place.ts`): a
Google rating is never presented as a Khabo Kothay rating, and photos resolve through one
hierarchy (`lib/photos.ts`) — Google → community → curated placeholder — with the lead
photo's source labelled on screen.

## Project structure

```
src/
  domain/            typed vocabulary — auth, place, menu, offers, reviews,
                     rewards, recommendation, intelligence, discoveryFacts
  integrations/
    supabase/        client + generated database types
  transformers/      row → domain conversion (pure, tested)
  repositories/      source selection seam (Supabase ⇄ bundled dataset)
  services/          orchestration over repositories
  hooks/             data + interaction hooks consumed by pages
  lib/               pure logic: filtering, open-hours, NL search, geo, maps,
                     ratings, photos, price intelligence, formatting
  map/               MapProvider (Google ⇄ Leaflet), areas, refit
  components/        UI, incl. ui/ primitives and explore/ workspace parts
  pages/             routed screens, incl. /manage and /admin consoles
  context/           Auth, Favorites, Saved, Compare, RecentlyViewed
  store/demoDb.ts    reactive localStorage demo DB (offline mode)
  data/              bundled offline dataset + seeds + dev simulation island
  *.css              twelve stylesheets, load order significant (see main.tsx)
scripts/
  prerender.mjs      static prerender of every route after the bundle
  extract-demo-reference.mjs
supabase/
  migrations/        applied schema history (source of truth)
  schema/            foundation snapshot, proposals, validation queries
docs/                architecture and visual-direction notes
```

CSS is deliberately flat and **order-dependent**: `design-system.css` owns the tokens and base
layer, later sheets refine earlier ones, and `primitives.css` / `morph-slider.css` load last.
`main.tsx` documents why each file sits where it does — a correction belongs in the sheet that
made the rule, not in a new sheet on top.

## Product surface

- **Discovery builder** — Where / Cuisine / Budget / When / Vibe as primary controls with live
  match counts, plus an inline Advanced pane for craving, party size, diet, dining mode,
  distance, availability and structured preferences. Selections serialise into the URL.
- **Explore** — results list synced with a real pan/zoom map, "search this area", re-centre,
  and a mobile map/list toggle. Filter state lives in the URL, so results are shareable.
- **Recommendations** — deterministic, weighted, explainable scoring
  (`services/recommendationService.ts`). Cards distinguish "match for you" from "match for
  your search", and every score opens a breakdown of the signals that produced it.
- **Menus & price intelligence** — signature-first menu panes, and a per-dish history view that
  plots only actual recorded observations, never interpolated data.
- **Offers, reviews and rewards** — typed offers with an approval workflow, community reviews,
  and a token ledger where earning rules and caps are enforced in the ledger, not the UI.
- **Two consoles** — `/manage` for restaurant owners (ownership-scoped, draft → submit →
  approval) and `/admin` for platform executives (approvals, moderation, price signals).
- **Accessibility & motion** — focus-visible styles, a skip link, keyboard-navigable dialogs,
  and full `prefers-reduced-motion` support across every animated surface.

## Tests and quality gates

```bash
npx tsc -b --noEmit    # types
npm test               # Vitest
npm run lint           # oxlint
npm run build          # typecheck + bundle + prerender every route
```

The suite covers pure logic rather than rendering: filtering and open-hours (with an injected
clock), the natural-language parser, haversine distance, Maps URL building, recommendation
scoring and ranking, source-labelled ratings, photo selection, price-history derivation and
interpretation, the token economy's once-only and capped rules, transformers, and the
repository source-selection seam. A setup file supplies an in-memory `localStorage`.

## Deployment

Vercel, from `npm run build`. `scripts/prerender.mjs` writes a static HTML file per route plus
`dist/shell.html`, and stamps the build with the short git revision — so `.git` must be present
at build time. `vercel.json` rewrites the authenticated routes to `shell.html` and everything
else to `index.html`, so deep links and hard refreshes survive.

## Honesty notes

- Offers, reviews, menus and price history for the demo records are labelled as demo data. No
  Google rating, review or photo is fabricated: the `google` block stays absent until a real
  Places response supplies it.
- Demo authentication is a simulation — sessions live in `localStorage`, no SMS is sent, and
  coupons are not redeemable anywhere. Real authentication and authorization require the
  backend, not the client.
- `src/data/restaurants.ts` is a generated offline fallback. The live catalogue in Supabase is
  the source of truth; the spreadsheet inputs and one-off import pipelines are kept outside
  this repository.
- Recorded prices are presented as observations, never as a complete or verified record.
