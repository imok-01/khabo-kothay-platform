/**
 * Discovery facts.
 *
 * Approved, source-backed facts about a restaurant ("Why consider this
 * place"). The UI shows only the fact text — never the internal confidence,
 * evidence, or source metadata. The type mirrors the approved
 * `restaurant_discovery_facts` schema at the domain level so the page layer
 * stays independent of the integration layer.
 */

export type DiscoveryFactType =
  | 'HISTORY'
  | 'EXPERIENCE'
  | 'CONCEPT'
  | 'LOCATION'
  | 'IDENTITY'
  | 'OTHER';

export interface DiscoveryFact {
  id: string;
  restaurantId: string;
  factText: string;
  factType: DiscoveryFactType;
}