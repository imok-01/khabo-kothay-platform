import { describe, it, expect } from 'vitest';
import { getSuggestions } from '../searchSuggestions';
import type { Restaurant } from '../../types';

const make = (id: string, name: string, over: Partial<Restaurant> = {}): Restaurant =>
  ({
    id,
    name,
    cuisines: [],
    location: '',
    specialty: '',
    vibes: [],
    rating: 0,
    ...over,
  } as Restaurant);

const restaurants: Restaurant[] = [
  make('1', 'Burger King Gulshan', { location: 'Gulshan' }),
  make('2', 'Biryani Bonanza', { location: 'Banani' }),
  make('3', 'Chinese Cafe', { location: 'Dhanmondi' }),
];

describe('getSuggestions', () => {
  const opts = {
    restaurants,
    cuisines: ['Italian', 'Chinese', 'Burgers'],
    neighborhoods: ['Gulshan', 'Banani', 'Dhanmondi'],
  };

  it('returns nothing for an empty query', () => {
    expect(getSuggestions('   ', opts)).toEqual([]);
  });

  it('suggests restaurant names', () => {
    const out = getSuggestions('burger', opts);
    expect(out.some((s) => s.type === 'Restaurant' && s.value === 'Burger King Gulshan')).toBe(true);
  });

  it('suggests cuisines, areas and specialties', () => {
    const out = getSuggestions('chinese', opts);
    expect(out.some((s) => s.type === 'Cuisine' && s.value === 'Chinese')).toBe(true);
    expect(out.some((s) => s.type === 'Area' && s.value === 'Chinese')).toBe(false);
    const out2 = getSuggestions('gulshan', opts);
    expect(out2.some((s) => s.type === 'Area' && s.value === 'Gulshan')).toBe(true);
  });

  it('is case-insensitive', () => {
    const out = getSuggestions('BURGER', opts);
    expect(out.some((s) => s.type === 'Restaurant')).toBe(true);
  });

  it('caps total results', () => {
    const many = Array.from({ length: 20 }, (_, i) => make(`r${i}`, `Place ${i} food`));
    const out = getSuggestions('food', { ...opts, restaurants: many });
    expect(out.length).toBeLessThanOrEqual(8);
  });
});
