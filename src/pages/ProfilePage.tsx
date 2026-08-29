import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Gift, Share2, BadgeCheck, Bookmark, Heart, MessageSquareQuote,
  Wallet, Check, Info, X, Plus, Pencil, ChevronRight, ArrowRight, LogOut, LogIn, Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';
import {
  PROFILE_FIELDS, deriveCompletedFields, foodIdentity, computeBadges,
  PREFERENCE_LIMITS, BADGE_GOALS, SPICE_OPTIONS, TRAVEL_OPTIONS, MEAL_TIME_OPTIONS,
} from '../lib/profile';
import { grantProfileCompletionReward, inviteFriend, verifyInvite } from '../lib/rewards';
import { DEFAULT_REWARD_CONFIG } from '../domain/rewards';
import { NEIGHBORHOODS, CUISINES } from '../hooks/useTaxonomy';
import { saveUser } from '../hooks/useUsers';
import { tokenBalance, useRewards } from '../hooks/useRewards';
import { useUserReviews } from '../hooks/useReviews';
import { useFavorites } from '../context/FavoritesContext';
import { useSaved } from '../context/SavedContext';
import RewardsWallet from '../components/RewardsWallet';
import PreferencePicker, { type PickerOption } from '../components/PreferencePicker';
import type { Budget } from '../types';
import type { DemoUser, SpiceLevel, TravelRange } from '../domain/auth';
import { Button, Disclosure, Field, IconButton, Celebration, CopyCode, CoinMark, badgeMark } from '../components/ui';

/**
 * The signed-in profile.
 *
 * What changed in this pass is presentation and hierarchy, not data. Three
 * things were wrong beyond styling and are fixed here:
 *
 * 1. A hard-coded "Food Explorer" chip sat in the identity band next to the
 *    real earned badges, so an account that had earned nothing still displayed
 *    an achievement. Badges now come only from computeBadges(); the ones not
 *    yet earned are shown as locked, with the real condition that unlocks them.
 * 2. The Badges panel rendered outside the tab switch, so it appeared under the
 *    rewards and referral tabs too. It now belongs to the profile tab.
 * 3. Nothing linked the profile to the Collection. Saved and Favourites are
 *    counted and linked here rather than re-listed — /saved and /favorites
 *    already own that surface.
 *
 * Every figure on this page is a count of the user's own records. No preference
 * setter, reward grant or write path is altered.
 */

/**
 * The remove mark inside a preference pill.
 *
 * This is the one place in the product where a *destructive* control was the
 * smallest target in it: a 12px glyph with 2px of padding, so a 16px box,
 * and a maroon `2px solid var(--primary)` focus ring that was a second focus
 * system beside §7's saffron one. `IconButton` fixes both, but it cannot
 * simply take its 34px box and 44px reach here — the pill is 32px tall and
 * `.pref-block__values` wraps at `gap: 6px`, so a 44px reach would overlap
 * the row above and below and the wrong pill would answer a tap.
 *
 * So the reach claims exactly the free space and no more, per §6:
 *  - box 20px, which fits inside the pill without growing it;
 *  - reach-y 38px = the 32px pill measured on /profile plus the 6px row gap
 *    `.pref-block__values` wraps at, i.e. exactly the row pitch, so two
 *    stacked rows' targets meet at zero overlap — the same arithmetic
 *    `.kk-chip` uses for 36 + 8 = 44;
 *  - reach-x 32px, which stops 4px short of the neighbouring pill's box.
 *
 * 400px² of target becomes ~1,216px². Not 44px, because 44px is not
 * available; three times the target, honestly bounded.
 */
const PREF_REMOVE_STYLE = {
  '--kk-ib-box': '20px',
  '--kk-ib-reach-x': '32px',
  '--kk-ib-reach-y': '38px',
} as CSSProperties;

