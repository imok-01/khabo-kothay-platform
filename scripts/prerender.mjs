/**
 * Khabo Kothay BD — build-time SPA prerenderer (browserless).
 *
 * The app is a client-rendered Vite/React SPA: the initial HTML is only the
 * shell, so crawlers/renderers that don't execute JavaScript see zero content.
 * This script runs AFTER `vite build` and writes real, pre-rendered HTML for
 * every public route:
 *
 *   /
 *   /explore
 *   /restaurant/<id>   (one per restaurant in the active dataset)
 *
 * Instead of launching a headless browser per route (which is far too slow and
 * heavy for CI/build containers), it renders the app server-side with React's
 * own `renderToPipeableStream` — the standard Vite SSR pipeline. The rendered
 * output is literally what React renders for hydration, so:
 *
 *   - no browser, no network, no painting — ~100ms per route;
 *   - no DOM normalization: the static HTML already matches the client's
 *     FIRST render (skeletons, empty map surface, guest header), so hydration
 *     is clean by construction;
 *   - the component tree, router, data and image system are untouched.
 *
 * A few small, prerender-only seams make this possible (see src/lib/prerender.ts):
 *   - `globalThis.__PRERENDER__` makes useRestaurants/useRestaurant seed their
 *     state synchronously and AuthProvider start "ready" (effects never run
 *     server-side);
 *   - a memory `localStorage` shim satisfies the demo store's reads.
 *
 * Per-route <title>/description/canonical/OG tags and Schema.org Restaurant
 * JSON-LD are injected into the built shell. Vercel serves the resulting
 * files directly; the existing `/(.*) → /index.html` rewrite still handles
 * every other path (auth pages, unknown restaurants, client-side routes).
 *
 * Set PRERENDER_SKIP=1 to bypass (fast local builds), PRERENDER_ONLY=/explore
 * to capture a subset.
 */
import { createServer as createViteServer } from 'vite';
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

/** Canonical production origin (the BD alias; the -kolkata alias is legacy). */
const CANONICAL_ORIGIN = 'https://khabo-kothay.vercel.app';

const MAX_ATTEMPTS = 3;
/** A single route's render must finish within this window. */
const RENDER_TIMEOUT_MS = 30000;

/* ------------------------------------------------------------------ */
/* Prerender environment                                               */
/* ------------------------------------------------------------------ */

// Marks this process as the build-time prerenderer (read by src/lib/prerender).
globalThis.__PRERENDER__ = true;

// The demo store reads localStorage during render (favorites, recently viewed,
// seeded users). Provide an in-memory implementation so rendering works with
// no DOM and no side effects.
const memoryStorage = (() => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => store.delete(String(key)),
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
})();
globalThis.localStorage = memoryStorage;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const budgetSymbol = (budget) =>
  budget === 'Budget' ? '৳' : budget === 'Mid-range' ? '৳৳' : budget === 'Premium' ? '৳৳৳' : '৳৳৳৳';

/** Same rewrite the app's ImageProvider applies (width segment on Google URLs). */
function photoAtWidth(url, width) {
  if (!url) return '';
  const m = url.match(/(=w(\d+))(-h(\d+))?(-k-no)/i);
  if (m) {
    const w = Number(m[2]);
    const h = m[4] ? Number(m[4]) : 0;
    if (w > 0 && h > 0) {
      const newH = Math.max(1, Math.round((h * width) / w));
      return url.replace(m[1], `=w${width}`).replace(m[3] ?? '', `-h${newH}`);
    }
    return url.replace(m[1], `=w${width}`);
  }
  return `${url}=w${width}`;
}

/** React SSR render of the app for one URL, resolved on `onAllReady`. */
function renderToStringAsync(node) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };
    let stream;
    try {
      stream = renderToPipeableStream(node, {
        onAllReady() {
          let html = '';
          const writable = new Writable({
            write(chunk, _enc, cb) {
              html += chunk.toString();
              cb();
            },
            final() {
              finish(resolve, html);
            },
          });
          stream.pipe(writable);
        },
        onError(err) {
          finish(reject, err);
        },
      });
    } catch (err) {
      finish(reject, err);
      return;
    }
    setTimeout(() => {
      finish(reject, new Error(`render timed out after ${RENDER_TIMEOUT_MS}ms`));
      try {
        stream.abort();
      } catch {
        /* best effort */
      }
    }, RENDER_TIMEOUT_MS);
  });
}

