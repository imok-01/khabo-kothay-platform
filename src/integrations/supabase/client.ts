import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Supabase client setup.
 *
 * The client is ONLY created when both `VITE_SUPABASE_URL` and
 * `VITE_SUPABASE_ANON_KEY` are present (see .env.example). Without them the
 * app keeps using the mock repository layer — this module never performs a
 * network call, so the dev server, tests and the build-time prerenderer are
 * unaffected by its presence.
 *
 * `@supabase/supabase-js` is dynamically imported so it is code-split into
 * its own chunk and only fetched when a Supabase backend is actually
 * configured — it never inflates the main bundle for the mock path.
 *
 * The anon key is a public client key (safe to ship to the browser). It must
 * be paired with Supabase Row Level Security on the tables the app reads —
 * RLS policies are a separate, approved step and are NOT implemented here.
 */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || undefined;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || undefined;

/** True when both URL and anon key are configured. */
export function isSupabaseConfigured(): boolean {
  // Unit tests always exercise the mock repositories — a developer's local
  // .env must not flip the app into Supabase mode during the test run
  // (repository seams select on this flag at module load).
  if (import.meta.env.MODE === 'test') return false;
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let clientPromise: Promise<SupabaseClient<Database> | null> | null = null;

/**
 * The typed Supabase client (lazily created), or null when not configured.
 * Repository code must check `isSupabaseConfigured()` (or use
 * `requireSupabase()`) before calling it — never assume a backend exists.
 */
export function getSupabase(): Promise<SupabaseClient<Database> | null> {
  if (!isSupabaseConfigured()) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        auth: {
          // Persist the Supabase session alongside the app's demo session so
          // a future auth swap keeps users signed in across reloads.
          persistSession: true,
          autoRefreshToken: true,
        },
      }),
    );
  }
  return clientPromise;
}

/**
 * Async guard for code paths that can only run against a configured backend.
 * The active repositories select the mock implementation when Supabase is
 * not configured, so this should never fire in the current app — it exists
 * to make misconfiguration loud instead of silently returning nulls.
 */
export async function requireSupabase(): Promise<SupabaseClient<Database>> {
  const client = await getSupabase();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, ' +
        'or keep using the mock repository layer.',
    );
  }
  return client;
}

/**
 * Resolve the real Supabase auth user id for the current session, or null when
 * Supabase is not configured or nobody is signed in. Used to attribute
 * ownership-sensitive writes (e.g. restaurant applications) to the verified
 * identity — never the demo/local id — so RLS `auth.uid()` checks hold.
 */
export async function getAuthUserId(): Promise<string | null> {
  const client = await getSupabase();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
