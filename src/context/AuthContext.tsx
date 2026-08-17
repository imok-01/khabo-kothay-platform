import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DemoUser, Role, SessionUser } from '../domain/auth';
import { hashPassword, verifyPassword } from '../lib/demoAuth';
import { seedDemoAccounts } from '../data/demoAccounts';
import { ensureDemoStartingBalance } from '../lib/rewards';
import { isPrerender } from '../lib/prerender';
import { getRewards, saveRewards } from '../store/demoDb';
import { userService } from '../services/userService';
import { useUsers } from '../hooks/useUsers';

interface AuthContextValue {
  /** The signed-in user (null = anonymous). */
  user: DemoUser | null;
  /** Who is signed in — mirrors `user` but stable across profile edits. */
  session: SessionUser | null;
  isAuthenticated: boolean;
  hasRole: (...roles: Role[]) => boolean;
  login: (contact: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (name: string, contact: string, password: string, role?: Role) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SessionUser | null>(() => userService.getSession());
  const [ready, setReady] = useState(() => {
    // Build-time prerender: effects never run server-side, so start ready to
    // render the full app tree into the static HTML.
    if (isPrerender()) return true;
    // Prerendered public pages arrive with the full app already in the DOM.
    // Start ready so hydration matches the static content instead of flashing
    // the loader — the seeding/session effect still runs in the background.
    if (typeof document !== 'undefined') {
      const root = document.getElementById('root');
      if (root && root.querySelector('.app')) return true;
    }
    return false;
  });

  // Reactive snapshot of all stored users — keeps `user` fresh after profile
  // edits or demo wallet resets without a full page reload.
  const users = useUsers();

  // Hydrate the demo database with seed accounts on first run.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = userService.getUsers();
        if (Object.keys(existing.byId).length === 0) {
          const seeded = await seedDemoAccounts();
          seeded.forEach((u) => userService.saveUser(u));
          // Seed the rewards ledger for users who already have referral
          // activity in their profile (demo consistency).
          seeded.forEach((u) => {
            if (u.referrals.length === 0) return;
            const state = getRewards(u.id);
            if (state.referrals.length === 0) {
              saveRewards(u.id, { ...state, referrals: u.referrals });
            }
          });
        }
        // Ensure demo accounts carry their seeded starting balance and repair
        // any corrupted (negative) balances from earlier demo sessions.
        for (const u of Object.values(userService.getUsers().byId)) {
          if (u.role === 'user' || u.role === 'restaurant_admin') {
            ensureDemoStartingBalance(u.id);
          }
        }
        // A stored session must reference a user that still exists.
        const current = userService.getSession();
        if (current && !userService.getUsers().byId[current.id]) {
          userService.setSession(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const user = useMemo(() => {
    if (!session) return null;
    return users.find((u) => u.id === session.id) ?? null;
  }, [session, users]);

  // Reflect profile edits (stored user record changes) into the session copy.
  useEffect(() => {
    if (session && user) {
      const next: SessionUser = { id: user.id, name: user.name, role: user.role, restaurantIds: user.restaurantIds };
      if (JSON.stringify(next) !== JSON.stringify(session)) setSessionState(next);
    }
  }, [session, user]);

  const login = useCallback(async (contact: string, password: string) => {
    const users = userService.getAllUsers();
    const match = users.find((u) => u.contact.toLowerCase() === contact.trim().toLowerCase());
    if (!match) return { ok: false, error: 'No account found with that contact. Try a demo account below.' };
    const valid = await verifyPassword(password, match.passwordHash);
    if (!valid) return { ok: false, error: 'Incorrect password.' };
    const next: SessionUser = { id: match.id, name: match.name, role: match.role, restaurantIds: match.restaurantIds };
    userService.setSession(next);
    setSessionState(next);
    return { ok: true };
  }, []);

  const signup = useCallback(async (name: string, contact: string, password: string, role: Role = 'user') => {
    const trimmed = contact.trim().toLowerCase();
    if (userService.getAllUsers().some((u) => u.contact.toLowerCase() === trimmed)) {
      return { ok: false, error: 'An account with that contact already exists.' };
    }
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    const hash = await hashPassword(password);
    const id = `user-${Date.now().toString(36)}`;
    const newUser: DemoUser = {
      id,
      name: name.trim(),
      contact: trimmed,
      passwordHash: hash,
      role,
      restaurantIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
      profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] },
      completedFields: ['name', 'contact'],
      badges: [],
      referralCode: `${name.trim().toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      referrals: [],
      completionRewardClaimed: false,
    };
    userService.saveUser(newUser);
    const next: SessionUser = { id, name: newUser.name, role, restaurantIds: [] };
    userService.setSession(next);
    setSessionState(next);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    userService.setSession(null);
    setSessionState(null);
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => (session ? roles.includes(session.role) : false),
    [session],
  );

  const value = useMemo(
    () => ({ user, session, isAuthenticated: Boolean(session), hasRole, login, signup, logout }),
    [user, session, hasRole, login, signup, logout],
  );

  if (!ready) {
    return (
      <main className="page-loader" aria-busy="true" role="status">
        <span className="page-loader__spinner" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </main>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
