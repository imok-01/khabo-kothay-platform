import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Library, Info } from 'lucide-react';

/**
 * The Collection header, shared by `/saved` and `/favorites`.
 *
 * Both pages used to render `<h1>Saved</h1>` and set the document title to
 * "Saved", so the two lists were indistinguishable once you arrived at either
 * one. They are not the same thing, and the fix is to teach the difference
 * rather than to merge them:
 *
 *   Saved       the wide net — anything you want to remember
 *   Favourites  the curated shortlist — the places you'd stand behind, and the
 *               list the recommendation engine actually learns your taste from
 *
 * One header, one switcher, and a stated definition of whichever list is open.
 * Counts are always shown for both tabs so the other list is never a mystery.
 */

export type CollectionTab = 'saved' | 'favourites';

const COPY: Record<CollectionTab, { title: string; lede: string; definition: string }> = {
  saved: {
    title: 'Saved',
    lede: 'Everywhere you want to remember — a broad list you can add to freely and come back to whenever you are deciding.',
    definition:
      'Saved is your wide net. Bookmark anything that catches your eye; when a place earns it, move it into Favourites.',
  },
  favourites: {
    title: 'Favourites',
    lede: 'Your carefully curated top choices — the short list you would genuinely stand behind.',
    definition:
      'Favourites is your shortlist, and it is the strongest signal you give us: your matches sharpen as it grows.',
  },
};

export interface CollectionTabsProps {
  active: CollectionTab;
  savedCount: number;
  favouriteCount: number;
  /** Usually "Clear all" — acts on the active list. */
  action?: ReactNode;
}

export default function CollectionTabs({ active, savedCount, favouriteCount, action }: CollectionTabsProps) {
  const copy = COPY[active];

  return (
    <header className="coll-head">
      <div className="coll-head__inner">
        <span className="coll-head__eyebrow">
          <Library size={14} aria-hidden="true" /> Your collection
        </span>
        <h1 className="coll-head__title">{copy.title}</h1>
        <p className="coll-head__lede">{copy.lede}</p>

        <nav className="coll-tabs" aria-label="Collection">
          <Link
            to="/saved"
            className={`coll-tab ${active === 'saved' ? 'coll-tab--on' : ''}`}
            aria-current={active === 'saved' ? 'page' : undefined}
          >
            Saved <span className="coll-tab__count">{savedCount}</span>
          </Link>
          <Link
            to="/favorites"
            className={`coll-tab ${active === 'favourites' ? 'coll-tab--on' : ''}`}
            aria-current={active === 'favourites' ? 'page' : undefined}
          >
            Favourites <span className="coll-tab__count">{favouriteCount}</span>
          </Link>
          {action && <div className="coll-tabs__action">{action}</div>}
        </nav>

        <p className="coll-def">
          <Info size={14} aria-hidden="true" />
          {copy.definition}
        </p>
      </div>
    </header>
  );
}
