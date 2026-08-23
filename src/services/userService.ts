import type { DemoUser, SessionUser } from '../domain/auth';
import { userRepository } from '../repositories/userRepository';

/**
 * UserService — the app's entry point for user/session data.
 *
 *   AuthContext/profile → userService → userRepository → data source
 *
 * The demo implementation wraps the localStorage store; a Supabase
 * implementation reads auth.users + user_profiles + roles. Full Supabase
 * Auth wiring is a later step — this only prepares the data boundary so
 * AuthContext no longer imports the demo store directly.
 */
export const userService = {
  getUsers: () => userRepository.getUsers(),
  getAllUsers: (): DemoUser[] => userRepository.getAllUsers(),
  saveUser: (user: DemoUser): void => userRepository.saveUser(user),
  deleteUser: (id: string): void => userRepository.deleteUser(id),
  getSession: (): SessionUser | null => userRepository.getSession(),
  setSession: (session: SessionUser | null): void => userRepository.setSession(session),

  /** Future async path: profile + roles for a Supabase auth user. */
  fetchProfileForUser: (userId: string) => userRepository.fetchProfileForUser?.(userId),
};
