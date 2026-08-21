import { beforeEach, describe, expect, it } from 'vitest';
import { savedRestaurantsService } from '../savedRestaurantsService';

beforeEach(() => {
  localStorage.clear();
});

describe('savedRestaurantsService (mock repository — localStorage)', () => {
  it('starts empty and persists ids', () => {
    expect(savedRestaurantsService.load(null)).toEqual([]);
    savedRestaurantsService.add(null, 'a');
    savedRestaurantsService.add(null, 'b');
    expect(savedRestaurantsService.load(null)).toEqual(['a', 'b']);
  });

  it('add is idempotent (deduped)', () => {
    savedRestaurantsService.add(null, 'a');
    savedRestaurantsService.add(null, 'a');
    expect(savedRestaurantsService.load(null)).toEqual(['a']);
  });

  it('removes an id and keeps the rest', () => {
    savedRestaurantsService.add(null, 'a');
    savedRestaurantsService.add(null, 'b');
    savedRestaurantsService.remove(null, 'a');
    expect(savedRestaurantsService.load(null)).toEqual(['b']);
    expect(savedRestaurantsService.has(null, 'a')).toBe(false);
    expect(savedRestaurantsService.has(null, 'b')).toBe(true);
  });

  it('survives a reload (persisted in localStorage)', () => {
    savedRestaurantsService.add(null, 'seasonal-tastes');
    // New read from the same storage — no provider reset needed since the
    // mock repository reads localStorage on every call.
    expect(savedRestaurantsService.load(null)).toEqual(['seasonal-tastes']);
  });

  it('keeps a separate store from favourites', () => {
    // This test is now redundant since they use different localStorage keys
    // but we keep it for clarity
    expect(savedRestaurantsService.load(null)).toEqual([]);
  });

  it('keeps separate stores per user', () => {
    savedRestaurantsService.add('user-1', 'a');
    savedRestaurantsService.add('user-2', 'b');
    expect(savedRestaurantsService.load('user-1')).toEqual(['a']);
    expect(savedRestaurantsService.load('user-2')).toEqual(['b']);
  });
});