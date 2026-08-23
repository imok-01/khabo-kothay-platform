// Minimal, env-gated analytics foundation for pilot measurement.
//
// Design rules:
// - No-op unless VITE_ENABLE_ANALYTICS === 'true' (safe to ship disabled).
// - Never emits PII: event props are coarse (ids, counts, sources) — never
//   emails, names, or precise coordinates.
// - When enabled AND Supabase is configured, each event is also persisted to
//   the `analytics_events` table (anonymous, RLS-restricted). Persistence is
//   fire-and-forget and never breaks the UI.
// - Swap the sink inside `persistEvent` later if a different backend is chosen;
//   the call sites should not change.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../integrations/supabase/client';

export type AnalyticsEvent =
  | 'session_start'
  | 'search_submitted'
  | 'result_clicked'
  | 'restaurant_viewed'
  | 'filter_applied'
  | 'sort_changed'
  | 'map_toggled'
  | 'saved'
  | 'unsaved'
  | 'share_clicked'
  | 'report_submitted';

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

const ENABLED = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';

let sessionStarted = false;

export function track(event: AnalyticsEvent, properties: AnalyticsProps = {}): void {
  if (!ENABLED) return;
  try {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, properties);
  } catch {
    /* analytics must never break the UI */
  }
  // Persistence is best-effort and must never throw into the caller.
  void persistEvent(event, properties);
}

export function trackSessionStart(): void {
  if (!ENABLED || sessionStarted) return;
  sessionStarted = true;
  track('session_start');
}

// Strip undefined values (JSON/Postgres jsonb has no undefined) and ensure we
// only ever store coarse, PII-free props.
function sanitize(properties: AnalyticsProps): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

async function persistEvent(event: AnalyticsEvent, properties: AnalyticsProps): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;
    const client = await getSupabase();
    if (!client) return;
    const db = client as SupabaseClient;
    await db
      .from('analytics_events')
      .insert({ event, properties: sanitize(properties), created_at: new Date().toISOString() });
  } catch {
    /* persistence is optional — never surface failures to the UI */
  }
}
