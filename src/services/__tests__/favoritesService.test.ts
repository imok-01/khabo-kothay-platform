import { beforeEach, describe, expect, it } from 'vitest';
import { favoritesService } from '../favoritesService';

beforeEach(() => {
  localStorage.clear();
});

describe('favoritesService (mock repository — localStorage)', () => {
  it('starts empty and persists ids', () => {
    expect(favoritesService.load()).toEqual([]);
    favoritesService.add('a');
    favoritesService.add('b');
    expect(favoritesService.load()).toEqual(['a', 'b']);
  });

  it('add is idempotent (deduped)', () => {
    favoritesService.add('a');
    favoritesService.add('a');
    expect(favoritesService.load()).toEqual(['a']);
  });

  it('removes an id and keeps the rest', () => {
    favoritesService.add('a');
    favoritesService.add('b');
    favoritesService.remove('a');
    expect(favoritesService.load()).toEqual(['b']);
    expect(favoritesService.has('a')).toBe(false);
    expect(favoritesService.has('b')).toBe(true);
  });

  it('survives a reload (persisted in localStorage)', () => {
    favoritesService.add('seasonal-tastes');
    // New read from the same storage — no provider reset needed since the
    // mock repository reads localStorage on every call.
    expect(favoritesService.load()).toEqual(['seasonal-tastes']);
  });
});
