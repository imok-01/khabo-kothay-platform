import { useMemo, useRef, useState } from 'react';
import { UtensilsCrossed, ChefHat, History, Search, Sparkles, RefreshCw, ExternalLink } from 'lucide-react';
import type { Restaurant } from '../types';
import type { Menu, MenuCategory, MenuItem } from '../domain/menu';
import { priceChange } from '../lib/menu';
import { formatCurrency } from '../lib/format';
import Provenance, { ProvenanceNote, type ProvenanceLevel } from './Provenance';
import { Button } from './ui';

/**
 * Compact, scannable menu.
 *
 * - The menu is loaded by the parent (`useRestaurantMenu`) so RestaurantPage
 *   and this section share one source of truth. The section renders loading,
 *   error + retry, honest empty ("Menu data not verified yet") and ready
 *   states.
 * - A "Signature" pane (curated signature dishes) is the default open view.
 * - A sticky category rail switches panes — no long scroll to scan the menu.
 * - Dish search works across all categories and preserves price + history.
 * - Price history opens in the page-owned modal (so offers can open it too).
 *
 * The detail page used to render a separate "Signature dishes" section above
 * this one, which duplicated the concept and — because most venues have no
 * priced signature dishes recorded — usually showed nothing but a promise.
 * Those curated names now arrive here as `curatedSignatures` and render as a
 * one-line "Known for" headline above the menu, so they still say something
 * real even when no menu has been recorded yet.
 */

export interface MenuSectionProps {
  restaurant: Restaurant;
  /** The effective menu (may be null while loading / when absent). */
  menu: Menu | null;
  menuStatus: 'loading' | 'ready' | 'empty' | 'error';
  onRetryMenu: () => void;
  /** Currently open price-history dish (page-owned so offers share the modal). */
  priceDish: MenuItem | null;
  onPriceDish: (dish: MenuItem | null) => void;
  /** Verified restaurant website, when one exists — never a Google search link. */
  website?: string;
  /**
   * Curated signature dish names from the restaurant record. These are names
   * only — no price, no description — so they are never rendered as priced
   * menu rows. Shown as a reputation headline above the menu itself.
   */
  curatedSignatures?: string[];
}