/* ------------------------------------------------------------------ */
/* Data + routes                                                       */
/* ------------------------------------------------------------------ */

async function loadRestaurants(viteServer) {
  const mod = await viteServer.ssrLoadModule('/src/data/restaurants.ts');
  const list = mod?.restaurants ?? [];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('restaurants module exported no data');
  }
  return list;
}

function restaurantDescription(r) {
  const loc = r.location || 'Dhaka';
  const bits = [];
  if (r.address) bits.push(r.address);
  if (r.cuisines.length > 0) bits.push(r.cuisines.join(', '));
  if (r.budget) bits.push(`${budgetSymbol(r.budget)} ${r.budget}`);
  let desc = `Discover ${r.name} in ${loc}`;
  if (bits.length > 0) desc += ` — ${bits.join(' · ')}.`;
  if (r.google?.rating && r.google.reviewCount > 0) {
    desc += ` Rated ${r.google.rating} stars by ${r.google.reviewCount} Google reviewers.`;
  }
  return desc.slice(0, 320);
}

function restaurantJsonLd(r) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: r.name,
    url: `${CANONICAL_ORIGIN}/restaurant/${r.id}`,
  };
  const img = photoAtWidth(r.google?.photos?.[0]?.imageUrl ?? '', 1200);
  if (img) data.image = img;
  if (r.address || r.location) {
    data.address = {
      '@type': 'PostalAddress',
      ...(r.address ? { streetAddress: r.address } : {}),
      ...(r.location ? { addressLocality: r.location } : {}),
      addressCountry: 'BD',
    };
  }
  if (r.lat && r.lng) data.geo = { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng };
  if (Array.isArray(r.cuisines) && r.cuisines.length > 0) data.servesCuisine = r.cuisines;
  if (r.budget) data.priceRange = budgetSymbol(r.budget);
  if (r.google?.rating && r.google.reviewCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: r.google.rating,
      reviewCount: r.google.reviewCount,
      bestRating: 5,
    };
  }
  // Guard against `</script>` breaking out of the JSON-LD block.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function buildRoutes(restaurants) {
  return [
    {
      path: '/',
      title: 'Khabo Kothay BD · Discover where to eat in Dhaka',
      description:
        'Khabo Kothay BD — discover where to eat in Dhaka. Search restaurants by neighbourhood, budget, cuisine and meal type.',
    },
    {
      path: '/explore',
      title: 'Explore restaurants · Khabo Kothay BD',
      description:
        'Explore all restaurants in Dhaka — filter by neighbourhood, budget, cuisine, rating, meal type and more.',
    },
    ...restaurants.map((r) => ({
      path: `/restaurant/${r.id}`,
      title: `${r.name} · Khabo Kothay BD`,
      description: restaurantDescription(r),
      ogImage: photoAtWidth(r.google?.photos?.[0]?.imageUrl ?? '', 1200),
      jsonLd: restaurantJsonLd(r),
    })),
    ...[
      {
        path: '/about',
        title: 'About · Khabo Kothay BD',
        description: 'Khabo Kothay BD is a restaurant discovery guide for Dhaka — browse real restaurants by neighbourhood, cuisine and budget.',
      },
      {
        path: '/how-it-works',
        title: 'How it works · Khabo Kothay BD',
        description: 'Tell Khabo Kothay what you\'re craving, get transparent match scores with reasons, then pick, save and share.',
      },
      {
        path: '/faq',
        title: 'FAQ · Khabo Kothay BD',
        description: 'Frequently asked questions about Khabo Kothay BD — how recommendations work, where restaurant data comes from, and more.',
      },
      {
        path: '/terms',
        title: 'Terms of use · Khabo Kothay BD',
        description: 'General terms of use for the Khabo Kothay BD restaurant discovery website.',
      },
      {
        path: '/privacy',
        title: 'Privacy · Khabo Kothay BD',
        description: 'How Khabo Kothay BD handles data — local preferences, demo sign-in and third-party services.',
      },
      {
        path: '/contact',
        title: 'Contact & feedback · Khabo Kothay BD',
        description: 'Send feedback on a restaurant listing, or get in touch if you run a restaurant in Dhaka.',
      },
      {
        path: '/partners',
        title: 'Restaurant partners · Khabo Kothay BD',
        description: 'Restaurant partners — list your restaurant, update information, and understand how listings work on Khabo Kothay BD.',
      },
      {
        path: '/partners/list-your-restaurant',
        title: 'List your restaurant · Khabo Kothay BD',
        description: 'Get your restaurant listed on Khabo Kothay BD so Dhaka diners can discover it.',
      },
      {
        path: '/partners/update-information',
        title: 'Update restaurant information · Khabo Kothay BD',
        description: 'Request corrections to restaurant information on Khabo Kothay BD — hours, address, menus and more.',
      },
      {
        path: '/partners/how-listings-work',
        title: 'How listings work · Khabo Kothay BD',
        description: 'How restaurant listings are created and verified on Khabo Kothay BD, and how restaurants can request updates.',
      },
      {
        path: '/partners/enquiry',
        title: 'Restaurant enquiry · Khabo Kothay BD',
        description: 'Send your restaurant details or a correction request to the Khabo Kothay team for review.',
      },
    ],
  ];
}

