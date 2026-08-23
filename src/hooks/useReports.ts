// Report persistence for the consumer "Report incorrect information" flow.
//
// Reliability hardening for 4.3C.6C: restaurant reports are stored in Supabase
// (`restaurant_reports`) when configured, replacing the previous localStorage-
// only behaviour so KK admins can actually see them. Review-moderation flags
// (targetType !== 'restaurant') stay in the local store — no moderation
// workflow is built here.
//
// The public API (upsertFlag / useFlags) is unchanged so existing call sites
// (RestaurantPage submit, ExecutiveAdminPage visibility) keep working.

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../integrations/supabase/client';
import { type FlagEntry, upsertFlag as localUpsert, useFlags as useLocalFlags } from '../store/demoDb';

interface ReportRow {
  id: string;
  restaurant_id: string;
  reason: string;
  status: string;
  created_at: string;
}

/** Map a Supabase report row back into the shared FlagEntry shape. */
export function mapReportRow(row: ReportRow): FlagEntry {
  return {
    id: row.id,
    targetType: 'restaurant',
    targetId: row.restaurant_id,
    reason: row.reason,
    status: row.status === 'resolved' ? 'resolved' : 'pending',
    at: row.created_at,
  };
}

/**
 * Submit a flag. Restaurant reports go to Supabase when configured; everything
 * else (e.g. review-moderation flags) stays in the local store. Falls back to
 * the local store if the Supabase write fails.
 */
export async function upsertFlag(flag: FlagEntry): Promise<void> {
  if (isSupabaseConfigured() && flag.targetType === 'restaurant') {
    try {
      const client = await getSupabase();
      if (client) {
        const db = client as SupabaseClient;
        await db.from('restaurant_reports').insert({
          id: flag.id,
          restaurant_id: flag.targetId,
          reason: flag.reason,
          status: flag.status,
          created_at: flag.at,
        });
        return;
      }
    } catch {
      /* fall through to local store */
    }
  }
  localUpsert(flag);
}

/**
 * Admin-visible flags: local store (review moderation etc.) merged with
 * restaurant reports pulled from Supabase when configured. Falls back to local
 * only when Supabase is unavailable.
 */
export function useFlags(): FlagEntry[] {
  const local = useLocalFlags();
  const [remote, setRemote] = useState<FlagEntry[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    getSupabase()
      .then(async (client) => {
        if (cancelled || !client) return;
        const db = client as SupabaseClient;
        try {
          const { data, error } = await db
            .from('restaurant_reports')
            .select('id, restaurant_id, reason, status, created_at')
            .order('created_at', { ascending: false });
          if (cancelled || error || !data) return;
          setRemote((data as ReportRow[]).map(mapReportRow));
        } catch {
          /* keep local-only */
        }
      })
      .catch(() => {
        /* keep local-only */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return [...remote, ...local];
}
