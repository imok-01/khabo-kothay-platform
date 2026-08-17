import { useMemo, useState } from 'react';
import { Coins, Gift, Ticket, Lock, CheckCircle2, RotateCcw, Info, ArrowUpRight } from 'lucide-react';
import type { Coupon, RewardDefinition } from '../domain/rewards';
import { DEFAULT_REWARD_CONFIG, DEMO_STARTING_BALANCE } from '../domain/rewards';
import { REWARD_CATALOGUE } from '../data/rewards';
import {
  effectiveCouponStatus,
  isDemoUser,
  markCouponUsed,
  redeemReward,
  resetDemoWallet,
  type RedemptionResult,
} from '../lib/rewards';
import { tokenBalance, useRewards } from '../store/demoDb';

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

const EARN_RULES = [
  { label: 'Complete your profile', value: `+${DEFAULT_REWARD_CONFIG.profileCompletion}`, note: 'One time only' },
  { label: 'Write your first useful review', value: `+${DEFAULT_REWARD_CONFIG.review}`, note: 'One time only' },
  { label: 'Favourite a restaurant', value: `+${DEFAULT_REWARD_CONFIG.favourite}`, note: `Cap ${DEFAULT_REWARD_CONFIG.favouriteCap} favourites` },
  { label: 'Try a new cuisine', value: `+${DEFAULT_REWARD_CONFIG.cuisineDiscovery}`, note: `Cap ${DEFAULT_REWARD_CONFIG.cuisineDiscoveryCap} cuisines` },
  { label: 'Refer a verified new user', value: `+${DEFAULT_REWARD_CONFIG.referralVerified}`, note: 'Per successful referral' },
  { label: 'Upload a useful food photo', value: `+${DEFAULT_REWARD_CONFIG.photo}`, note: 'Arrives with photo uploads' },
];

function stateLabel(state: RewardState): string {
  return state === 'available' ? 'Available' : state === 'insufficient' ? 'Need more tokens' : state === 'redeemed' ? 'Redeemed' : state === 'used' ? 'Used' : 'Expired';
}