/* ------------------------------------------------------------------ */
/* Head injection + file writing                                       */
/* ------------------------------------------------------------------ */

const HEAD_MARKER_START = '<!-- kk-prerender:head -->';
const HEAD_MARKER_END = '<!-- /kk-prerender:head -->';

function injectHead(html, route) {
  const canonical = `${CANONICAL_ORIGIN}${route.path === '/' ? '/' : route.path}`;
  const extras = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:site_name" content="Khabo Kothay BD" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    route.ogImage ? `<meta property="og:image" content="${escapeHtml(route.ogImage)}" />` : '',
    route.jsonLd ? `<script type="application/ld+json">${route.jsonLd}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ');

  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(route.title)}</title>`);
  out = out.replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${escapeHtml(route.description)}" />`);
  // Replace any block injected by a previous run (prevents accumulation).
  out = out.replace(new RegExp(`${HEAD_MARKER_START}[\\s\\S]*?${HEAD_MARKER_END}`), '');
  if (out.includes('</head>')) {
    out = out.replace('</head>', `${HEAD_MARKER_START}\n    ${extras}\n  ${HEAD_MARKER_END}\n  </head>`);
  }
  return out;
}

function writeRouteFiles(route, html) {
  if (route.path === '/') {
    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html, 'utf8');
    return;
  }
  const rel = route.path.slice(1); // e.g. "explore" | "restaurant/<id>"
  const dir = path.join(DIST_DIR, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  // Clean-URL fallback form ("/explore" → explore.html) for hosts that don't
  // resolve directory indexes.
  fs.writeFileSync(`${dir}.html`, html, 'utf8');
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const startedAt = Date.now();
  const only = (process.env.PRERENDER_ONLY ?? '').trim();

  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error(`dist/index.html not found — run \`vite build\` before prerendering.`);
  }

  // Start from a clean slate: drop stale prerendered route files from earlier
  // runs. `vite build` (which runs before this script) already emptied dist,
  // so this only matters when the script is re-run manually.
  for (const stale of ['restaurant', 'explore', 'partners']) {
    fs.rmSync(path.join(DIST_DIR, stale), { recursive: true, force: true });
  }
  fs.rmSync(path.join(DIST_DIR, 'explore.html'), { force: true });

  // dist/index.html must be the pristine Vite shell, not a previous run's
  // prerendered home page.
  const shell = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  if (!shell.includes('<div id="root"></div>')) {
    throw new Error(
      'dist/index.html is not the fresh Vite shell (it may be a previous prerender). Run `vite build` first.',
    );
  }
  const wrapBody = (body) => shell.replace('<div id="root"></div>', `<div id="root">${body}</div>`);

  // Ship the pristine SPA shell as well. Vercel serves it for authenticated
  // routes (/login, /favorites, /saved, /profile, /admin, /manage) so
  // crawlers and pre-hydration views never see the prerendered homepage on
  // those paths.
  fs.writeFileSync(path.join(DIST_DIR, 'shell.html'), shell, 'utf8');

  console.log('[prerender] loading active restaurant dataset…');
  const viteServer = await createViteServer({
    root: PROJECT_ROOT,
    logLevel: 'silent',
    server: { middlewareMode: true },
    appType: 'custom',
  });

  let done = 0;
  let fallbackWritten = 0;
  const failures = [];

  try {
    const restaurants = await loadRestaurants(viteServer);
    let routes = buildRoutes(restaurants);
    if (only) {
      routes = routes.filter((r) => only.split(',').some((p) => r.path === p.trim() || r.path.startsWith(p.trim())));
      console.log(`[prerender] PRERENDER_ONLY filter — ${routes.length} route(s)`);
    } else {
      console.log(`[prerender] ${restaurants.length} restaurants → ${routes.length} public routes to prerender`);
    }

    const { renderApp } = await viteServer.ssrLoadModule('/src/server-entry.tsx');

    for (const route of routes) {
      let html = null;
      const attemptErrors = [];
      for (let attempt = 1; attempt <= MAX_ATTEMPTS && !html; attempt++) {
        try {
          const body = await renderToStringAsync(renderApp(route.path));
          html = injectHead(wrapBody(body), route);
        } catch (err) {
          attemptErrors.push(String(err?.message ?? err));
        }
      }
      if (html) {
        writeRouteFiles(route, html);
        done++;
        if (done % 25 === 0 || done === routes.length) {
          console.log(`[prerender] ${done}/${routes.length} routes rendered (${Math.round((Date.now() - startedAt) / 1000)}s)`);
        }
      } else {
        // Render failed after retries — ship the generic SPA shell for that
        // path (graceful degradation) and flag it below.
        writeRouteFiles(route, injectHead(shell, route));
        fallbackWritten++;
        console.warn(`[prerender] ✗ ${route.path} failed after ${MAX_ATTEMPTS} attempts — ${attemptErrors.join(' | ')}`);
        failures.push({ path: route.path, error: attemptErrors.join(' | ') });
      }
    }

    // Lightweight build identity so a deployed build can be traced back to
    // its timestamp/commit. Pure metadata — no runtime dependency.
    const gitSha = (() => {
      try {
        const rev = fs.readFileSync(path.join(PROJECT_ROOT, '.git', 'HEAD'), 'utf8').trim();
        if (rev.startsWith('ref: ')) {
          const ref = rev.slice(5).trim();
          return fs.readFileSync(path.join(PROJECT_ROOT, '.git', ref), 'utf8').trim().slice(0, 12);
        }
        return rev.slice(0, 12);
      } catch {
        return 'unavailable';
      }
    })();
    fs.writeFileSync(
      path.join(DIST_DIR, 'build-info.json'),
      JSON.stringify(
        {
          app: 'khabo-kothay-bd',
          environment: 'production',
          buildTime: new Date().toISOString(),
          gitCommit: gitSha,
          restaurants: restaurants.length,
          routesPrerendered: done,
          routesFallback: fallbackWritten,
        },
        null,
        2,
      ),
      'utf8',
    );
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(`[prerender] done in ${elapsed}s — ${done} prerendered, ${fallbackWritten} fallback, ${failures.length} failed`);

    // Fail the build on real render failures so a blocking issue is visible
    // instead of silently shipping shell-only pages.
    if (failures.length > 0) {
      console.error('[prerender] FAILED routes:');
      for (const f of failures) console.error(`  - ${f.path}: ${f.error}`);
      throw new Error(`${failures.length} route(s) failed to prerender`);
    }
  } finally {
    await viteServer.close().catch(() => {});
  }
}

if (process.env.PRERENDER_SKIP) {
  console.log('[prerender] PRERENDER_SKIP set — skipping');
  process.exit(0);
}

main().catch((err) => {
  console.error('[prerender] fatal:', err?.message ?? err);
  process.exit(1);
});
