/**
 * Did the pointer move, or did the page move under the pointer?
 *
 * The browser cannot tell you, but it dispatches boundary events for both.
 * Scroll a grid of cards under a stationary cursor and Chrome re-hit-tests
 * every frame, firing a stream of `pointerleave`/`pointerenter` pairs that are
 * indistinguishable — at the handler — from a user sweeping across the grid.
 * On the Explore results that stream was doing real work per event: a page
 * state change, a marker repaint across the whole map, and a fresh hover
 * animation on whichever card had just slid beneath the cursor. The scroll's
 * own frame budget paid for all of it, which is why scrolling felt worst
 * exactly when the cursor happened to be resting over the results.
 *
 * The discriminator is coordinates. Per the Pointer Events spec a real move
 * into a new element fires `pointerover`/`pointerenter` *before* the
 * `pointermove` that caused them, so at enter time the last recorded position
 * is still the previous one and the two differ. A scroll-induced enter carries
 * the last known pointer location unchanged — no `pointermove` was dispatched,
 * because the pointer did not move — so the coordinates match exactly.
 *
 * This is deliberately one-directional: only *entering* is gated. A
 * scroll-induced `pointerleave` is honest — the pointer really is no longer
 * over that card — and must always be honoured, or a card could be left stuck
 * in its hover state after scrolling away from it. Gating one side can only
 * ever remove motion during a scroll, never add it.
 */

/** Last position the pointer was actually observed at, in client coordinates. */
let lastX = Number.NaN;
let lastY = Number.NaN;
let installed = false;

function record(event: PointerEvent): void {
  lastX = event.clientX;
  lastY = event.clientY;
}

/**
 * One passive listener for the whole application, installed on first use so
 * that importing this module has no effect during SSR or prerender.
 *
 * `pointermove` is the recorder; `pointerdown` is there for the pointer that
 * appears without moving first — a stylus tap, or a mouse whose first event in
 * the document is a click.
 */
function install(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('pointermove', record, { passive: true });
  window.addEventListener('pointerdown', record, { passive: true });
}

/**
 * True when this boundary event was caused by the pointer moving, false when
 * the page moved under a stationary pointer.
 *
 * Read-only: the window listener above is the single writer, so calling this
 * from several cards in the same event loop gives all of them the same answer.
 *
 * The first call of a session returns true (nothing has been recorded yet),
 * which is correct — a first hover with no prior pointer history is a genuine
 * one. A caller that guesses wrong is self-healing: the accompanying
 * `pointermove` handler grants the hover on the next real movement, one frame
 * later at worst.
 */
export function isPointerMotion(event: { clientX: number; clientY: number }): boolean {
  install();
  return event.clientX !== lastX || event.clientY !== lastY;
}

/**
 * A single cached MediaQueryList, read at call time rather than subscribed to.
 *
 * A hook would be the idiomatic answer, but this is consulted by every card on
 * the page and a 200-card grid does not need 200 `matchMedia` subscriptions to
 * learn one fact. Reading `.matches` inside the pointer handler is both cheaper
 * and fresher: the value is sampled at the moment a spring is about to start.
 */
let reduceQuery: MediaQueryList | null = null;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  if (!reduceQuery) reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return reduceQuery.matches;
}
