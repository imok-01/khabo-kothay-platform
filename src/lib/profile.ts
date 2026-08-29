import type { Badge, DemoUser, SpiceLevel, TravelRange } from '../domain/auth';

/**
 * Intentional selection limits — enforced in the data layer (setters slice
 * to these) and surfaced in the UI, so preferences never become a tag wall.
 */
export const PREFERENCE_LIMITS = {
  cuisines: 5,
  neighbourhoods: 3,
  interests: 3,
  mealTimes: 3,
} as const;

/**
 * The three answer sets added with the new questions live here rather than in
 * `ProfilePage`, because `foodIdentity()` below has to spell the same answers
 * back to the diner in prose. Two copies of "Full heat" would eventually
 * disagree, and the one that disagrees is the sentence describing the person.
 */
export const SPICE_OPTIONS: Array<{ value: SpiceLevel; label: string }> = [
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'hot', label: 'Full heat' },
];

export const TRAVEL_OPTIONS: Array<{ value: TravelRange; label: string }> = [
  { value: 'walk', label: 'Walking distance' },
  { value: 'area', label: 'My side of Dhaka' },
  { value: 'city', label: 'Anywhere in the city' },
];

/** Dhaka's actual eating-out rhythm, not a generic breakfast/lunch/dinner set. */
export const MEAL_TIME_OPTIONS: string[] = [
  'Breakfast',
  'Lunch',
  'Afternoon coffee',
  'Dinner',
  'Late-night bites',
];

/**
 * Profile completion is computed from actually-completed fields — never a
 * hard-coded number. Each field maps to a key stored in `completedFields`.
 *
 * Ordered as a questionnaire rather than as a changelog: who you are, then
 * taste, then money, then place, then when. The order is read straight into
 * the completion checklist and the segmented meter, so it is the order the
 * diner is asked in.
 */
export const PROFILE_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'name', label: 'Your name' },
  { key: 'contact', label: 'Contact' },
  { key: 'cuisines', label: 'Favourite cuisines' },
  { key: 'diet', label: 'Diet preference' },
  { key: 'spice', label: 'Spice tolerance' },
  { key: 'budget', label: 'Typical budget' },
  { key: 'neighbourhoods', label: 'Preferred areas' },
  { key: 'travel', label: 'How far you go' },
  { key: 'mealTimes', label: 'When you eat out' },
  { key: 'interests', label: 'Food interests' },
];

export function profileCompletion(user: DemoUser): number {
  if (PROFILE_FIELDS.length === 0) return 0;
  const done = PROFILE_FIELDS.filter((f) => user.completedFields.includes(f.key)).length;
  return Math.round((done / PROFILE_FIELDS.length) * 100);
}

export function missingProfileFields(user: DemoUser): string[] {
  return PROFILE_FIELDS.filter((f) => !user.completedFields.includes(f.key)).map((f) => f.label);
}

/**
 * Which fields are *currently* answered, read off the profile data.
 *
 * Deliberately not a union with the stored `completedFields`. It used to be —
 * the set started from the stored array and only ever added to it — which made
 * completion a ratchet: remove your last cuisine and the tick, the meter and
 * the checklist all still claimed the question was answered, because the answer
 * had been recorded once. `ProfilePage` writes this function's result straight
 * back into `completedFields` on every save, so the stale entry then outlived
 * the data that justified it. A question whose answer you can see is empty must
 * read as unanswered; that is the whole point of deriving it.
 *
 * `diet` is the one exception, and the stored array is consulted only for it.
 * Its `'any'` is simultaneously a real dietary answer and the unanswered
 * default, so data alone cannot tell "no restrictions" from "never asked" —
 * a profile that recorded the answer keeps it. Every other field has an
 * absent/empty form that unambiguously means unanswered, which is also why the
 * three newer questions are optional rather than defaulted.
 */
export function deriveCompletedFields(user: DemoUser): string[] {
  const completed = new Set<string>();
  if (user.name.trim()) completed.add('name');
  if (user.contact.trim()) completed.add('contact');
  if (user.profile.cuisines.length > 0) completed.add('cuisines');
  if (user.profile.budget) completed.add('budget');
  if (user.profile.neighbourhoods.length > 0) completed.add('neighbourhoods');
  if (user.profile.diet !== 'any' || user.completedFields.includes('diet')) completed.add('diet');
  if (user.profile.diningInterests.length > 0) completed.add('interests');
  if (user.profile.spice) completed.add('spice');
  if ((user.profile.mealTimes ?? []).length > 0) completed.add('mealTimes');
  if (user.profile.travel) completed.add('travel');
  return PROFILE_FIELDS.map((f) => f.key).filter((k) => completed.has(k));
}

