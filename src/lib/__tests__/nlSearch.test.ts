import { describe, expect, it } from 'vitest';
import { parseNaturalLanguage } from '../nlSearch';

describe('parseNaturalLanguage', () => {
  it('extracts cuisine, price, location and meal from a rich query', () => {
    const p = parseNaturalLanguage('biryani under ₹500 near Gulshan tonight');
    expect(p.cuisine).toBe('Biryani');
    expect(p.maxPriceForTwo).toBe(500);
    expect(p.location).toBe('Gulshan');
    expect(p.mealType).toBe('Dinner');
    expect(p.query).toBe('');
  });

  it('keeps unknown words as free text', () => {
    const p = parseNaturalLanguage('smoky biryani near Banani');
    expect(p.cuisine).toBe('Biryani');
    expect(p.location).toBe('Banani');
    expect(p.query).toBe('smoky');
  });

  it('understands price with BDT or legacy rupee symbols', () => {
    expect(parseNaturalLanguage('under ৳500 dinner').maxPriceForTwo).toBe(500);
    expect(parseNaturalLanguage('under 1000 dinner').maxPriceForTwo).toBe(1000);
    expect(parseNaturalLanguage('less than ₹300').maxPriceForTwo).toBe(300);
    expect(parseNaturalLanguage('under 700 taka lunch').maxPriceForTwo).toBe(700);
  });

  it('understands budget tier words', () => {
    expect(parseNaturalLanguage('cheap biryani').budget).toBe('Budget');
    expect(parseNaturalLanguage('mid range italian').budget).toBe('Mid-range');
    expect(parseNaturalLanguage('luxury thai').budget).toBe('Luxury');
  });

  it('matches multi-word cuisines correctly', () => {
    expect(parseNaturalLanguage('north indian thali').cuisine).toBe('North Indian');
    expect(parseNaturalLanguage('street food near gariahat').cuisine).toBe('Street Food');
  });

  it('understands diet terms', () => {
    expect(parseNaturalLanguage('pure veg lunch').vegOnly).toBe(true);
    expect(parseNaturalLanguage('vegetarian').vegOnly).toBe(true);
    expect(parseNaturalLanguage('non veg dinner').nonVegOnly).toBe(true);
    expect(parseNaturalLanguage('veg').vegOnly).toBe(true);
  });

  it('understands open-now and near-me', () => {
    expect(parseNaturalLanguage('open now café').openNow).toBe(true);
    expect(parseNaturalLanguage('café near me').nearMe).toBe(true);
  });

  it('understands delivery and outdoor seating', () => {
    expect(parseNaturalLanguage('biryani delivery').delivery).toBe(true);
    expect(parseNaturalLanguage('outdoor lunch').outdoorSeating).toBe(true);
    expect(parseNaturalLanguage('rooftop dinner').outdoorSeating).toBe(true);
  });

  it('understands vibe terms', () => {
    expect(parseNaturalLanguage('date night restaurant').vibe).toBe('Date night');
    expect(parseNaturalLanguage('quiet café').vibe).toBe('Quiet');
    expect(parseNaturalLanguage('work friendly place').vibe).toBe('Work-friendly');
    expect(parseNaturalLanguage('family lunch').vibe).toBe('Family');
    expect(parseNaturalLanguage('live music dinner').vibe).toBe('Live music');
  });

  it('reports what it understood for the UI', () => {
    const p = parseNaturalLanguage('biryani under ₹500 near Gulshan tonight');
    expect(p.understood).toContain('Biryani');
    expect(p.understood).toContain('under ৳500');
    expect(p.understood).toContain('Gulshan');
    expect(p.understood).toContain('Dinner');
  });

  it('returns empty structured terms for plain text', () => {
    const p = parseNaturalLanguage('smoky grilled chicken');
    expect(p.cuisine).toBeUndefined();
    expect(p.maxPriceForTwo).toBeUndefined();
    expect(p.location).toBeUndefined();
    expect(p.query).toBe('smoky grilled chicken');
  });

  it('is case-insensitive', () => {
    const p = parseNaturalLanguage('BIRYANI NEAR GULSHAN');
    expect(p.cuisine).toBe('Biryani');
    expect(p.location).toBe('Gulshan');
  });
});
