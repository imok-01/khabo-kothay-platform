import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();
const chain = {
  select: () => ({
    eq: () => ({ data: SAMPLE_ROWS, error: null }),
  }),
};

vi.mock('../client', () => ({
  requireSupabase: async () => ({
    from: (table: string) => {
      fromMock(table);
      return chain;
    },
  }),
}));

import { selectVerificationRecordsForRestaurant } from '../queries';

const SAMPLE_ROWS = [
  {
    id: 'v1',
    restaurant_id: 'R1',
    field_name: 'address',
    field_value: '123 Gulshan Ave, Dhaka',
    status: 'KK_VERIFIED',
    verification_source: 'kk-exec',
    verified_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  },
];

describe('selectVerificationRecordsForRestaurant', () => {
  beforeEach(() => {
    fromMock.mockClear();
  });

  it('reads through the anon-safe verification_records_public view (not the base table)', async () => {
    const rows = await selectVerificationRecordsForRestaurant('R1');
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('verification_records_public');
    expect(rows).toHaveLength(1);
    expect(rows[0].field_name).toBe('address');
    expect(rows[0].status).toBe('KK_VERIFIED');
  });
});
