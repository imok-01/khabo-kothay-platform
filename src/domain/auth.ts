/**
 * Roles & user identity.
 *
 * Demo architecture note: this is a frontend demo — sessions live in
 * localStorage and passwords are only ever stored as a SHA-256 hash. A real
 * backend would own authentication, sessions and authorization; the role
 * model below is designed so that boundary checks (ownership, role guards)
 * translate directly to server-side authorization later.
 */

export type Role = 'user' | 'restaurant_admin' | 'executive';

/**
 * UI-facing view of a signed-in (or anonymous) visitor. Maps the data-layer
 * Role onto the four product experiences the navigation/account system
 * distinguishes. Supabase auth will later produce the same Role values, so
 * this mapping stays valid once the backend replaces the demo store.
 */
export type RoleView = 'guest' | 'customer' | 'restaurant_owner' | 'admin';

export function roleViewOf(role?: Role | null): RoleView {
  if (!role) return 'guest';
  if (role === 'executive') return 'admin';
  if (role === 'restaurant_admin') return 'restaurant_owner';
  return 'customer';
}

/**
 * Application-facing user identity contract.
 *
 * This is the unified identity that the rest of the application should use.
 * It abstracts away the difference between development (stable UUID per phone)
 * and production (Supabase auth.users.id).
 *
 * In development: stable UUID per phone number (generated once, persisted in localStorage)
 * In production: Supabase auth.users.id
 */
export type AppUserId = string;

/**
 * Minimal application user profile for the rest of the application.
 * Contains only the fields needed by the UI layer.
 * Downstream systems (rewards, referrals, favorites, etc.) should migrate
 * to use this identity instead of DemoUser.id.
 */
export interface AppUser {
  id: AppUserId;
  name: string;
  role: Role;
  restaurantIds: string[];
  contact?: string;
  createdAt?: string;
}

/**
 * Session user for authentication state.
 * Extends AppUser with session-specific fields if needed.
 */
export type SessionUser = AppUser;

/**
 * Legacy demo user type — used by downstream systems that haven't migrated yet.
 * @deprecated Use AppUser for new code. Downstream systems (rewards, referrals,
 * favorites, saved, etc.) still use this type but should migrate to AppUser.
 */
export interface DemoUser {
  /** Stable internal id. */
  id: string;
  name: string;
  /** Phone or email — demo only, never treated as verified. */
  contact: string;
  /** Demo password (SHA-256 of plaintext) — NOT production auth. */
  passwordHash: string;
  role: Role;
  /** Restaurant ids a restaurant_admin may manage (ownership boundary). */
  restaurantIds: string[];
  /** Avatar initial fallback. */
  avatarUrl?: string;
  createdAt: string;
  profile: UserPreferences;
  /** Explicitly completed profile fields, used for completion %. */
  completedFields: string[];
  badges: Badge[];
  /** Referral identity. */
  referralCode: string;
  /** People this user invited (demo simulation). */
  referrals: Array<{ id: string; name: string; status: 'invited' | 'verified'; rewarded: boolean }>;
  /** Whether the 100%-profile-completion reward was already granted. */
  completionRewardClaimed: boolean;
  bio?: string;
}

/** How much heat the diner actually wants. Absent = not answered. */
export type SpiceLevel = 'mild' | 'medium' | 'hot';

/** How far they are willing to go for a meal. Absent = not answered. */
export type TravelRange = 'walk' | 'area' | 'city';

export interface UserPreferences {
  cuisines: string[];
  budget?: string;
  diet: 'any' | 'veg' | 'nonveg';
  neighbourhoods: string[];
  diningInterests: string[];
  /**
   * The three questions that took the profile from seven fields to ten.
   *
   * All three are optional, and that is the whole migration: a profile
   * written before them stays valid, `transformers/user.ts` keeps
   * constructing preferences without them, and absence reads as
   * "not answered" rather than as a stored answer. `diet` shows why that
   * matters — its `'any'` is simultaneously a real choice and the
   * unanswered default, so a diner with no dietary preference can never
   * finish the profile. These three do not repeat that.
   */
  spice?: SpiceLevel;
  /** Meal times they actually go out for, capped by PREFERENCE_LIMITS. */
  mealTimes?: string[];
  travel?: TravelRange;
}

export interface Badge {
  id: string;
  label: string;
  description: string;
  earnedAt: string;
}