/**
 * Turn a failed backend write into a sentence that is true.
 *
 * The owner console used to hold one hard-coded string per surface, asserting a
 * single cause — for the menu tab, that the account "isn't linked to a verified
 * restaurant owner" — and applying it to every error that arrived, whatever it
 * was. The real answer measured against this backend is narrower and different:
 * `POST /rest/v1/menus` returns 401 with `42501 permission denied for table
 * menus`, a table-level GRANT refusal, because a demo sign-in reaches Supabase as
 * the anonymous role with no session at all. Row ownership never gets a say.
 *
 * A wrong diagnosis is worse than a vague one: it sends an owner off to find
 * credentials that would not have helped. So each code the backend actually
 * returns gets its own sentence, and anything unrecognised is quoted rather than
 * re-labelled.
 *
 * Codes are PostgREST/Postgres SQLSTATEs, which is what supabase-js throws.
 */
export function describeWriteFailure(err: unknown): string {
  const e = err as { code?: string; message?: string } | null;
  const code = e?.code ?? '';
  const message = e?.message ?? '';

  // 42501 — insufficient_privilege. The role has no grant on the table at all.
  if (code === '42501' || /permission denied/i.test(message)) {
    return 'This sign-in has no write access to the menu tables, so nothing was sent. Demo accounts are read-only against the live backend — a menu can only be changed from a restaurant account that is authenticated with Khabo Kothay.';
  }
  // 42P01 — undefined_table.
  if (code === '42P01') {
    return 'The menu tables are not available on this backend, so nothing was sent.';
  }
  // The grant exists but a row policy refused the row: a genuine ownership answer.
  if (/row-level security|policy/i.test(message)) {
    return 'The backend accepted the request but refused the write: this account is not recorded as an owner of this restaurant.';
  }
  // 22P02 — invalid_text_representation, i.e. a slug reached a uuid column.
  if (code === '22P02' || /invalid input syntax/i.test(message)) {
    return 'This restaurant could not be matched to a catalogue record, so the menu was not saved.';
  }
  if (/failed to fetch|networkerror/i.test(message)) {
    return 'Khabo Kothay could not be reached, so nothing was saved. Your editing is still here — try again in a moment.';
  }
  return message
    ? `Nothing was saved. The backend reported: ${message}`
    : 'Nothing was saved, and the backend did not say why. Your editing is still here — try again in a moment.';
}
