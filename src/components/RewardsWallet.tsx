import { useMemo, useState } from 'react';
import { Gift, Ticket, Lock, CheckCircle2, RotateCcw, Info, X } from 'lucide-react';
import type { Coupon, RewardDefinition, RewardKind } from '../domain/rewards';
import { DEFAULT_REWARD_CONFIG, DEMO_STARTING_BALANCE } from '../domain/rewards';
import { effectiveCouponStatus, isDemoUser, markCouponUsed, redeemReward, resetDemoWallet, type RedemptionResult } from '../lib/rewards';
import { REWARD_CATALOGUE, tokenBalance, useRewards } from '../hooks/useRewards';
import { Button, Celebration, CoinMark, ConfirmButton, CopyCode, Dialog } from './ui';

/**
 * The rewards wallet.
 *
 * Everything on this surface is read from the append-only token ledger in
 * lib/rewards — balance, earned, spent, per-rule grant counts, coupons. Nothing
 * is estimated, projected or rounded up. There are no levels, tiers or streaks
 * because the ledger records none, and inventing them would be inventing
 * business data.
 *
 * The ledger and its caps are real; the *value* is not. Tokens buy demo coupons
 * that no restaurant honours, and every panel here says so — those disclosures
 * are load-bearing, not decoration.
 */

interface RewardsWalletProps {
  userId: string;
}

type RewardState = 'available' | 'insufficient' | 'redeemed' | 'used' | 'expired';

interface RewardCardState {
  definition: RewardDefinition;
  state: RewardState;
  coupon?: Coupon;
  need?: number;
}

const CFG = DEFAULT_REWARD_CONFIG;

