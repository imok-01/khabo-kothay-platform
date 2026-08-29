import { useMemo } from 'react';
import { Navigation, Clock, Wine, Moon, Users, Coffee, Cake, Bike, Wallet, Star, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Restaurant } from '../../types';
import { filterRestaurants, type FilterCriteria } from '../../lib/filter';
import { withParam } from '../../lib/exploreCriteria';
import type { GeoPoint } from '../../lib/geo';
import { Chip } from '../ui';

/**
 * The mood rail — the first thing on the page that behaves like a person.
 *
 * "Date night", "Rooftop", "Delivered to me" are not new filters: each one writes
 * exactly one existing URL param, so a mood is bookmarkable, shareable and
 * reversible in the same way every other control is.
 *
 * The rail is measured before it is rendered, and that is the important part. A
 * mood that matches nothing anywhere in the catalogue is worse than no mood at
 * all — it is a beautiful button that empties the page — so a mood whose param
 * matches zero venues catalogue-wide is not rendered. A mood that matches
 * something in general but nothing alongside the current search is rendered and
 * marked, because that is information rather than a dead end.
 *
 * The upshot is that the rail grows on its own as coverage lands: the vibe field
 * is empty in the live catalogue today, so the four vibe moods below are simply
 * absent, and they will appear the day the data does — no code change.
 */

type Mood = {
  key: string;
  label: string;
  /** The component, not an element: `Chip` sizes the mark so 14 is written once. */
  icon: LucideIcon;
  param: string;
  value: string;
  /** true for the one mood that sorts rather than filters */
  sorts?: boolean;
};

const MOODS: Mood[] = [
  { key: 'near', label: 'Near me', icon: Navigation, param: 'sortBy', value: 'distance', sorts: true },
  { key: 'open', label: 'Open right now', icon: Clock, param: 'availability', value: 'open' },
  { key: 'date', label: 'Date night', icon: Wine, param: 'vibe', value: 'Date night' },
  { key: 'roof', label: 'Rooftop', icon: Sun, param: 'vibe', value: 'Rooftop' },
  { key: 'late', label: 'Late night', icon: Moon, param: 'vibe', value: 'Late-night' },
  { key: 'family', label: 'Family table', icon: Users, param: 'family', value: '1' },
  { key: 'breakfast', label: 'Breakfast', icon: Coffee, param: 'mealType', value: 'Breakfast' },
  { key: 'dessert', label: 'Something sweet', icon: Cake, param: 'mealType', value: 'Dessert' },
  { key: 'delivery', label: 'Delivered to me', icon: Bike, param: 'delivery', value: '1' },
  { key: 'value', label: 'Under ৳1,500 for two', icon: Wallet, param: 'maxPrice', value: '1500' },
  { key: 'loved', label: 'City favourites', icon: Star, param: 'rating', value: '4.5' },
];

export interface MoodRailProps {
  restaurants: Restaurant[];
  criteria: FilterCriteria;
  values: Record<string, string>;
  onSet: (key: string, value: string) => void;
  geoReference: GeoPoint | null;
  geoReady: boolean;
  onRequestGeo: () => void;
}

export default function MoodRail({
  restaurants,
  criteria,
  values,
  onSet,
  geoReference,
  geoReady,
  onRequestGeo,
}: MoodRailProps) {
  // Catalogue-wide reach. Depends only on the data, so it survives every
  // keystroke — and it decides which moods exist at all.
  const reach = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of MOODS) {
      if (m.sorts) continue;
      map.set(m.key, filterRestaurants(restaurants, withParam({}, m.param, m.value)).length);
    }
    return map;
  }, [restaurants]);

  // Reach alongside everything else currently asked for.
  const here = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of MOODS) {
      if (m.sorts) continue;
      map.set(m.key, filterRestaurants(restaurants, withParam(criteria, m.param, m.value, geoReference)).length);
    }
    return map;
  }, [restaurants, criteria, geoReference]);

  const shown = MOODS.filter((m) => m.sorts || (reach.get(m.key) ?? 0) > 0);
  if (shown.length === 0) return null;

  return (
    <div className="disc__moods" role="group" aria-label="Moods">
      {shown.map((m) => {
        const on = (values[m.param] ?? '') === m.value;
        const empty = !m.sorts && !on && (here.get(m.key) ?? 0) === 0;
        return (
          <Chip
            key={m.key}
            className="disc__mood"
            icon={m.icon}
            selected={on}
            empty={empty}
            title={empty ? 'Nothing matches this alongside your current search' : undefined}
            onClick={() => {
              // "Near me" is honest about needing a location: it asks for one and
              // switches the order at the same time, so the click always does
              // something even before permission comes back.
              if (m.sorts && !geoReady) onRequestGeo();
              onSet(m.param, on ? '' : m.value);
            }}
          >
            {m.label}
          </Chip>
        );
      })}
    </div>
  );
}
