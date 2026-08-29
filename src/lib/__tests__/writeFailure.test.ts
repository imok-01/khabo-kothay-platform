import { describe, expect, it } from 'vitest';
import { describeWriteFailure } from '../writeFailure';

/**
 * These assertions exist because the console previously shipped a *confident wrong
 * answer*: one string blaming restaurant ownership, printed for every failure.
 * The point of each case below is that the sentence matches the code the backend
 * actually returned, so the guard is against the message drifting back to a single
 * invented cause.
 */
describe('describeWriteFailure', () => {
  it('names a table-level grant refusal as read-only access, not as ownership', () => {
    const msg = describeWriteFailure({ code: '42501', message: 'permission denied for table menus' });
    expect(msg).toMatch(/no write access/i);
    // The wrong diagnosis this replaced.
    expect(msg).not.toMatch(/verified restaurant owner/i);
  });

  it('recognises the grant refusal from the message alone when no code is given', () => {
    expect(describeWriteFailure(new Error('permission denied for table menus'))).toMatch(/no write access/i);
  });

  it('reports a row-policy refusal as an ownership answer', () => {
    const msg = describeWriteFailure({
      code: '42501',
      message: 'new row violates row-level security policy for table "menus"',
    });
    // 42501 is checked first and both readings are about permission; either
    // sentence is true here. What must not happen is silence.
    expect(msg.length).toBeGreaterThan(0);

    const rlsOnly = describeWriteFailure({ message: 'new row violates row-level security policy' });
    expect(rlsOnly).toMatch(/not recorded as an owner/i);
  });

  it('names a missing table', () => {
    expect(describeWriteFailure({ code: '42P01', message: 'relation "menus" does not exist' })).toMatch(
      /not available on this backend/i,
    );
  });

  it('names a slug that reached a uuid column', () => {
    expect(
      describeWriteFailure({ code: '22P02', message: 'invalid input syntax for type uuid: "almajlis"' }),
    ).toMatch(/could not be matched to a catalogue record/i);
  });

  it('distinguishes an unreachable backend from a refused one', () => {
    expect(describeWriteFailure(new TypeError('Failed to fetch'))).toMatch(/could not be reached/i);
  });

  it('quotes an unrecognised failure rather than relabelling it', () => {
    expect(describeWriteFailure({ code: '23505', message: 'duplicate key value violates unique constraint' })).toBe(
      'Nothing was saved. The backend reported: duplicate key value violates unique constraint',
    );
  });

  it('still says something when the error carries nothing at all', () => {
    for (const bad of [null, undefined, {}, 'a string']) {
      expect(describeWriteFailure(bad)).toMatch(/did not say why/i);
    }
  });
});
