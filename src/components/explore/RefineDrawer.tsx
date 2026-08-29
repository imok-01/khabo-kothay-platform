import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  X, MapPin, UtensilsCrossed, Wallet, Clock, Sparkles, Star, Users, ArrowUpDown, Navigation,
} from 'lucide-react';
import { CUISINES, NEIGHBORHOODS } from '../../hooks/useTaxonomy';
import { SPECIALTIES } from '../../domain/intelligence';
import { BUDGET_LABEL, VIBES, type Budget, type MealType, type Restaurant } from '../../types';
import { filterRestaurants, type FilterCriteria } from '../../lib/filter';
import { withParam } from '../../lib/exploreCriteria';
import { formatCurrency } from '../../lib/format';
import type { GeoPoint } from '../../lib/geo';
import { IconButton, Chip } from '../ui';

/**
 * The refine sheet.
 *
 * It replaces a twelve-group sidebar of labelled `<select>`s that sat permanently
 * beside the results. Same params, same setters, same analytics — but it is
 * summoned rather than always present, it is grouped the way a diner thinks
 * (where / what / spend / when / the room), and every option carries the number
 * of places it would actually give you.
 *
 * Those counts are the reason this is not just a prettier sidebar. Large parts
 * of the catalogue are not yet covered field-by-field, so several honest filters
 * currently match nothing. Hiding them would be a product decision that is not
 * mine to make, and leaving them silent turns them into dead ends — so they are
 * shown, marked, and the number says why. A count is contextual: it is measured
 * against everything else already chosen, via the shared `withParam` mapping, so
 * the number on the chip is the number of cards you will get.
 *
 * The counts are only computed while the sheet is open — roughly 120
 * `filterRestaurants` passes over the catalogue, which is not worth spending on
 * every keystroke behind a closed sheet.
 */

type Opt = {
  value: string;
  label: string;
  /** omitted where the param genuinely does not narrow the result set */
  count?: number;
  /** per-option param override, for groups of independent switches */
  param?: string;
};

type Group = {
  key: string;
  param: string;
  title: string;
  icon: ReactNode;
  note?: string;
  opts: Opt[];
  /** true where re-clicking the active option must not clear it (sort order) */
  radio?: boolean;
};

export interface RefineDrawerProps {
  open: boolean;
  onClose: () => void;
  /** the whole catalogue — counts are measured against it, not against results */
  restaurants: Restaurant[];
  /** the live criteria, so each count is contextual */
  criteria: FilterCriteria;
  /** raw URL param values, keyed by param name */
  values: Record<string, string>;
  /** writes a param without closing the sheet */
  onSet: (key: string, value: string) => void;
  onClear: () => void;
  resultCount: number;
  activeCount: number;
  geoReference: GeoPoint | null;
  geoReady: boolean;
  onRequestGeo: () => void;
}

const PRICE_CAPS = [500, 1000, 1500, 2500, 5000];
const MEAL_TYPES: MealType[] = ['Breakfast', 'Brunch', 'Lunch', 'Snacks', 'Dinner', 'Dessert'];
const BUDGETS: Budget[] = ['Budget', 'Mid-range', 'Premium', 'Luxury'];
const DISTANCES = ['1', '3', '5', '10'];
const RATINGS = ['4', '4.3', '4.5'];

const SORT_OPTIONS: Opt[] = [
  { value: 'recommended', label: 'Best match' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'distance', label: 'Nearest first' },
  { value: 'price-low', label: 'Gentlest on the wallet' },
  { value: 'price-high', label: 'Most indulgent' },
  { value: 'popularity', label: 'Most talked about' },
];

const PARTY_SIZES: Opt[] = [
  { value: '1', label: 'Just me' },
  { value: '2', label: 'Two of us' },
  { value: '3-4', label: '3–4' },
  { value: '5-8', label: '5–8' },
  { value: '9+', label: '9 or more' },
];

/** Vibe labels that read better in a sentence than the raw taxonomy value. */
const VIBE_LABELS: Record<string, string> = { Family: 'Family friendly' };

