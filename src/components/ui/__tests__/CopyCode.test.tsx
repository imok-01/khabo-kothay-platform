import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CopyCode from '../CopyCode';

/**
 * `CopyCode` is the primitive for the three codes the product asks people to
 * take somewhere else — a redeemed reward's code, the coupon stub's code, and
 * a diner's referral code. All three shipped as plain text.
 *
 * The environment is `node` with no jsdom (see `Field.test.tsx`), so what is
 * assertable here is the markup contract: the value is rendered as text, the
 * button has a name, and the variant/size axes resolve to classes rather than
 * to inline style. The clipboard itself is not testable here at all — there is
 * no `navigator`, and the three tiers (`clipboard.writeText`, the
 * `execCommand` fallback for the non-secure LAN case, then selecting the text
 * and saying so) were verified in the preview pane.
 *
 * The one behaviour worth stating in a comment because no test can see it: the
 * check mark is only shown after a write actually resolved. A copy button that
 * confirms unconditionally is worse than no button, because the person walks
 * away from a coupon code they do not have.
 */

const attrOf = (html: string, attr: string) =>
  html.match(new RegExp(`(?<![\\w-])${attr}="([^"]*)"`))?.[1];

describe('CopyCode', () => {
  it('renders the code as text, so it is still readable and selectable', () => {
    const html = renderToStaticMarkup(<CopyCode value="KKFREE-XTQE" />);
    expect(html).toContain('KKFREE-XTQE');
    expect(html).toContain('kk-code__value');
  });

  it('names the button after the code it copies, not just "Copy"', () => {
    const html = renderToStaticMarkup(<CopyCode value="ANANYA-FOODIE" />);
    // A page with three codes on it gives a screen-reader user three buttons
    // called "Copy" unless the name carries the value.
    expect(attrOf(html, 'aria-label')).toBe('Copy code ANANYA-FOODIE');
    // And the caller can override it where the surrounding words matter.
    const custom = renderToStaticMarkup(
      <CopyCode value="ANANYA-FOODIE" label="Copy your referral code" />,
    );
    expect(attrOf(custom, 'aria-label')).toBe('Copy your referral code');
  });

  it('borrows the icon button, so the 44px target and focus ring arrive with it', () => {
    const html = renderToStaticMarkup(<CopyCode value="KK-1" />);
    expect(html).toContain('kk-ib');
    expect(html).toContain('type="button"');
  });

  it('starts silent — the live region says nothing until something happened', () => {
    const html = renderToStaticMarkup(<CopyCode value="KK-1" />);
    expect(html).toContain('role="status"');
    // An announcement rendered at rest would be read out on page load, and
    // would claim a copy that has not happened.
    expect(html).not.toContain('copied');
  });

  it('carries its state on a data attribute rather than a class', () => {
    // Same rule as `Disclosure`'s `aria-expanded`: a class can disagree with
    // the component's state, an attribute written from it cannot.
    expect(renderToStaticMarkup(<CopyCode value="KK-1" />)).toContain('data-state="idle"');
  });

  it('walks both axes by class, with plate as the default', () => {
    const plate = renderToStaticMarkup(<CopyCode value="KK-1" />);
    expect(plate).toContain('kk-code--plate');
    expect(plate).toContain('kk-code--md');

    const inline = renderToStaticMarkup(<CopyCode value="KK-1" variant="inline" size="sm" />);
    expect(inline).toContain('kk-code--inline');
    expect(inline).toContain('kk-code--sm');
    // The stub it is built for already has a ground; a plate there would be a
    // box inside a box.
    expect(inline).not.toContain('kk-code--plate');
  });

  it('appends a caller class without dropping the primitive ones', () => {
    const html = renderToStaticMarkup(<CopyCode value="KK-1" className="reward-card__code" />);
    expect(html).toContain('kk-code kk-code--plate kk-code--md reward-card__code');
  });
});
