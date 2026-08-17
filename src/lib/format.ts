import { MARKET } from './market';

/** Formats an amount as the market's currency, e.g. ৳1,500 (lakh grouping). */
export function formatCurrency(amount: number): string {
  return `${MARKET.currencySymbol}${Math.round(amount).toLocaleString(MARKET.locale)}`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}
