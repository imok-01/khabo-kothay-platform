import { beforeEach, describe, expect, it } from 'vitest';
import { favoritesService } from '../favoritesService';

beforeEach(() => {
  localStorage.clear();
});

describe('favoritesService (mock repository — localStorage)', () => {
  it('starts empty and persists ids', () => {
    expect(favoritesService.load(null)).toEqual([]);
    favoritesService.add(null, 'a');
    favoritesService.add(null, 'b');
    expect(favoritesService.load(null)).toEqual(['a', 'b']);
  });

  it('add is idempotent (deduped)', () => {
    favoritesService.add(null, 'a');
    favoritesService.add(null, 'a');
    expect(favoritesService.load(null)).toEqual(['a']);
  });

  it('removes an id and keeps the rest', () => {
    favoritesService.add(null, 'a');
    favoritesService.add(null, 'b');
    favoritesService.remove(null, 'a');
    expect(favoritesService.load(null)).toEqual(['b']);
    expect(favoritesService.has(null, 'a')).toBe(false);
    expect(favoritesService.has(null, 'b')).toBe(true);
  });

  it('survives a reload (persisted in localStorage)', () => {
    favoritesService.add(null, 'seasonal-tastes');
    // New read from the same storage — no provider reset needed since the
    // mock repository reads localStorage on every call.
    expect(favoritesService.load(null)).toEqual(['seasonal-tastes']);
  });

  it('keeps separate stores per user', () => {
    favoritesService.add('user-1', 'a');
    favoritesService.add('user-2', 'b');
    expect(favoritesService.load('user-1')).toEqual(['a']);
    expect(favoritesService.load('user-2')).toEqual(['b']);
  });
});