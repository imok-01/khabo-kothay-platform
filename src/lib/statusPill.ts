/**
 * One state mark for the whole console.
 *
 * Two generations of state label shipped side by side. `.admin-status`
 * (phase3.css) is a 999px capitalised pill; `.status-pill` (console.css) is
 * the current one — a 6px rectangle that shares `.kk-badge`'s geometry, so a
 * state and a tag in the same row line up instead of missing each other by a
 * pixel and a half. The restaurant console had already moved: 57 `.status-pill`
 * against zero `.admin-status`. The executive console had not: 12
 * `.admin-status`, and it was the only page in the product still using it.
 *
 * Worse than the shape mismatch was what the old classes *meant*. Roles were
 * being painted with decision colours — `admin-status--pending` for a
 * restaurant owner, `--approved` for an executive — so an owner account read
 * as "awaiting approval" and a diner as "published". That is the same class of
 * defect as a hard-coded write-failure reason: a confident mark that states
 * something untrue about the row it sits on.
 *
 * So this maps a *recorded state word* to a tone, and nothing else. A role is
 * not a state and does not belong here — it goes through `Badge`, which is the
 * primitive for a fact about a thing rather than a step in a process.
 */

export type PillTone = 'neutral' | 'ok' | 'pending' | 'danger' | 'info';

/**
 * Every state word the console actually prints, lower-cased. Deliberately a
 * closed list with a neutral fallback: an unrecognised state gets the quiet
 * mark rather than being guessed into a colour that might contradict it.
 */
const TONES: Record<string, PillTone> = {
  // Settled, and the settlement was favourable.
  published: 'ok',
  approved: 'ok',
  verified: 'ok',
  resolved: 'ok',
  connected: 'ok',
  live: 'ok',
  // Waiting on a person.
  pending: 'pending',
  'pending review': 'pending',
  pending_review: 'pending',
  submitted: 'pending',
  recorded: 'pending',
  unverified: 'pending',
  'recorded · unverified': 'pending',
  changed: 'pending',
  // Settled against.
  rejected: 'danger',
  removed: 'danger',
  flagged: 'danger',
  failed: 'danger',
  // Something happened that is neither a yes nor a no.
  contacted: 'info',
  added: 'ok',
  // Explicitly quiet.
  draft: 'neutral',
  unchanged: 'neutral',
  'not configured': 'neutral',
  'single observation': 'neutral',
};

export function statusTone(status: string): PillTone {
  return TONES[status.trim().toLowerCase()] ?? 'neutral';
}

/**
 * The full class string for a state mark. `dot` adds the 6px leading disc,
 * which is for a state that is *live right now* (a connection, a service) as
 * opposed to a decision that has been recorded.
 */
export function statusPill(status: string, opts: { dot?: boolean } = {}): string {
  const tone = statusTone(status);
  return [
    'status-pill',
    tone !== 'neutral' && `status-pill--${tone}`,
    opts.dot && 'status-pill--dot',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Account roles, humanised. The console printed the raw enum, so a restaurant
 * owner's row read `restaurant_admin` — a database identifier shown to a
 * person, underscore and all.
 */
export function roleLabel(role: string): string {
  switch (role) {
    case 'executive':
      return 'Khabo Kothay';
    case 'restaurant_admin':
      return 'Restaurant owner';
    case 'user':
      return 'Diner';
    default:
      return role;
  }
}
