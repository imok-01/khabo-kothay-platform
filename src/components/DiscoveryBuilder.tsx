import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CUISINES, NEIGHBORHOODS } from '../hooks/useTaxonomy';
import { useScrollFade } from '../hooks/useScrollFade';
import { BUDGET_LABEL, VIBES, type Budget, type MealType } from '../types';
import type { Restaurant } from '../types';
import type { GeoPoint } from '../lib/geo';
import { filterRestaurants } from '../lib/filter';
import { getEffectiveIntelligence } from '../lib/intelligence';
import { SPECIALTIES } from '../domain/intelligence';
import {
  ChevronDown, MapPin, UtensilsCrossed, Wallet, Clock, Sparkles, ChefHat, ArrowRight,
  SlidersHorizontal, Users, Salad, Store, Navigation, Timer, Check, RotateCcw, X, Crosshair,
} from 'lucide-react';
import { Button, Disclosure } from './ui';

type BuilderSelection = Record<string, string>;

interface FieldOption {
  value: string;
  label: string;
  // A shorter form for the closed trigger, where the field is one fifth of a
  // rail rather than a full menu row. Only the money ladder needs it: at 768
  // the narrow fields are 165px and "৳200 – 500 / person" clips to "৳200 – 5",
  // which does not just lose the unit — it misreads as five taka. The menu and
  // the summary chip keep the full band; the trigger states the range.
  short?: string;
  count?: number;
}

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  options: FieldOption[];
  value: string;
  icon: ReactNode;
}

interface DiscoveryBuilderProps {
  restaurants: Restaurant[];
  /** initial selections from URL params (deep link support) */
  initial?: BuilderSelection;
  /** geolocation handle so distance options can work honestly ("Use my location"). */
  geo?: { status: string; reference: GeoPoint | null; request: () => void };
}

const NEAR_ME = '__near_me__';
const OPEN_NOW = '__open_now__';

// The money ladder as a closed field can state it: BUDGET_LABEL with the
// per-person unit dropped and the dash tightened. Derived rather than retyped so
// the currency symbol and the band boundaries keep exactly one source — if the
// ladder moves, this moves with it.
const BUDGET_SHORT = Object.fromEntries(
  (Object.entries(BUDGET_LABEL) as [Budget, string][]).map(([tier, band]) => [
    tier,
    band.replace(' / person', '').replace(' – ', '–').replace(/^(\S+) under /, 'Under $1'),
  ]),
) as Record<Budget, string>;

const PARTY_OPTIONS: FieldOption[] = [
  { value: '1', label: '1 person' },
  { value: '2', label: '2 people' },
  { value: '3-4', label: '3–4 people' },
  { value: '5-8', label: '5–8 people' },
  { value: '9+', label: '9+ people' },
];

const DISTANCE_OPTIONS: FieldOption[] = [
  { value: '1', label: 'Within 1 km' },
  { value: '3', label: 'Within 3 km' },
  { value: '5', label: 'Within 5 km' },
  { value: '10', label: 'Within 10 km' },
];

const AVAILABILITY_OPTIONS: FieldOption[] = [
  { value: 'open', label: 'Open now' },
  { value: 'soon', label: 'Opening soon' },
  { value: 'later', label: 'Open later today' },
];