export default function MenuSection({ restaurant, menu, menuStatus, onRetryMenu, priceDish, onPriceDish, website, curatedSignatures = [] }: MenuSectionProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string>('signature');
  const railRef = useRef<HTMLDivElement>(null);

  // Signature pane = curated signature dishes pulled from every category.
  const signatureCat: MenuCategory | null = useMemo(() => {
    if (!menu) return null;
    const dishes = menu.categories.flatMap((c) => c.dishes.filter((d) => d.isSignature));
    if (dishes.length === 0) return null;
    return { id: 'signature', name: 'Signature', order: 0, dishes };
  }, [menu]);

  const panes = useMemo<MenuCategory[]>(() => {
    if (!menu) return [];
    const cats = menu.categories.filter((c) => c.dishes.length > 0);
    return signatureCat ? [signatureCat, ...cats] : cats;
  }, [menu, signatureCat]);

  // A dish's real category, so the Signature pane can name where each dish
  // actually lives instead of repeating "Signature" under a row that already
  // carries a Signature tag.
  const categoryOfDish = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of menu?.categories ?? []) {
      for (const d of c.dishes) map.set(d.id, c.name);
    }
    return map;
  }, [menu]);

  const totalDishes = menu ? menu.categories.reduce((n, c) => n + c.dishes.length, 0) : 0;

  // Search across all categories — shows the dish's category so context is
  // never lost, and keeps price + history entry points intact.
  const results = useMemo(() => {
    if (!menu) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return menu.categories.flatMap((c) =>
      c.dishes
        .filter((d) => d.name.toLowerCase().includes(q) || (d.description ?? '').toLowerCase().includes(q))
        .map((d) => ({ dish: d, category: c.name })),
    );
  }, [menu, query]);

  const activeCat = panes.find((p) => p.id === active) ?? panes[0];

  const jump = (id: string) => {
    setActive(id);
    const btn = railRef.current?.querySelector<HTMLElement>(`[data-pane="${id}"]`);
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  return (
    <section className="detail__section" aria-label={`Menu for ${restaurant.name}`}>
      <div className="detail__section-head">
        {/* Every other body section on this page names itself with an eyebrow
            above the heading; this one was the odd one out, so the four
            sections read as three plus a stray. */}
        <span className="detail__section-eyebrow">What they cook</span>
        <h2>Menu</h2>
        {/* Only describes the menu when there is one. "prices as recorded"
            above an empty section was captioning data that doesn't exist. */}
        {menuStatus === 'ready' && menu && totalDishes > 0 && (
          <span className="detail__section-sub">
            <UtensilsCrossed size={12} aria-hidden="true" />{' '}
            {menu.categories.length} categories · {totalDishes} dishes
            <Provenance
              level={menuProvenanceLevel(menu)}
              size="sm"
              title="Confidence is derived from each dish's recorded source — never assumed."
            >
              {menuSourceLabel(menu)}
            </Provenance>
          </span>
        )}
      </div>

      {/*
        Curated "known for" names, merged in from the old standalone
        "Signature dishes" section. This is a reputation headline, not a menu
        view: one line you read without interacting, where the Signature pane
        is a priced list you have to tab into. Rendered outside the status
        branches on purpose — when the menu isn't recorded yet this is the only
        real thing the page can say about the kitchen. Names only: there is no
        recorded price behind them, so they are never rendered as priced rows.
      */}
      {curatedSignatures.length > 0 && (
        <div className="known-for">
          <span className="known-for__label">
            <ChefHat size={14} aria-hidden="true" /> Known for
          </span>
          <ul className="known-for__list">
            {curatedSignatures.map((d) => (
              <li key={d} className="known-for__item">{d}</li>
            ))}
          </ul>
        </div>
      )}

      {menuStatus === 'loading' && (
        <div className="menu-empty menu-empty--loading" role="status" aria-live="polite">
          <p>Loading menu…</p>
        </div>
      )}

      {menuStatus === 'error' && (
        <div className="menu-empty" role="alert">
          <p>We couldn't load this restaurant's menu.</p>
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRetryMenu}>
            Try again
          </Button>
        </div>
      )}

      {menuStatus === 'empty' && (
        <div className="menu-empty">
          <p>Menu data not verified yet.</p>
          {website ? (
            <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
              Our team is still recording this restaurant's menu — check the website in the meantime.
            </p>
          ) : (
            <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
              Our team is still recording this restaurant's menu.
            </p>
          )}
          {website && (
            /* `iconAfter`, so the control says it is leaving the product before
               it is pressed — the old anchor gave no sign it opened a new tab. */
            <Button
              variant="ghost"
              size="sm"
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              iconAfter={ExternalLink}
            >
              View restaurant website
            </Button>
          )}
        </div>
      )}

      {menuStatus === 'ready' && menu && (
        <>
          {/* A search field over zero dishes is an input that cannot succeed.
              When there is nothing recorded, the empty state below speaks for
              the section on its own. */}
          {totalDishes > 0 && (
            <div className="menu-search" role="search">
              <Search size={14} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${totalDishes} dishes…`}
                aria-label="Search the menu"
              />
            </div>
          )}

          {query.trim() ? (
            results.length > 0 ? (
              <ul className="menu-search__results">
                {results.map(({ dish, category }) => (
                  <MenuDishRow
                    key={dish.id}
                    dish={dish}
                    categoryLabel={category}
                    showSignatureTag={false}
                    onPriceHistory={() => onPriceDish(dish)}
                  />
                ))}
              </ul>
            ) : (
              <p className="menu-search__empty">
                No dish matches “{query.trim()}”. Try another name — or browse the categories below.
              </p>
            )
          ) : panes.length === 0 ? (
            <div className="menu-empty">
              <p>Menu data not verified yet.</p>
              {website ? (
                <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
                  Our team is still recording this restaurant's menu — check the website in the meantime.
                </p>
              ) : (
                <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
                  Our team is still recording this restaurant's menu.
                </p>
              )}
              {website && (
                <Button
                  variant="ghost"
                  size="sm"
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  iconAfter={ExternalLink}
                >
                  View restaurant website
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="menu-rail" ref={railRef} role="tablist" aria-label="Menu categories">
                {panes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={activeCat.id === p.id}
                    data-pane={p.id}
                    className={`menu-rail__item ${activeCat.id === p.id ? 'menu-rail__item--active' : ''}`}
                    onClick={() => jump(p.id)}
                  >
                    {p.id === 'signature' && <Sparkles size={12} aria-hidden="true" />}
                    {p.name}
                    <span className="menu-rail__count">{p.dishes.length}</span>
                  </button>
                ))}
              </div>

              {activeCat && (
                <div className={`menu-pane ${activeCat.id === 'signature' ? 'menu-pane--signature' : ''}`} role="tabpanel">
                  {activeCat.id === 'signature' && (
                    <p className="menu-pane__intro">
                      Popular picks worth knowing before you browse the full menu.
                    </p>
                  )}
                  <ul className="menu-category__list">
                    {activeCat.dishes.map((dish) => (
                      <MenuDishRow
                        key={dish.id}
                        dish={dish}
                        categoryLabel={categoryOfDish.get(dish.id) ?? activeCat.name}
                        showSignatureTag={activeCat.id === 'signature'}
                        onPriceHistory={() => onPriceDish(dish)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Only when there is actually recorded menu data to caveat. The
              empty state already says the menu isn't verified yet; a sourcing
              note under it would be describing data that doesn't exist. */}
          {!priceDish && totalDishes > 0 && (
            <ProvenanceNote level={allDishesVerified(menu) ? 'verified' : 'recorded'}>
              Menu data is recorded from permitted sources (restaurant, website, Khabo Kothay). Prices may change —
              always confirm at the restaurant.
            </ProvenanceNote>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** True only when every recorded dish came from a verified source. */
function allDishesVerified(menu: Menu): boolean {
  const dishes = menu.categories.flatMap((c) => c.dishes);
  return dishes.length > 0 && dishes.every((d) => d.source === 'verified');
}

/**
 * Confidence level for the menu as a whole, derived from the same recorded
 * `source` values as `menuSourceLabel`. A menu is only ever "verified" when
 * every single dish is — a partially verified menu is `recorded`, never
 * upgraded for presentation.
 */
function menuProvenanceLevel(menu: Menu): ProvenanceLevel {
  return allDishesVerified(menu) ? 'verified' : 'recorded';
}

/**
 * Confidence label derived strictly from each dish's recorded `source` —
 * never invented. "Verified menu" is shown only when every dish is sourced
 * from a verified record; otherwise the dominant real source is named.
 */
function menuSourceLabel(menu: Menu): string {
  const counts: Record<string, number> = {};
  for (const c of menu.categories) {
    for (const d of c.dishes) {
      counts[d.source] = (counts[d.source] ?? 0) + 1;
    }
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const allVerified = entries.length === 1 && entries[0][0] === 'verified';
  if (allVerified) return 'Verified menu';
  const top = entries[0];
  if (!top) return 'Menu available';
  switch (top[0]) {
    case 'restaurant':
      return 'Menu from the restaurant';
    case 'website':
      return 'Menu from the restaurant website';
    case 'khabo-recorded':
      return 'Menu recorded by Khabo Kothay';
    default:
      return 'Menu available';
  }
}

function MenuDishRow({ dish, categoryLabel, showSignatureTag, onPriceHistory }: {
  dish: MenuItem;
  categoryLabel: string;
  showSignatureTag: boolean;
  onPriceHistory: () => void;
}) {
  const change = priceChange(dish);
  return (
    <li className={`menu-dish ${!dish.available ? 'menu-dish--unavailable' : ''}`}>
      <div className="menu-dish__main">
        <div className="menu-dish__name-row">
          <strong>{dish.name}</strong>
          {showSignatureTag && (
            <span className="dish__tag dish__tag--signature"><Sparkles size={12} aria-hidden="true" /> Signature</span>
          )}
          {dish.featured && !showSignatureTag && (
            <span className="dish__tag"><ChefHat size={12} aria-hidden="true" /> Chef's pick</span>
          )}
          {!dish.available && <span className="dish__tag dish__tag--muted">Unavailable</span>}
        </div>
        {dish.description && <p className="menu-dish__desc">{dish.description}</p>}
        <button
          type="button"
          className="price-history-link"
          onClick={onPriceHistory}
          aria-label={`Price history for ${dish.name}`}
        >
          <History size={12} aria-hidden="true" />
          {change && change.previousPrice !== undefined && change.absoluteChange !== undefined && change.absoluteChange !== 0
            ? `${change.absoluteChange > 0 ? '▲' : '▼'} ${formatCurrency(Math.abs(change.absoluteChange))} since last recorded · View price history`
            : 'View price history'}
        </button>
      </div>
      <div className="menu-dish__price">
        <strong>{dish.price > 0 ? formatCurrency(dish.price) : 'Price not listed'}</strong>
        <span className="t-xs" style={{ color: 'var(--ink-faint)' }}>{categoryLabel}</span>
      </div>
    </li>
  );
}
