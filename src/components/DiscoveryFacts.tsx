import type { DiscoveryFact } from '../domain/discoveryFacts';
import { factKind } from './discoveryFactKinds';
import { Disclosure } from './ui';
import SpotlightDeck, { SpotlightCard } from './ui/SpotlightDeck';

/**
 * "Did you know?" — the approved discovery facts, as a dossier you open.
 *
 * These are the only sentences on the page that nobody could have found in
 * a listing: each was researched against a named source and approved one at
 * a time. Two rewrites got them here.
 *
 * The first replaced an auto-fit grid of 220px boxes holding 14px semibold
 * body type behind a green tick — the shape of a feature checklist, worn by
 * the page's rarest material. That grid also shared one row height across
 * facts that run 14 to 264 characters, so a one-line note sat in a box
 * stretched to match a four-line neighbour and the section's dominant
 * feature was empty space.
 *
 * The second is this one, and it answers two things the first got wrong.
 *
 * **It is closed until asked for.** Open, five facts are most of a screen,
 * and this sits above the menu — which is the single most-wanted thing on
 * the page. A reader who came for the menu should not have to scroll a
 * researched essay to reach it, and a reader who came for the story should
 * not have to hunt for it. A count on a pill does both: `5 notes worth
 * knowing` is a promise small enough to skip and specific enough to take.
 * `animate` rather than `hidden` on purpose — the facts stay in the markup,
 * which is what the 219 prerendered routes need.
 *
 * **The ground is ink.** The first rewrite made this a cream plaque two
 * steps up the paper ramp, on the argument that a dark panel under a large
 * hero photo bands the top of the page dark-light-dark. That argument does
 * not survive the section being closed by default — there is no band until
 * someone opens it — and cream-on-cream turned out to be too small a
 * difference to read as a different material at all. Ink is also the only
 * ground on which light means anything, and light is what this section
 * is now made of: `SpotlightDeck` lights each card's edge as the cursor
 * approaches it, which is a treatment gold hairlines on paper cannot have.
 *
 * Layout is a single column of cards, each its own height. Not a grid: see
 * the 14–264 character spread above. The first card is the lead and is set
 * larger, which is ordinary magazine hierarchy at five facts and the whole
 * answer at one — and one or two is 87% of the venues that have any.
 *
 * The page owns the `<section>` and its heading, as it does for
 * `RestaurantSignals` and `CustomerHighlights`; this owns the disclosure
 * and the deck. Styles are editorial.css §14d.
 */

interface Props {
  facts: DiscoveryFact[];
}

export default function DiscoveryFacts({ facts }: Props) {
  if (facts.length === 0) return null;

  return (
    <Disclosure
      className="dyk"
      variant="inline"
      marker="chevron"
      // Height, not `hidden`: a panel that unrolls is worth the one layout
      // read, and it keeps the facts in the prerendered HTML either way.
      animate
      panelClassName="dyk__panel"
      summary={
        <>
          {/* Not `aria-hidden`, unlike the card numerals. This figure is the
              only thing that says how much is behind the pill, so it has to
              be part of the button's name. */}
          <span className="dyk__count">{facts.length}</span>
          <span>{facts.length === 1 ? 'note worth knowing' : 'notes worth knowing'}</span>
        </>
      }
    >
      {/* The deck's defaults are already this system's: saffron glow, because
          gold is KK's emphasis colour and light is emphasis. Only the radius
          is stated, and only because a page section is narrower than the
          landing-page bento the 320px default was tuned against. */}
      <SpotlightDeck as="ol" className="dyk__deck" spotlightRadius={300} moteCount={6}>
        {facts.map((fact, index) => {
          const { label, Icon } = factKind(fact.factType);
          return (
            <SpotlightCard
              as="li"
              key={fact.id}
              className={index === 0 ? 'dyk__card dyk__card--lead' : 'dyk__card'}
            >
              <span className="dyk__meta">
                <span className="dyk__tag">
                  <Icon size={12} aria-hidden="true" />
                  {label}
                </span>
                {/* Drawn, not read: the <ol> already carries the ordinality,
                    so announcing "01" over it would say the position twice. */}
                <span className="dyk__num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </span>
              <p className="dyk__text">{fact.factText}</p>
            </SpotlightCard>
          );
        })}
      </SpotlightDeck>
    </Disclosure>
  );
}
