import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Coins, Gift, Share2, BadgeCheck, Camera, MapPin, Wallet, Trash2, Check, ExternalLink, Info, X, ChevronDown, Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';
import {
  profileCompletion, PROFILE_FIELDS, deriveCompletedFields, foodIdentity, computeBadges, PREFERENCE_LIMITS,
} from '../lib/profile';
import { grantProfileCompletionReward, inviteFriend, verifyInvite } from '../lib/rewards';
import { DEFAULT_REWARD_CONFIG } from '../domain/rewards';
import { NEIGHBORHOODS, CUISINES } from '../hooks/useTaxonomy';
import { saveUser } from '../hooks/useUsers';
import { tokenBalance, useRewards } from '../hooks/useRewards';
import { useUserReviews } from '../hooks/useReviews';
import { useFavorites } from '../context/FavoritesContext';
import RewardsWallet from '../components/RewardsWallet';
import PreferencePicker, { type PickerOption } from '../components/PreferencePicker';
import type { Budget } from '../types';
import type { DemoUser } from '../domain/auth';

const BUDGETS: Budget[] = ['Budget', 'Mid-range', 'Premium', 'Luxury'];
const DIET_OPTIONS: Array<{ value: 'any' | 'veg' | 'nonveg'; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'veg', label: 'Vegetarian' },
  { value: 'nonveg', label: 'Non-vegetarian' },
];
const INTEREST_GROUPS: Array<{ group: string; items: string[] }> = [
  { group: 'Food', items: ['Home-style food', 'Street food', 'Desserts', 'Seafood'] },
  { group: 'Experience', items: ['Fine dining', 'Café hopping'] },
  { group: 'Occasion / dining mood', items: ['Family dinners', 'Date nights', 'Late-night bites'] },
];
const INTEREST_OPTIONS: PickerOption[] = INTEREST_GROUPS.flatMap((g) => g.items.map((item) => ({ value: item, label: item, group: g.group })));

type PickerKind = 'cuisines' | 'budget' | 'diet' | 'areas' | 'interests' | null;

