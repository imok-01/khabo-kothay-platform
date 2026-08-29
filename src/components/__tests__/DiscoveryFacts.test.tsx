import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DiscoveryFact, DiscoveryFactType } from '../../domain/discoveryFacts';
import DiscoveryFacts from '../DiscoveryFacts';
import { factKind } from '../discoveryFactKinds';
import { SPOTLIGHT_CARD_CLASS } from '../ui/SpotlightDeck';

/**
 * The dossier is a drawing and was measured in the preview pane. What is
 * asserted here is the part that is not visual and would fail silently:
 *
 * 1. Every fact type has a caption. A type added to `DiscoveryFactType` without
 *    one still renders — it renders as everyone else's "Worth knowing", which is
 *    the failure the map exists to prevent.
 * 2. A type the union has never heard of still renders its fact. The transformer
 *    casts `row.fact_type` with no validation, so the database can hand this
 *    component a string the frontend does not know; losing the fact over its
 *    label would be the wrong trade.
 * 3. The fact text is passed through verbatim. These sentences were approved one
 *    at a time against a named source, so nothing here may truncate, ellipsise
 *    or re-case them.
 * 4. Only the first entry is the lead. The lead is a font size, so a second one
 *    is not a visible error — it is two competing pull-quotes.
 * 5. Nothing renders for an empty list. The page's own `hasDiscoveryFacts` gate
 *    is not the only thing standing between no facts and an empty panel.
 * 6. It ships closed, and the closed control says how much is behind it. A
 *    disclosure whose label is just "Did you know?" is a door with nothing
 *    written on it, and the count is the only thing that makes the pill worth
 *    pressing — or worth skipping.
 * 7. Every card carries the class the deck queries for. This is the one
 *    contract between the section and `SpotlightDeck` that has no type: rename
 *    the card's own modifier and everything still renders, still passes tsc,
 *    and the animation is simply gone.
 *
 * The facts stay in the markup while closed — asserted below by rendering a
 * closed component and finding the text — because 219 routes are prerendered
 * and a panel that renders nothing until pressed would ship 219 documents with
 * the page's rarest content missing from them.
 */

const TYPES: DiscoveryFactType[] = [
  'HISTORY',
  'EXPERIENCE',
  'CONCEPT',
  'LOCATION',
  'IDENTITY',
  'OTHER',
];

function fact(over: Partial<DiscoveryFact> = {}): DiscoveryFact {
  return {
    id: 'fact-1',
    restaurantId: 'r-1',
    factText: 'Occupies the 14th floor of Tower B 11 on Banani Road 11.',
    factType: 'LOCATION',
    ...over,
  };
}

describe('factKind', () => {
  it('captions every fact type, and no two the same', () => {
    const labels = TYPES.map((t) => factKind(t).label);
    for (const [i, t] of TYPES.entries()) {
      expect(labels[i], `${t} has no caption`).toBeTruthy();
    }
    expect(new Set(labels).size).toBe(TYPES.length);
  });

  it('falls back rather than throwing on a type the union does not carry', () => {
    expect(factKind('MICHELIN').label).toBe(factKind('OTHER').label);
  });
});

describe('DiscoveryFacts', () => {
  it('renders nothing at all when there are no approved facts', () => {
    expect(renderToStaticMarkup(<DiscoveryFacts facts={[]} />)).toBe('');
  });

  it('carries each fact text through untouched, with its caption', () => {
    const long =
      'Meat Theory pairs a steakhouse menu — rib steak, picanha, tenderloin — with ' +
      'Korean-accented items such as cheese buldak and gochujang rice, and finishes ' +
      'several cuts on a tabletop griddle pan.';
    const html = renderToStaticMarkup(
      <DiscoveryFacts facts={[fact({ factText: long, factType: 'IDENTITY' })]} />,
    );
    expect(html).toContain(long);
    expect(html).toContain(factKind('IDENTITY').label);
  });

  /**
   * Closed is the default and the reason the section was rewritten: this sits
   * above the menu, which is the most-wanted thing on the page.
   */
  it('ships closed, with the fact count on the control', () => {
    const html = renderToStaticMarkup(
      <DiscoveryFacts facts={[fact({ id: 'a' }), fact({ id: 'b' }), fact({ id: 'c' })]} />,
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('aria-expanded="true"');
    // The figure is inside the button, so it is part of the accessible name —
    // unlike the card numerals, which are `aria-hidden`.
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[\s\S]*?>3<[\s\S]*?notes worth knowing/);
    // Closed, not absent. Prerender needs the sentences in the document.
    expect(html).toContain('Occupies the 14th floor');
  });

  it('counts in the singular for the one-fact venue, which is the common case', () => {
    const html = renderToStaticMarkup(<DiscoveryFacts facts={[fact()]} />);
    expect(html).toContain('note worth knowing');
    expect(html).not.toContain('notes worth knowing');
  });

  it('makes the first entry the lead and only the first', () => {
    const html = renderToStaticMarkup(
      <DiscoveryFacts facts={[fact({ id: 'a' }), fact({ id: 'b' }), fact({ id: 'c' })]} />,
    );
    expect(html.match(/dyk__card--lead/g)).toHaveLength(1);
    // The lead has to be the FIRST entry, not merely the only one: the class
    // sets a font size, so a lead in third place is a legible page with its
    // hierarchy pointing at the wrong fact.
    const [, first, ...rest] = html.split(`class="${SPOTLIGHT_CARD_CLASS} dyk__card`);
    expect(first).toContain('--lead');
    for (const item of rest) expect(item).not.toContain('--lead');
  });

  /**
   * `SpotlightDeck` finds its cards by class name at runtime. Nothing in the
   * type system connects the two, so this is the assertion that stands between
   * a rename and an animation that silently stops existing.
   */
  it('gives every card the class the spotlight deck looks for', () => {
    const facts = [fact({ id: 'a' }), fact({ id: 'b' }), fact({ id: 'c' })];
    const html = renderToStaticMarkup(<DiscoveryFacts facts={facts} />);
    expect(html.match(new RegExp(`class="${SPOTLIGHT_CARD_CLASS} `, 'g'))).toHaveLength(
      facts.length,
    );
    expect(html).toMatch(/<ol class="kk-spotdeck[^"]*\bdyk__deck\b/);
  });

  /**
   * The index is drawn and the `<ol>` is what a screen reader counts, so the
   * numerals have to stay out of the accessibility tree — announced, they read
   * the position of every fact twice.
   */
  it('numbers the entries from 01 and hides the figures from assistive tech', () => {
    const html = renderToStaticMarkup(
      <DiscoveryFacts facts={[fact({ id: 'a' }), fact({ id: 'b' })]} />,
    );
    expect(html).toContain('>01<');
    expect(html).toContain('>02<');
    expect(html.match(/class="dyk__num" aria-hidden="true"/g)).toHaveLength(2);
  });
});
