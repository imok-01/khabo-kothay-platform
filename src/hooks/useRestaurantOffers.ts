import { useCallback, useEffect, useState } from 'react';
import type { Offer } from '../domain/offers';
import {
  fetchOffers,
  createDbOffer,
  deleteDbOffer,
  setDbOfferStatus,
  type CreateOfferInput,
} from '../repositories/offerRepository';
import { resolveRestaurantUuid } from '../repositories/restaurantRepository';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import { getAdminOffers, upsertAdminOffer, deleteAdminOffer } from '../store/demoDb';
import { uid } from '../lib/uid';

export type CreateOfferInputData = Omit<CreateOfferInput, 'restaurantId'>;

/**
 * Restaurant-admin offers, backed by the `offers` table when Supabase is
 * configured and by the local draft store otherwise. The restaurant id passed
 * in is the frontend slug; it is resolved to the database UUID for queries.
 */
export function useRestaurantOffers(restaurantId: string | undefined) {
  const configured = isSupabaseConfigured();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) {
      setOffers([]);
      return;
    }
    if (!configured) {
      setOffers(
        getAdminOffers()
          .filter((o) => o.restaurantId === restaurantId)
          .map<Offer>((o) => ({
            id: o.id,
            restaurantId: o.restaurantId,
            title: o.title,
            discountLabel: o.discountLabel,
            value: o.value,
            validity: o.validity,
            terms: o.terms,
            dishNames: [],
            applicableMealTypes: ['Lunch', 'Dinner'],
            isMock: true,
            source: 'admin',
            status: (o.status as Offer['status']) ?? 'approved',
          })),
      );
      return;
    }
    setLoading(true);
    try {
      const uuid = await resolveRestaurantUuid(restaurantId);
      setOffers(uuid ? await fetchOffers(uuid) : []);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, configured]);

  useEffect(() => {
    load();
  }, [load]);

  const createOffer = useCallback(
    async (input: CreateOfferInputData) => {
      if (!configured) {
        upsertAdminOffer({
          id: uid('off'),
          restaurantId: restaurantId!,
          title: input.title,
          discountLabel: input.discountLabel,
          value: input.value,
          validity: input.validity,
          terms: input.terms,
          status: (input.status as 'draft') ?? 'draft',
          createdAt: new Date().toISOString(),
        });
        load();
        return;
      }
      const uuid = await resolveRestaurantUuid(restaurantId!);
      if (!uuid) return;
      await createDbOffer({ restaurantId: uuid, ...input });
      load();
    },
    [configured, restaurantId, load],
  );

  const submitOffer = useCallback(
    async (id: string) => {
      if (!configured) {
        const o = getAdminOffers().find((x) => x.id === id);
        if (o) upsertAdminOffer({ ...o, status: 'pending' });
        load();
        return;
      }
      await setDbOfferStatus(id, 'pending');
      load();
    },
    [configured, load],
  );

  const removeOffer = useCallback(
    async (id: string) => {
      if (!configured) {
        deleteAdminOffer(id);
        load();
        return;
      }
      await deleteDbOffer(id);
      load();
    },
    [configured, load],
  );

  return { offers, loading, createOffer, submitOffer, removeOffer };
}
