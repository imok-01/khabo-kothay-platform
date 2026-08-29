import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Dialog from '../Dialog';

/**
 * `Dialog` is the one primitive with a dependency behind it, so these tests
 * have two jobs: the usual one of pinning the wiring the ten hand-rolled
 * modals got wrong, and a second one of pinning what Radix must *not* do to
 * the prerender. `scripts/prerender.mjs` renders every route to static HTML;
 * a dialog that emitted markup while closed would ship 219 files carrying a
 * hidden panel each.
 *
 * What cannot be tested here, and why: `aria-labelledby` is emitted by Radix
 * only once `Title` has registered itself, and it registers in a
 * `useLayoutEffect` — which never runs under `renderToStaticMarkup`. The
 * attribute is therefore correct in the browser and absent from every
 * assertion below. It was verified in the preview pane instead.
 *
 * One more thing every assertion below silently rests on: in the browser this
 * tree is portalled to `document.body`, and `createPortal` throws under
 * `react-dom/server`. The `typeof document === 'undefined'` branch in
 * `Dialog.tsx` is what keeps both the prerender and this file working — see the
 * first test.
 *
 * See `Field.test.tsx` for why there is no DOM here at all.
 */

/**
 * The lookbehind is load-bearing, for the same reason it is in
 * `Field.test.tsx` and `Disclosure.test.tsx`: a bare `id="` also matches
 * inside `aria-labelledby="…"`, which silently reads the wrong attribute and
 * passes.
 */
const attrOf = (html: string, attr: string) =>
  html.match(new RegExp(`(?<![\\w-])${attr}="([^"]*)"`))?.[1];

const noop = () => {};

