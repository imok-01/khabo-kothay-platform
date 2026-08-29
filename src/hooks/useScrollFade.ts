import { useCallback } from 'react';
import type { UIEvent } from 'react';

/* How far the fade reaches once it is fully in. A little over half a 40px
   dropdown row: enough that the row at the edge reads as cut off rather than as
   dimmed, not so much that the row above it loses its label. Whatever uses this
   should mirror it in `scroll-padding-block`, so a row the keyboard scrolls to
   never lands under the fade. */
const BAND = 26;

/**
 * Two lengths saying how far a scrolling box has travelled from each of its own
 * ends, for CSS to fade with.
 *
 * The signal is the whole point. A list cut off by a hard edge has already told
 * the reader everything except the one thing they need — whether there is more
 * of it, and in which direction. Both ends ramp in over the first `band` pixels
 * of travel rather than switching on, so a list at rest has a genuinely sharp
 * top edge and the softness only ever means "you have scrolled past something".
 *
 * No state, no re-render: this writes two custom properties on the node itself.
 * Lifting the two numbers into React state instead would re-render all 23 rows
 * of a cuisine list on every scroll frame to move two gradient stops.
 *
 * A box that cannot scroll gets no fade at all. `scrollHeight` and
 * `clientHeight` can sit a fraction apart on a sub-pixel layout, and a
 * permanent 1px veil over a five-item menu is a defect that is very hard to
 * notice and impossible to stop noticing.
 */
export function useScrollFade(band = BAND) {
  const measure = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      const room = el.scrollHeight - el.clientHeight;
      const gone = room < 2 ? 0 : Math.min(el.scrollTop, band);
      const left = room < 2 ? 0 : Math.min(room - el.scrollTop, band);
      el.style.setProperty('--fade-t', `${Math.max(0, Math.round(gone))}px`);
      el.style.setProperty('--fade-b', `${Math.max(0, Math.round(left))}px`);
    },
    [band],
  );

  const onScroll = useCallback((e: UIEvent<HTMLElement>) => measure(e.currentTarget), [measure]);

  return { measure, onScroll };
}
