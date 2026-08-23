import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock('../../integrations/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: async () => ({ from: fromMock }),
}));

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disabled mode does nothing (no Supabase insert, no throw)', async () => {
    const { track, trackSessionStart } = await import('../analytics');
    track('search_submitted', { query: 'biryani' });
    trackSessionStart();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('enabled mode persists events to analytics_events', async () => {
    vi.stubEnv('VITE_ENABLE_ANALYTICS', 'true');
    vi.resetModules();
    const { track } = await import('../analytics');
    track('restaurant_viewed', { id: 'r1' });
    // allow the fire-and-forget persist promise to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(fromMock).toHaveBeenCalledWith('analytics_events');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'restaurant_viewed', properties: { id: 'r1' } }),
    );
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