const BUDGETS: Budget[] = ['Budget', 'Mid-range', 'Premium', 'Luxury'];const DIET_OPTIONS: Array<{ value: 'any' | 'veg' | 'nonveg'; label: string }> = [
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

type PickerKind = 'cuisines' | 'budget' | 'diet' | 'areas' | 'interests' | 'spice' | 'mealTimes' | 'travel' | null;
type Tab = 'profile' | 'rewards' | 'referral';

/**
 * Which picker answers which completion field.
 *
 * The checklist used to be seven lines of inert text sitting directly above the
 * five pickers that fill them — it told you what was missing and then made you
 * scroll past it to find the control. Name and contact are absent on purpose:
 * they come from the account, not from a preference sheet, so those two rows stay
 * text rather than pretending to be a button that opens nothing.
 */
const PICKER_FOR_FIELD: Record<string, Exclude<PickerKind, null>> = {
  cuisines: 'cuisines',
  budget: 'budget',
  neighbourhoods: 'areas',
  diet: 'diet',
  interests: 'interests',
  spice: 'spice',
  mealTimes: 'mealTimes',
  travel: 'travel',
};

/**
 * One preference question, foldable.
 *
 * Eight questions, each permanently showing its title, its explanation line,
 * its chosen values and its own button, made a 900px wall of settings — and the
 * three questions added in this pass would have made it 1,300px. The panel is
 * not a settings sheet, it is a questionnaire, and a questionnaire's answered
 * questions should get out of the way.
 *
 * So each row is a `Disclosure`, and the fold state is *derived*: unanswered
 * questions are open because they are the work left to do, answered ones are
 * closed because they are done. Nothing is remembered until the diner
 * overrides it by hand — `openPref[key]` starts undefined, so answering a
 * question folds it in the same render that ticks it, and clearing the last
 * value unfolds it again.
 *
 * The answer is repeated in the trigger rather than hidden with the panel. A
 * closed row that says only "Spice tolerance" forces a click to find out
 * whether it is even answered, and because the readout sits inside the button
 * it is also the button's accessible name: "Favourite cuisines, Bengali, Thai"
 * rather than eight buttons all called the name of a question.
 *
 * `variant="row"` and not `card`: eight bordered cards inside one bordered
 * panel is a box inside a box eight times over. The ruled row is what an
 * accordion of siblings wants, and §7 already owns it.
 */
/**
 * What a folded, unanswered row says. Not an em dash and not blank: the readout
 * is inside the trigger, so it is part of the button's name, and a button called
 * "Spice tolerance —" tells a screen-reader user nothing about whether there is
 * anything behind it.
 */
const NOT_ANSWERED = 'Not answered yet';

interface PrefQuestionProps {
  title: string;
  /** Ticked in the trigger, and the reason the row folds itself. */
  answered: boolean;
  /** The answer, spelled out in the trigger. Plain text — it lives in a button. */
  readout: string;
  /** What answering it actually changes. One line, under the trigger. */
  effect: string;
  open: boolean;
  onToggle: (next: boolean) => void;
  /** The chips, including their remove marks — interactive, so panel-only. */
  children: ReactNode;
  /** Add / Change / Choose. */
  action: ReactNode;
}

function PrefQuestion({ title, answered, readout, effect, open, onToggle, children, action }: PrefQuestionProps) {
  return (
    <Disclosure
      variant="row"
      className="pref-q"
      open={open}
      onToggle={onToggle}
      summary={
        <>
          <span className="pref-q__label">
            <span className="pref-q__mark" aria-hidden="true">
              {answered ? <Check size={13} /> : <span className="pref-q__dot" />}
            </span>
            {title}
          </span>
          <span className="pref-q__read" data-answered={answered ? 'true' : 'false'}>{readout}</span>
        </>
      }
      panelClassName="pref-q__panel"
    >
      <p className="pref-q__effect">{effect}</p>
      <div className="pref-block__values">{children}</div>
      <div className="pref-q__action">{action}</div>
    </Disclosure>
  );
}

/** Member-since is a stored string; render it long-form, or not at all. */
function memberSince(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function titleFromSlug(slug: string): string {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function ProfilePage() {
  usePageTitle('Your profile');
  const { user, appUser, logout } = useAuth();
  const { favoriteIds } = useFavorites();
  const { savedIds } = useSaved();
  const [tab, setTab] = useState<Tab>('profile');
  const [flash, setFlash] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [picker, setPicker] = useState<PickerKind>(null);
  /* Manual overrides of the fold state only. An absent key means "follow the
     answer" — see `PrefQuestion`. Storing every row's state here instead would
     freeze whatever it was when the page mounted, so answering a question would
     tick it and leave it open. */
  const [openPref, setOpenPref] = useState<Record<string, boolean>>({});
  /* The amount just claimed, held only for as long as the celebration plays.
     Not derived from `completionRewardClaimed`: that flag stays true forever,
     and a flourish that replays on every visit to a finished profile is a
     nag. This is the event, not the state. */
  const [claimed, setClaimed] = useState<number | null>(null);

  const balance = user ? tokenBalance(appUser?.id ?? user.id) : 0;
  /**
   * Completion, read off the data rather than off the stored `completedFields`
   * array. The two disagree whenever that array is stale — a fresh demo account
   * has a name and a contact but an empty list, so `profileCompletion()` returned
   * 0% beside a checklist that was already ticking two rows. Everything else on
   * this page (the ticks, the answered count, the missing-field pickers) derives
   * from deriveCompletedFields(); the ring and the meter now derive from it too,
   * so one page cannot state two different figures for one profile.
   */
  const completion = user
    ? Math.round((deriveCompletedFields(user).length / PROFILE_FIELDS.length) * 100)
    : 0;
  const rewards = useRewards(appUser?.id ?? user?.id ?? '');

  const allUserReviews = useUserReviews();
  const myReviews = useMemo(() => {
    if (!user) return [];
    return allUserReviews.filter((r) => r.userId === user.id);
  }, [user, allUserReviews]);

  if (!user) {
    return (
      <main className="profile-page">
        <div className="profile-body">
          <div className="console-empty">
            <span className="console-empty__icon"><User size={20} aria-hidden="true" /></span>
            <h1 className="console-empty__title">Sign in to see your profile</h1>
            <p className="console-empty__text">
              Your saved places, favourites, reviews and reward tokens live here once you're signed in.
            </p>
            <div className="console-empty__actions">
              <Button variant="primary" to="/login" icon={LogIn}>Sign in</Button>
              <Button variant="ghost" to="/explore" icon={Compass}>Browse restaurants</Button>
            </div>
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
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1500);
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

  const setSpice = (s: SpiceLevel) => {
    persistUser({ ...user, profile: { ...user.profile, spice: s } });
    setPicker(null);
  };

  const setTravel = (t: TravelRange) => {
    persistUser({ ...user, profile: { ...user.profile, travel: t } });
    setPicker(null);
  };

  const setMealTimes = (vals: string[]) => {
    persistUser({ ...user, profile: { ...user.profile, mealTimes: vals.slice(0, PREFERENCE_LIMITS.mealTimes) } });
    setPicker(null);
  };
  const removeMealTime = (t: string) => setMealTimes((user.profile.mealTimes ?? []).filter((x) => x !== t));

  /* A question is open unless it has been answered — unless the diner said
     otherwise, which is the only thing `openPref` records. */
  const prefOpen = (key: string) => openPref[key] ?? !fields.includes(key);
  const togglePref = (key: string) => (next: boolean) => setOpenPref((o) => ({ ...o, [key]: next }));

  const mealTimes = user.profile.mealTimes ?? [];
  const spiceLabel = SPICE_OPTIONS.find((s) => s.value === user.profile.spice)?.label;
  const travelLabel = TRAVEL_OPTIONS.find((t) => t.value === user.profile.travel)?.label;
  const dietLabel = DIET_OPTIONS.find((d) => d.value === user.profile.diet)?.label ?? 'Any';

  const claimCompletionReward = () => {
    // The ledger enforces once-only even if the UI flag is out of sync.
    const res = grantProfileCompletionReward(appUser?.id ?? user.id);
    if (res.granted) {
      saveUser({ ...user, completionRewardClaimed: true });
      /* Only on a real grant. The celebration is the receipt for tokens that
         actually moved, so a second click on a stale banner — the case the
         ledger's once-only rule exists for — must not produce one. */
      setClaimed(DEFAULT_REWARD_CONFIG.profileCompletion);
    }
  };

  const identity = foodIdentity(user);
  const badges = computeBadges(user, myReviews.length);
  const earnedIds = new Set(badges.map((b) => b.id));

  /**
   * How far along a locked badge is, for the two conditions that are a count
   * rather than a switch. Read straight off the same values computeBadges()
   * tests, so a tile can never claim progress the badge logic disagrees with.
   * Everything else returns null — "Set your typical budget to Budget" has no
   * halfway, and inventing one would be inventing a mechanic.
   */
  const goalProgress = (id: string): string | null => {
    if (id === 'badge-cuisine-explorer') return `${Math.min(user.profile.cuisines.length, 3)} of 3 cuisines chosen`;
    if (id === 'badge-top-reviewer') return `${Math.min(myReviews.length, 3)} of 3 reviews written`;
    return null;
  };

  /* Any stored badge that isn't in the goal catalogue still belongs to the
     user, so it is listed rather than silently dropped. */
  const extraBadges = badges.filter((b) => !BADGE_GOALS.some((g) => g.id === b.id));
  const since = memberSince(user.createdAt);

  const onInvite = (e: FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) return;
    inviteFriend(appUser?.id ?? user.id, inviteName.trim());
    setInviteName('');
  };

  return (
    <main className="profile-page">
      <header className="profile-head">
        {/* The avatar carries the completion figure as a ring around itself.
            Before this, how far along your profile was lived only in a 6px bar
            two panels down, so the identity band said who you are and nothing
            about the thing you are building. The ring is the same number the
            meter shows — no new mechanic, no invented level — but at the one
            place on the page a diner already looks at themselves. */}
        <div
          className="profile-identity"
          style={{ '--pct': completion } as CSSProperties}
          role="img"
          aria-label={`Profile ${completion}% complete`}
        >
          <div className="profile-head__avatar" aria-hidden="true">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.charAt(0).toUpperCase()}
          </div>
          <span className="profile-identity__figure" aria-hidden="true">{completion}%</span>
        </div>
        <div className="profile-head__info">
          <span className="profile-head__eyebrow">Your food profile</span>
          <h1>{user.name}</h1>
          <div className="profile-head__meta">
            <span>{user.contact}</span>
            {since && <span>Member since {since}</span>}
            {badges.length > 0 && (
              /* The badges you hold, shown rather than counted. "2 badges
                 earned" set in the same grey as the phone number is a fact
                 about the account; a row of the same gold marks the badge
                 tiles use — one per badge, the tile's disc at a fifth of the
                 size — is something you collected. The count stays as the
                 label, so the sentence a screen reader gets is unchanged and
                 the marks are decoration on top of it. The title names them,
                 because a pip on its own says you have one, not which.
                 Each pip carries its own badge's mark: the whole row used to be
                 the same rosette five times, which at this size read as one
                 wide smudge rather than as five things. */
              <span
                className="profile-head__badges"
                title={badges.map((b) => b.label).join(' · ')}
              >
                <span className="profile-head__pips" aria-hidden="true">
                  {badges.slice(0, 5).map((b) => {
                    const Mark = badgeMark(b.id);
                    return (
                      <span key={b.id} className="profile-head__pip">
                        <Mark size={12} />
                      </span>
                    );
                  })}
                </span>
                {badges.length} badge{badges.length === 1 ? '' : 's'} earned
              </span>
            )}
          </div>
        </div>
        {/* The balance, minted. It was two words of text against a hairline —
            the same weight as "Member since March", when it is the one figure
            on this page a diner spends. The coin mark says what kind of number
            it is before the number is read, and the plaque plus the chevron say
            the figure is a way through to the wallet, which previously only the
            title attribute knew. Gold ink and a gold hairline, not a gold
            fill: §3 keeps the filled gold for the single commercial action,
            which on this tab is the claim button below. */}
        <button
          type="button"
          className="profile-head__tokens profile-head__tokens--button"
          onClick={() => setTab('rewards')}
          aria-label={`${balance} tokens — open rewards and coupons`}
          title="Open rewards & coupons"
        >
          <span className="profile-head__tokens-mark" aria-hidden="true">
            <CoinMark size={28} />
          </span>
          <span className="profile-head__tokens-figure">
            <strong>{balance}</strong>
            <span className="profile-head__tokens-unit">tokens</span>
          </span>
          <ChevronRight className="profile-head__tokens-go" size={16} aria-hidden="true" />
        </button>
      </header>

      <nav className="profile-tabs" role="tablist" aria-label="Profile sections">
        <button type="button" role="tab" aria-selected={tab === 'profile'} onClick={() => setTab('profile')}>
          Profile
        </button>
        <button type="button" role="tab" aria-selected={tab === 'rewards'} onClick={() => setTab('rewards')}>
          Rewards
        </button>
        <button type="button" role="tab" aria-selected={tab === 'referral'} onClick={() => setTab('referral')}>
          Refer a friend
        </button>
      </nav>

      {tab === 'profile' && (
        <div className="profile-body">
          {/* What we know, and how much of it there is. One panel, because the
              sentence and the meter answer the same question. */}
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Your food profile</h2>
              {/* A count, not a third percentage. The ring in the head band and
                  the meter below both state the figure already; what neither of
                  them says is how many answers it is made of, which is the one
                  number that tells you the profile is finishable. */}
              <p className="completion-count">
                <strong>{fields.length}</strong> of {PROFILE_FIELDS.length} answered
              </p>
            </div>
            <p className="food-identity">{identity}</p>

            <div className="progress progress--segmented" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion" style={{ '--segments': PROFILE_FIELDS.length } as CSSProperties}>
              <span className="progress__fill" style={{ width: `${completion}%` }} />
            </div>

            {/* Each unanswered field is the control that answers it. The list was
                seven lines of text directly above the five pickers that fill
                them: it told you what was missing, then made you scroll past it
                to do anything about it. */}
            <ul className="completion-list">
              {PROFILE_FIELDS.map((f) => {
                const done = fields.includes(f.key);
                const target = PICKER_FOR_FIELD[f.key];
                if (done) {
                  return (
                    <li key={f.key} data-done="true">
                      <Check size={14} aria-hidden="true" />
                      {f.label}
                    </li>
                  );
                }
                if (!target) {
                  return (
                    <li key={f.key}>
                      <span className="completion-list__dot" aria-hidden="true" />
                      {f.label}
                    </li>
                  );
                }
                return (
                  <li key={f.key}>
                    <button
                      type="button"
                      className="completion-list__go"
                      onClick={() => setPicker(target)}
                      aria-label={`Set ${f.label.toLowerCase()}`}
                    >
                      <span className="completion-list__dot" aria-hidden="true" />
                      {f.label}
                      <ChevronRight size={13} aria-hidden="true" className="completion-list__mark" />
                    </button>
                  </li>
                );
              })}
            </ul>

            {completion === 100 && !user.completionRewardClaimed && (
              <div className="console-banner console-banner--pending">
                <Gift size={16} aria-hidden="true" />
                <div className="console-banner__body">
                  <strong>Your profile is complete</strong>
                  <p>Claim the one-time completion reward — it can only be granted once.</p>
                  <div className="console-banner__actions">
                    {/* `accent`, not `primary`. This is the one commercial action
                        in the view — the moment the profile pays the user back —
                        and `.btn--accent` exists for exactly that. It had zero
                        call sites product-wide, which is why claiming a reward
                        looked identical to saving a form. */}
                    <Button variant="accent" size="sm" icon={Gift} onClick={claimCompletionReward}>
                      Claim +{DEFAULT_REWARD_CONFIG.profileCompletion} tokens
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {completion === 100 && user.completionRewardClaimed && (
              <p className="status-text status-text--ok">
                <Check size={14} aria-hidden="true" /> Completion reward claimed — +{DEFAULT_REWARD_CONFIG.profileCompletion} tokens already in your ledger.
              </p>
            )}
            {missing.length > 0 && (
              <p className="panel__foot">
                <Info size={14} aria-hidden="true" />
                <span>
                  {missing.length} field{missing.length === 1 ? '' : 's'} left. Your preferences decide which
                  restaurants match you and what reason we give for each recommendation — completing them also
                  earns +{DEFAULT_REWARD_CONFIG.profileCompletion} tokens, once.
                </span>
              </p>
            )}
          </section>

          {/* Preferences. Eight questions, folded once answered — each row
              states its answer in the trigger, and what answering it changes
              inside. */}
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Food preferences</h2>
              <span className="panel__hint">
                {PROFILE_FIELDS.filter((f) => PICKER_FOR_FIELD[f.key] && fields.includes(f.key)).length} of{' '}
                {PROFILE_FIELDS.filter((f) => PICKER_FOR_FIELD[f.key]).length} answered
              </span>
            </div>

            <PrefQuestion
              title="Favourite cuisines"
              answered={fields.includes('cuisines')}
              readout={user.profile.cuisines.join(', ') || NOT_ANSWERED}
              effect={`${user.profile.cuisines.length} of ${PREFERENCE_LIMITS.cuisines} chosen · decides which cuisine pages list you a match`}
              open={prefOpen('cuisines')}
              onToggle={togglePref('cuisines')}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={() => setPicker('cuisines')}
                  unavailable={user.profile.cuisines.length >= PREFERENCE_LIMITS.cuisines}
                  unavailableReason={`That's all ${PREFERENCE_LIMITS.cuisines} cuisines — remove one to add another.`}
                >
                  Add
                </Button>
              }
            >
              {user.profile.cuisines.map((c) => (
                <span key={c} className="chip chip--remove">
                  {c}
                  <IconButton
                    icon={X}
                    label={`Remove ${c} from favourite cuisines`}
                    size="sm"
                    style={PREF_REMOVE_STYLE}
                    onClick={() => removeCuisine(c)}
                  />
                </span>
              ))}
              {user.profile.cuisines.length === 0 && <span className="pref-row__empty">No cuisines yet</span>}
            </PrefQuestion>

            <PrefQuestion
              title="Diet"
              answered={fields.includes('diet')}
              readout={fields.includes('diet') ? dietLabel : NOT_ANSWERED}
              effect="Vegetarian and non-vegetarian matches are ordered around this"
              open={prefOpen('diet')}
              onToggle={togglePref('diet')}
              action={
                <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setPicker('diet')}>
                  Change
                </Button>
              }
            >
              <span className="chip">{dietLabel}</span>
            </PrefQuestion>

            <PrefQuestion
              title="Spice tolerance"
              answered={fields.includes('spice')}
              readout={spiceLabel ?? NOT_ANSWERED}
              effect="The one taste note a cuisine tag never carries — it goes into how we describe you, not into hiding anything from you"
              open={prefOpen('spice')}
              onToggle={togglePref('spice')}
              action={
                <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setPicker('spice')}>
                  {spiceLabel ? 'Change' : 'Choose'}
                </Button>
              }
            >
              {spiceLabel
                ? <span className="chip">{spiceLabel}</span>
                : <span className="pref-row__empty">Not set</span>}
            </PrefQuestion>

            <PrefQuestion
              title="Typical budget"
              answered={fields.includes('budget')}
              readout={user.profile.budget ?? NOT_ANSWERED}
              effect="Used to rank price fit — never to hide a restaurant from you"
              open={prefOpen('budget')}
              onToggle={togglePref('budget')}
              action={
                <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setPicker('budget')}>
                  {user.profile.budget ? 'Change' : 'Choose'}
                </Button>
              }
            >
              {user.profile.budget
                ? <span className="chip">{user.profile.budget}</span>
                : <span className="pref-row__empty">No budget yet</span>}
            </PrefQuestion>

            <PrefQuestion
              title="Preferred areas"
              answered={fields.includes('neighbourhoods')}
              readout={user.profile.neighbourhoods.join(', ') || NOT_ANSWERED}
              effect={`${user.profile.neighbourhoods.length} of ${PREFERENCE_LIMITS.neighbourhoods} chosen · nearby matches are weighted towards these`}
              open={prefOpen('neighbourhoods')}
              onToggle={togglePref('neighbourhoods')}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={() => setPicker('areas')}
                  unavailable={user.profile.neighbourhoods.length >= PREFERENCE_LIMITS.neighbourhoods}
                  unavailableReason={`That's all ${PREFERENCE_LIMITS.neighbourhoods} areas — remove one to add another.`}
                >
                  Add
                </Button>
              }
            >
              {user.profile.neighbourhoods.map((a) => (
                <span key={a} className="chip chip--remove">
                  {a}
                  <IconButton
                    icon={X}
                    label={`Remove ${a} from preferred areas`}
                    size="sm"
                    style={PREF_REMOVE_STYLE}
                    onClick={() => removeArea(a)}
                  />
                </span>
              ))}
              {user.profile.neighbourhoods.length === 0 && <span className="pref-row__empty">No areas yet</span>}
            </PrefQuestion>

            <PrefQuestion
              title="How far you'll go"
              answered={fields.includes('travel')}
              readout={travelLabel ?? NOT_ANSWERED}
              effect="Says how strictly to read your preferred areas — a shortlist you'd cross Dhaka for is a different shortlist"
              open={prefOpen('travel')}
              onToggle={togglePref('travel')}
              action={
                <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setPicker('travel')}>
                  {travelLabel ? 'Change' : 'Choose'}
                </Button>
              }
            >
              {travelLabel
                ? <span className="chip">{travelLabel}</span>
                : <span className="pref-row__empty">Not set</span>}
            </PrefQuestion>

            <PrefQuestion
              title="When you eat out"
              answered={fields.includes('mealTimes')}
              readout={mealTimes.join(', ') || NOT_ANSWERED}
              effect={`${mealTimes.length} of ${PREFERENCE_LIMITS.mealTimes} chosen · the hours you actually go out, which is not the same as the hours a place is open`}
              open={prefOpen('mealTimes')}
              onToggle={togglePref('mealTimes')}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={() => setPicker('mealTimes')}
                  unavailable={mealTimes.length >= PREFERENCE_LIMITS.mealTimes}
                  unavailableReason={`That's all ${PREFERENCE_LIMITS.mealTimes} times — remove one to add another.`}
                >
                  Add
                </Button>
              }
            >
              {mealTimes.map((t) => (
                <span key={t} className="chip chip--remove">
                  {t}
                  <IconButton
                    icon={X}
                    label={`Remove ${t} from when you eat out`}
                    size="sm"
                    style={PREF_REMOVE_STYLE}
                    onClick={() => removeMealTime(t)}
                  />
                </span>
              ))}
              {mealTimes.length === 0 && <span className="pref-row__empty">Nothing yet</span>}
            </PrefQuestion>

            <PrefQuestion
              title="What you're usually looking for"
              answered={fields.includes('interests')}
              readout={user.profile.diningInterests.join(', ') || NOT_ANSWERED}
              effect={`${user.profile.diningInterests.length} of ${PREFERENCE_LIMITS.interests} chosen · the occasion and mood behind a match`}
              open={prefOpen('interests')}
              onToggle={togglePref('interests')}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={() => setPicker('interests')}
                  unavailable={user.profile.diningInterests.length >= PREFERENCE_LIMITS.interests}
                  unavailableReason={`That's all ${PREFERENCE_LIMITS.interests} of them — remove one to add another.`}
                >
                  Add
                </Button>
              }
            >
              {user.profile.diningInterests.map((i) => (
                <span key={i} className="chip chip--remove">
                  {i}
                  <IconButton
                    icon={X}
                    label={`Remove ${i} preference`}
                    size="sm"
                    style={PREF_REMOVE_STYLE}
                    onClick={() => removeInterest(i)}
                  />
                </span>
              ))}
              {user.profile.diningInterests.length === 0 && <span className="pref-row__empty">Nothing yet</span>}
            </PrefQuestion>

            {flash && (
              <p className="status-text status-text--ok"><Check size={14} aria-hidden="true" /> Preferences saved</p>
            )}
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
          {picker === 'spice' && (
            <PreferencePicker
              title="Spice tolerance"
              single
              options={SPICE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
              selected={user.profile.spice ? [user.profile.spice] : []}
              max={1}
              onApply={(v) => v[0] && setSpice(v[0] as SpiceLevel)}
              onClose={() => setPicker(null)}
            />
          )}
          {picker === 'travel' && (
            <PreferencePicker
              title="How far you'll go for a meal"
              single
              options={TRAVEL_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
              selected={user.profile.travel ? [user.profile.travel] : []}
              max={1}
              onApply={(v) => v[0] && setTravel(v[0] as TravelRange)}
              onClose={() => setPicker(null)}
            />
          )}
          {picker === 'mealTimes' && (
            <PreferencePicker
              title="When you eat out"
              options={MEAL_TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
              selected={mealTimes}
              max={PREFERENCE_LIMITS.mealTimes}
              onApply={setMealTimes}
              onClose={() => setPicker(null)}
            />
          )}

          {/* Collection + activity. Counted here, kept where it lives: /saved and
              /favorites already own those lists, so this links out instead of
              re-rendering them. */}
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Your collection</h2>
              <span className="panel__hint">Counts of your own records</span>
            </div>
            <ul className="records records--bare">
              <li className="record">
                <div className="record__main">
                  <p className="record__title"><Bookmark size={14} aria-hidden="true" /> Saved</p>
                  <div className="record__meta"><span>Your wide net — anywhere you want to remember</span></div>
                </div>
                <span className="record__figure">{savedIds.length}<small>places</small></span>
                <Button variant="ghost" size="sm" to="/saved" iconAfter={ChevronRight}>Open</Button>
              </li>
              <li className="record">
                <div className="record__main">
                  <p className="record__title"><Heart size={14} aria-hidden="true" /> Favourites</p>
                  <div className="record__meta"><span>Your shortlist — the strongest signal your matches learn from</span></div>
                </div>
                <span className="record__figure">{favoriteIds.length}<small>places</small></span>
                <Button variant="ghost" size="sm" to="/favorites" iconAfter={ChevronRight}>Open</Button>
              </li>
              <li className="record">
                <div className="record__main">
                  <p className="record__title"><MessageSquareQuote size={14} aria-hidden="true" /> Reviews written</p>
                  <div className="record__meta"><span>What you've told other diners</span></div>
                </div>
                <span className="record__figure">{myReviews.length}<small>reviews</small></span>
              </li>
              <li className="record">
                <div className="record__main">
                  <p className="record__title"><CoinMark size={15} /> Token balance</p>
                  <div className="record__meta"><span>Earned from your profile, reviews and saves</span></div>
                </div>
                <span className="record__figure">{balance}<small>tokens</small></span>
                <Button variant="ghost" size="sm" icon={Wallet} onClick={() => setTab('rewards')}>
                  Wallet
                </Button>
              </li>
            </ul>
            <p className="panel__foot">
              <Info size={14} aria-hidden="true" />
              <span>Only restaurants can be saved. Saving an individual dish isn't recorded yet, so there is no dish list to show.</span>
            </p>
          </section>

          {/* Reviews. */}
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Your reviews</h2>
              {myReviews.length > 0 && <span className="panel__hint">{myReviews.length} written</span>}
            </div>
            {myReviews.length === 0 ? (
              <div className="console-empty console-empty--inset">
                <h3 className="console-empty__title">You haven't written a review yet</h3>
                <p className="console-empty__text">
                  Your first useful review earns +{DEFAULT_REWARD_CONFIG.review} tokens, once — and it is the part of
                  your profile other diners actually read.
                </p>
                <div className="console-empty__actions">
                  <Button variant="ghost" size="sm" to="/explore" iconAfter={ArrowRight}>Find a place you've been</Button>
                </div>
              </div>
            ) : (
              <ul className="records records--bare">
                {myReviews.map((r) => (
                  <li key={r.id} className="record record--stack">
                    <div className="record__main">
                      <p className="record__title">
                        <Link to={`/restaurant/${r.restaurantId}`}>{titleFromSlug(r.restaurantId)}</Link>
                      </p>
                      <div className="record__meta">
                        <span aria-label={`${r.rating} out of 5`}>{'★'.repeat(Math.round(r.rating))}</span>
                        <span>{r.date}</span>
                      </div>
                      <p className="record__body">{r.comment}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Achievements. Earned badges come from computeBadges(); the rest are
              shown locked with the real condition, so nothing is implied to be
              earned that isn't. The two conditions that are countable also say
              how far along they are — a locked tile that reads "2 of 3 cuisines"
              is a goal, where "Choose 3 favourite cuisines" alone is a rule.
              No dates: badges derived from current preferences are stamped with
              today, so an "earned on" line would be fiction.

              Every tile draws its own badge's mark (src/components/ui/marks.tsx),
              earned or not. It used to be one rosette seven times and a padlock
              for the rest, which is what made a grid of seven achievements read
              as one achievement repeated: the tile you had earned and the tile
              you had not were told apart by colour alone, and no tile said what
              it was *for*. A locked tile now shows the thing you would collect,
              greyed — the dashed border, the recessed field and the requirement
              line already say it is not yours yet, so the padlock was spending
              the one glyph slot on information three other signals carried. */}
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Achievements</h2>
              <span className="panel__hint">{badges.length} of {BADGE_GOALS.length + extraBadges.length} earned</span>
            </div>
            <div className="badge-grid">
              {BADGE_GOALS.map((goal) => {
                const earned = earnedIds.has(goal.id);
                const toward = earned ? null : goalProgress(goal.id);
                const Mark = badgeMark(goal.id);
                return (
                  <div key={goal.id} className="badge-tile" data-locked={earned ? undefined : 'true'}>
                    <span className="badge-tile__mark" aria-hidden="true">
                      <Mark size={18} />
                    </span>
                    <strong>{goal.label}</strong>
                    <span>{earned ? goal.description : goal.requirement}</span>
                    {toward && <span className="badge-tile__toward">{toward}</span>}
                  </div>
                );
              })}
              {extraBadges.map((b) => {
                const Mark = badgeMark(b.id);
                return (
                  <div key={b.id} className="badge-tile">
                    <span className="badge-tile__mark" aria-hidden="true"><Mark size={18} /></span>
                    <strong>{b.label}</strong>
                    <span>{b.description}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Sign out closes the page rather than sitting in a panel of its own —
              a bordered box holding one transparent button reads as an empty row. */}
          <div className="profile-signout">
            {/* `danger`, not `ghost`. This is one of only two ways out of a
                session in the whole product, and it read exactly like the
                Wallet link two panels up. `danger` is quiet at rest and
                reddens under the pointer — the signal arrives at the moment
                it is worth having, not as a red box you scroll past. */}
            <Button variant="danger" icon={LogOut} onClick={logout}>
              Sign out
            </Button>
          </div>
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
              <h2 className="panel__title">Refer a friend</h2>
              <span className="panel__hint">Demo flow</span>
            </div>

            <dl className="console-defs">
              <div>
                <dt>Your referral code</dt>
                {/* The one value on this panel that has to leave the page. It
                    was 13px text you had to drag-select. */}
                <dd>
                  <CopyCode
                    value={user.referralCode}
                    label={`Copy your referral code ${user.referralCode}`}
                  />
                </dd>
              </div>
              <div>
                <dt>Reward per verified friend</dt>
                <dd>+{DEFAULT_REWARD_CONFIG.referralVerified} tokens, to both of you</dd>
              </div>
              <div>
                <dt>Verified so far</dt>
                <dd>{rewards.referrals.filter((r) => r.status === 'verified').length} of {rewards.referrals.length || 0}</dd>
              </div>
            </dl>

            {/* The button sits on its own row rather than beside the field.
                `Field` renders label / control / hint, so a same-row button
                could only align its *bottom* to the hint's bottom — which is
                what shipped, and it left the Invite button hanging 25px below
                the input it belongs to. Moving the hint out to fix that would
                cost the input its `aria-describedby`. */}
            <form className="invite-form" onSubmit={onInvite}>
              <Field label="Friend's name" hint="Only used to label the invite in your list.">
                <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Nusrat Jahan" />
              </Field>
              <Button type="submit" variant="primary" icon={Share2}>
                Invite
              </Button>
            </form>

            {rewards.referrals.length === 0 ? (
              <div className="console-empty console-empty--inset">
                <h3 className="console-empty__title">No invites yet</h3>
                <p className="console-empty__text">Add a friend's name above to record an invite in this demo.</p>
              </div>
            ) : (
              <ul className="referral-list">
                {rewards.referrals.map((r) => (
                  <li key={r.id}>
                    {/* The initial, in the same disc the profile header uses for
                        the diner themselves. A referral list is a list of
                        people; it had been a list of left-aligned strings with
                        600px of paper between the name and its status. */}
                    <span className="referral-list__mark" aria-hidden="true">
                      {r.name.trim().charAt(0).toUpperCase() || '?'}
                    </span>
                    <span className="referral-list__name">{r.name}</span>
                    {r.status === 'verified' ? (
                      <span className="status-pill status-pill--ok"><BadgeCheck size={12} aria-hidden="true" /> Verified</span>
                    ) : (
                      <span className="status-pill status-pill--pending">Invited</span>
                    )}
                    {r.rewarded && <span className="earn-list__amount">+{DEFAULT_REWARD_CONFIG.referralVerified}</span>}
                    {r.status === 'invited' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={BadgeCheck}
                        onClick={() => verifyInvite(appUser?.id ?? user.id, r.id)}
                        title="Demo step — no OTP is actually sent"
                      >
                        Simulate verify
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <p className="reward-disclosure">
              <Info size={16} aria-hidden="true" />
              <span>
                Demo only — no SMS or WhatsApp is sent and verification is simulated. A real referral would be
                verified by the same phone OTP used to sign in.
              </span>
            </p>
          </section>
        </div>
      )}

      <div className="profile-body" style={{ paddingTop: 0 }}>
        <p className="reward-disclosure">
          <Info size={16} aria-hidden="true" />
          <span>
            Your profile, preferences and tokens are stored in this browser (localStorage). Signing out keeps them
            here; clearing your browser data removes them.
          </span>
        </p>
      </div>

      {/* The claim, celebrated. It portals to the body, so it plays over
          whatever the page did next — including the banner that granted it
          being replaced by its claimed line in the same render. */}
      {claimed !== null && (
        <Celebration
          amount={claimed}
          headline="Reward claimed"
          caption="Your food profile is complete. Spend these on rewards in the wallet."
          onDone={() => setClaimed(null)}
        />
      )}
    </main>
  );
}