export default function ProfilePage() {
  usePageTitle('Your profile');
  const { user, appUser, logout } = useAuth();
  const { favoriteIds } = useFavorites();
  const [tab, setTab] = useState<'profile' | 'rewards' | 'referral'>('profile');
  const [saved, setSaved] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [picker, setPicker] = useState<PickerKind>(null);

  const balance = user ? tokenBalance(appUser?.id ?? user.id) : 0;
  const completion = user ? profileCompletion(user) : 0;
  const rewards = useRewards(appUser?.id ?? user?.id ?? '');

  const allUserReviews = useUserReviews();
  const myReviews = useMemo(() => {
    if (!user) return [];
    return allUserReviews.filter((r) => r.userId === user.id);
  }, [user, allUserReviews]);

  if (!user) {
    return (
      <main className="section section--narrow">
        <div className="section__inner">
          <div className="access-denied">
            <User size={40} aria-hidden="true" />
            <h1>Sign in to see your profile</h1>
            <p>Your saved places, reviews and rewards live here once you're signed in.</p>
            <Link to="/login" className="btn btn--primary">Sign in</Link>
          </div>
        </div>
      </main>
    );
  }

  const fields = deriveCompletedFields(user);
  const missing = PROFILE_FIELDS.filter((f) => !fields.includes(f.key));

  /**
   * Single write: profile change + recomputed completedFields in one save.
   * (The old code saved twice with a stale user object, silently reverting
   * the preference change — this also fixes that.)
   */
  const persistUser = (next: DemoUser) => {
    saveUser({ ...next, completedFields: deriveCompletedFields(next) });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  const setCuisines = (vals: string[]) => {
    persistUser({ ...user, profile: { ...user.profile, cuisines: vals.slice(0, PREFERENCE_LIMITS.cuisines) } });
    setPicker(null);
  };
  const removeCuisine = (c: string) => setCuisines(user.profile.cuisines.filter((x) => x !== c));

  const setBudget = (b: Budget) => {
    persistUser({ ...user, profile: { ...user.profile, budget: b } });
    setPicker(null);
  };

  const setDiet = (d: 'any' | 'veg' | 'nonveg') => {
    persistUser({ ...user, profile: { ...user.profile, diet: d } });
    setPicker(null);
  };

  const setAreas = (vals: string[]) => {
    persistUser({ ...user, profile: { ...user.profile, neighbourhoods: vals.slice(0, PREFERENCE_LIMITS.neighbourhoods) } });
    setPicker(null);
  };
  const removeArea = (a: string) => setAreas(user.profile.neighbourhoods.filter((x) => x !== a));

  const setInterests = (vals: string[]) => {
    persistUser({ ...user, profile: { ...user.profile, diningInterests: vals.slice(0, PREFERENCE_LIMITS.interests) } });
    setPicker(null);
  };
  const removeInterest = (i: string) => setInterests(user.profile.diningInterests.filter((x) => x !== i));

  const claimCompletionReward = () => {
    // The ledger enforces once-only even if the UI flag is out of sync.
    const res = grantProfileCompletionReward(appUser?.id ?? user.id);
    if (res.granted) saveUser({ ...user, completionRewardClaimed: true });
  };

  const identity = foodIdentity(user);
  const badges = computeBadges(user, myReviews.length);

  const onInvite = (e: FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) return;
    inviteFriend(appUser?.id ?? user.id, inviteName.trim());
    setInviteName('');
  };

  return (
    <main className="section section--narrow">
      <div className="section__inner">
        <div className="profile-head">
          <div className="profile-head__avatar" aria-hidden="true">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.charAt(0).toUpperCase()}
          </div>
          <div className="profile-head__info">
            <span className="section-heading__eyebrow">Your profile</span>
            <h1>{user.name}</h1>
            <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>{user.contact} · member since {user.createdAt}</p>
            <div className="profile-head__badges">
              {user.badges.map((b) => (
                <span key={b.id} className="badge-chip" title={b.description}>
                  <BadgeCheck size={12} aria-hidden="true" /> {b.label}
                </span>
              ))}
              <span className="badge-chip badge-chip--muted"><Camera size={12} aria-hidden="true" /> Food Explorer</span>
            </div>
          </div>
          <button
            type="button"
            className="profile-head__tokens profile-head__tokens--button"
            onClick={() => setTab('rewards')}
            aria-label={`${balance} tokens — open rewards & coupons`}
            title="Open rewards & coupons"
          >
            <Coins size={18} aria-hidden="true" />
            <strong>{balance}</strong>
            <span>tokens · rewards</span>
          </button>
        </div>

        <div className="auth-card__tabs" role="tablist" aria-label="Profile sections">
          <button type="button" role="tab" aria-selected={tab === 'profile'} className={`auth-card__tab ${tab === 'profile' ? 'auth-card__tab--active' : ''}`} onClick={() => setTab('profile')}>
            <User size={15} aria-hidden="true" /> Profile
          </button>
          <button type="button" role="tab" aria-selected={tab === 'rewards'} className={`auth-card__tab ${tab === 'rewards' ? 'auth-card__tab--active' : ''}`} onClick={() => setTab('rewards')}>
            <Wallet size={15} aria-hidden="true" /> Rewards & coupons
          </button>
          <button type="button" role="tab" aria-selected={tab === 'referral'} className={`auth-card__tab ${tab === 'referral' ? 'auth-card__tab--active' : ''}`} onClick={() => setTab('referral')}>
            <Share2 size={15} aria-hidden="true" /> Refer a friend
          </button>
        </div>

        {tab === 'profile' && (
          <div className="profile-body">
            <section className="panel">
              <div className="panel__head">
                <h2>Profile completion</h2>
                <strong className="completion-pct">{completion}%</strong>
              </div>
              <div className="progress" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
                <div className="progress__bar" style={{ width: `${completion}%` }} />
              </div>
              <ul className="completion-list">
                {PROFILE_FIELDS.map((f) => {
                  const done = fields.includes(f.key);
                  return (
                    <li key={f.key} className={done ? 'completion-list__item--done' : ''}>
                      {done ? <Check size={13} aria-hidden="true" /> : <span className="completion-list__dot" aria-hidden="true" />}
                      {f.label}
                    </li>
                  );
                })}
              </ul>
              {completion === 100 && !user.completionRewardClaimed && (
                <button type="button" className="btn btn--primary btn--block" onClick={claimCompletionReward}>
                  <Gift size={15} aria-hidden="true" /> Claim +{DEFAULT_REWARD_CONFIG.profileCompletion} tokens for completing your profile
                </button>
              )}
              {completion === 100 && user.completionRewardClaimed && (
                <p className="t-sm reward-claimed" style={{ color: 'var(--success)' }}>
                  <Check size={12} aria-hidden="true" /> Profile reward claimed — +{DEFAULT_REWARD_CONFIG.profileCompletion} tokens already earned.
                </p>
              )}
              {missing.length > 0 && (
                <p className="t-sm" style={{ color: 'var(--ink-soft)', marginTop: 'var(--s3)' }}>
                  Complete your profile to get +{DEFAULT_REWARD_CONFIG.profileCompletion} tokens and more relevant restaurant recommendations.
                </p>
              )}
            </section>

            <section className="panel">
              <div className="panel__head">
                <h2>Your food profile</h2>
                <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>How Khabo Kothay sees you</span>
              </div>
              <p className="food-identity" style={{ color: 'var(--ink-soft)' }}>{identity}</p>
              <p className="t-sm" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s2)' }}>
                <Info size={12} aria-hidden="true" /> Your preferences shape the restaurant matches you see and the reasons we give you for each recommendation.
              </p>
            </section>

            <section className="panel">
              <div className="panel__head">
                <h2>Food preferences</h2>
                <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>These shape your recommendations</span>
              </div>

              <div className="pref-block">
                <h3>Favourite cuisines</h3>
                <div className="pref-row">
                  <div className="pref-chips">
                    {user.profile.cuisines.map((c) => (
                      <span key={c} className="chip chip--remove">
                        {c}
                        <button type="button" onClick={() => removeCuisine(c)} aria-label={`Remove ${c} from favourite cuisines`}><X size={12} aria-hidden="true" /></button>
                      </span>
                    ))}
                    {user.profile.cuisines.length === 0 && <span className="pref-row__empty">No favourite cuisines yet.</span>}
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setPicker('cuisines')}
                    disabled={user.profile.cuisines.length >= PREFERENCE_LIMITS.cuisines}
                  >
                    <Plus size={13} aria-hidden="true" /> Add cuisine
                  </button>
                </div>
                <span className="pref-row__meta">
                  {user.profile.cuisines.length} of {PREFERENCE_LIMITS.cuisines} selected
                  {user.profile.cuisines.length >= PREFERENCE_LIMITS.cuisines && ' — you can select up to 5 favourite cuisines.'}
                </span>
              </div>

              <div className="pref-block">
                <h3>Typical budget</h3>
                <div className="pref-row">
                  <button type="button" className="pref-select" onClick={() => setPicker('budget')}>
                    <span className="pref-select__label">Budget</span>
                    <span className="pref-select__value">{user.profile.budget ?? 'Any price'}</span>
                    <ChevronDown size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="pref-block">
                <h3>Diet</h3>
                <div className="pref-row">
                  <button type="button" className="pref-select" onClick={() => setPicker('diet')}>
                    <span className="pref-select__label">Diet</span>
                    <span className="pref-select__value">{DIET_OPTIONS.find((d) => d.value === user.profile.diet)?.label ?? 'Any'}</span>
                    <ChevronDown size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="pref-block">
                <h3>Preferred areas</h3>
                <div className="pref-row">
                  <div className="pref-chips">
                    {user.profile.neighbourhoods.map((a) => (
                      <span key={a} className="chip chip--remove">
                        {a}
                        <button type="button" onClick={() => removeArea(a)} aria-label={`Remove ${a} from preferred areas`}><X size={12} aria-hidden="true" /></button>
                      </span>
                    ))}
                    {user.profile.neighbourhoods.length === 0 && <span className="pref-row__empty">No preferred areas yet.</span>}
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setPicker('areas')}
                    disabled={user.profile.neighbourhoods.length >= PREFERENCE_LIMITS.neighbourhoods}
                  >
                    <Plus size={13} aria-hidden="true" /> Add area
                  </button>
                </div>
                <span className="pref-row__meta">
                  {user.profile.neighbourhoods.length} of {PREFERENCE_LIMITS.neighbourhoods} selected
                  {user.profile.neighbourhoods.length >= PREFERENCE_LIMITS.neighbourhoods && ' — you can choose up to 3 preferred areas.'}
                </span>
              </div>

              <div className="pref-block">
                <h3>What you're usually looking for</h3>
                <div className="pref-row">
                  <div className="pref-chips">
                    {user.profile.diningInterests.map((i) => (
                      <span key={i} className="chip chip--remove">
                        {i}
                        <button type="button" onClick={() => removeInterest(i)} aria-label={`Remove ${i} preference`}><X size={12} aria-hidden="true" /></button>
                      </span>
                    ))}
                    {user.profile.diningInterests.length === 0 && <span className="pref-row__empty">No preferences yet.</span>}
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setPicker('interests')}
                    disabled={user.profile.diningInterests.length >= PREFERENCE_LIMITS.interests}
                  >
                    <Plus size={13} aria-hidden="true" /> Add preference
                  </button>
                </div>
                <span className="pref-row__meta">
                  {user.profile.diningInterests.length} of {PREFERENCE_LIMITS.interests} selected
                  {user.profile.diningInterests.length >= PREFERENCE_LIMITS.interests && ' — you can add up to 3 preferences.'}
                </span>
              </div>

              {saved && <p className="t-sm" style={{ color: 'var(--success)' }}><Check size={12} aria-hidden="true" /> Preferences saved</p>}
            </section>

            {picker === 'cuisines' && (
              <PreferencePicker
                title="Choose favourite cuisines"
                options={CUISINES.map((c) => ({ value: c, label: c }))}
                selected={user.profile.cuisines}
                max={PREFERENCE_LIMITS.cuisines}
                onApply={setCuisines}
                onClose={() => setPicker(null)}
              />
            )}
            {picker === 'budget' && (
              <PreferencePicker
                title="Typical budget"
                single
                options={BUDGETS.map((b) => ({ value: b, label: b }))}
                selected={user.profile.budget ? [user.profile.budget] : []}
                max={1}
                onApply={(v) => v[0] && setBudget(v[0] as Budget)}
                onClose={() => setPicker(null)}
              />
            )}
            {picker === 'diet' && (
              <PreferencePicker
                title="Diet"
                single
                options={DIET_OPTIONS.map((d) => ({ value: d.value, label: d.label }))}
                selected={[user.profile.diet]}
                max={1}
                onApply={(v) => v[0] && setDiet(v[0] as 'any' | 'veg' | 'nonveg')}
                onClose={() => setPicker(null)}
              />
            )}
            {picker === 'areas' && (
              <PreferencePicker
                title="Choose preferred areas"
                options={NEIGHBORHOODS.map((n) => ({ value: n, label: n }))}
                selected={user.profile.neighbourhoods}
                max={PREFERENCE_LIMITS.neighbourhoods}
                onApply={setAreas}
                onClose={() => setPicker(null)}
              />
            )}
            {picker === 'interests' && (
              <PreferencePicker
                title="What you're usually looking for"
                options={INTEREST_OPTIONS}
                selected={user.profile.diningInterests}
                max={PREFERENCE_LIMITS.interests}
                onApply={setInterests}
                onClose={() => setPicker(null)}
              />
            )}

            <section className="panel">
              <div className="panel__head">
                <h2>Your activity</h2>
              </div>
              <ul className="activity-list">
                <li><MapPin size={13} aria-hidden="true" /> <strong>{favoriteIds.length}</strong> favourite restaurants</li>
                <li><User size={13} aria-hidden="true" /> <strong>{myReviews.length}</strong> review{myReviews.length === 1 ? '' : 's'} written</li>
                <li><Coins size={13} aria-hidden="true" /> <strong>{balance}</strong> tokens</li>
              </ul>
              {myReviews.length > 0 && (
                <div className="my-reviews">
                  {myReviews.map((r) => (
                    <div key={r.id} className="my-review">
                      <Link to={`/restaurant/${r.restaurantId}`}><strong>{r.restaurantId.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</strong></Link>
                      <span>{'★'.repeat(Math.round(r.rating))} <span className="t-sm">· {r.date}</span></span>
                      <p>{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <button type="button" className="btn btn--subtle" onClick={logout}>
              Sign out
            </button>
          </div>
        )}

        {tab === 'rewards' && (
          <div className="profile-body">
            <RewardsWallet userId={appUser?.id ?? user.id} />
          </div>
        )}

        {tab === 'referral' && (
          <div className="profile-body">
            <section className="panel">
              <div className="panel__head">
                <h2>Your referral code</h2>
                <strong className="referral-code">{user.referralCode}</strong>
              </div>
              <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
                When a friend signs up and verifies their contact, you both earn <strong>+{DEFAULT_REWARD_CONFIG.referralVerified} tokens</strong>.
              </p>
              <form className="invite-form" onSubmit={onInvite}>
                <label className="field" style={{ flex: 1 }}>
                  <span className="field__label">Friend's name</span>
                  <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Riya Banerjee" />
                </label>
                <button type="submit" className="btn btn--primary" style={{ alignSelf: 'flex-end' }}>Invite</button>
              </form>
              <div className="referral-list">
                {rewards.referrals.map((r) => (
                  <div key={r.id} className="referral-item">
                    <span className="referral-item__name">{r.name}</span>
                    <span className={`referral-item__status referral-item__status--${r.status}`}>
                      {r.status === 'invited' ? 'Invited' : <><BadgeCheck size={11} aria-hidden="true" /> Verified</>}
                    </span>
                    {r.status === 'invited' && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => verifyInvite(appUser?.id ?? user.id, r.id)}
                        title="Demo step — no OTP is actually sent"
                      >
                        Simulate verify
                      </button>
                    )}
                    {r.rewarded && <span className="referral-item__reward">+{DEFAULT_REWARD_CONFIG.referralVerified} tokens</span>}
                  </div>
                ))}
                {rewards.referrals.length === 0 && <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>Invite your first friend.</p>}
              </div>
              <p className="t-xs" style={{ color: 'var(--ink-faint)' }}>
                <ExternalLink size={11} aria-hidden="true" /> Demo only — no SMS or WhatsApp is actually sent, and verification is simulated.
              </p>
            </section>
          </div>
        )}

        {badges.length > 0 && (
          <section className="panel">
            <div className="panel__head"><h2>Badges</h2></div>
            <div className="badge-grid">
              {badges.map((b) => (
                <div key={b.id} className="badge-tile">
                  <BadgeCheck size={20} aria-hidden="true" />
                  <strong>{b.label}</strong>
                  <span className="t-xs">{b.description}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s4)' }}>
          <Trash2 size={11} aria-hidden="true" /> Your data lives in this browser only (localStorage). Signing out keeps your profile stored locally.
        </p>
      </div>
    </main>
  );
}
