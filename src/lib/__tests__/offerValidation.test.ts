import { describe, expect, it } from 'vitest';
import { validateOfferDraft } from '../offerValidation';

const valid = {
  title: 'Weekend biryani combo',
  discountLabel: '20% off',
  value: 'Save up to ৳400',
  validity: 'Weekdays, 12–4 PM',
  terms: 'Valid on dine-in only. Cannot be combined with other offers.',
};

describe('validateOfferDraft', () => {
  it('accepts a well-formed offer', () => {
    const result = validateOfferDraft(valid);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('requires a title of at least 4 characters', () => {
    expect(validateOfferDraft({ ...valid, title: '' }).errors.title).toBe('Title is required.');
    expect(validateOfferDraft({ ...valid, title: 'add' }).errors.title).toBe('Title needs at least 4 characters.');
    expect(validateOfferDraft({ ...valid, title: 'adda' }).isValid).toBe(true);
  });

  it('rejects a discount label that is not a discount', () => {
    const result = validateOfferDraft({ ...valid, discountLabel: 'adda' });
    expect(result.isValid).toBe(false);
    expect(result.errors.discountLabel).toMatch(/Include an amount/);
  });

  it('accepts a discount label that looks like a discount', () => {
    for (const label of ['20% off', 'Flat ৳50 off', 'Buy 1 get 1', 'Free dessert', 'Half price', 'BOGO']) {
      expect(validateOfferDraft({ ...valid, discountLabel: label }).isValid).toBe(true);
    }
  });

  it('requires a non-empty discount label', () => {
    expect(validateOfferDraft({ ...valid, discountLabel: '' }).errors.discountLabel).toBe('Discount label is required.');
  });

  it('accepts numeric/currency/percentage discount labels (no minimum length)', () => {
    for (const label of ['76', '500', '20', '20%', '৳100 off', '৳250']) {
      expect(validateOfferDraft({ ...valid, discountLabel: label }).isValid).toBe(true);
    }
  });

  it('rejects whitespace-only discount labels', () => {
    expect(validateOfferDraft({ ...valid, discountLabel: '   ' }).errors.discountLabel).toBe(
      'Discount label is required.',
    );
  });

  it('validates the value by meaning (number present), not character count', () => {
    // A value with no number is rejected with actionable guidance.
    expect(validateOfferDraft({ ...valid, value: 'abc' }).errors.value).toBe(
      'Add the offer value — e.g. 20%, ৳100, or 500.',
    );
    // Numeric values (the reported BUG 7 cases) are accepted despite being short.
    expect(validateOfferDraft({ ...valid, value: '20' }).errors.value).toBeUndefined();
    expect(validateOfferDraft({ ...valid, value: '100' }).errors.value).toBeUndefined();
    expect(validateOfferDraft({ ...valid, value: '500' }).errors.value).toBeUndefined();
    expect(validateOfferDraft({ ...valid, value: 'Save up to ৳400' }).errors.value).toBeUndefined();
    // Validity and terms still guard against empty/short free text.
    expect(validateOfferDraft({ ...valid, validity: 'x' }).errors.validity).toBe('Validity looks too short.');
    expect(validateOfferDraft({ ...valid, terms: 'short' }).errors.terms).toMatch(/Terms look too short/);
  });

  it('treats empty optional fields as acceptable (defaults apply downstream)', () => {
    expect(validateOfferDraft({ ...valid, value: '', validity: '', terms: '' }).isValid).toBe(true);
  });
});