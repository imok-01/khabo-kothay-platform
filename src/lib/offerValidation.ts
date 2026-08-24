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

/**
 * A discount label must actually look like a discount — not arbitrary text.
 * Accept a numeric value (the discount amount itself, e.g. "76", "500", "20"),
 * a percentage, a currency amount (৳/₹), or a recognisable offer phrase.
 * Reject only empty/whitespace input or meaningless text (e.g. "adda").
 */
const DISCOUNT_RE =
  /(?:\d|৳|₹|%|free|buy|get|off|flat|half\s*price|bogo|taka|save|complimentary|gift)/i;

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
  else if (!DISCOUNT_RE.test(discountLabel)) {
    errors.discountLabel = "Include an amount — e.g. '20% off', 'Flat ৳50 off', 'Buy 1 get 1'.";
  }

  if (value) {
    // Validate by business meaning, not character count: the value must carry a
    // positive number (e.g. 20, 100, 500, "20% off", "Save up to ৳400").
    const numeric = Number(value.replace(/[^0-9.]/g, ''));
    if (!/\d/.test(value)) errors.value = 'Add the offer value — e.g. 20%, ৳100, or 500.';
    else if (Number.isNaN(numeric) || numeric <= 0) errors.value = 'Value must be a positive number.';
  }
  if (validity && validity.length < 4) errors.validity = 'Validity looks too short.';
  if (terms && terms.length < 10) errors.terms = 'Terms look too short — spell out the actual conditions.';

  return { errors, isValid: Object.keys(errors).length === 0 };
}
