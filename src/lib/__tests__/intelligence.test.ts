import { beforeEach, describe, expect, it } from 'vitest';
import { getEffectiveIntelligence, attachIntelligence, attachIntelligenceToAll } from '../intelligence';
import { getSuggestions, saveSuggestions, upsertSuggestion, resolveSuggestion } from '../../store/demoDb';
// Stable fixture dataset — the pre-migration demo set (see data/demo).
import { restaurants } from '../../data/demo/demo-restaurants';
import type { IntelligenceSuggestion } from '../../domain/intelligence';

beforeEach(() => {
  localStorage.clear();
});

function suggestion(partial: Partial<IntelligenceSuggestion>): IntelligenceSuggestion {
  return {
    id: 's-1',
    restaurantId: 'arsalan',
    field: 'specialties',
    add: [],
    remove: [],
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe('getEffectiveIntelligence', () => {
  it('returns the curated seed baseline for every restaurant', () => {
    for (const r of restaurants) {
      const eff = getEffectiveIntelligence(r.id);
      expect(eff.provenance).toBe('seed');
      // curated restaurants all have at least one specialty & occasion
      expect(eff.specialties.length).toBeGreaterThan(0);
      expect(eff.bestFor.length).toBeGreaterThan(0);
    }
  });

  it('ignores pending and rejected suggestions — only approved ones count', () => {
    upsertSuggestion(suggestion({ add: ['Fine dining'] }));
    upsertSuggestion(suggestion({ id: 's-2', add: ['Desserts'], status: 'rejected' }));

    const eff = getEffectiveIntelligence('arsalan');
    expect(eff.specialties).not.toContain('Fine dining');
    expect(eff.specialties).not.toContain('Desserts');
    expect(eff.provenance).toBe('seed');
  });

  it('applies approved additions on top of the seed', () => {
    upsertSuggestion(suggestion({ add: ['Fine dining'], status: 'approved', resolvedAt: new Date().toISOString() }));
    const eff = getEffectiveIntelligence('arsalan');
    expect(eff.specialties).toContain('Biryani'); // seed preserved
    expect(eff.specialties).toContain('Fine dining'); // approved add
    expect(eff.provenance).toBe('suggested');
  });

  it('applies approved removals', () => {
    upsertSuggestion(suggestion({ remove: ['Kebab'], status: 'approved', resolvedAt: new Date().toISOString() }));
    const eff = getEffectiveIntelligence('arsalan');
    expect(eff.specialties).not.toContain('Kebab');
    expect(eff.specialties).toContain('Biryani');
  });

  it('does not duplicate an addition that already exists in the seed', () => {
    upsertSuggestion(suggestion({ add: ['Biryani'], status: 'approved', resolvedAt: new Date().toISOString() }));
    const eff = getEffectiveIntelligence('arsalan');
    expect(eff.specialties.filter((s) => s === 'Biryani')).toHaveLength(1);
  });

  it('resolveSuggestion transitions pending → approved and the merge reacts live', () => {
    upsertSuggestion(suggestion({ add: ['Fine dining'] }));
    expect(getEffectiveIntelligence('arsalan').specialties).not.toContain('Fine dining');
    resolveSuggestion('s-1', 'approved');
    expect(getEffectiveIntelligence('arsalan').specialties).toContain('Fine dining');
  });
});

describe('attachIntelligence', () => {
  it('populates the intelligence field on restaurant objects', () => {
    const arsalan = restaurants.find((r) => r.id === 'arsalan')!;
    const attached = attachIntelligence(arsalan);
    expect(attached.intelligence?.specialties).toContain('Biryani');
  });

  it('attachIntelligenceToAll covers every restaurant', () => {
    const all = attachIntelligenceToAll(restaurants);
    expect(all.every((r) => r.intelligence)).toBe(true);
    expect(getSuggestions()).toEqual([]);
    expect(saveSuggestions).toBeDefined();
  });
});