export default function RewardsWallet({ userId }: RewardsWalletProps) {
  const rewards = useRewards(userId);
  const balance = tokenBalance(userId);

  const [confirming, setConfirming] = useState<RewardDefinition | null>(null);
  const [result, setResult] = useState<RedemptionResult | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
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

  const confirmRedemption = () => {
    if (!confirming) return;
    const res = redeemReward(userId, confirming.id);
    setResult(res);
    setConfirming(null);
  };

  const handleReset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    resetDemoWallet(userId);
    setResetArmed(false);
    setResetDone(true);
    window.setTimeout(() => setResetDone(false), 2500);
  };

  return (
    <div className="wallet">
      {/* Balance + purpose */}
      <section className="panel">
        <div className="panel__head">
          <h2>Your tokens</h2>
          <strong className="completion-pct"><Coins size={16} aria-hidden="true" /> {balance}</strong>
        </div>
        <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
          Tokens are demo-only — they can't be exchanged for real value. Earn them by building your food profile,
          reviewing places and referring friends; spend them on the rewards below. Every movement is recorded in your ledger.
        </p>
        {demo && (
          <div className="wallet__demo">
            <p className="t-xs" style={{ color: 'var(--ink-faint)' }}>
              <Info size={11} aria-hidden="true" /> Demo account — resetting restores the {DEMO_STARTING_BALANCE}-token starting balance and clears reward/coupon state so you can re-demonstrate a flow.
            </p>
            <button type="button" className="btn btn--subtle btn--sm" onClick={handleReset}>
              <RotateCcw size={13} aria-hidden="true" />
              {resetArmed ? 'Confirm reset?' : resetDone ? 'Wallet reset' : 'Reset demo wallet'}
            </button>
            {resetDone && <span className="t-sm" style={{ color: 'var(--success)' }}><CheckCircle2 size={12} aria-hidden="true" /> Wallet restored to {DEMO_STARTING_BALANCE} tokens.</span>}
          </div>
        )}
      </section>

      {/* Reward catalogue */}
      <section className="panel">
        <div className="panel__head">
          <h2>Available rewards</h2>
          <span className="t-sm" style={{ color: 'var(--ink-faint)' }}>For participating restaurants · demo only</span>
        </div>
        <div className="reward-grid">
          {cards.map(({ definition, state, coupon, need }) => (
            <article key={definition.id} className={`reward-card reward-card--${state}`}>
              <div className="reward-card__head">
                <span className="reward-card__tag">{definition.tag}</span>
                <span className={`reward-card__state reward-card__state--${state}`}>
                  {state === 'redeemed' ? <CheckCircle2 size={12} aria-hidden="true" /> : state === 'insufficient' ? <Lock size={12} aria-hidden="true" /> : null}
                  {stateLabel(state)}
                </span>
              </div>
              <strong className="reward-card__title">{definition.title}</strong>
              <p className="reward-card__desc">{definition.description}</p>
              <dl className="reward-card__terms">
                <div><dt>Min. bill</dt><dd>{definition.minBill}</dd></div>
                <div><dt>Where</dt><dd>{definition.applicable}</dd></div>
                <div><dt>Valid</dt><dd>{definition.validDays} days</dd></div>
              </dl>
              <div className="reward-card__foot">
                <span className="reward-card__cost"><Coins size={13} aria-hidden="true" /> {definition.cost} tokens</span>
                {state === 'available' && (
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => setConfirming(definition)}>
                    Redeem for {definition.cost} tokens
                  </button>
                )}
                {state === 'insufficient' && (
                  <span className="reward-card__need">Need {need} more tokens</span>
                )}
                {state === 'redeemed' && coupon && (
                  <span className="reward-card__code">{coupon.code}</span>
                )}
                {state === 'used' && <span className="reward-card__need">Used</span>}
                {state === 'expired' && <span className="reward-card__need">Expired</span>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* My coupons */}
      <section className="panel">
        <div className="panel__head">
          <h2>Your coupons</h2>
          <span className="t-sm" style={{ color: 'var(--ink-faint)' }}>Demo coupons — not redeemable anywhere</span>
        </div>
        {rewards.coupons.length === 0 ? (
          <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>No coupons yet. Redeem a reward above to unlock one.</p>
        ) : (
          <div className="coupon-grid">
            {rewards.coupons.map((c) => {
              const status = effectiveCouponStatus(c);
              return (
                <article key={c.id} className={`coupon-card coupon-card--${status}`}>
                  <div className="coupon-card__code">{c.code}</div>
                  <strong>{c.title}</strong>
                  <p className="t-sm">{c.description}</p>
                  <span className="coupon-card__value">{c.value}</span>
                  <p className="t-xs" style={{ color: 'var(--ink-faint)' }}>
                    Min. bill {c.minBill} · {c.applicable} · valid till {new Date(c.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="t-xs" style={{ color: 'var(--ink-faint)' }}>{c.demoNote}</p>
                  {status === 'available' ? (
                    <div className="reward-card__foot">
                      <span className="reward-card__state--redeemed">Available</span>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => markCouponUsed(userId, c.id)} title="Demo action — marks this coupon as used">
                        Mark as used
                      </button>
                    </div>
                  ) : (
                    <span className="coupon-card__status">{status === 'used' ? `Used${c.usedAt ? ` · ${new Date(c.usedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}` : `Expired · ${new Date(c.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}</span>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* How to earn */}
      <section className="panel">
        <div className="panel__head">
          <h2>How to earn tokens</h2>
          <Gift size={18} aria-hidden="true" />
        </div>
        <ul className="earn-list">
          {EARN_RULES.map((r) => (
            <li key={r.label}>
              <span className="earn-list__label">{r.label}</span>
              <span className="earn-list__value">{r.value}</span>
              <span className="earn-list__note">{r.note}</span>
            </li>
          ))}
        </ul>
        <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s3)' }}>
          <Info size={11} aria-hidden="true" /> One-off rewards are checked against your token ledger, so repeated actions can never double-pay.
        </p>
      </section>

      {/* Ledger */}
      <section className="panel">
        <div className="panel__head">
          <h2>Token ledger</h2>
          <span className="t-sm" style={{ color: 'var(--ink-faint)' }}>Balance: <strong className="t-num">{balance}</strong></span>
        </div>
        <ul className="tx-list">
          {rewards.transactions.map((t) => (
            <li key={t.id} className={t.delta >= 0 ? 'tx-list__in' : 'tx-list__out'}>
              <span>
                {t.reason}
                <span className="t-xs" style={{ color: 'var(--ink-faint)', display: 'block' }}>
                  {new Date(t.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {new Date(t.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
              <strong className="t-num">{t.delta >= 0 ? `+${t.delta}` : t.delta}</strong>
            </li>
          ))}
          {rewards.transactions.length === 0 && <li className="t-sm" style={{ color: 'var(--ink-soft)' }}>No token activity yet.</li>}
        </ul>
      </section>

      {/* Redemption confirmation */}
      {confirming && (
        <div className="modal-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirming(null); }}>
          <div className="redeem-modal" role="dialog" aria-modal="true" aria-labelledby="redeem-title">
            <div className="redeem-modal__head">
              <h3 id="redeem-title">Redeem {confirming.title}?</h3>
              <button type="button" className="redeem-modal__close" onClick={() => setConfirming(null)} aria-label="Close">×</button>
            </div>
            <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
              {confirming.cost} tokens will be deducted from your balance.
            </p>
            <p className="t-md t-num" style={{ marginTop: 'var(--s2)' }}>
              Your balance will become <strong className="t-num">{Math.max(0, balance - confirming.cost)}</strong> tokens.
            </p>
            <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s2)' }}>
              A demo coupon will be added to your wallet. Demo coupons are not redeemable in real restaurants.
            </p>
            <div className="redeem-modal__actions">
              <button type="button" className="btn btn--subtle" onClick={() => setConfirming(null)}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={confirmRedemption}>Redeem reward</button>
            </div>
          </div>
        </div>
      )}

      {/* Success / error toast */}
      {result && (
        <div className={`toast ${result.ok ? 'toast--ok' : 'toast--err'}`} role="status">
          {result.ok ? (
            <>
              <CheckCircle2 size={15} aria-hidden="true" />
              <span><strong>Coupon unlocked:</strong> {result.coupon?.code} — {result.coupon?.title}. See it under “Your coupons”.</span>
            </>
          ) : (
            <>
              <Lock size={15} aria-hidden="true" />
              <span>{result.error === 'insufficient' ? `Not enough tokens — need ${result.need} more.` : result.error === 'already-redeemed' ? 'This reward was already redeemed.' : 'Unknown reward.'}</span>
            </>
          )}
          <button type="button" className="toast__close" onClick={() => setResult(null)} aria-label="Dismiss"><ArrowUpRight size={13} /></button>
        </div>
      )}

      <p className="t-xs" style={{ color: 'var(--ink-faint)' }}>
        <Ticket size={11} aria-hidden="true" /> Rewards shown are demo simulations for participating restaurants — they are not guaranteed discounts.
      </p>
    </div>
  );
}
