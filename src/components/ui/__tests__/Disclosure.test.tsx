import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Disclosure from '../Disclosure';

/**
 * `Disclosure` is a wiring component, and every defect it was built to fix
 * was in an attribute rather than in a pixel: three of the four disclosures
 * it replaces carried `aria-expanded` with no `aria-controls`, and the FAQ
 * marked a collapsed panel `aria-hidden` while leaving it reachable by
 * keyboard. So these tests read attributes, which is exactly what
 * `renderToStaticMarkup` gives — no DOM, no test renderer, no dependency.
 * See `Field.test.tsx` for the same approach and the same reason.
 */

/**
 * The lookbehind is load-bearing, for the same reason it is in
 * `Field.test.tsx`: a bare `id="` also matches inside `aria-controls="…"`,
 * which silently reads the wrong attribute and passes.
 */
const attrOf = (html: string, attr: string) =>
  html.match(new RegExp(`(?<![\\w-])${attr}="([^"]*)"`))?.[1];

describe('Disclosure', () => {
  it('names the panel it controls, and the name matches the panel', () => {
    const html = renderToStaticMarkup(
      <Disclosure summary="Is Khabo Kothay free?">Yes.</Disclosure>,
    );
    const controls = attrOf(html, 'aria-controls');
    const panelId = attrOf(html, 'id');
    expect(controls).toBeTruthy();
    expect(controls).toBe(panelId);
  });

  it('reports collapsed state and removes the panel outright', () => {
    const html = renderToStaticMarkup(<Disclosure summary="Q">A</Disclosure>);
    expect(html).toContain('aria-expanded="false"');
    // `hidden` does three jobs in one attribute — out of the layout, out of
    // the tab order, out of the accessibility tree.
    expect(html).toContain('hidden=""');
  });

  it('reports expanded state and leaves the panel alone', () => {
    const html = renderToStaticMarkup(
      <Disclosure summary="Q" defaultOpen>
        A
      </Disclosure>,
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).not.toContain('hidden=""');
    expect(html).toContain('A');
  });

  it('uses inert, never aria-hidden, for a collapsed animated panel', () => {
    const html = renderToStaticMarkup(
      <Disclosure summary="Q" animate>
        A
      </Disclosure>,
    );
    expect(html).toContain('inert=""');
    // The bug this replaces: `aria-hidden` hides the panel from a screen
    // reader and still lets the keyboard walk into it.
    expect(html).not.toContain('aria-hidden="true"><div class="kk-disc__panel-inner"');
    expect(html).toContain('kk-disc__panel--animated');
    // Height is driven, not hidden — the panel must stay measurable.
    expect(html).toContain('height:0');
  });

  it('drops inert when the animated panel is open', () => {
    const html = renderToStaticMarkup(
      <Disclosure summary="Q" animate defaultOpen>
        A
      </Disclosure>,
    );
    expect(html).not.toContain('inert=""');
  });

  it('marks the trigger for the marker it renders, and hides the glyph', () => {
    const plus = renderToStaticMarkup(
      <Disclosure summary="Q" marker="plus">
        A
      </Disclosure>,
    );
    expect(plus).toContain('kk-disc__marker--plus');
    expect(plus).toContain('aria-hidden="true"');

    const none = renderToStaticMarkup(
      <Disclosure summary="Q" marker="none">
        A
      </Disclosure>,
    );
    expect(none).not.toContain('kk-disc__marker');
  });

  it('wraps the trigger in the heading level it is given, and only then', () => {
    const h3 = renderToStaticMarkup(
      <Disclosure summary="Q" headingLevel={3}>
        A
      </Disclosure>,
    );
    expect(h3).toContain('<h3 class="kk-disc__heading">');
    expect(h3).toContain('</h3>');

    const bare = renderToStaticMarkup(<Disclosure summary="Q">A</Disclosure>);
    expect(bare).not.toContain('kk-disc__heading');
  });

  it('renders the aside beside the trigger and outside it', () => {
    const html = renderToStaticMarkup(
      <Disclosure summary="Advanced" aside={<span data-x="chips">2 selected</span>}>
        A
      </Disclosure>,
    );
    expect(html).toContain('kk-disc__head');
    // Outside, so it cannot be folded into the button's accessible name.
    const buttonEnd = html.indexOf('</button>');
    expect(buttonEnd).toBeGreaterThan(-1);
    expect(html.indexOf('data-x="chips"')).toBeGreaterThan(buttonEnd);
  });

  it('omits the head wrapper when there is no aside to place', () => {
    const html = renderToStaticMarkup(<Disclosure summary="Q">A</Disclosure>);
    expect(html).not.toContain('kk-disc__head');
  });

  it('obeys the controlled prop rather than its own state', () => {
    const open = renderToStaticMarkup(
      <Disclosure summary="Q" open defaultOpen={false}>
        A
      </Disclosure>,
    );
    expect(open).toContain('aria-expanded="true"');

    // `defaultOpen` must lose to an explicit `open={false}`, or an accordion
    // that allows one row at a time could render two rows open.
    const shut = renderToStaticMarkup(
      <Disclosure summary="Q" open={false} defaultOpen>
        A
      </Disclosure>,
    );
    expect(shut).toContain('aria-expanded="false"');
  });

  it('carries variant, ground and caller classes without dropping any', () => {
    const html = renderToStaticMarkup(
      <Disclosure
        summary="Q"
        variant="row"
        ground="ink"
        defaultOpen
        className="principle"
        triggerClassName="t-extra"
        panelClassName="principle__panel"
      >
        A
      </Disclosure>,
    );
    for (const cls of [
      'kk-disc',
      'kk-disc--row',
      'kk-disc--ink',
      'kk-disc--open',
      'principle',
      'kk-disc__trigger',
      't-extra',
      'kk-disc__panel',
      'principle__panel',
    ]) {
      expect(html).toContain(cls);
    }
  });

  it('does not claim to be open on a paper card that is closed', () => {
    const html = renderToStaticMarkup(
      <Disclosure summary="Q" variant="card">
        A
      </Disclosure>,
    );
    expect(html).toContain('kk-disc--card');
    expect(html).not.toContain('kk-disc--open');
  });
});
