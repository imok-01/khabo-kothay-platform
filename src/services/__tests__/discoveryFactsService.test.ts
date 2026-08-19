import { describe, expect, it } from 'vitest';
import { discoveryFactsService } from '../discoveryFactsService';

// In test mode `isSupabaseConfigured()` returns false, so the active
// repository is the mock. The demo store has no discovery facts, so the
// honest result is an empty list — the page hides the section instead of
// inventing content.
describe('discoveryFactsService (mock repository)', () => {
  it('returns an empty list for any restaurant in the demo store', async () => {
    await expect(discoveryFactsService.fetchApprovedForRestaurant('star-kebab-house')).resolves.toEqual([]);
  });
});