/**
 * Build-time prerender flag.
 *
 * scripts/prerender.mjs renders the app server-side with
 * `renderToPipeableStream` to produce the static HTML for public routes. It
 * sets `globalThis.__PRERENDER__ = true` first. During that server render:
 *
 *  - `useRestaurants`/`useRestaurant` seed their state synchronously from the
 *    dataset instead of starting in the "loading" state (effects never run
 *    server-side, so the loading state would otherwise be baked into the HTML);
 *  - `AuthProvider` starts "ready" so the full app tree renders instead of the
 *    loader splash.
 *
 * In the browser the flag is never set, so all existing async/loading
 * behaviour is untouched — this only affects the static build output.
 */
export const isPrerender = (): boolean =>
  typeof globalThis !== 'undefined' && Boolean((globalThis as { __PRERENDER__?: boolean }).__PRERENDER__);
