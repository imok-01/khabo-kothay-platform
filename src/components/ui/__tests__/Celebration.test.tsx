import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Celebration from '../Celebration';

/**
 * `Celebration` portals to `document.body`, which makes it the one primitive
 * that could take the prerender down: `scripts/prerender.mjs` renders all 219
 * routes through `react-dom/server`, and `createPortal` is not supported
 * there — it throws rather than degrading. The component guards on
 * `typeof document`, and this file is what keeps that guard from being
 * "cleaned up" by someone who cannot see what it is holding back.
 *
 * The test environment is `node` with no jsdom (see `Field.test.tsx`), so
 * `document` really is undefined here — the same condition the prerender runs
 * under. That is why these assertions are about *absence*: the flourish's own
 * behaviour is timing and keyframes, neither of which exists in static markup,
 * and both were verified in the preview pane instead. The reduced-motion
 * branch was verified live there too, which is the branch that actually ships
 * to the pane's `prefers-reduced-motion: reduce`.
 */

const noop = () => {};

describe('Celebration', () => {
  it('renders nothing without a document, so the prerender survives it', () => {
    const html = renderToStaticMarkup(
      <Celebration amount={10} headline="Reward claimed" onDone={noop} />,
    );
    expect(html).toBe('');
  });

  it('stays silent on a server render even with a caption and a custom mark', () => {
    const html = renderToStaticMarkup(
      <Celebration
        headline="Coupon unlocked"
        caption="Free Beverage · KKFREE-XTQE"
        icon={<svg />}
        announce={false}
        onDone={noop}
      />,
    );
    expect(html).toBe('');
  });
});
