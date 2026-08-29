import { useCallback, useRef } from 'react';

/* A wheel notch reports its travel in one of three units, and only one of
   them is pixels. Firefox on Windows sends lines; a genuine page-scroll
   device sends pages. 16 is the line height every implementation of this
   settles on — it is not the row's line height, it is the unit the event
   was quantised with. A page is deliberately not a full width: the same
   90% a page-down leaves behind, so the card you were looking at is still
   on screen to anchor the jump. */
const LINE = 16;
const PAGE_FRACTION = 0.9;

/* How much of the remaining distance the row closes each frame. 0.18 is a
   ~14-frame settle from a single notch: long enough that a notched wheel
   glides instead of stepping, short enough that a second notch feels like
   it landed on the first rather than queueing behind it. */
const GLIDE = 0.18;

/* Below half a pixel there is nothing left to paint, and `scrollLeft`
   rounds anyway — carrying the frame loop past this only burns rAF. */
const SETTLED = 0.5;

/* Sub-pixel layout means a row with nowhere to go can still report a
   fraction of a pixel of room, and a scroller one fraction from its end is
   at its end as far as the reader is concerned. Both are the same
   tolerance: the first stops us claiming a wheel event we cannot use, the
   second is what makes the last notch fall through to the page instead of
   dying in a dead zone. */
const EDGE = 1;

/** The parts of a `wheel` event this decision actually depends on. */
export type WheelSample = {
  deltaX: number;
  deltaY: number;
  /** `WheelEvent.DOM_DELTA_PIXEL` (0), `_LINE` (1) or `_PAGE` (2). */
  deltaMode: number;
  /** A pinch-zoom arrives as ctrl+wheel and is never ours. */
  ctrlKey?: boolean;
};

/** Where the row is and how far it can go, in CSS pixels. */
export type PanBox = {
  /** Current position — the *target* while a glide is running, not the
      lagging `scrollLeft`, or the last notch of a glide would read the
      middle of the row and swallow itself at the end. */
  at: number;
  /** `scrollWidth - clientWidth`. */
  max: number;
  clientWidth: number;
};

/**
 * How far a wheel event should move a horizontal row — `0` meaning "not
 * ours, let the page have it".
 *
 * Everything about this function is the anti-trap rule. A row that claims
 * every wheel event over it is a hole in the page: the reader arrives at
 * the end of ten cuisines and the document stops responding. So the row
 * only takes the event when it can actually act on it, and the moment it
 * cannot — no room, already at the end and asked for more, already at the
 * start and asked for less — the event is handed back untouched and the
 * page scrolls exactly as it would have if the cursor were an inch lower.
 *
 * A horizontally-dominant delta is also handed back, and that one is not a
 * compromise: a trackpad's two-finger sideways swipe is already a
 * first-class horizontal scroll that the browser applies to this scroller
 * natively, with its own momentum and rubber-banding. Intercepting it
 * would replace a real gesture with an imitation of one.
 */
export function resolveWheelPan(sample: WheelSample, box: PanBox): number {
  if (sample.ctrlKey) return 0;
  if (box.max <= EDGE) return 0;
  if (Math.abs(sample.deltaX) > Math.abs(sample.deltaY)) return 0;

  const unit =
    sample.deltaMode === 1 ? LINE : sample.deltaMode === 2 ? box.clientWidth * PAGE_FRACTION : 1;
  const delta = sample.deltaY * unit;
  if (delta === 0) return 0;

  if (delta > 0 && box.at >= box.max - EDGE) return 0;
  if (delta < 0 && box.at <= EDGE) return 0;

  /* Never overshoot the ends. Clamping the *result* rather than letting the
     scroller clamp it keeps `at` honest for the next event, which is what
     the edge tests above are reading. */
  const next = Math.min(box.max, Math.max(0, box.at + delta));
  return next - box.at;
}

/**
 * Turns vertical wheel travel over a horizontal row into horizontal
 * movement, and gets out of the way otherwise.
 *
 * Returns a ref callback. Attach it to the scroller itself — the listener
 * has to be non-passive to be allowed to decline the page scroll, which
 * React's `onWheel` cannot express, and React 19 lets a ref callback
 * return its own teardown.
 *
 * Nothing here runs on touch. A swipe emits no `wheel` event, so a phone
 * keeps the native `overflow-x` scroll it already had, complete with
 * momentum — the row was already swipeable and this does not touch that.
 * Vertical page scrolling on a phone is likewise untouched, because there
 * is nothing to intercept.
 *
 * The glide is the reason this is not two lines. A notched wheel delivers
 * 100-120px in a single event, and writing that straight to `scrollLeft`
 * steps the row like a slideshow; easing toward a target reads like the
 * momentum a trackpad would have given it. Under `prefers-reduced-motion`
 * the target is applied in the same frame instead, so the row still moves
 * — declining to animate is not declining to scroll.
 */
export function useWheelPan() {
  const frame = useRef(0);
  const target = useRef(0);
  const gliding = useRef(false);

  return useCallback((el: HTMLElement | null) => {
    if (!el) return;

    const stop = () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      gliding.current = false;
    };

    /* Proximity snapping and a wheel are not compatible, and the reason is
       not the glide it fights — it is that a snap container has positions it
       refuses to rest at. This row snaps its first card's edge to the
       content edge, so it rests 36px in and the 36px below that is a place
       the reader can be moved to but cannot stay. A wheel notch spent
       there is a notch that visibly does nothing and does not reach the
       page either: the dead zone the brief bans, sitting exactly where
       someone scrolling back up the page would find it.

       So the first notch this row claims turns snapping off and leaves it
       off. The row then rests wherever it was put, both ends become
       reachable, and the notch after the last one falls through to the
       page. Nothing restores it, on purpose — restoring re-snaps, and a
       re-snap is the same 36px jump arriving later. Touch never comes
       through here, so a phone keeps its snap points and the flick they
       are for. */
    const release = () => {
      if (el.style.scrollSnapType !== 'none') el.style.scrollSnapType = 'none';
    };

    const step = () => {
      const room = target.current - el.scrollLeft;
      if (Math.abs(room) < SETTLED) {
        el.scrollLeft = target.current;
        stop();
        return;
      }
      el.scrollLeft += room * GLIDE;
      frame.current = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      const max = el.scrollWidth - el.clientWidth;
      const at = gliding.current ? target.current : el.scrollLeft;
      const pan = resolveWheelPan(e, { at, max, clientWidth: el.clientWidth });
      if (pan === 0) {
        /* Handing the event back mid-glide would let the page scroll
           while the row was still moving. Park the row where it is. */
        if (gliding.current) {
          target.current = el.scrollLeft;
          stop();
        }
        return;
      }

      e.preventDefault();
      release();

      const instant =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (instant) {
        el.scrollLeft = at + pan;
        return;
      }

      target.current = at + pan;
      if (!gliding.current) {
        gliding.current = true;
        frame.current = requestAnimationFrame(step);
      }
    };

    /* A drag, a keyboard, a snap or a swipe all move the row without us,
       and a stale target would yank it back on the next notch. Reading
       `scrollLeft` fresh whenever we are not gliding is enough — this
       listener stays passive and does no work in the case that matters. */
    const onScroll = () => {
      if (!gliding.current) target.current = el.scrollLeft;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      stop();
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
    };
  }, []);
}
