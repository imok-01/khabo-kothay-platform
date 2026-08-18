import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CUISINES, NEIGHBORHOODS } from '../hooks/useTaxonomy';
import { VIBES, type Budget, type MealType } from '../types';
import type { Restaurant } from '../types';
import type { GeoPoint } from '../lib/geo';
import { filterRestaurants } from '../lib/filter';
import { getEffectiveIntelligence } from '../lib/intelligence';
import { SPECIALTIES } from '../domain/intelligence';
import {
  ChevronDown, MapPin, UtensilsCrossed, Wallet, Clock, Sparkles, ChefHat, ArrowRight,
  SlidersHorizontal, Users, Salad, Store, Navigation, Timer, Check,
} from 'lucide-react';

type BuilderSelection = Record<string, string>;

interface FieldOption {
  value: string;
  label: string;
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
  const criteriaFor = (sel: BuilderSelection, exclude?: string) => {
    const c: Parameters<typeof filterRestaurants>[1] = {};
    for (const [k, v] of Object.entries(sel)) {
      if (!v || k === exclude) continue;
      if (k === 'location') c.location = v;
      else if (k === 'cuisine') c.cuisine = v;
      else if (k === 'specialty') c.specialty = v;
      else if (k === 'budget') c.budget = v;
      else if (k === 'mealType') c.mealType = v;
      else if (k === 'vibe') c.vibe = v;
      else if (k === 'veg') c.vegOnly = v === '1';
      else if (k === 'openNow') c.openNow = v === '1';
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
  };

  const countWith = (sel: BuilderSelection, key: string, value: string) => {
    const next = { ...sel };
    if (value === NEAR_ME) delete next.location;
    else next[key] = value;
    return filterRestaurants(restaurants, criteriaFor(next)).length;
  };

  const fields = useMemo<FieldDef[]>(() => {
    const mealOptions: FieldOption[] = (['Breakfast', 'Brunch', 'Lunch', 'Snacks', 'Dinner', 'Dessert'] as MealType[]).map(
      (m) => ({ value: m, label: m, count: countWith(selection, 'mealType', m) }),
    );
    return [
      {
        key: 'location',
        label: 'Where',
        placeholder: 'Anywhere',
        icon: <MapPin size={15} />,
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
        icon: <UtensilsCrossed size={15} />,
        value: selection.cuisine ?? '',
        options: CUISINES.map((c) => ({ value: c, label: c, count: countWith(selection, 'cuisine', c) })),
      },
      {
        key: 'budget',
        label: 'Budget',
        placeholder: 'Any price',
        icon: <Wallet size={15} />,
        value: selection.budget ?? '',
        options: (['Budget', 'Mid-range', 'Premium', 'Luxury'] as Budget[]).map((b) => ({
          value: b,
          label: b === 'Budget' ? 'Under ৳300' : b === 'Mid-range' ? '৳300–৳600' : b === 'Premium' ? '৳600–৳1,000' : 'Premium',
          count: countWith(selection, 'budget', b),
        })),
      },
      {
        key: 'mealType',
        label: 'When',
        placeholder: 'Anytime',
        icon: <Clock size={15} />,
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
        icon: <Sparkles size={15} />,
        value: selection.vibe ?? '',
        options: VIBES.map((v) => ({ value: v, label: v, count: countWith(selection, 'vibe', v) })),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, restaurants, geo?.reference]);

  const advancedFields = useMemo<FieldDef[]>(() => {
    const dietCount = (v: string) => countWith(selection, 'veg', v);
    return [
      {
        key: 'specialty',
        label: 'Craving',
        placeholder: 'Any specialty',
        icon: <ChefHat size={15} />,
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
        icon: <Users size={15} />,
        value: selection.partySize ?? '',
        options: PARTY_OPTIONS,
      },
      {
        key: 'veg',
        label: 'Diet',
        placeholder: 'Any diet',
        icon: <Salad size={15} />,
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
        icon: <Store size={15} />,
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
        icon: <Navigation size={15} />,
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
        icon: <Timer size={15} />,
        value: selection.availability ?? '',
        options: AVAILABILITY_OPTIONS.map((o) => ({
          ...o,
          count: filterRestaurants(restaurants, criteriaFor({ ...selection, availability: o.value })).length,
        })),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, restaurants, geo?.reference]);

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

  const primaryTerms = fields.filter((f) => f.value).map((f) => labelFor(f));

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

      {/* Advanced — a compact secondary action, expanded inline when needed. */}
      <div className="builder__advanced-row">
        <button
          type="button"
          className={`builder__advanced-toggle ${advancedOpen ? 'builder__advanced-toggle--open' : ''}`}
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((o) => !o)}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          Advanced
          <ChevronDown size={14} className="builder__advanced-chevron" aria-hidden="true" />
        </button>
        {!advancedOpen && advancedTerms.length > 0 && (
          <div className="builder__advanced-summary" aria-label="Advanced selections">
            {advancedTerms.map((t) => (
              <span key={t} className="chip chip--active">{t}</span>
            ))}
          </div>
        )}
      </div>

      {advancedOpen && (
        <div className="builder__advanced">
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
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => geo?.request()}>
                Use my location
              </button>
            </p>
          )}
        </div>
      )}

      <div className="builder__summary">
        <div className="builder__summary-terms">
          {primaryTerms.length === 0 ? (
            <span className="t-sm" style={{ color: 'var(--ink-faint)' }}>Tell us what you're craving — pick anything.</span>
          ) : (
            primaryTerms.map((t) => (
              <span key={t} className="chip">{t}</span>
            ))
          )}
        </div>
        <span className="builder__count">
          {matchedCount} match{matchedCount === 1 ? '' : 'es'}
        </span>
        <button type="button" className="btn btn--primary builder__cta" onClick={goExplore}>
          Find restaurants <ArrowRight size={16} aria-hidden="true" />
        </button>
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
  return (
    <div className="builder-field">
      <button
        type="button"
        className={`builder-field__trigger ${active ? 'builder-field__trigger--active' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={onToggle}
      >
        <span>
          <span className="builder-field__label">
            {field.icon} {field.label}
          </span>
          <span className="builder-field__value">{active ? field.options.find((o) => o.value === field.value)?.label ?? field.value : field.placeholder}</span>
        </span>
        <ChevronDown size={16} className="builder-field__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="builder__popover" role="listbox" aria-label={field.label}>
          {field.options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === field.value}
              className={`builder__option ${o.value === field.value ? 'builder__option--selected' : ''}`}
              onClick={() => onSelect(o.value)}
            >
              <span>{o.label}</span>
              {o.count !== undefined && <span className="builder__option-count">{o.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