export default function DiscoveryBuilder({ restaurants, initial = {}, geo }: DiscoveryBuilderProps) {
  const [selection, setSelection] = useState<BuilderSelection>(initial);
  const [openField, setOpenField] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Only one dropdown open at a time; close on outside click or Escape.
  useEffect(() => {
    if (!openField) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenField(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenField(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openField]);

  const geoReady = geo?.status === 'ready' && Boolean(geo.reference);

  const setValue = (key: string, value: string) => {
    setSelection((s) => {
      const next = { ...s };
      if (value === '' || value === 'any') delete next[key];
      else next[key] = value;
      return next;
    });
    setOpenField(null);
  };

  const toggleChip = (key: string) => {
    setSelection((s) => {
      const next = { ...s };
      if (next[key] === '1') delete next[key];
      else next[key] = '1';
      return next;
    });
  };

  /** Map a selection to hard filter criteria (used for live match counts). */
  const criteriaFor = useCallback(
    (sel: BuilderSelection, exclude?: string) => {
      const c: Parameters<typeof filterRestaurants>[1] = {};
      for (const [k, v] of Object.entries(sel)) {
        if (!v || k === exclude) continue;
        if (k === 'location') c.location = v;
        else if (k === 'cuisine') c.cuisine = v;
        else if (k === 'specialty') c.specialty = v;
        else if (k === 'budget') c.budget = v;
        else if (k === 'mealType') c.mealType = v;
        else if (k === 'vibe') c.vibe = v;
        // Diet is a three-state control ('' / '1' / '0'), so '0' has to select
        // the nonVegOnly criterion. Setting `vegOnly: false` — as this did —
        // reads as "no diet filter", which made choosing Non-veg silently
        // change nothing while still showing the unfiltered count.
        else if (k === 'veg') {
          if (v === '1') c.vegOnly = true;
          else if (v === '0') c.nonVegOnly = true;
        } else if (k === 'openNow') c.openNow = v === '1';
        else if (k === 'dining') c.delivery = v === 'delivery';
        else if (k === 'availability') c.availability = v as 'open' | 'soon' | 'later';
        else if (k === 'outdoor') c.outdoorSeating = v === '1';
        else if (k === 'family') c.familyFriendly = v === '1';
        else if (k === 'quiet') c.quiet = v === '1';
        else if (k === 'distance' && geo?.reference) {
          c.withinKm = Number(v);
          c.origin = geo.reference;
        }
      }
      return c;
    },
    [geo?.reference],
  );

  const countWith = useCallback(
    (sel: BuilderSelection, key: string, value: string) => {
      const next = { ...sel };
      if (value === NEAR_ME) delete next.location;
      else next[key] = value;
      return filterRestaurants(restaurants, criteriaFor(next)).length;
    },
    [restaurants, criteriaFor],
  );

  const fields = useMemo<FieldDef[]>(() => {
    const mealOptions: FieldOption[] = (['Breakfast', 'Brunch', 'Lunch', 'Snacks', 'Dinner', 'Dessert'] as MealType[]).map(
      (m) => ({ value: m, label: m, count: countWith(selection, 'mealType', m) }),
    );
    return [
      {
        key: 'location',
        label: 'Where',
        placeholder: 'Anywhere',
        icon: <MapPin size={16} />,
        value: selection.location ?? '',
        options: [
          { value: NEAR_ME, label: 'Near me', count: restaurants.length },
          ...NEIGHBORHOODS.map((n) => ({ value: n, label: n, count: countWith(selection, 'location', n) })),
        ],
      },
      {
        key: 'cuisine',
        label: 'Cuisine',
        placeholder: 'Any cuisine',
        icon: <UtensilsCrossed size={16} />,
        value: selection.cuisine ?? '',
        options: CUISINES.map((c) => ({ value: c, label: c, count: countWith(selection, 'cuisine', c) })),
      },
      {
        key: 'budget',
        label: 'Budget',
        placeholder: 'Any price',
        icon: <Wallet size={16} />,
        value: selection.budget ?? '',
        options: (['Budget', 'Mid-range', 'Premium', 'Luxury'] as Budget[]).map((b) => ({
          value: b,
          // BUDGET_LABEL is the approved per-person ladder and the same source
          // Explore shows. The bands were hardcoded here and had drifted from
          // it — "Under ৳300" where the tier is under ৳200 — and the Luxury
          // option was labelled "Premium", so two rows read as the same tier.
          label: BUDGET_LABEL[b],
          // The same band, stated for a 165px trigger: the per-person unit is
          // said once in the menu and the range is what the closed field needs
          // to carry. Tight en-dash, because "৳500 – 1000" is wider than the
          // well and "৳500 – 1" is worse than no answer at all.
          short: BUDGET_SHORT[b],
          count: countWith(selection, 'budget', b),
        })),
      },
      {
        key: 'mealType',
        label: 'When',
        placeholder: 'Anytime',
        icon: <Clock size={16} />,
        value: selection.mealType ?? '',
        options: [
          ...mealOptions,
          { value: OPEN_NOW, label: 'Open now', count: countWith(selection, 'openNow', '1') },
        ],
      },
      {
        key: 'vibe',
        label: 'Vibe',
        placeholder: 'Any mood',
        icon: <Sparkles size={16} />,
        value: selection.vibe ?? '',
        options: VIBES.map((v) => ({ value: v, label: v, count: countWith(selection, 'vibe', v) })),
      },
    ];
  }, [selection, restaurants, countWith]);

  const advancedFields = useMemo<FieldDef[]>(() => {
    const dietCount = (v: string) => countWith(selection, 'veg', v);
    return [
      {
        key: 'specialty',
        label: 'Craving',
        placeholder: 'Any specialty',
        icon: <ChefHat size={16} />,
        value: selection.specialty ?? '',
        options: SPECIALTIES.map((s) => ({
          value: s,
          label: s,
          count: restaurants.filter((r) => (r.intelligence ?? getEffectiveIntelligence(r)).specialties.includes(s)).length,
        })),
      },
      {
        key: 'partySize',
        label: 'People',
        placeholder: 'Any group',
        icon: <Users size={16} />,
        value: selection.partySize ?? '',
        options: PARTY_OPTIONS,
      },
      {
        key: 'veg',
        label: 'Diet',
        placeholder: 'Any diet',
        icon: <Salad size={16} />,
        value: selection.veg ?? '',
        options: [
          { value: '', label: 'Any diet', count: restaurants.length },
          { value: '1', label: 'Pure veg', count: dietCount('1') },
          { value: '0', label: 'Non-veg', count: dietCount('0') },
        ],
      },
      {
        key: 'dining',
        label: 'Dining',
        placeholder: 'Any',
        icon: <Store size={16} />,
        value: selection.dining ?? '',
        options: [
          { value: '', label: 'Any', count: restaurants.length },
          { value: 'dine-in', label: 'Dine-in', count: restaurants.length },
          { value: 'delivery', label: 'Delivery', count: restaurants.filter((r) => r.hasDelivery).length },
        ],
      },
      {
        key: 'distance',
        label: 'Distance',
        placeholder: 'Any distance',
        icon: <Navigation size={16} />,
        value: selection.distance ?? '',
        options: DISTANCE_OPTIONS.map((o) =>
          geo?.reference
            ? { ...o, count: filterRestaurants(restaurants, criteriaFor({ ...selection, distance: o.value })).length }
            : o,
        ),
      },
      {
        key: 'availability',
        label: 'Availability',
        placeholder: 'Anytime',
        icon: <Timer size={16} />,
        value: selection.availability ?? '',
        options: AVAILABILITY_OPTIONS.map((o) => ({
          ...o,
          count: filterRestaurants(restaurants, criteriaFor({ ...selection, availability: o.value })).length,
        })),
      },
    ];
  }, [selection, restaurants, geo?.reference, countWith, criteriaFor]);

  const morePreferences = [
    { key: 'outdoor', label: 'Outdoor seating', active: selection.outdoor === '1' },
    { key: 'family', label: 'Family friendly', active: selection.family === '1' },
    { key: 'quiet', label: 'Quiet', active: selection.quiet === '1' },
  ];

  const matchedCount = useMemo(() => {
    const c = criteriaFor(selection);
    if (selection.location === NEAR_ME) delete c.location; // keep all; explore sorts by distance
    return filterRestaurants(restaurants, c).length;
  }, [selection, restaurants, geo?.reference]);

  const labelFor = (f: FieldDef) => {
    const opt = f.options.find((o) => o.value === f.value);
    return opt ? opt.label : f.value;
  };

  // Each reported term carries the field it came from, so the chip that
  // reports a choice can also take it back. A chip that only reports is a
  // label; the same chip that clears is a control, and it costs no new state.
  const primaryTerms = fields.filter((f) => f.value).map((f) => ({ key: f.key, label: labelFor(f) }));
  const chosenCount = Object.keys(selection).length;

  // Compact advanced summary so users never re-open Advanced to remember.
  const advancedTerms: string[] = [];
  if (selection.specialty) advancedTerms.push(`Craving: ${selection.specialty}`);
  if (selection.partySize) advancedTerms.push(PARTY_OPTIONS.find((o) => o.value === selection.partySize)?.label ?? selection.partySize);
  if (selection.veg === '1') advancedTerms.push('Pure veg');
  if (selection.veg === '0') advancedTerms.push('Non-veg');
  if (selection.dining === 'delivery') advancedTerms.push('Delivery');
  if (selection.dining === 'dine-in') advancedTerms.push('Dine-in');
  if (selection.distance) advancedTerms.push(`Within ${selection.distance} km`);
  if (selection.availability === 'open') advancedTerms.push('Open now');
  if (selection.availability === 'soon') advancedTerms.push('Opening soon');
  if (selection.availability === 'later') advancedTerms.push('Open later');
  for (const m of morePreferences) if (m.active) advancedTerms.push(m.label);

  const goExplore = () => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(selection)) {
      if (!v) continue;
      if (k === 'location' && v === NEAR_ME) {
        params.set('sortBy', 'distance');
        continue;
      }
      if (k === 'mealType' && v === OPEN_NOW) {
        params.set('openNow', '1');
        continue;
      }
      params.set(k, v);
    }
    const qs = params.toString();
    navigate(qs ? `/explore?${qs}` : '/explore');
  };

  return (
    <div className="builder" role="search" aria-label="Restaurant discovery builder" ref={rootRef}>
      {/* Primary decisions — the five things that matter most. */}
      <div className="builder__fields">
        {fields.map((f) => (
          <BuilderField
            key={f.key}
            field={f}
            open={openField === f.key}
            onToggle={() => setOpenField(openField === f.key ? null : f.key)}
            onSelect={(v) => setValue(f.key, v)}
          />
        ))}
      </div>

      {/* Advanced — a compact secondary action, expanded inline when needed.
          The chip summary rides in `aside` rather than inside the trigger:
          it is *what the closed panel is holding*, so a person can check
          their advanced selections without reopening the panel, and it must
          not be swallowed into the button's accessible name. */}
      <Disclosure
        className="builder__advanced-row"
        variant="inline"
        marker="chevron"
        open={advancedOpen}
        onToggle={setAdvancedOpen}
        panelClassName="builder__advanced"
        summary={
          <>
            <SlidersHorizontal size={16} aria-hidden="true" />
            Advanced
          </>
        }
        aside={
          !advancedOpen && advancedTerms.length > 0 ? (
            <div className="builder__advanced-summary" aria-label="Advanced selections">
              {advancedTerms.map((t) => (
                <span key={t} className="chip chip--active">{t}</span>
              ))}
            </div>
          ) : undefined
        }
      >
        <div className="builder__fields builder__fields--advanced">
          {advancedFields.map((f) => (
            <BuilderField
              key={f.key}
              field={f}
              open={openField === f.key}
              onToggle={() => setOpenField(openField === f.key ? null : f.key)}
              onSelect={(v) => setValue(f.key, v)}
            />
          ))}
        </div>

        <div className="builder__more">
          <span className="builder__more-label">More preferences</span>
          <div className="builder__more-chips">
            {morePreferences.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`chip-chip ${m.active ? 'chip-chip--active' : ''}`}
                aria-pressed={m.active}
                onClick={() => toggleChip(m.key)}
              >
                {m.active && <Check size={12} aria-hidden="true" />}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {selection.distance && !geoReady && (
          <p className="builder__geo-hint" role="status">
            You haven’t shared your location — distance will apply once you allow it.
            <Button variant="ghost" size="sm" icon={Crosshair} onClick={() => geo?.request()}>
              Use my location
            </Button>
          </p>
        )}
      </Disclosure>

      {/* THE FOOT: two rows, and each one answers a different question.
          Row 1 is what you have said so far. Row 2 is what happens next.
          It used to be one wrapping flex row holding four unrelated children
          with the button shoved right by `margin-left: auto`, which is how a
          sentence, a large orange number and a primary button ended up sitting
          side by side with nothing to say to each other.

          The terms row is mounted in both states on purpose. With the old
          `:has(.chip--dismiss)` reflow the first chip promoted the row to full
          width and dropped the count and the button onto a second line —
          measured at 1405, picking one option grew the console 53px and moved
          the button under the reader's cursor. Same slot, both states, no
          jump. */}
      <div className="builder__summary">
        <div className="builder__summary-terms">
          {primaryTerms.length === 0 ? (
            /* A class, not an inline colour. The builder's only ground used to
               be paper, so `var(--ink-faint)` inline was safe; the hero's
               console is dark glass now and an inline style cannot be
               re-coloured from a stylesheet without `!important`. */
            <span className="t-sm builder__empty">Start anywhere — one choice is enough to begin.</span>
          ) : (
            primaryTerms.map((t) => (
              /* The chip that reports a choice is the chip that removes it.
                 Before this, undoing "Thai" meant reopening Cuisine and
                 hunting for the row you were already looking at in the
                 summary. `aria-label` carries the verb because the visible
                 text is the term, not the action. */
              <button
                key={t.key}
                type="button"
                className="chip chip--dismiss"
                aria-label={`Remove ${t.label}`}
                onClick={() => setValue(t.key, '')}
              >
                {t.label}
                <X size={11} aria-hidden="true" />
              </button>
            ))
          )}
        </div>
        <div className="builder__action">
          {/* The catalogue number, and what it means. "207 matches" is a figure
              with no referent: 207 of what, and matching what? Unfiltered it is
              the whole Dhaka catalogue; narrowed it is the answer to the
              question being built above; at zero it has to say so plainly and
              point at the way out, because a diner reading "0" next to a live
              Find button has been set up to fail.

              One line, not a figure stacked on a caption. Stacked and set at
              1.25rem display it was a metric tile — the loudest thing in the
              foot, competing with the button for the same attention. Read as a
              sentence it does the job it is actually for: telling you the
              search is live and how much of Dhaka is still in it. */}
          <p className={`builder__count ${matchedCount === 0 ? 'builder__count--empty' : ''}`}>
            <strong className="builder__count-figure">{matchedCount}</strong>{' '}
            <span className="builder__count-note">
              {matchedCount === 0
                ? 'Nothing fits all of that — lift one choice.'
                : chosenCount === 0
                  ? `place${matchedCount === 1 ? '' : 's'} across Dhaka`
                  : `place${matchedCount === 1 ? ' fits' : 's fit'} what you picked`}
            </span>
          </p>
          {chosenCount > 0 && (
            <button type="button" className="builder__reset" onClick={() => setSelection({})}>
              <RotateCcw size={13} aria-hidden="true" />
              Start over
            </button>
          )}
          <Button variant="primary" className="builder__cta" iconAfter={ArrowRight} onClick={goExplore}>
            Find restaurants
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BuilderField({ field, open, onToggle, onSelect }: {
  field: FieldDef;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  const active = Boolean(field.value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Two nodes, because one element cannot both cast a shadow and fade its own
  // edges: a `mask-image` clips the box-shadow away and makes the background
  // transparent where it fades. So `frameRef` is the opaque panel — ground,
  // hairline, shadow, position — and `listRef` is the transparent scroller
  // inside it, which is what actually scrolls and what the mask fades.
  const frameRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { measure, onScroll } = useScrollFade();
  // Typeahead buffer. A listbox of 23 cuisines is a list you should be able to
  // type at — "th" ought to land on Thai — and the standard buffer window is
  // roughly three quarters of a second of silence.
  const typed = useRef({ q: '', at: 0 });

  const options = useCallback(
    () => Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('.builder__option') ?? []),
    [],
  );

  // Where the menu goes, and how tall it is allowed to be. Only ever called
  // with an open menu — the popover does not exist until then, so nothing here
  // runs during prerender.
  //
  // Both halves have to be measured from the *field*, not from the viewport:
  // these fields sit far down a tall hero. Measured at 1440x900 with the page
  // at the top, the console's row-1 fields sit 677px down with 223px of room
  // beneath them, but "When" and "Vibe" sit at 751px with only 149px — under
  // the floor that keeps a menu usable — so a field with no room below opens
  // upward, which is the ordinary behaviour of a dropdown near an edge.
  //
  // The room a flipped menu gets is NOT the whole distance to the top of the
  // viewport, and that was the bug: with Advanced open the Craving field sits
  // 777px down, the old ceiling resolved to 753px, and the menu rendered from
  // y=18 — across the wordmark, the headline and everything else the hero is
  // for. The header is a fixed overlay on this page, so the ceiling has to stop
  // below it. `--nav-h` is read rather than assumed because it steps to 62 on
  // narrow phones.
  //
  // Direction is decided here because only script can compare the two gaps, but
  // everything else stays in CSS: this writes an attribute and one length, and
  // polish.css section 11 owns the positioning. The flip is scoped to pointer
  // widths there — at ≤768 the menu is a fixed bottom sheet with no "up" to
  // flip to.
  const place = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const trigger = el.previousElementSibling;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    // FLOOR is the least room worth dropping into; GAP must match the 6px
    // offset in polish.css section 11, GUTTER the air left at the far edge.
    const FLOOR = 176;
    const GAP = 6;
    const GUTTER = 24;
    const navH = parseFloat(getComputedStyle(el).getPropertyValue('--nav-h')) || 60;
    const below = window.innerHeight - r.bottom - GAP - GUTTER;
    const above = r.top - GAP - GUTTER - navH;
    const up = below < FLOOR && above > below;
    el.dataset.drop = up ? 'up' : 'down';
    el.style.setProperty('--menu-room', `${Math.max(0, Math.round(up ? above : below))}px`);
  }, []);

  const setPopoverAnchor = useCallback(
    (el: HTMLDivElement | null) => {
      frameRef.current = el;
      place(el);
    },
    [place],
  );

  // The scroller. Measured as soon as it exists, because a menu of five rows
  // does not scroll and must show no fade at all; the open effect below
  // re-measures after it has centred the list on the chosen row.
  const setListNode = useCallback(
    (el: HTMLDivElement | null) => {
      listRef.current = el;
      measure(el);
    },
    [measure],
  );

  // An open menu is anchored to a field that the page can still move. Scrolling
  // carries a flipped menu up with its trigger, so a ceiling measured at open
  // time goes stale in exactly the direction that matters — toward the header.
  // Re-measuring costs one `getBoundingClientRect` per scroll frame on a node
  // that is already in the layout, and only while a menu is open. Passive, and
  // `capture` because the hero's console is not itself the scroller.
  useEffect(() => {
    if (!open) return;
    const onMove = () => place(frameRef.current);
    window.addEventListener('scroll', onMove, { passive: true, capture: true });
    window.addEventListener('resize', onMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', onMove, { capture: true });
      window.removeEventListener('resize', onMove);
    };
  }, [open, place]);

  // Opening puts focus on the chosen row, or the first if nothing is chosen.
  // `preventScroll` matters: the fields sit ~680px down a tall hero and the
  // menu can be a fixed bottom sheet, so letting the browser scroll to the
  // focused row is letting it scroll the page. The list is centred on the row
  // by hand instead, which moves the menu's own scroller and nothing else.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const opts = options();
    if (!list || opts.length === 0) return;
    const i = Math.max(0, field.options.findIndex((o) => o.value === field.value));
    const el = opts[i];
    if (!el) return;
    el.focus({ preventScroll: true });
    list.scrollTop = Math.max(0, el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2);
    measure(list);
    typed.current = { q: '', at: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Closing hands focus back, but only if the menu still had it. Selecting a
  // row or pressing Escape leaves focus on a node that is about to unmount, so
  // without this the caret lands on `<body>` and the next Tab restarts from the
  // top of the page. A click elsewhere is different — that click chose where
  // focus goes, and this must not overrule it.
  const hadFocus = useRef(false);
  useEffect(() => {
    if (open) {
      hadFocus.current = true;
      return;
    }
    if (!hadFocus.current) return;
    hadFocus.current = false;
    const a = document.activeElement;
    if (!a || a === document.body) triggerRef.current?.focus();
  }, [open]);

  const move = (from: HTMLElement | null, delta: number, to?: 'first' | 'last') => {
    const opts = options();
    if (opts.length === 0) return;
    if (to === 'first') return opts[0].focus();
    if (to === 'last') return opts[opts.length - 1].focus();
    const i = from ? opts.indexOf(from as HTMLButtonElement) : -1;
    const next = (i + delta + opts.length) % opts.length;
    opts[next]?.focus();
  };

  const onListKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = document.activeElement as HTMLElement | null;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        return move(current, 1);
      case 'ArrowUp':
        e.preventDefault();
        return move(current, -1);
      case 'Home':
        e.preventDefault();
        return move(current, 0, 'first');
      case 'End':
        e.preventDefault();
        return move(current, 0, 'last');
      case 'Tab':
        // Tab leaves the menu rather than walking 23 rows of it. Closing by
        // hand and returning focus is what keeps the next Tab going forward
        // from the field instead of from wherever React left the caret.
        e.preventDefault();
        onToggle();
        return;
      default:
        break;
    }
    // Typeahead. One printable character, no modifiers: extend the buffer and
    // jump to the first label that starts with it; if the extended buffer
    // matches nothing, treat the keystroke as a fresh start rather than
    // stranding the user in a dead prefix.
    if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
    const now = Date.now();
    const base = now - typed.current.at < 750 ? typed.current.q : '';
    const opts = options();
    const find = (q: string) =>
      field.options.findIndex((o) => o.label.toLowerCase().startsWith(q));
    let q = base + e.key.toLowerCase();
    let i = find(q);
    if (i < 0 && base) {
      q = e.key.toLowerCase();
      i = find(q);
    }
    typed.current = { q, at: now };
    if (i >= 0) {
      e.preventDefault();
      opts[i]?.focus();
    }
  };

  // What the closed field says. `short` when the option carries one, because the
  // trigger is a fifth of a rail and the menu row it came from is not.
  const chosen = field.options.find((o) => o.value === field.value);
  const shown = active ? (chosen ? chosen.short ?? chosen.label : field.value) : field.placeholder;

  return (
    <div className="builder-field">
      <button
        ref={triggerRef}
        type="button"
        className={`builder-field__trigger ${active ? 'builder-field__trigger--active' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={onToggle}
      >
        {/* The icon in a well of its own. It used to sit inline in the caps
            label, where a 16px gold glyph beside 10px letterspaced type is
            neither icon nor text. In a tile it becomes the field's face — and
            the tile is what lights up once the field has an answer, so a row
            of five reads at a glance as how much of your taste KK has been
            told. That replaced a 6px dot in the corner. */}
        <span className="builder-field__well" aria-hidden="true">{field.icon}</span>
        <span className="builder-field__text">
          <span className="builder-field__label">{field.label}</span>
          <span className="builder-field__value">{shown}</span>
        </span>
        <ChevronDown size={16} className="builder-field__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="builder__popover"
          ref={setPopoverAnchor}
          /* How many rows there are, so a menu that opened upward can run its
             arrival from the bottom row — out of the trigger — rather than
             into it. Read only by the flipped rule in polish.css section 11. */
          style={{ '--n': field.options.length } as CSSProperties}
        >
          <div
            className="builder__popover-list"
            role="listbox"
            aria-label={field.label}
            ref={setListNode}
            onKeyDown={onListKeyDown}
            onScroll={onScroll}
          >
            {field.options.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="option"
                // Roving focus, so the menu is one stop on the page rather than
                // twenty-three. Arrow keys move real focus, which is what lets a
                // screen reader announce the row without `aria-activedescendant`
                // having to agree with anything.
                tabIndex={-1}
                aria-selected={o.value === field.value}
                className={`builder__option ${o.value === field.value ? 'builder__option--selected' : ''}`}
                style={{ '--i': i } as CSSProperties}
                onClick={() => onSelect(o.value)}
              >
                <Check className="builder__option-check" size={15} aria-hidden="true" />
                <span className="builder__option-label">{o.label}</span>
                {o.count !== undefined && <span className="builder__option-count">{o.count}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