describe('Dialog', () => {
  it('renders in place on the server, so the portal cannot take the prerender down', () => {
    // The browser branch portals to `document.body` — the only escape from
    // `<main>`'s permanent stacking context, which pinned the scrim under the
    // z-50 header at any z-index. `createPortal` does not degrade under
    // `react-dom/server`, it throws, and `scripts/prerender.mjs` renders 219
    // routes through it. This guard is also why there is anything left for the
    // rest of this file to read.
    expect(() =>
      renderToStaticMarkup(
        <Dialog open onClose={noop} title="Compare places">
          <p>Body</p>
        </Dialog>,
      ),
    ).not.toThrow();
  });

  it('emits nothing at all while closed, so the prerender stays clean', () => {
    const html = renderToStaticMarkup(
      <Dialog open={false} onClose={noop} title="Compare places">
        <p>Body</p>
      </Dialog>,
    );
    expect(html).toBe('');
  });

  it('renders the scrim before the panel, because the scroll lock rides on it', () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={noop} title="T">
        <p>Body</p>
      </Dialog>,
    );
    expect(html.indexOf('kk-dialog__scrim')).toBeGreaterThan(-1);
    expect(html.indexOf('kk-dialog__scrim')).toBeLessThan(html.indexOf('kk-dialog__panel'));
  });

  it('gives the panel a dialog role and a focusable box', () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={noop} title="T">
        <p>Body</p>
      </Dialog>,
    );
    expect(html).toContain('role="dialog"');
    // The panel itself must be focusable, or the trap has nowhere to land
    // when a dialog opens with no focusable child.
    expect(html).toContain('tabindex="-1"');
  });

  it('renders the title as one h2 at the dialog size, never a page heading', () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={noop} title="Redeem Free dessert?">
        <p>Body</p>
      </Dialog>,
    );
    // Two of the four migrated dialogs were a bare `<h2>` inheriting
    // `--fs-h2` — up to 40px of page lettering inside a 520px box.
    expect(html).toContain('class="kk-dialog__title"');
    expect(html).toMatch(/<h2 id="[^"]+" class="kk-dialog__title">Redeem Free dessert\?<\/h2>/);
  });

  it('walks the width ladder by class, not by inline style', () => {
    for (const [size, cls] of [
      ['sm', 'kk-dialog__panel--sm'],
      ['md', 'kk-dialog__panel--md'],
      ['lg', 'kk-dialog__panel--lg'],
    ] as const) {
      const html = renderToStaticMarkup(
        <Dialog open onClose={noop} title="T" size={size}>
          <p>Body</p>
        </Dialog>,
      );
      expect(html).toContain(cls);
      // Paint lives in primitives.css §8. A width in a `style` attribute here
      // would be a second place to change it.
      expect(html).not.toContain('--kk-dialog-w');
    }
  });

  it('defaults to md so a caller that names no size still gets one', () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={noop} title="T">
        <p>Body</p>
      </Dialog>,
    );
    expect(html).toContain('kk-dialog__panel--md');
  });

  it('fills every panel slot it is given, in reading order', () => {
    const html = renderToStaticMarkup(
      <Dialog
        open
        onClose={noop}
        eyebrow="Price intelligence"
        title="Kacchi Biryani"
        description="Six months of recorded prices."
        toolbar={<i data-x="range" />}
        footer={<b data-x="actions" />}
      >
        <p data-x="body">Body</p>
      </Dialog>,
    );
    const order = [
      'kk-dialog__eyebrow',
      'kk-dialog__title',
      'kk-dialog__desc',
      'kk-dialog__toolbar',
      'kk-dialog__body',
      'kk-dialog__foot',
    ].map((cls) => html.indexOf(cls));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('omits the slots it is not given rather than rendering empty boxes', () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={noop} title="T">
        <p>Body</p>
      </Dialog>,
    );
    for (const cls of ['kk-dialog__eyebrow', 'kk-dialog__desc', 'kk-dialog__toolbar', 'kk-dialog__foot']) {
      expect(html).not.toContain(cls);
    }
    // An empty `__foot` would still paint its border-top.
    expect(html).toContain('kk-dialog__body');
  });

  it('carries a named close button, and drops it on request', () => {
    const named = renderToStaticMarkup(
      <Dialog open onClose={noop} title="T" closeLabel="Close price history">
        <p>Body</p>
      </Dialog>,
    );
    expect(named).toContain('kk-dialog__close');
    expect(attrOf(named, 'aria-label')).toBe('Close price history');
    // The close button is an `IconButton`, so it inherits one focus ring and
    // one hit area rather than a fifth hand-written × .
    expect(named).toContain('kk-ib');

    const bare = renderToStaticMarkup(
      <Dialog open onClose={noop} title="T" showClose={false}>
        <p>Body</p>
      </Dialog>,
    );
    expect(bare).not.toContain('kk-dialog__close');
  });

  it('swaps both grounds for the photo viewer and keeps no panel chrome', () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={noop} variant="media" title="Sultan's Dine photo gallery">
        <img alt="" data-x="photo" />
      </Dialog>,
    );
    expect(html).toContain('kk-dialog__scrim kk-dialog__scrim--media');
    expect(html).toContain('kk-dialog__panel--media');
    // The size ladder is a panel concept; the media box fills the viewport.
    expect(html).not.toContain('kk-dialog__panel--md');
    for (const cls of ['kk-dialog__head', 'kk-dialog__body', 'kk-dialog__close']) {
      expect(html).not.toContain(cls);
    }
  });

  it('still names the media viewer, invisibly', () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={noop} variant="media" title="Sultan's Dine photo gallery">
        <img alt="" />
      </Dialog>,
    );
    // A photo viewer has no visible heading, which is exactly why it needs
    // this one — the title is the dialog's accessible name.
    expect(html).toContain('class="sr-only"');
    expect(html).toContain("Sultan&#x27;s Dine photo gallery");
  });

  it('adds no appearance of its own in the bare variant', () => {
    const html = renderToStaticMarkup(
      <Dialog
        open
        onClose={noop}
        variant="bare"
        title="Menu"
        overlayClassName="nav__drawer-backdrop"
        className="nav__mobile"
      >
        <p data-x="links">Links</p>
      </Dialog>,
    );
    // The nav drawer keeps its own z 70/71 presentation and takes only the
    // behaviour — a focus trap, Escape, one scroll lock, focus returned.
    expect(html).not.toContain('kk-dialog');
    expect(html).toContain('class="nav__drawer-backdrop"');
    expect(html).toContain('class="nav__mobile"');
    // Behaviour still arrives: role, focusable box, accessible name.
    expect(html).toContain('role="dialog"');
    expect(html).toContain('class="sr-only"');
  });

  it('appends caller classes to the primitive ones without replacing them', () => {
    const html = renderToStaticMarkup(
      <Dialog
        open
        onClose={noop}
        title="T"
        size="lg"
        className="compare-dialog"
        overlayClassName="compare-scrim"
        bodyClassName="pref-picker__body"
      >
        <p>Body</p>
      </Dialog>,
    );
    expect(html).toContain('kk-dialog__panel kk-dialog__panel--lg compare-dialog');
    expect(html).toContain('kk-dialog__scrim compare-scrim');
    expect(html).toContain('kk-dialog__body pref-picker__body');
  });
});
