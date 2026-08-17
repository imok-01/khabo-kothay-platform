import type { Badge, DemoUser } from '../domain/auth';

/**
 * Intentional selection limits — enforced in the data layer (setters slice
 * to these) and surfaced in the UI, so preferences never become a tag wall.
 */
export const PREFERENCE_LIMITS = {
  cuisines: 5,
  neighbourhoods: 3,
  interests: 3,
} as const;

/**
 * Profile completion is computed from actually-completed fields — never a
 * hard-coded number. Each field maps to a key stored in `completedFields`.
 */
export const PROFILE_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'name', label: 'Your name' },
  { key: 'contact', label: 'Contact' },
  { key: 'cuisines', label: 'Favourite cuisines' },
  { key: 'budget', label: 'Typical budget' },
  { key: 'neighbourhoods', label: 'Preferred areas' },
  { key: 'diet', label: 'Diet preference' },
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

/** Convenience: recompute which fields are effectively complete from data. */
export function deriveCompletedFields(user: DemoUser): string[] {
  const completed = new Set(user.completedFields);
  if (user.name.trim()) completed.add('name');
  if (user.contact.trim()) completed.add('contact');
  if (user.profile.cuisines.length > 0) completed.add('cuisines');
  if (user.profile.budget) completed.add('budget');
  if (user.profile.neighbourhoods.length > 0) completed.add('neighbourhoods');
  if (user.profile.diet !== 'any') completed.add('diet');
  if (user.profile.diningInterests.length > 0) completed.add('interests');
  return PROFILE_FIELDS.map((f) => f.key).filter((k) => completed.has(k));
}

/**
 * One-line food identity derived from actual profile data — never a static
 * label. Used on the profile page so the user understands what we know.
 */
export function foodIdentity(user: DemoUser): string {
  const bits: string[] = [];
  if (user.profile.cuisines.length > 0) {
    bits.push(`${user.profile.cuisines.slice(0, 3).join(', ')}${user.profile.cuisines.length > 3 ? '…' : ''} food`);
  }
  if (user.profile.budget) bits.push(`${user.profile.budget.toLowerCase()} restaurants`);
  if (user.profile.diet === 'veg') bits.push('vegetarian');
  else if (user.profile.diet === 'nonveg') bits.push('non-vegetarian');
  if (user.profile.neighbourhoods.length > 0) {
    const areas = user.profile.neighbourhoods.slice(0, 3);
    bits.push(`around ${areas.join(' & ')}${user.profile.neighbourhoods.length > 3 ? '…' : ''}`);
  }
  const interests = user.profile.diningInterests.join(', ').toLowerCase();
  const personality = interests ? ` You're into ${interests}.` : '';
  return bits.length > 0
    ? `You usually prefer ${bits.join(', ')}.${personality}`
    : 'Tell us what you like and we’ll learn your taste — the more you share, the better your matches.';
}

/**
 * Badges computed from actual activity/preferences — never fabricated.
 * Merged with any stored badges and de-duplicated by id.
 */
export function computeBadges(user: DemoUser, reviewCount: number): Badge[] {
  const badges: Badge[] = [...user.badges];
  const today = new Date().toISOString().slice(0, 10);
  const add = (id: string, label: string, description: string, earnedAt: string) => {
    if (!badges.some((b) => b.id === id)) badges.push({ id, label, description, earnedAt });
  };

  const hasAnyPrefs =
    user.profile.cuisines.length > 0 ||
    Boolean(user.profile.budget) ||
    user.profile.neighbourhoods.length > 0 ||
    user.profile.diningInterests.length > 0 ||
    user.profile.diet !== 'any';
  if (hasAnyPrefs || reviewCount > 0) {
    add('badge-food-explorer', 'Food Explorer', 'Exploring Dhaka one plate at a time', today);
  }
  if (user.profile.budget === 'Budget') {
    add('badge-budget-hunter', 'Budget Hunter', 'Knows where the best-value plates hide', today);
  }
  if (user.profile.cuisines.length >= 3) {
    add('badge-cuisine-explorer', 'Cuisine Explorer', 'Adventurous across many kitchens', today);
  }
  if (user.profile.diningInterests.includes('Café hopping')) {
    add('badge-cafe-hopper', 'Café Hopper', 'Chases good coffee and quiet corners', today);
  }
  if (reviewCount >= 1) {
    add('badge-first-review', 'First review', 'Wrote a review on the platform', today);
  }
  if (reviewCount >= 3) {
    add('badge-top-reviewer', 'Top Reviewer', 'Reviews that help the community decide', today);
  }
  return badges;
}
