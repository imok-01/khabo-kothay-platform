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

export interface UserPreferences {
  cuisines: string[];
  budget?: string;
  diet: 'any' | 'veg' | 'nonveg';
  neighbourhoods: string[];
  diningInterests: string[];
}

export interface Badge {
  id: string;
  label: string;
  description: string;
  earnedAt: string;
}

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

export type SessionUser = Pick<DemoUser, 'id' | 'name' | 'role' | 'restaurantIds'>;
