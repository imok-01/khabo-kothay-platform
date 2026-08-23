import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock('../../integrations/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: async () => ({ from: fromMock }),
}));

import { upsertFlag, mapReportRow } from '../useReports';

describe('useReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes restaurant reports to Supabase (restaurant_reports) and not the local store', async () => {
    const flag = {
      id: 'flag-r1-wrong-address',
      targetType: 'restaurant',
      targetId: 'r1',
      reason: 'Wrong address',
      status: 'pending',
      at: '2026-01-01T00:00:00Z',
    };
    await upsertFlag(flag as never);
    expect(fromMock).toHaveBeenCalledWith('restaurant_reports');
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'flag-r1-wrong-address',
        restaurant_id: 'r1',
        reason: 'Wrong address',
        status: 'pending',
      }),
    );
  });

  it('keeps non-restaurant flags (e.g. review moderation) in the local store', async () => {
    const flag = {
      id: 'flag-rev1',
      targetType: 'review',
      targetId: 'rev1',
      reason: 'Reported by a user',
      status: 'pending',
      at: '2026-01-01T00:00:00Z',
    };
    await upsertFlag(flag as never);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('maps a report row to a FlagEntry', () => {
    const entry = mapReportRow({
      id: 'x',
      restaurant_id: 'r9',
      reason: 'Closed restaurant',
      status: 'pending',
      created_at: '2026-02-02T00:00:00Z',
    });
    expect(entry).toEqual({
      id: 'x',
      targetType: 'restaurant',
      targetId: 'r9',
      reason: 'Closed restaurant',
      status: 'pending',
      at: '2026-02-02T00:00:00Z',
    });
  });
});
