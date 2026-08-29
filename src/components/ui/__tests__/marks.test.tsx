import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BADGE_GOALS } from '../../../lib/profile';
import { BADGE_MARKS, badgeMark } from '../badgeMarks';
import { CoinMark } from '../marks';

/**
 * The marks are drawings, so most of what matters about them was measured in
 * the preview pane rather than asserted here. Three things are not visual and
 * would fail silently, which is what this file holds:
 *
 * 1. Every badge the platform can award has its own mark. The whole reason the
 *    marks exist is that seven achievements shared one glyph; adding an eighth
 *    badge to `BADGE_GOALS` without a mark would quietly reinstate that — the
 *    fallback means it renders, it just renders as everyone else's spare.
 * 2. No two badges share a silhouette. The head band overlaps its pips by 5px
 *    at 18px, where two identical marks read as one wide smudge.
 * 3. `CoinMark` carries `kk-coin`, which is the hook primitives.css §12 uses to
 *    state the coin's own ink. Two of its call sites set `color: #fff` for the
 *    stroke glyph they used to hold, and a white coin's knockouts are white on
 *    white — so losing that class does not make the coin the wrong colour, it
 *    makes it a plain disc with nothing struck into it.
 */

describe('badgeMark', () => {
  it('gives every awardable badge its own mark', () => {
    for (const goal of BADGE_GOALS) {
      expect(BADGE_MARKS[goal.id], `${goal.id} has no mark`).toBeTruthy();
    }
  });

  it('draws no two badges the same', () => {
    const marks = BADGE_GOALS.map((g) => badgeMark(g.id));
    expect(new Set(marks).size).toBe(BADGE_GOALS.length);
  });

  it('falls back rather than throwing on a badge stored by an older release', () => {
    expect(badgeMark('badge-from-2025')).toBeTruthy();
    expect(badgeMark('badge-from-2025')).not.toBe(badgeMark('badge-first-review'));
  });
});

describe('CoinMark', () => {
  it('carries the class its ink comes from, and keeps any class given to it', () => {
    expect(renderToStaticMarkup(<CoinMark />)).toContain('class="kk-coin"');
    expect(renderToStaticMarkup(<CoinMark className="wallet-hero__coin" />))
      .toContain('class="kk-coin wallet-hero__coin"');
  });

  it('is decoration: hidden from the accessibility tree at every size', () => {
    const html = renderToStaticMarkup(<CoinMark size={14} />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('width="14"');
    // The face is drawn on Lucide's grid, so it sits beside a Lucide glyph.
    expect(html).toContain('viewBox="0 0 24 24"');
  });

  /**
   * The milling and the rim line are sub-pixel below 18px, where they stop being
   * detail and become a grey fuzz around the edge. Both sizes are asserted
   * because the small branch is the one a reader is most likely to "simplify"
   * away, and the large one is the whole reason the coin looks struck.
   */
  it('drops the milling below the size it can resolve at, and strikes the face larger instead', () => {
    const small = renderToStaticMarkup(<CoinMark size={15} />);
    expect(small).not.toContain('stroke-dasharray');
    expect(small).toContain('scale(1.18)');

    const large = renderToStaticMarkup(<CoinMark size={24} />);
    expect(large).toContain('stroke-dasharray');
    expect(large).toContain('scale(1.02)');
  });
});
