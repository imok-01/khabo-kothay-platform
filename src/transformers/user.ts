import type { DemoUser, Role } from '../domain/auth';
import type { RolesRow, UserProfilesRow } from '../integrations/supabase/database.types';

/**
 * Transformation layer: approved user rows → frontend user model.
 *
 * v1.1 user tables: `auth.users` (Supabase-owned), `user_profiles`,
 * `roles`. The frontend `DemoUser` also carries demo-only fields
 * (password hash, referrals, rewards, badges) that have NO v1.1 equivalent —
 * those are intentionally NOT fabricated here.
 *
 * This mapper produces only the fields that map cleanly. When Supabase auth
 * replaces the demo auth, the missing fields must be resolved by a product
 * decision (where rewards/referrals live), never invented.
 */

const ROLE_MAP: Record<string, Role> = {
  user: 'user',
  restaurant_admin: 'restaurant_admin',
  executive: 'executive',
};

export function mapRole(roleName: string | null | undefined): Role {
  return ROLE_MAP[roleName ?? ''] ?? 'user';
}

/** The cleanly-mappable subset of the frontend user shape. */
export interface MappedKkUser {
  id: string;
  name: string;
  role: Role;
  createdAt: string;
}

export function mapUserProfileRow(
  userId: string,
  profile: UserProfilesRow | null,
  roles: RolesRow[],
): MappedKkUser {
  return {
    id: userId,
    name: profile?.display_name?.trim() || 'Member',
    role: mapRole(roles.find((r) => r.role_name.trim())?.role_name),
    createdAt: profile?.created_at ?? '',
  };
}

/** Placeholder for the full DemoUser mapping — see module docs above. */
export function demoUserFromMapped(mapped: MappedKkUser): DemoUser {
  return {
    id: mapped.id,
    name: mapped.name,
    contact: '',
    passwordHash: '',
    role: mapped.role,
    restaurantIds: [],
    createdAt: mapped.createdAt || new Date().toISOString().slice(0, 10),
    profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] },
    completedFields: [],
    badges: [],
    referralCode: '',
    referrals: [],
    completionRewardClaimed: false,
  };
}