export default function RefineDrawer({
  open,
  onClose,
  restaurants,
  criteria,
  values,
  onSet,
  onClear,
  resultCount,
  activeCount,
  geoReference,
  geoReady,
  onRequestGeo,
}: RefineDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  /** Whatever the keyboard was on when the sheet opened, so it can go back. */
  const returnToRef = useRef<HTMLElement | null>(null);

  // Move focus into the sheet when it opens so the keyboard lands where the
  // eye does, and hand it back to the Refine button when the sheet closes —
  // without that, closing drops a keyboard user at the top of the document,
  // because the panel they were standing in becomes `visibility: hidden`.
  // Escape and the body-scroll lock are owned by the page, which already holds
  // that effect for the mobile sheet.
  //
  // The two frames of delay are load-bearing, not superstition. The closed
  // panel is `visibility: hidden` (so its hundred options are not reachable by
  // tab or read aloud while it is off-screen), and `visibility` is transitioned
  // — `step-end` on the way out, 0s on the way in — which means Chrome resolves
  // it one frame late: measured here, the computed value is still `hidden`
  // during the effect and through the first animation frame, and `focus()` on a
  // `visibility: hidden` element is a silent no-op. Focusing on the second
  // frame is the difference between the sheet catching the keyboard and the
  // keyboard staying behind on the Refine button.
  useEffect(() => {
    if (!open) {
      const back = returnToRef.current;
      returnToRef.current = null;
      if (back && document.contains(back)) back.focus();
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body && !panelRef.current?.contains(active)) {
      returnToRef.current = active;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => panelRef.current?.focus());
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open]);

  const groups = useMemo<Group[]>(() => {
    if (!open) return [];
    const n = (key: string, value: string) =>
      filterRestaurants(restaurants, withParam(criteria, key, value, geoReference)).length;

    const where: Opt[] = [
      ...NEIGHBORHOODS.map((v) => ({ value: v, label: v, count: n('location', v) })),
      ...(geoReady
        ? DISTANCES.map((d) => ({ value: d, label: `Within ${d} km`, count: n('distance', d), param: 'distance' }))
        : []),
    ];

    return [
      {
        key: 'where', param: 'location', title: 'Where', icon: <MapPin size={14} />,
        note: geoReady ? 'Distances are measured from where you are.' : undefined,
        opts: where,
      },
      {
        key: 'what', param: 'cuisine', title: 'What you feel like', icon: <UtensilsCrossed size={14} />,
        opts: CUISINES.map((v) => ({ value: v, label: v, count: n('cuisine', v) })),
      },
      {
        key: 'craving', param: 'specialty', title: 'Known for', icon: <Sparkles size={14} />,
        note: 'What the kitchen is known for — curated, not guessed from menus.',
        opts: SPECIALTIES.map((v) => ({ value: v, label: v, count: n('specialty', v) })),
      },
      {
        key: 'spend', param: 'budget', title: 'Spend', icon: <Wallet size={14} />,
        opts: [
          ...BUDGETS.map((b) => ({ value: b, label: BUDGET_LABEL[b], count: n('budget', b) })),
          ...PRICE_CAPS.map((p) => ({
            value: String(p), label: `Under ${formatCurrency(p)} for two`, count: n('maxPrice', String(p)), param: 'maxPrice',
          })),
        ],
      },
      {
        key: 'when', param: 'mealType', title: 'When', icon: <Clock size={14} />,
        opts: [
          ...MEAL_TYPES.map((m) => ({ value: m, label: m, count: n('mealType', m) })),
          { value: 'open', label: 'Open now', count: n('availability', 'open'), param: 'availability' },
          { value: 'soon', label: 'Opening soon', count: n('availability', 'soon'), param: 'availability' },
          { value: 'later', label: 'Open later today', count: n('availability', 'later'), param: 'availability' },
        ],
      },
      {
        key: 'room', param: 'vibe', title: 'The room', icon: <Sparkles size={14} />,
        opts: [
          ...VIBES.map((v) => ({ value: v, label: VIBE_LABELS[v] ?? v, count: n('vibe', v) })),
          { value: '1', label: 'Outdoor seating', count: n('outdoor', '1'), param: 'outdoor' },
          { value: '1', label: 'Quiet enough to talk', count: n('quiet', '1'), param: 'quiet' },
          { value: '1', label: 'Family friendly', count: n('family', '1'), param: 'family' },
          { value: '1', label: 'Delivers', count: n('delivery', '1'), param: 'delivery' },
        ],
      },
      {
        key: 'diet', param: 'veg', title: 'Diet', icon: <UtensilsCrossed size={14} />,
        opts: [
          { value: '1', label: 'Pure veg', count: n('veg', '1') },
          { value: '0', label: 'Non-veg', count: n('veg', '0') },
        ],
      },
      {
        key: 'quality', param: 'rating', title: 'Only the well-reviewed', icon: <Star size={14} />,
        opts: RATINGS.map((r) => ({ value: r, label: `${r}★ and up`, count: n('rating', r) })),
      },
      {
        key: 'table', param: 'partySize', title: 'The table', icon: <Users size={14} />,
        note: 'Shapes the ranking and what we say about a place — it does not hide any.',
        opts: [
          ...PARTY_SIZES,
          { value: 'dine-in', label: 'Dine in', param: 'dining' },
          { value: 'delivery', label: 'Delivery', param: 'dining' },
        ],
      },
      {
        key: 'sort', param: 'sortBy', title: 'Order', icon: <ArrowUpDown size={14} />,
        opts: SORT_OPTIONS, radio: true,
      },
    ];
  }, [open, restaurants, criteria, geoReference, geoReady]);

  const layers = (
    <>
      <div
        className={`rf__scrim${open ? ' rf__scrim--on' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`rf${open ? ' rf--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Refine your search"
        aria-hidden={!open}
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="rf__head">
          <div>
            <span className="rf__eyebrow">Refine</span>
            <p className="rf__count">
              <strong>{resultCount}</strong> {resultCount === 1 ? 'place' : 'places'} match
            </p>
          </div>
          <IconButton icon={X} label="Close refine" className="rf__close" onClick={onClose} />
        </header>

        <div className="rf__body">
          {!geoReady && (
            <button type="button" className="rf__geo" onClick={onRequestGeo}>
              <Navigation size={14} aria-hidden="true" />
              <span>
                <strong>Use my location</strong>
                Unlocks distance and nearest-first.
              </span>
            </button>
          )}

          {groups.map((g) => (
            <section className="rf__group" key={g.key}>
              <h3 className="rf__group-title">
                <span className="rf__group-icon" aria-hidden="true">{g.icon}</span>
                {g.title}
              </h3>
              {g.note && <p className="rf__group-note">{g.note}</p>}
              <div className="rf__opts">
                {g.opts.map((o) => {
                  const param = o.param ?? g.param;
                  const on = (values[param] ?? '') === o.value;
                  const empty = o.count === 0 && !on;
                  return (
                    <Chip
                      key={`${param}:${o.value}:${o.label}`}
                      className="rf__opt"
                      selected={on}
                      empty={empty}
                      count={o.count}
                      title={empty ? 'No places match this yet' : undefined}
                      onClick={() => onSet(param, on && !g.radio ? '' : o.value)}
                    >
                      {o.label}
                    </Chip>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <footer className="rf__foot">
          <button
            type="button"
            className="rf__reset"
            onClick={onClear}
            disabled={activeCount === 0}
          >
            Start over
          </button>
          <button type="button" className="rf__done" onClick={onClose}>
            Show {resultCount} {resultCount === 1 ? 'place' : 'places'}
          </button>
        </footer>
      </div>
    </>
  );

  // Portalled to `document.body`, for the same reason `Dialog` is, and the
  // symptom here was worse. `editorial.css:1956` sets
  // `main { animation: kk-page-in 260ms var(--ease-out) both; }`, and `both`
  // keeps that animation filling forever, so every page's `<main>` is a
  // permanent stacking context — `.disc` adds `isolation: isolate` on top of
  // it. Rendered inline, this sheet's `z-index: 71` and the scrim's `70` were
  // sealed inside that layer and could not outrank the fixed `.nav` at `50`,
  // which lives in a sibling subtree. Measured in the pane at 1342×954 with
  // the sheet open: `.rf__close` sat at (1315, 20) and
  // `document.elementFromPoint` at its centre returned `header.nav` — the
  // close button was not clickable — while `.nav__link` ("Home") was, under an
  // `aria-modal="true"` dialog. §11's own comment claimed the sheet covered
  // `.mobile-nav` (z 60); it did not, at any width, for the same reason. No
  // z-index fixes this: `Dialog.tsx` records a scrim at 2147483000 still
  // painting under the header.
  //
  // Two things this deliberately does NOT change. The sheet stays mounted in
  // both states, because its `visibility` transition and the two-frame focus
  // dance above depend on that; a portal is orthogonal to mounting. And the
  // guard is load-bearing rather than defensive — `scripts/prerender.mjs:173`
  // prerenders `/explore` through `react-dom/server`, where `createPortal`
  // throws instead of degrading, so without the server branch the build loses
  // that route. Hydration cannot mismatch: `main.tsx` uses `createRoot`, not
  // `hydrateRoot`. Styling is portal-safe — no `.rf*` rule is qualified by an
  // ancestor (`.rf__head .rf__close` is inside the moved subtree), and every
  // token these rules read is defined on `:root`.
  return typeof document === 'undefined' ? layers : createPortal(layers, document.body);
}
