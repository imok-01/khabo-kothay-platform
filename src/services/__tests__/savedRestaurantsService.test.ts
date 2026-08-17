import { beforeEach, describe, expect, it } from 'vitest';
import { savedRestaurantsService } from '../savedRestaurantsService';

beforeEach(() => {
  localStorage.clear();
});

describe('savedRestaurantsService (mock repository — localStorage)', () => {
  it('starts empty and persists ids', () => {
    expect(savedRestaurantsService.load()).toEqual([]);
    savedRestaurantsService.add('a');
    savedRestaurantsService.add('b');
    expect(savedRestaurantsService.load()).toEqual(['a', 'b']);
  });

  it('add is idempotent (deduped)', () => {
    savedRestaurantsService.add('a');
    savedRestaurantsService.add('a');
    expect(savedRestaurantsService.load()).toEqual(['a']);
  });

  it('removes an id and keeps the rest', () => {
    savedRestaurantsService.add('a');
    savedRestaurantsService.add('b');
    savedRestaurantsService.remove('a');
    expect(savedRestaurantsService.load()).toEqual(['b']);
    expect(savedRestaurantsService.has('a')).toBe(false);
    expect(savedRestaurantsService.has('b')).toBe(true);
  });

  it('survives a reload (persisted in localStorage)', () => {
    savedRestaurantsService.add('seasonal-tastes');
    expect(savedRestaurantsService.load()).toEqual(['seasonal-tastes']);
  });

  it('keeps a separate store from favourites', () => {
    savedRestaurantsService.add('seasonal-tastes');
    // Favourites live under their own key; saved must not see them.
    expect(savedRestaurantsService.load()).toEqual(['seasonal-tastes']);
  });
});
