/**
 * Validation for restaurant-created offers. Lightweight client-side checks so
 * junk text ("dadad" / "adda") is caught at the source instead of the
 * executive's inbox — the approval workflow itself is unchanged.
 *
 * Every rule is a minimum-content check; nothing here attempts semantic truth
 * (an offer can still be inaccurate and get rejected by the executive).
 */

export interface OfferDraftFields {
  title: string;
  discountLabel: string;
  value: string;
  validity: string;
  terms: string;
}

export interface OfferValidation {
  errors: Record<string, string>;
  isValid: boolean;
}

/** A discount label must actually look like a discount — not arbitrary text. */
const DISCOUNT_RE =
  /(?:[0-9]+\s*%|flat\b|\bbuy\b|\bget\b|free|\boff\b|half\s*price|bogo|৳|₹|taka)/i;

export function validateOfferDraft(fields: OfferDraftFields): OfferValidation {
  const errors: Record<string, string> = {};

  const title = fields.title.trim();
  const discountLabel = fields.discountLabel.trim();
  const value = fields.value.trim();
  const validity = fields.validity.trim();
  const terms = fields.terms.trim();

  if (!title) errors.title = 'Title is required.';
  else if (title.length < 4) errors.title = 'Title needs at least 4 characters.';

  if (!discountLabel) errors.discountLabel = 'Discount label is required.';
  else if (discountLabel.length < 3) errors.discountLabel = 'Discount label needs at least 3 characters.';
  else if (!DISCOUNT_RE.test(discountLabel)) {
    errors.discountLabel = "Include an amount — e.g. '20% off', 'Flat ৳50 off', 'Buy 1 get 1'.";
  }

  if (value && value.length < 4) errors.value = 'Value looks too short.';
  if (validity && validity.length < 4) errors.validity = 'Validity looks too short.';
  if (terms && terms.length < 10) errors.terms = 'Terms look too short — spell out the actual conditions.';

  return { errors, isValid: Object.keys(errors).length === 0 };
}