/** "a and b" / "a, b and c" — an English list, not `join(', ')`. */
function listPhrase(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** How each heat level reads inside a sentence about a person. */
const SPICE_PHRASE: Record<SpiceLevel, string> = {
  mild: 'mild spice',
  medium: 'medium heat',
  hot: 'proper heat',
};

/** Clauses, not labels — these are spoken back mid-sentence. */
const TRAVEL_PHRASE: Record<TravelRange, string> = {
  walk: 'you would rather it was walking distance',
  area: 'you stay on your own side of Dhaka',
  city: 'you will cross the city for the right table',
};

/**
 * One-line food identity derived from actual profile data — never a static
 * label. Used on the profile page so the user understands what we know.
 *
 * This is also the honest answer to "what do the three new questions do?".
 * Spice, meal times and travel range are stored on the profile and are *not*
 * wired into recommendation scoring — so the copy beside them must not claim
 * they rank anything. What they do change is this sentence, immediately: the
 * diner answers, and the paragraph describing them grows a clause. That is a
 * real consequence, visible on the same screen, and it is the one this
 * function is allowed to promise.
 */
export function foodIdentity(user: DemoUser): string {
  const bits: string[] = [];
  if (user.profile.cuisines.length > 0) {
    bits.push(`${user.profile.cuisines.slice(0, 3).join(', ')}${user.profile.cuisines.length > 3 ? '…' : ''} food`);
  }
  if (user.profile.budget) bits.push(`${user.profile.budget.toLowerCase()} restaurants`);
  if (user.profile.diet === 'veg') bits.push('vegetarian');
  else if (user.profile.diet === 'nonveg') bits.push('non-vegetarian');
  if (user.profile.spice) bits.push(SPICE_PHRASE[user.profile.spice]);
  if (user.profile.neighbourhoods.length > 0) {
    const areas = user.profile.neighbourhoods.slice(0, 3);
    bits.push(`around ${areas.join(' & ')}${user.profile.neighbourhoods.length > 3 ? '…' : ''}`);
  }

  /* When and how far — a second sentence, because appending two more clauses
     to the first one produced a 40-word run-on at 10 answered fields. */
  const rhythm: string[] = [];
  const times = user.profile.mealTimes ?? [];
  if (times.length > 0) {
    rhythm.push(`you mostly eat out at ${listPhrase(times.map((t) => t.toLowerCase()))}`);
  }
  if (user.profile.travel) rhythm.push(TRAVEL_PHRASE[user.profile.travel]);
  const joined = rhythm.join(', and ');
  const rhythmLine = joined ? ` ${joined.charAt(0).toUpperCase()}${joined.slice(1)}.` : '';

  const interests = user.profile.diningInterests.join(', ').toLowerCase();
  const personality = interests ? ` You're into ${interests}.` : '';
  return bits.length > 0
    ? `You usually prefer ${bits.join(', ')}.${rhythmLine}${personality}`
    : rhythmLine
      ? `${rhythmLine.trim()}${personality} Tell us what you like and we’ll learn the rest.`
      : 'Tell us what you like and we’ll learn your taste — the more you share, the better your matches.';
}

/**
 * Every badge the platform can award, with the condition that awards it stated
 * in plain language.
 *
 * computeBadges() below reads each badge's label and description from here, so
 * the profile page can show a badge the user has *not* earned yet — with its
 * real unlock condition — without keeping a second copy of the wording that
 * could drift from the copy actually awarded. `requirement` is documentation of
 * the condition coded below it; it grants nothing.
 */
export const BADGE_GOALS: Array<{ id: string; label: string; description: string; requirement: string }> = [
  { id: 'badge-food-explorer', label: 'Food Explorer', description: 'Exploring Dhaka one plate at a time', requirement: 'Set any food preference, or write a review' },
  { id: 'badge-budget-hunter', label: 'Budget Hunter', description: 'Knows where the best-value plates hide', requirement: 'Set your typical budget to Budget' },
  { id: 'badge-cuisine-explorer', label: 'Cuisine Explorer', description: 'Adventurous across many kitchens', requirement: 'Choose 3 favourite cuisines' },
  { id: 'badge-cafe-hopper', label: 'Café Hopper', description: 'Chases good coffee and quiet corners', requirement: 'Add “Café hopping” to what you look for' },
  { id: 'badge-heat-seeker', label: 'Heat Seeker', description: 'Takes the chilli as it comes', requirement: 'Set your spice tolerance to Full heat' },
  { id: 'badge-first-review', label: 'First review', description: 'Wrote a review on the platform', requirement: 'Write your first review' },
  { id: 'badge-top-reviewer', label: 'Top Reviewer', description: 'Reviews that help the community decide', requirement: 'Write 3 reviews' },
];

/**
 * Badges computed from actual activity/preferences — never fabricated.
 * Merged with any stored badges and de-duplicated by id.
 */
export function computeBadges(user: DemoUser, reviewCount: number): Badge[] {
  const badges: Badge[] = [...user.badges];
  const today = new Date().toISOString().slice(0, 10);
  const add = (id: string, earnedAt: string) => {
    const goal = BADGE_GOALS.find((g) => g.id === id);
    if (!goal || badges.some((b) => b.id === id)) return;
    badges.push({ id, label: goal.label, description: goal.description, earnedAt });
  };

  const hasAnyPrefs =
    user.profile.cuisines.length > 0 ||
    Boolean(user.profile.budget) ||
    user.profile.neighbourhoods.length > 0 ||
    user.profile.diningInterests.length > 0 ||
    Boolean(user.profile.spice) ||
    (user.profile.mealTimes ?? []).length > 0 ||
    Boolean(user.profile.travel) ||
    user.profile.diet !== 'any';
  if (hasAnyPrefs || reviewCount > 0) {
    add('badge-food-explorer', today);
  }
  if (user.profile.budget === 'Budget') {
    add('badge-budget-hunter', today);
  }
  if (user.profile.cuisines.length >= 3) {
    add('badge-cuisine-explorer', today);
  }
  if (user.profile.diningInterests.includes('Café hopping')) {
    add('badge-cafe-hopper', today);
  }
  if (user.profile.spice === 'hot') {
    add('badge-heat-seeker', today);
  }
  if (reviewCount >= 1) {
    add('badge-first-review', today);
  }
  if (reviewCount >= 3) {
    add('badge-top-reviewer', today);
  }
  return badges;
}
