import { useMemo, useRef, useState } from 'react';
import { UtensilsCrossed, ChefHat, History, Search, Sparkles, RefreshCw } from 'lucide-react';
import type { Restaurant } from '../types';
import type { Menu, MenuCategory, MenuItem } from '../domain/menu';
import { priceChange } from '../lib/menu';
import { formatCurrency } from '../lib/format';

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
}

export default function MenuSection({ restaurant, menu, menuStatus, onRetryMenu, priceDish, onPriceDish, website }: MenuSectionProps) {
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
        <h2>Menu</h2>
        <span className="detail__section-sub">
          <UtensilsCrossed size={12} aria-hidden="true" /> {menuStatus === 'ready' && menu ? `${menu.categories.length} categories · ${totalDishes} dishes · prices as recorded` : 'prices as recorded'}
        </span>
      </div>

      {menuStatus === 'loading' && (
        <div className="menu-empty menu-empty--loading" role="status" aria-live="polite">
          <p>Loading menu…</p>
        </div>
      )}

      {menuStatus === 'error' && (
        <div className="menu-empty" role="alert">
          <p>We couldn't load this restaurant's menu.</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetryMenu}>
            <RefreshCw size={12} aria-hidden="true" /> Try again
          </button>
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
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost btn--sm"
            >
              View restaurant website
            </a>
          )}
        </div>
      )}

      {menuStatus === 'ready' && menu && (
        <>
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
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--ghost btn--sm"
                >
                  View restaurant website
                </a>
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
                        categoryLabel={activeCat.name}
                        showSignatureTag={activeCat.id === 'signature'}
                        onPriceHistory={() => onPriceDish(dish)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {!priceDish && (
            <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s3)' }}>
              Menu data is recorded from permitted sources (restaurant, website, Khabo Kothay). Prices may change — always confirm at the restaurant.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

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
            <span className="dish__tag dish__tag--signature"><Sparkles size={11} aria-hidden="true" /> Signature</span>
          )}
          {dish.featured && !showSignatureTag && (
            <span className="dish__tag"><ChefHat size={11} aria-hidden="true" /> Chef's pick</span>
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
          <History size={11} aria-hidden="true" />
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