function stateLabel(state: RewardState): string {
  return state === 'available' ? 'Available' : state === 'insufficient' ? 'Need more tokens' : state === 'redeemed' ? 'Redeemed' : state === 'used' ? 'Used' : 'Expired';
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export default function RewardsWallet({ userId }: RewardsWalletProps) {
  const rewards = useRewards(userId);
  const balance = tokenBalance(userId);

  const [confirming, setConfirming] = useState<RewardDefinition | null>(null);
  const [result, setResult] = useState<RedemptionResult | null>(null);
  /* The coupon just unlocked, held for the length of the celebration. Separate
     from `result` because that state also carries refusals and stays until the
     diner dismisses the toast; this one is the moment and clears itself. */
  const [unlocked, setUnlocked] = useState<{ title: string; code?: string } | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const demo = isDemoUser(userId);

  const cards: RewardCardState[] = useMemo(() => {
    return REWARD_CATALOGUE.map((def) => {
      const coupon = rewards.coupons.find((c) => c.rewardId === def.id);
      if (coupon) {
        const status = effectiveCouponStatus(coupon);
        return {
          definition: def,
          state: status === 'used' ? 'used' : status === 'expired' ? 'expired' : 'redeemed',
          coupon,
        };
      }
      if (balance < def.cost) {
        return { definition: def, state: 'insufficient', need: def.cost - balance };
      }
      return { definition: def, state: 'available' };
    });
  }, [rewards.coupons, balance]);

  /* Totals for the balance band — both sides of the same ledger, so they always
     reconcile to the balance shown beside them. */
  const { earned, spent } = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    for (const t of rewards.transactions) {
      if (t.delta >= 0) inSum += t.delta;
      else outSum += -t.delta;
    }
    return { earned: inSum, spent: outSum };
  }, [rewards.transactions]);

  const liveCoupons = rewards.coupons.filter((c) => effectiveCouponStatus(c) === 'available').length;

  /**
   * What this balance is walking towards: the cheapest reward still out of reach.
   * A token count on its own is a scoreboard — 100 tokens means nothing until you
   * know it is 50 short of something you actually want. Read off the same `cards`
   * the catalogue renders, so the line can never name a reward the grid shows as
   * already redeemed, and absent entirely when everything is affordable: there is
   * no next unlock then, and inventing one would be inventing a goal.
   */
  const nextUnlock = useMemo(() => {
    const cheapest = cards
      .filter((c) => c.state === 'insufficient')
      .sort((a, b) => a.definition.cost - b.definition.cost)[0];
    if (!cheapest) return null;
    return {
      title: cheapest.definition.title,
      need: cheapest.need ?? 0,
      pct: Math.min(100, Math.round((balance / cheapest.definition.cost) * 100)),
    };
  }, [cards, balance]);

  /**
   * How many times each earning rule has actually paid this account, counted
   * from the ledger by transaction kind and shown against the cap the reward
   * config genuinely enforces. A cap of null means the rule is uncapped.
   */
  const milestones = useMemo(() => {
    const granted = (kind: RewardKind) =>
      rewards.transactions.filter((t) => t.kind === kind && t.delta > 0).length;
    return [
      { kind: 'profile' as RewardKind, label: 'Complete your food profile', amount: CFG.profileCompletion, count: Math.min(granted('profile'), 1), cap: 1, meter: false, note: 'Granted once, ever — the ledger blocks a second grant.' },
      { kind: 'review' as RewardKind, label: 'Write a useful review', amount: CFG.review, count: Math.min(granted('review'), 1), cap: 1, meter: false, note: 'Granted once, ever — later reviews are welcome but do not pay again.' },
      { kind: 'favourite' as RewardKind, label: 'Save a restaurant', amount: CFG.favourite, count: granted('favourite'), cap: CFG.favouriteCap, meter: true, note: `Pays for your first ${CFG.favouriteCap} saved places.` },
      { kind: 'cuisine' as RewardKind, label: 'Try a new cuisine', amount: CFG.cuisineDiscovery, count: granted('cuisine'), cap: CFG.cuisineDiscoveryCap, meter: true, note: `Pays for your first ${CFG.cuisineDiscoveryCap} distinct cuisines.` },
      { kind: 'referral' as RewardKind, label: 'Refer a friend who verifies', amount: CFG.referralVerified, count: granted('referral'), cap: null, meter: false, note: 'Uncapped — every verified referral pays.' },
      { kind: 'photo' as RewardKind, label: 'Upload a useful food photo', amount: CFG.photo, count: granted('photo'), cap: null, meter: false, note: 'The rule is live, but there is no diner photo upload yet — so this stays at zero until one exists.' },
    ];
  }, [rewards.transactions]);

  const confirmRedemption = () => {
    if (!confirming) return;
    const res = redeemReward(userId, confirming.id);
    setResult(res);
    setConfirming(null);
    /* Only a successful redemption is a moment. `redeemReward` also answers
       "insufficient" and "already-redeemed", and those go to the toast alone —
       a celebration over a refusal would be worse than no feedback. */
    if (res.ok) setUnlocked({ title: confirming.title, code: res.coupon?.code });
  };

  const handleReset = () => {
    resetDemoWallet(userId);
    setResetDone(true);
    window.setTimeout(() => setResetDone(false), 2500);
  };

  return (
    <div className="wallet">
      {/* Balance band. The one gradient surface in the console, because this is
          the reward moment — and the three figures beside it are the ledger's
          own totals, not a summary of it. */}
      <section className="wallet-hero">
        <div className="wallet-hero__text">
          <span className="wallet-hero__label">Your token balance</span>
          <p className="wallet-hero__value">
            {balance} <span>tokens</span>
          </p>
          {/* The next thing the balance buys. Without it the band states a number
              and stops; with it the number has a direction. */}
          {nextUnlock && (
            <div className="wallet-next">
              <p className="wallet-next__text">
                <strong>{nextUnlock.need} more</strong> to unlock {nextUnlock.title}
              </p>
              <span className="wallet-next__track" aria-hidden="true">
                <span style={{ width: `${nextUnlock.pct}%` }} />
              </span>
            </div>
          )}
          <p className="wallet-hero__note">
            Tokens are demo-only — they can't be exchanged for real value. Earn them by building your food
            profile, reviewing places and referring friends; spend them on the rewards below. Every movement is
            recorded in your ledger.
          </p>
        </div>
        <div className="wallet-hero__figures">
          <div className="wallet-hero__figure">
            <strong>{earned}</strong>
            <span>Earned</span>
          </div>
          <div className="wallet-hero__figure">
            <strong>{spent}</strong>
            <span>Spent</span>
          </div>
          <div className="wallet-hero__figure">
            <strong>{liveCoupons}</strong>
            <span>Coupons live</span>
          </div>
        </div>
      </section>

      {/* Reward catalogue */}
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Rewards you can claim</h2>
          <span className="panel__hint">For participating restaurants · demo only</span>
        </div>
        <div className="reward-grid">
          {cards.map(({ definition, state, coupon, need }) => (
            <article key={definition.id} className="reward-card" data-affordable={state === 'insufficient' ? 'false' : 'true'}>
              <div className="reward-card__head">
                <div className="reward-card__headtext">
                  <span className="reward-card__tag">{definition.tag}</span>
                  <strong className="reward-card__title">{definition.title}</strong>
                </div>
                <span className="reward-card__cost">
                  <strong>{definition.cost}</strong>
                  <span>tokens</span>
                </span>
              </div>
              <p>{definition.description}</p>
              <p className="reward-card__terms">
                Min. bill {definition.minBill} · {definition.applicable} · valid {definition.validDays} days
              </p>
              <div className="reward-card__foot">
                {state === 'available' && (
                  <>
                    <span className="status-text">Ready to redeem</span>
                    <Button variant="primary" size="sm" onClick={() => setConfirming(definition)}>
                      Redeem
                    </Button>
                  </>
                )}
                {state === 'insufficient' && (
                  /* Distance, not just denial. "3 more tokens needed" and "58 more
                     tokens needed" were the same sentence in the same grey, so a
                     reward you are one review away from looked exactly like one you
                     are nowhere near. The bar is the balance against this reward's
                     own cost, which is what `need` is the remainder of. */
                  <div className="reward-card__toward">
                    <span className="status-text">
                      <Lock size={14} aria-hidden="true" /> {need} more token{need === 1 ? '' : 's'} needed
                    </span>
                    <span className="reward-card__meter" aria-hidden="true">
                      <span style={{ width: `${Math.min(100, Math.round((balance / definition.cost) * 100))}%` }} />
                    </span>
                  </div>
                )}
                {state === 'redeemed' && coupon && (
                  <>
                    <span className="status-pill"><CheckCircle2 size={12} aria-hidden="true" /> {stateLabel(state)}</span>
                    {/* The code was a bare `.t-num` span here: the one thing on
                        a redeemed card the diner has to take somewhere else,
                        and the only way to take it was to drag-select it. */}
                    <CopyCode value={coupon.code} size="sm" label={`Copy coupon code ${coupon.code}`} />
                  </>
                )}
                {(state === 'used' || state === 'expired') && (
                  <span className="status-pill">{stateLabel(state)}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* My coupons */}
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Your coupons</h2>
          <span className="panel__hint">Demo coupons — not redeemable anywhere</span>
        </div>
        {rewards.coupons.length === 0 ? (
          <div className="console-empty console-empty--inset">
            <span className="console-empty__icon"><Ticket size={20} aria-hidden="true" /></span>
            <h3 className="console-empty__title">No coupons yet</h3>
            <p className="console-empty__text">Redeem a reward above and the coupon appears here with its code and validity.</p>
          </div>
        ) : (
          <div className="coupon-grid">
            {rewards.coupons.map((c) => {
              const status = effectiveCouponStatus(c);
              return (
                <article key={c.id} className="coupon-card" data-status={status}>
                  <div className="coupon-card__code">
                    <CopyCode value={c.code} variant="inline" size="sm" label={`Copy coupon code ${c.code}`} />
                    <span className="coupon-card__value">{c.value}</span>
                  </div>
                  <strong>{c.title}</strong>
                  <p>{c.description}</p>
                  <p className="coupon-card__terms">
                    Min. bill {c.minBill} · {c.applicable} · valid till {shortDate(c.expiresAt)}
                    <br />
                    {c.demoNote}
                  </p>
                  <div className="coupon-card__foot">
                    {status === 'available' ? (
                      <>
                        <span className="status-text">Unused</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markCouponUsed(userId, c.id)}
                          title="Demo action — marks this coupon as used"
                        >
                          Mark as used
                        </Button>
                      </>
                    ) : (
                      <span className="status-pill">
                        {status === 'used'
                          ? `Used${c.usedAt ? ` · ${longDate(c.usedAt)}` : ''}`
                          : `Expired · ${shortDate(c.expiresAt)}`}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* How you earn — the rate and your actual progress in one list, counted
          from the ledger. This is the milestones surface: no levels or streaks,
          because the ledger records none. */}
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">How you earn tokens</h2>
          <span className="panel__hint"><Gift size={14} aria-hidden="true" /> Counted from your ledger</span>
        </div>
        <ul className="milestone-list">
          {milestones.map((m) => {
            const pct = m.cap ? Math.min(100, Math.round((m.count / m.cap) * 100)) : 0;
            return (
              <li key={m.kind} className="milestone">
                <div className="milestone__head">
                  <span className="milestone__label">{m.label}</span>
                  <span className="milestone__count">{m.cap ? `${m.count} of ${m.cap}` : `${m.count} earned`}</span>
                  <span className="earn-list__amount">+{m.amount}</span>
                </div>
                {m.meter && (
                  <div
                    className="progress"
                    role="progressbar"
                    aria-valuenow={m.count}
                    aria-valuemin={0}
                    aria-valuemax={m.cap ?? undefined}
                    aria-label={`${m.label} — ${m.count} of ${m.cap}`}
                  >
                    <span className="progress__fill" style={{ width: `${pct}%` }} />
                  </div>
                )}
                <p className="milestone__note">{m.note}</p>
              </li>
            );
          })}
        </ul>
        <p className="panel__foot">
          <Info size={14} aria-hidden="true" />
          <span>One-off rewards are checked against your token ledger, so repeated actions can never double-pay.</span>
        </p>
      </section>

      {/* Ledger */}
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Token ledger</h2>
          <span className="panel__hint">
            {rewards.transactions.length} entr{rewards.transactions.length === 1 ? 'y' : 'ies'} · balance{' '}
            <strong className="t-num">{balance}</strong>
          </span>
        </div>
        {rewards.transactions.length === 0 ? (
          <div className="console-empty console-empty--inset">
            <span className="console-empty__icon"><CoinMark size={20} /></span>
            <h3 className="console-empty__title">No token activity yet</h3>
            <p className="console-empty__text">
              Your first grant appears here the moment you complete a profile field or write a review.
            </p>
          </div>
        ) : (
          <ul className="tx-list">
            {rewards.transactions.map((t) => (
              <li key={t.id}>
                <span>{t.reason}</span>
                <time dateTime={t.at}>{shortDate(t.at)} · {timeOf(t.at)}</time>
                <strong className={`tx-list__amount tx-list__amount--${t.delta >= 0 ? 'in' : 'out'}`}>
                  {t.delta >= 0 ? `+${t.delta}` : t.delta}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      {demo && (
        <section className="panel panel--quiet">
          <div className="panel__head">
            <h2 className="panel__title">Demo controls</h2>
            <span className="panel__hint">Demo account</span>
          </div>
          <p className="milestone__note">
            Resetting restores the {DEMO_STARTING_BALANCE}-token starting balance and clears reward and coupon
            state, so a flow can be demonstrated again from the beginning.
          </p>
          <div className="panel__actions" style={{ marginTop: 'var(--s4)' }}>
            {/* This arm-then-confirm used to be hand-rolled here, and it is
                where `ConfirmButton` came from. It now uses the primitive, so
                the wallet gets the parts the local version never had: it
                disarms itself on a timeout, on blur and on Escape, and it says
                it is armed out loud. */}
            <ConfirmButton
              size="sm"
              icon={RotateCcw}
              confirmLabel="Confirm reset?"
              armedAnnouncement="Tap again to reset the demo wallet."
              onConfirm={handleReset}
            >
              Reset demo wallet
            </ConfirmButton>
            {resetDone && (
              <span className="status-text status-text--ok">
                <CheckCircle2 size={14} aria-hidden="true" /> Wallet restored to {DEMO_STARTING_BALANCE} tokens.
              </span>
            )}
          </div>
        </section>
      )}

      {/* Redemption confirmation */}
      {confirming && (
        <Dialog
          open
          onClose={() => setConfirming(null)}
          size="sm"
          title={`Redeem ${confirming.title}?`}
          closeLabel="Cancel redemption"
          footer={
            <>
              <Button variant="subtle" onClick={() => setConfirming(null)}>Cancel</Button>
              {/* Gold here and NOT on the per-reward `Redeem` above: this is one
                  button in one dialog, so it is the single commercial action
                  §3 reserves the accent for. The catalogue's buttons repeat once
                  per reward card, and gold six times over is decoration. */}
              <Button variant="accent" onClick={confirmRedemption}>Redeem reward</Button>
            </>
          }
        >
          <dl className="console-defs">
            <div>
              <dt>Cost</dt>
              <dd className="t-num">{confirming.cost} tokens</dd>
            </div>
            <div>
              <dt>Balance after</dt>
              <dd className="t-num">{Math.max(0, balance - confirming.cost)} tokens</dd>
            </div>
            <div>
              <dt>Valid for</dt>
              <dd>{confirming.validDays} days</dd>
            </div>
          </dl>
          <p className="reward-disclosure">
            <Info size={16} aria-hidden="true" />
            <span>A demo coupon will be added to your wallet. Demo coupons are not redeemable in real restaurants.</span>
          </p>
        </Dialog>
      )}

      {/* Success / error toast */}
      {result && (
        <div className={`toast ${result.ok ? 'toast--ok' : 'toast--err'}`} role="status">
          {result.ok ? (
            <>
              <CheckCircle2 size={16} aria-hidden="true" />
              <span><strong>Coupon unlocked:</strong> {result.coupon?.code} — {result.coupon?.title}. See it under “Your coupons”.</span>
            </>
          ) : (
            <>
              <Lock size={16} aria-hidden="true" />
              <span>{result.error === 'insufficient' ? `Not enough tokens — need ${result.need} more.` : result.error === 'already-redeemed' ? 'This reward was already redeemed.' : 'Unknown reward.'}</span>
            </>
          )}
          <button type="button" className="toast__close" onClick={() => setResult(null)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {/* The unlock, celebrated. `announce={false}` because the toast above is
          already a `role="status"` for the same event, and the coin is a ticket
          rather than the token mark: tokens left the balance here, what arrived
          is the coupon. */}
      {unlocked && (
        <Celebration
          icon={<Ticket size={26} />}
          headline="Coupon unlocked"
          caption={unlocked.code ? `${unlocked.title} · ${unlocked.code}` : unlocked.title}
          announce={false}
          onDone={() => setUnlocked(null)}
        />
      )}

      <p className="reward-disclosure">
        <Ticket size={16} aria-hidden="true" />
        <span>Rewards shown are demo simulations for participating restaurants — they are not guaranteed discounts.</span>
      </p>
    </div>
  );
}
