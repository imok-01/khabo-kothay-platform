import { useEffect, useRef } from 'react';

/**
 * useReveal — the hook the `[data-reveal]` contract has been waiting for.
 *
 * `design-system.css` has carried the whole scroll-reveal system since
 * Phase A: a `pending` state, a `shown` state, a `--reveal-delay` for
 * stagger, a `prefers-reduced-motion` opt-out, and — the load-bearing
 * part — content that is **visible by default**, so nothing can ever be
 * trapped hidden. What it never had was the twenty lines that flip the
 * attribute. Until now the product's entire scroll behaviour was: nothing
 * happens.
 *
 * Four decisions are worth the reader's time.
 *
 * **The attribute is never rendered, only set.** If `data-reveal="pending"`
 * appeared in JSX it would ship inside all 219 prerendered documents, and a
 * reader with JS off — or with a failed chunk, or a browser without
 * `IntersectionObserver` — would get a page of invisible sections. The hook
 * writes the attribute from the browser and only from the browser, which is
 * what makes "visible by default" true rather than aspirational.
 *
 * **Below the fold only** (§5 rule 6, and it is not just taste). Because the
 * attribute is set in an effect, it lands *after* first paint. An element that
 * is already on screen would therefore be painted, then hidden, then faded
 * back in — a flash, on the content the reader is currently looking at. So
 * anything whose top edge is above the fold when it is measured is left alone
 * entirely: no attribute, no observer, no cost. It also happens to be the rule
 * the direction doc already wanted — "the page is *there* when you arrive; it
 * does not assemble itself for you."
 *
 * **Measured more than once.** The fold test above is worthless if it only
 * runs at mount, because at mount the page is a stack of skeletons: the
 * homepage was a third of its final height, so four of its nine bands counted
 * as on-screen and then slid thousands of pixels down as their data arrived,
 * arriving with no reveal. A `ResizeObserver` on the root re-runs the same test
 * as the page grows. The rule does not bend — a node still only becomes
 * `pending` while it is below the fold — it is simply applied when the answer
 * is true rather than when it is convenient.
 *
 * **One observer for the whole page, not one per section.** The hook takes a
 * `targets` selector and reveals descendants, so a page wires this once
 * (`useReveal({ targets: '.band__inner' })`) instead of threading a ref
 * through thirteen sections. That also keeps the reveal decision in one place
 * per page rather than scattered across its JSX.
 *
 * **Stagger is grouped by parent, and capped.** Delay is `index × 40ms`
 * within each parent, clamped at 8 steps — §5 rule 4, because past ~320ms the
 * last card arrives late enough to read as a bug rather than as choreography.
 * Grouping by parent is what makes a split layout behave: the homepage's
 * recommendation spread is one lead card plus a `.spread__rest` column, and
 * without grouping the column would start its count at 1 and inherit the
 * lead's offset for no reason.
 *
 * Reveal is **one-shot**. Each target is unobserved the moment it shows, and
 * nothing ever re-hides — a section that fades out again on the way back up is
 * the single most common way this effect turns from premium into cheap.
 *
 * docs/KK_VISUAL_DIRECTION.md §5; the CSS is design-system.css's scroll-reveal
 * block.
 */

/** §5 rule 4: stagger caps at 8 steps of 40ms. */
const STAGGER_STEP_MS = 40;
const STAGGER_CAP = 8;

/**
 * The trigger line sits 12% of the viewport above its bottom edge, so a
 * section starts arriving once it is properly on screen rather than the
 * instant its first pixel clears — which reads as arriving late, because the
 * 680ms rise is still running when the reader has already reached it.
 */
const ROOT_MARGIN = '0px 0px -12% 0px';

export interface RevealOptions {
  /**
   * Selector for the descendants to reveal individually. Omit to reveal the
   * referenced element itself as one block.
   */
  targets?: string;
  /**
   * Give matched targets sharing a parent an increasing `--reveal-delay`.
   * For card grids and rails; wrong for sections, which should each answer
   * their own scroll position.
   */
  stagger?: boolean;
  /** Skip entirely — for a caller whose content is static in some states. */
  disabled?: boolean;
}

export function useReveal<T extends HTMLElement = HTMLElement>(options: RevealOptions = {}) {
  const { targets, stagger = false, disabled = false } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (disabled || !root) return;
    // Feature-detected rather than assumed: without the observer there is no
    // way to ever flip `pending` back off, so the correct behaviour is to
    // leave every target visible and do nothing at all.
    if (typeof IntersectionObserver === 'undefined') return;
    // Checked here as well as in CSS. The stylesheet's opt-out neutralises the
    // states, but returning early also skips the observer, the attribute
    // writes and the layout reads — reduced motion should cost less, not the
    // same amount with the movement subtracted.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const nodes = () => (targets ? Array.from(root.querySelectorAll<HTMLElement>(targets)) : [root]);
    const pending = new Set<HTMLElement>();
    const seen = new Map<Element, number>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const node = entry.target as HTMLElement;
          node.dataset.reveal = 'shown';
          // One-shot: stop watching immediately, so scrolling back up cannot
          // re-hide anything and the observer empties itself as the reader
          // works down the page.
          io.unobserve(node);
          pending.delete(node);
        }
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 },
    );

    /**
     * Tag every candidate that is currently below the fold and not already
     * accounted for. Run on mount and again whenever the page grows — see the
     * ResizeObserver below.
     */
    const scan = () => {
      const fold = window.innerHeight;
      for (const node of nodes()) {
        if (node.dataset.reveal !== undefined) continue;
        // A single layout read per candidate, before any attribute is written,
        // so the loop cannot thrash.
        if (node.getBoundingClientRect().top < fold) continue;
        if (stagger) {
          const parent = node.parentElement ?? root;
          const index = seen.get(parent) ?? 0;
          seen.set(parent, index + 1);
          node.style.setProperty(
            '--reveal-delay',
            `${Math.min(index, STAGGER_CAP) * STAGGER_STEP_MS}ms`,
          );
        }
        node.dataset.reveal = 'pending';
        pending.add(node);
        io.observe(node);
      }
    };

    scan();

    /**
     * A second scan, because the first one runs against a page that has not
     * finished loading. Measured on the homepage: at mount only 5 of its 9
     * bands were below the fold, because the async ones were still skeletons
     * and the document was a third of its eventual height. The other four then
     * slid thousands of pixels down as data arrived and appeared with no
     * reveal at all — so which sections got the effect depended on how tall
     * the loading state happened to be.
     *
     * Re-scanning on growth fixes that without weakening the flash rule: a
     * node only ever becomes `pending` while it is below the fold, which is
     * exactly the condition that makes hiding it unobservable. Tagging changes
     * `opacity` and `transform`, neither of which affects layout, so the
     * observer cannot feed itself.
     */
    let queued = 0;
    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            // Coalesced to one scan per frame: a page filling in fires this
            // once per image, card and band that lands.
            if (queued) return;
            queued = requestAnimationFrame(() => {
              queued = 0;
              scan();
            });
          });
    ro?.observe(root);

    return () => {
      io.disconnect();
      ro?.disconnect();
      if (queued) cancelAnimationFrame(queued);
      // Leave nothing hidden behind. A target still `pending` when its page
      // unmounts would be handed to the next render — React reuses DOM across
      // a route change on shared layout — with no observer left to show it.
      for (const node of pending) {
        delete node.dataset.reveal;
        node.style.removeProperty('--reveal-delay');
      }
    };
  }, [targets, stagger, disabled]);

  return ref;
}

export default useReveal;
