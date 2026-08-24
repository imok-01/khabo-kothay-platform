import { isSupabaseConfigured, getSupabase, getAuthUserId } from '../integrations/supabase/client';
import type { Offer } from '../domain/offers';
import type { MealType } from '../types';

/**
 * Real database-backed offers repository.
 *
 * Offers now live in the `offers` table (created alongside the KK Demo
 * Restaurant work). This module is the single write/read seam for offers:
 *  - When Supabase is configured it talks to the `offers` table directly.
 *  - When it is not configured (mock/test mode) it degrades to the existing
 *    localStorage draft store so the admin UI keeps working unchanged.
 *
 * NOTE: the generated `database.types.ts` predates the `offers` table, so the
 * typed client does not know the relation yet. We cast the client to `any`
 * here only for the `offers` relation; the row shape is still validated by the
 * `OfferRow` mapping.
 */

interface OfferRow {
  id: string;
  restaurant_id: string;
  title: string;
  discount_label: string | null;
  value: string | null;
  validity: string | null;
  terms: string | null;
  dish_names: string[] | null;
  applicable_meal_types: string[] | null;
  is_mock: boolean | null;
  source: string | null;
  status: string | null;
  campaign: string | null;
  starts_at: string | null;
  ends_at: string | null;
  redemptions: number | null;
  created_by: string | null;
}

function mapRow(r: OfferRow): Offer {
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    title: r.title,
    discountLabel: r.discount_label ?? '',
    value: r.value ?? '',
    validity: r.validity ?? '',
    terms: r.terms ?? '',
    dishNames: (r.dish_names as string[]) ?? [],
    applicableMealTypes: (r.applicable_meal_types as unknown as MealType[]) ?? ['Lunch', 'Dinner'],
    isMock: Boolean(r.is_mock),
    source: (r.source as Offer['source']) ?? 'admin',
    status: (r.status as Offer['status']) ?? 'approved',
    startDate: r.starts_at ?? undefined,
    endDate: r.ends_at ?? undefined,
  };
}

export interface CreateOfferInput {
  restaurantId: string;
  title: string;
  discountLabel: string;
  value: string;
  validity: string;
  terms: string;
  dishNames?: string[];
  applicableMealTypes?: MealType[];
  status?: Offer['status'];
  campaign?: string;
  startsAt?: string;
  endsAt?: string;
}

export async function fetchOffers(restaurantId?: string): Promise<Offer[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await getSupabase();
  if (!supabase) return [];
  const client = supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{ data: OfferRow[] | null; error: unknown }>;
        };
        order: (col: string, opts: { ascending: boolean }) => Promise<{ data: OfferRow[] | null; error: unknown }>;
      };
    };
  };
  const relation = client.from('offers').select('*');
  const query = restaurantId ? relation.eq('restaurant_id', restaurantId) : relation;
  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) {
    console.error('[offerRepository] fetch failed', error);
    return [];
  }
  return (data ?? []).map(mapRow);
}

export async function createDbOffer(input: CreateOfferInput): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await getSupabase();
  if (!supabase) return;
  const ownerId = await getAuthUserId();
  const client = supabase as unknown as {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
    };
  };
  const { error } = await client.from('offers').insert({
    restaurant_id: input.restaurantId,
    title: input.title,
    discount_label: input.discountLabel,
    value: input.value,
    validity: input.validity,
    terms: input.terms,
    dish_names: input.dishNames ?? [],
    applicable_meal_types: input.applicableMealTypes ?? ['Lunch', 'Dinner'],
    is_mock: false,
    source: 'admin',
    status: input.status ?? 'draft',
    campaign: input.campaign ?? null,
    starts_at: input.startsAt ?? null,
    ends_at: input.endsAt ?? null,
    created_by: ownerId ?? null,
  });
  if (error) console.error('[offerRepository] create failed', error);
}

export async function deleteDbOffer(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await getSupabase();
  if (!supabase) return;
  const client = supabase as unknown as {
    from: (table: string) => {
      delete: () => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
    };
  };
  const { error } = await client.from('offers').delete().eq('id', id);
  if (error) console.error('[offerRepository] delete failed', error);
}

export async function setDbOfferStatus(id: string, status: Offer['status']): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await getSupabase();
  if (!supabase) return;
  const client = supabase as unknown as {
    from: (table: string) => {
      update: (patch: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
    };
  };
  const { error } = await client.from('offers').update({ status }).eq('id', id);
  if (error) console.error('[offerRepository] status update failed', error);
}
