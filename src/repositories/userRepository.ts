import type { DemoUser, SessionUser } from '../domain/auth';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';
import { mapUserProfileRow, type MappedKkUser } from '../transformers/user';
import type { StoredUsers } from '../store/demoDb';
import {
  getAllUsers as demoGetAllUsers,
  getSession as demoGetSession,
  getUsers as demoGetUsers,
  saveUser as demoSaveUser,
  setSession as demoSetSession,
} from '../store/demoDb';

/**
 * UserRepository — the seam between user/session data and the UI.
 *
 *   AuthContext/profile → userService → userRepository → data source
 *
 * The mock implementation wraps the demo localStorage store (users, session).
 * The Supabase implementation maps `auth.users` + `user_profiles` + `roles`
 * onto the frontend user shape — full auth (Supabase Auth sessions) is a
 * separate, later step; this repository only prepares the data boundary.
 */

export interface UserRepository {
  getUsers(): StoredUsers;
  getAllUsers(): DemoUser[];
  saveUser(user: DemoUser): void;
  getSession(): SessionUser | null;
  setSession(session: SessionUser | null): void;
  /** Future async path: profile + roles for a Supabase auth user. */
  fetchProfileForUser?(userId: string): Promise<MappedKkUser | null>;
}

/** Mock implementation — demo localStorage store. */
export const mockUserRepository: UserRepository = {
  getUsers: () => demoGetUsers(),
  getAllUsers: () => demoGetAllUsers(),
  saveUser: (user) => demoSaveUser(user),
  getSession: () => demoGetSession(),
  setSession: (session) => demoSetSession(session),
};

class SupabaseUserRepository implements UserRepository {
  // Sync paths have no backend equivalent until Supabase Auth is wired —
  // throwing keeps a misconfiguration loud.
  getUsers(): StoredUsers {
    throw new Error('SupabaseUserRepository has no sync path — use the mock repository or wire Supabase Auth.');
  }

  getAllUsers(): DemoUser[] {
    throw new Error('SupabaseUserRepository has no sync path.');
  }

  saveUser(_user: DemoUser): void {
    throw new Error('SupabaseUserRepository has no sync path.');
  }

  getSession(): SessionUser | null {
    return null;
  }

  setSession(_session: SessionUser | null): void {
    // Supabase Auth owns sessions; nothing to persist here.
  }

  async fetchProfileForUser(userId: string): Promise<MappedKkUser | null> {
    const [profile, roles] = await Promise.all([
      queries.selectProfileForUser(userId),
      queries.selectRolesForUser(userId),
    ]);
    if (!profile) return null;
    return mapUserProfileRow(userId, profile, roles);
  }
}

/** Active repository — Supabase when configured, the mock otherwise. */
export const userRepository: UserRepository = isSupabaseConfigured()
  ? new SupabaseUserRepository()
  : mockUserRepository;
