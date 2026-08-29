import { describe, expect, it } from 'vitest';
import { roleLabel, statusPill, statusTone } from '../statusPill';

/**
 * The assertions that matter here are the *negative* ones. The console used to
 * paint a restaurant owner's role with `admin-status--pending` and a diner's
 * with `--published`, so the mark contradicted the row: an owner looked as
 * though their account were awaiting approval. Nothing below may reintroduce a
 * decision tone for something that is not a decision.
 */
describe('statusTone', () => {
  it('maps favourable settlements to ok', () => {
    for (const s of ['published', 'approved', 'verified', 'resolved', 'connected']) {
      expect(statusTone(s)).toBe('ok');
    }
  });

  it('maps anything waiting on a person to pending', () => {
    for (const s of ['pending', 'pending review', 'recorded · unverified', 'submitted']) {
      expect(statusTone(s)).toBe('pending');
    }
  });

  it('maps refusals to danger', () => {
    for (const s of ['rejected', 'removed', 'flagged']) {
      expect(statusTone(s)).toBe('danger');
    }
  });

  it('is case- and whitespace-insensitive, because the callers pass raw enums', () => {
    expect(statusTone('  APPROVED ')).toBe('ok');
    expect(statusTone('PENDING')).toBe('pending');
  });

  it('falls back to neutral rather than guessing a colour', () => {
    for (const s of ['', 'archived', 'whatever-the-backend-adds-next']) {
      expect(statusTone(s)).toBe('neutral');
    }
  });

  it('gives no state tone to an account role', () => {
    // The defect this replaced, stated as a test: a role is not a decision.
    for (const role of ['user', 'restaurant_admin', 'executive']) {
      expect(statusTone(role)).toBe('neutral');
    }
  });
});

describe('statusPill', () => {
  it('omits the modifier for a neutral state instead of writing status-pill--neutral', () => {
    expect(statusPill('draft')).toBe('status-pill');
  });

  it('composes tone and dot', () => {
    expect(statusPill('connected', { dot: true })).toBe('status-pill status-pill--ok status-pill--dot');
    expect(statusPill('not configured', { dot: true })).toBe('status-pill status-pill--dot');
  });

  it('never emits a class the stylesheet does not define', () => {
    const defined = new Set(['status-pill', 'status-pill--ok', 'status-pill--pending', 'status-pill--danger', 'status-pill--info', 'status-pill--dot']);
    for (const s of ['published', 'pending', 'rejected', 'contacted', 'draft', 'nonsense']) {
      for (const cls of statusPill(s, { dot: true }).split(' ')) {
        expect(defined).toContain(cls);
      }
    }
  });
});

describe('roleLabel', () => {
  it('never shows a raw database identifier to a person', () => {
    expect(roleLabel('restaurant_admin')).toBe('Restaurant owner');
    expect(roleLabel('restaurant_admin')).not.toMatch(/_/);
    expect(roleLabel('user')).toBe('Diner');
    expect(roleLabel('executive')).toBe('Khabo Kothay');
  });

  it('passes an unknown role through rather than inventing a name for it', () => {
    expect(roleLabel('auditor')).toBe('auditor');
  });
});
