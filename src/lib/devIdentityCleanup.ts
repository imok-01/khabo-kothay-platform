/**
 * Development-mode identity cleanup.
 * Previous buggy builds created stale generic "Dev User XXXX" entries
 * in khabo-kothay:demo:users that share a phone with a demo seed account
 * but have a different UUID id. With phone-first lookup those stale entries
 * are shadowed, but to guarantee clean QA we purge them once.
 *
 * ONLY runs when VITE_DEV_AUTH_MOCK=true. No effect on production Supabase auth.
 */

import { DEMO_USER_IDS, DEMO_ACCOUNT_CREDENTIALS } from '../data/demoAccounts';

const USERS_KEY = 'khabo-kothay:demo:users';
const CLEANUP_MARKER = 'khabo-kothay:dev:cleanup-v1';

function normalizePhoneForCleanup(phone: string): string | null {
  try {
    let normalized = phone.trim().replace(/[\s\-()]/g, '');
    const hasPlus = normalized.startsWith('+');
    if (hasPlus) normalized = normalized.slice(1);
    normalized = normalized.replace(/\D/g, '');
    let canonical: string;
    if (normalized.startsWith('8801') && normalized.length === 13) {
      canonical = '+' + normalized;
    } else if (normalized.startsWith('01') && normalized.length === 11) {
      canonical = '+880' + normalized.slice(1);
    } else if (normalized.startsWith('1') && normalized.length === 10) {
      canonical = '+880' + normalized;
    } else {
      return null;
    }
    if (!/^\+8801[0-9]{9}$/.test(canonical)) return null;
    return canonical;
  } catch {
    return null;
  }
}

export function runDevIdentityCleanup(): void {
  if (import.meta.env.VITE_DEV_AUTH_MOCK !== 'true') return;
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  // run once per browser - idempotent, safe to skip if already cleaned
  try {
    if (localStorage.getItem(CLEANUP_MARKER) === 'done') return;
  } catch {
    // ignore
  }

  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      try { localStorage.setItem(CLEANUP_MARKER, 'done'); } catch {}
      return;
    }
    const parsed = JSON.parse(raw) as { byId?: Record<string, any> };
    const byId = parsed?.byId;
    if (!byId || typeof byId !== 'object') {
      try { localStorage.setItem(CLEANUP_MARKER, 'done'); } catch {}
      return;
    }

    const demoIds = new Set(DEMO_USER_IDS);
    const demoPhones = new Set<string>();
    for (const acc of DEMO_ACCOUNT_CREDENTIALS) {
      const n = normalizePhoneForCleanup(acc.contact);
      if (n) demoPhones.add(n);
    }

    let changed = false;
    for (const [id, user] of Object.entries(byId)) {
      if (demoIds.has(id)) continue; // keep real demo seeds
      const contact: string | undefined = (user as any)?.contact;
      if (!contact) continue;
      const norm = normalizePhoneForCleanup(contact);
      if (norm && demoPhones.has(norm)) {
        // stale generic that duplicates a demo phone - purge it
        delete byId[id];
        changed = true;
        // also clean orphaned rewards/favorites/saved keys for this stale id (best effort)
        try {
          localStorage.removeItem(`khabo-kothay:demo:rewards:${id}`);
          localStorage.removeItem(`khabo-kothay:favorites:${id}`);
          localStorage.removeItem(`khabo-kothay:saved-restaurants:${id}`);
        } catch {}
      }
    }

    if (changed) {
      localStorage.setItem(USERS_KEY, JSON.stringify({ byId }));
    }
    try { localStorage.setItem(CLEANUP_MARKER, 'done'); } catch {}
  } catch {
    // cleanup must never break app startup
    try { localStorage.setItem(CLEANUP_MARKER, 'done'); } catch {}
  }
}
