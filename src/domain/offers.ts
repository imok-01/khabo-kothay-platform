import type { MealType } from '../types';

export interface Offer {
  id: string;
  restaurantId: string;
  title: string;
  /** short headline, e.g. "20% off lunch" */
  discountLabel: string;
  /** value claim, e.g. "Save up to ৳400" */
  value: string;
  validity: string;
  terms: string;
  /** Dishes this offer actually involves (matched to the menu by name), so
   *  users can check a dish's price history before trusting the deal. */
  dishNames?: string[];
  applicableMealTypes: MealType[];
  /** explicitly marks demo data so it can't be mistaken for real offers */
  isMock: boolean;
  /** where this offer came from — seeded demo or a restaurant admin draft */
  source: 'seed' | 'admin';
  /** approval workflow state for admin-created offers */
  status: 'approved' | 'pending';
  /** start/end dates for admin offers (demo approval window) */
  startDate?: string;
  endDate?: string;
}
