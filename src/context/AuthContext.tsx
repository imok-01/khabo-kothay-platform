import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppUser, DemoUser, Role, SessionUser } from '../domain/auth';
import { seedDemoAccounts } from '../data/demoAccounts';
import { ensureDemoStartingBalance } from '../lib/rewards';
import { isPrerender } from '../lib/prerender';
import { runDevIdentityCleanup } from '../lib/devIdentityCleanup';
import { getRewards, saveRewards } from '../store/demoDb';
import { userService } from '../services/userService';
import { useUsers } from '../hooks/useUsers';
import { getSupabase } from '../integrations/supabase/client';
import { developmentOtpAuth } from '../lib/developmentOtpAdapter';

// Normalize phone number helper
// Accepts various Bangladesh phone formats and converts to canonical +8801XXXXXXXXX format
// Valid input formats:
// - Local: 01XXXXXXXXX (11 digits)
// - International with +: +8801XXXXXXXXX (14 chars including +)
// - International without +: 8801XXXXXXXXX (13 digits)
// - Formatted: +880 1XXX-XXXXXX, +880 1XXX XXXXXX, etc.
// Returns canonical format: +8801XXXXXXXXX (14 chars including +)
const normalizePhone = (phoneNumber: string): string => {
  // Trim whitespace and remove spaces, hyphens, parentheses
  let normalized = phoneNumber.trim().replace(/[\s\-()]/g, '');
  
  // Handle leading + if present
  const hasPlusPrefix = normalized.startsWith('+');
  if (hasPlusPrefix) {
    normalized = normalized.slice(1);
  }
  
  // Remove any remaining non-digits
  normalized = normalized.replace(/\D/g, '');
  
  // Validate and convert to canonical +8801XXXXXXXXX format
  let canonical: string;
  
  if (normalized.startsWith('8801') && normalized.length === 13) {
    // International with country code: 8801XXXXXXXXX (13 digits = 8801 + 9 digits)
    // This handles both "+8801XXXXXXXXX" (after stripping +) and "8801XXXXXXXXX" directly
    canonical = '+' + normalized;
  } else if (normalized.startsWith('01') && normalized.length === 11) {
    // Local format: 01XXXXXXXXX (11 digits = 01 + 9 digits) -> convert to +8801XXXXXXXXX
    canonical = '+880' + normalized.slice(1);
  } else if (normalized.startsWith('1') && normalized.length === 10) {
    // Edge case: user typed 1XXXXXXXXX (10 digits, missing 880 prefix)
    canonical = '+880' + normalized;
  } else {
    throw new Error('Invalid phone number. Please use a valid Bangladesh number (e.g., 01XXXXXXXXX, +8801XXXXXXXXX, or 8801XXXXXXXXX)');
  }
  
  // Validate the canonical format: must be +8801 followed by 9 digits
  if (!/^\+8801[0-9]{9}$/.test(canonical)) {
    throw new Error('Invalid phone number. Please use a valid Bangladesh number (e.g., 01XXXXXXXXX, +8801XXXXXXXXX, or 8801XXXXXXXXX)');
  }
  
  return canonical;
};

interface AuthContextValue {
  /** The signed-in user (null = anonymous). Legacy DemoUser for backward compatibility. */
  user: DemoUser | null;
  /** Unified application user identity for new code. */
  appUser: AppUser | null;
  /** Who is signed in — mirrors `user` but stable across profile edits. */
  session: SessionUser | null;
  isAuthenticated: boolean;
  hasRole: (...roles: Role[]) => boolean;
  /** Send OTP to phone number */
  sendOtp: (phoneNumber: string) => Promise<{ ok: boolean; error?: string; otp?: string }>;
  /** Verify OTP code */
  verifyOtp: (phoneNumber: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  /** Resend OTP */
  resendOtp: (phoneNumber: string) => Promise<{ ok: boolean; error?: string; otp?: string }>;
  /** Check if OTP can be resent */
  canResendOtp: (phoneNumber?: string) => boolean;
  /** Check if phone number already has an account (for signup flow) */
  checkPhoneExists: (phoneNumber: string) => boolean;
  /** Login with verified phone (completed OTP verification) */
  loginWithVerifiedPhone: (phoneNumber: string) => Promise<{ ok: boolean; error?: string }>;
  /** Signup with phone (after OTP verification) */
  signup: (name: string, phoneNumber: string, role?: Role) => Promise<{ ok: boolean; error?: string }>;
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

  // Determine if we should use development OTP mock
  const useDevMock = import.meta.env.VITE_DEV_AUTH_MOCK === 'true';

  // Production safety guard: prevent dev mock from running in production
  if (useDevMock && import.meta.env.PROD) {
    console.error('SECURITY ERROR: VITE_DEV_AUTH_MOCK is enabled in production!');
    throw new Error('VITE_DEV_AUTH_MOCK cannot be enabled in production');
  }

  // Hydrate the demo database with seed accounts on first run.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Dev-mode hard reset: purge stale generic Dev Users that shadow demo seeds (previous buggy builds)
        runDevIdentityCleanup();
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

  // Initialize session from development adapter if in dev mock mode
  useEffect(() => {
    if (useDevMock) {
      (async () => {
        try {
          const result = await developmentOtpAuth.getSession();
          if (result.data?.session?.user) {
            const supabaseUser = result.data.session.user;
            // Check if user exists in our demo database - prioritize phone match (demo roles) over id
            // This ensures demo accounts are restored correctly even if a stale generic user exists
            let existingUser: typeof users[number] | undefined;
            if (supabaseUser.phone) {
              try {
                const normalizedPhone = normalizePhone(supabaseUser.phone);
                existingUser = users.find(u => {
                  const storedContact = u.contact?.replace(/\D/g, '');
                  const normalizedStored = storedContact ? normalizePhone(storedContact) : '';
                  return normalizedStored === normalizedPhone;
                });
              } catch {
                // ignore normalize errors - fall through to id check
              }
            }
            if (!existingUser) {
              existingUser = users.find(u => u.id === supabaseUser.id);
            }
            let dbUser: DemoUser;
            
            if (existingUser) {
              dbUser = existingUser;
            } else {
              // Create demo user entry for this development identity
              dbUser = {
                id: supabaseUser.id,
                name: supabaseUser.user_metadata?.full_name || `Dev User ${supabaseUser.phone?.slice(-4) || 'XXXX'}`,
                contact: supabaseUser.phone || '',
                passwordHash: '',
                role: 'user',
                restaurantIds: [],
                createdAt: new Date().toISOString().slice(0, 10),
                profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] },
                completedFields: ['name', 'contact'],
                badges: [],
                referralCode: '',
                referrals: [],
                completionRewardClaimed: false,
              };
              userService.saveUser(dbUser);
            }
            
            const sessionUser: SessionUser = {
              id: dbUser.id,
              name: dbUser.name,
              role: dbUser.role,
              restaurantIds: dbUser.restaurantIds
            };
            
            userService.setSession(sessionUser);
            setSessionState(sessionUser);
          }
        } catch (err) {
          console.error('Error initializing dev session:', err);
        }
      })();
    }
  }, [useDevMock, users]);

  const user = useMemo(() => {
    if (!session) return null;
    return users.find((u) => u.id === session.id) ?? null;
  }, [session, users]);

  // Supabase Auth state listener
  useEffect(() => {
    if (!useDevMock) {
      // Only set up Supabase Auth listener when not in dev mock mode
      let subscription: { unsubscribe: () => void } | null = null;
      
      (async () => {
        try {
          const supabase = await getSupabase();
          if (supabase) {
            const { data } = await supabase.auth.onAuthStateChange(async (event, session) => {
              if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                  // Fetch or create user profile from our user_profiles table
                  try {
                    const { data: profile, error } = await supabase
                      .from('user_profiles')
                      .select('*, roles(role_name, restaurant_id)')
                      .eq('user_id', session.user.id)
                      .single();
                    
                    if (!error && profile) {
                      // Determine role from roles table
                      const roles = (profile.roles as unknown) as Array<{ role_name: string; restaurant_id: string | null }> | null;
                      const roleName = roles?.[0]?.role_name || 'user';
                      const restaurantId = roles?.[0]?.restaurant_id || null;
                      
                      // Map role name to our Role type
                      const roleMap: Record<string, Role> = {
                        user: 'user',
                        restaurant_admin: 'restaurant_admin',
                        executive: 'executive',
                      };
                      const role = roleMap[roleName] ?? 'user';
                      
                      // Save to local user service for backward compatibility
                      const dbUser: DemoUser = {
                        id: profile.user_id,
                        name: profile.display_name || `${session.user.phone || ''}`.slice(-4),
                        contact: session.user.phone || '',
                        passwordHash: '',
                        role,
                        restaurantIds: restaurantId ? [restaurantId] : [],
                        createdAt: new Date().toISOString().slice(0, 10),
                        profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] },
                        completedFields: ['name', 'contact'],
                        badges: [],
                        referralCode: '',
                        referrals: [],
                        completionRewardClaimed: false,
                      };
                      
                      userService.saveUser(dbUser);
                      userService.setSession({
                        id: dbUser.id,
                        name: dbUser.name,
                        role: dbUser.role,
                        restaurantIds: dbUser.restaurantIds
                      });
                      setSessionState({
                        id: dbUser.id,
                        name: dbUser.name,
                        role: dbUser.role,
                        restaurantIds: dbUser.restaurantIds
                      });
                    }
                  } catch (err) {
                    console.error('Error fetching user profile:', err);
                    userService.setSession(null);
                    setSessionState(null);
                  }
                }
              } else if (event === 'SIGNED_OUT') {
                userService.setSession(null);
                setSessionState(null);
              }
            });
            
            subscription = data.subscription;
          }
        } catch (err) {
          console.error('Error setting up Supabase Auth listener:', err);
        }
      })();
      
      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [useDevMock]);

  const sendOtp = useCallback(async (phoneNumber: string) => {
    try {
      const normalizedPhone = normalizePhone(phoneNumber);
      
      if (useDevMock) {
        // Use development OTP adapter
        const result = await developmentOtpAuth.signInWithOtp({ phone: normalizedPhone });
        return {
          ok: result.error === null,
          error: result.error?.message ?? undefined,
          otp: result.otp
        };
      } else {
        // Use real Supabase Auth
        const supabase = await getSupabase();
        if (!supabase) {
          return { ok: false, error: 'Supabase not configured' };
        }
        
        const { error } = await supabase.auth.signInWithOtp({
          phone: normalizedPhone,
        });
        
        return { ok: !error, error: error?.message };
      }
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }, [useDevMock]);

  const verifyOtp = useCallback(async (phoneNumber: string, code: string) => {
    try {
      const normalizedPhone = normalizePhone(phoneNumber);
      
      if (useDevMock) {
        // Use development OTP adapter
        const result = await developmentOtpAuth.verifyOtp({ 
          phone: normalizedPhone, 
          token: code, 
          type: 'sms' 
        });
        
        if (result.error !== null) {
          return { ok: false, error: result.error.message };
        }
        
        // In dev mock mode, use localStorage for user profiles (not Supabase)
        // The development OTP adapter already creates/persists the user identity
        // and session in localStorage. The AuthContext session initialization
        // effect will restore the user from localStorage on app load.
        
        return { ok: true };
      } else {
        // Use real Supabase Auth
        const supabase = await getSupabase();
        if (!supabase) {
          return { ok: false, error: 'Supabase not configured' };
        }
        
        const { error } = await supabase.auth.verifyOtp({
          phone: normalizedPhone,
          token: code,
          type: 'sms'
        });
        
        return { ok: !error, error: error?.message };
      }
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }, [useDevMock]);

  const resendOtp = useCallback(async (phoneNumber: string) => {
    try {
      const normalizedPhone = normalizePhone(phoneNumber);
      
      if (useDevMock) {
        // Use development OTP adapter
        const result = await developmentOtpAuth.signInWithOtpForResend({ phone: normalizedPhone });
        return {
          ok: result.error === null,
          error: result.error?.message ?? undefined,
          otp: result.otp
        };
      } else {
        // Use real Supabase Auth
        const supabase = await getSupabase();
        if (!supabase) {
          return { ok: false, error: 'Supabase not configured' };
        }
        
        const { error } = await supabase.auth.resend({
          phone: normalizedPhone,
          type: 'sms'
        });
        
        return { ok: !error, error: error?.message };
      }
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }, [useDevMock]);

  const canResendOtp = useCallback((phoneNumber?: string) => {
    try {
      const normalizedPhone = normalizePhone(phoneNumber ?? '');
      
      if (useDevMock) {
        return developmentOtpAuth.canResendOtp(normalizedPhone);
      } else {
        // In real Supabase Auth, we'd need to check with the backend
        // For simplicity, we'll allow resending (Supabase handles rate limiting)
        return true;
      }
    } catch {
      return false;
    }
  }, [useDevMock]);

  const checkPhoneExists = useCallback((phoneNumber: string) => {
    try {
      const normalizedPhone = normalizePhone(phoneNumber);
      
      if (useDevMock) {
        // In dev mock mode, check if user already exists in our demo database
        // Normalize stored contacts for comparison (they may be in canonical format +8801...)
        return users.some(u => {
          const storedContact = u.contact?.replace(/\D/g, '');
          const normalizedStored = storedContact ? normalizePhone(storedContact) : '';
          return normalizedStored === normalizedPhone;
        });
      } else {
        // In production, check user_profiles table for existing phone number
        // This is async but we return a promise-aware function
        // Note: This is a synchronous callback, so we can't await here
        // The actual check happens in the signup flow via the async check
        // For synchronous checks, we rely on the dev mock path
        // In production, the signup flow will handle the async check
        return false;
      }
    } catch {
      return false;
    }
  }, [users, useDevMock]);

  const loginWithVerifiedPhone = useCallback(async (phoneNumber: string) => {
    try {
      const normalizedPhone = normalizePhone(phoneNumber);
      
      if (useDevMock) {
        // In dev mock mode, the verified identity comes from the OTP verification
        // which already created the user profile and persisted the session.
        // We just need to ensure the session is restored from the adapter.
        const result = await developmentOtpAuth.getSession();
        if (result.data?.session?.user) {
          const supabaseUser = result.data.session.user;
          
          // Find existing user in demo database - prioritize phone match (demo roles) over id match
          // This ensures demo accounts (exec-kk, etc.) are found even when a stale generic user exists with same phone
          let existingUser = users.find(u => {
            const storedContact = u.contact?.replace(/\D/g, '');
            const normalizedStored = storedContact ? normalizePhone(storedContact) : '';
            return normalizedStored === normalizedPhone;
          });
          if (!existingUser) {
            existingUser = users.find(u => u.id === supabaseUser.id);
          }
          
          if (existingUser) {
            const next: SessionUser = { 
              id: existingUser.id, 
              name: existingUser.name, 
              role: existingUser.role, 
              restaurantIds: existingUser.restaurantIds 
            };
            userService.setSession(next);
            setSessionState(next);
            return { ok: true };
          } else {
            // No existing account found - do not create a new user on login
            return { ok: false, error: 'No account found. Please create an account first.' };
          }
        } else {
          return { ok: false, error: 'No active development session' };
        }
} else {
        // Use real Supabase Auth - check session and sync with user_profiles
        const supabase = await getSupabase();
        if (!supabase) {
          return { ok: false, error: 'Supabase not configured' };
        }
        
        const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();
        if (error || !supabaseSession?.user) {
          return { ok: false, error: 'No active session' };
        }
        
        // Verify the phone number matches
        if (supabaseSession.user.phone !== normalizedPhone) {
          return { ok: false, error: 'Phone number mismatch' };
        }
        
        // Sync with our user service
        try {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*, roles(role_name, restaurant_id)')
            .eq('user_id', supabaseSession.user.id)
            .single();
        
        if (!profileError && profile) {
          // Determine role from roles table
          const roles = (profile.roles as unknown) as Array<{ role_name: string; restaurant_id: string | null }> | null;
          const roleName = roles?.[0]?.role_name || 'user';
          const restaurantId = roles?.[0]?.restaurant_id || null;
          
          // Map role name to our Role type
          const roleMap: Record<string, Role> = {
            user: 'user',
            restaurant_admin: 'restaurant_admin',
            executive: 'executive',
          };
          const role = roleMap[roleName] ?? 'user';
          
          const dbUser: DemoUser = {
            id: profile.user_id,
            name: profile.display_name || `${supabaseSession.user.phone || ''}`.slice(-4),
            contact: supabaseSession.user.phone || '',
            passwordHash: '',
            role,
            restaurantIds: restaurantId ? [restaurantId] : [],
            createdAt: new Date().toISOString().slice(0, 10),
            profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] },
            completedFields: ['name', 'contact'],
            badges: [],
            referralCode: '',
            referrals: [],
            completionRewardClaimed: false,
          };
          
          userService.saveUser(dbUser);
          userService.setSession({
            id: dbUser.id,
            name: dbUser.name,
            role: dbUser.role,
            restaurantIds: dbUser.restaurantIds
          });
          setSessionState({
            id: dbUser.id,
            name: dbUser.name,
            role: dbUser.role,
            restaurantIds: dbUser.restaurantIds
          });
        } else {
          userService.setSession(null);
          setSessionState(null);
          return { ok: false, error: 'User profile not found' };
        }
      } catch (err) {
        console.error('Error syncing with user service:', err);
        userService.setSession(null);
        setSessionState(null);
        return { ok: false, error: 'Failed to sync user data' };
      }
      
      return { ok: true };
      }
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }, [users, useDevMock]);

  const signup = useCallback(async (name: string, phoneNumber: string, role: Role = 'user') => {
    try {
      const normalizedPhone = normalizePhone(phoneNumber);
      
      if (useDevMock) {
        // In dev mock mode, check if user already exists in our demo database
        // Normalize stored contacts for comparison (they may be in canonical format +8801...)
        const phoneExists = users.some(u => {
          const storedContact = u.contact?.replace(/\D/g, '');
          const normalizedStored = storedContact ? normalizePhone(storedContact) : '';
          return normalizedStored === normalizedPhone;
        });
        
        if (phoneExists) {
          return { ok: false, error: 'An account with this phone number already exists. Please sign in.' };
        }
        
        // Get the stable UUID from the development OTP adapter session
        // The adapter creates a stable UUID per phone number during OTP verification
        const result = await developmentOtpAuth.getSession();
        if (!result.data?.session?.user) {
          return { ok: false, error: 'No active development session. Please complete OTP verification first.' };
        }
        
        const stableUserId = result.data.session.user.id;
        
        // Create new user in our demo database with the stable UUID identity
        const newUser: DemoUser = {
          id: stableUserId,
          name: name.trim(),
          contact: normalizedPhone,
          passwordHash: '',
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
        userService.setSession({
          id: newUser.id,
          name: newUser.name,
          role: newUser.role,
          restaurantIds: newUser.restaurantIds
        });
        setSessionState({
          id: newUser.id,
          name: newUser.name,
          role: newUser.role,
          restaurantIds: newUser.restaurantIds
        });
        
        return { ok: true };
      } else {
        // Use real Supabase Auth
        const supabase = await getSupabase();
        if (!supabase) {
          return { ok: false, error: 'Supabase not configured' };
        }
        
        // First, sign up with OTP (this sends the OTP)
        const { error: signupError } = await supabase.auth.signInWithOtp({
          phone: normalizedPhone,
        });
        
        if (signupError) {
          return { ok: false, error: signupError.message };
        }
        
        // Note: In Supabase phone auth, the user needs to verify the OTP first
        // We return success here indicating OTP was sent, and the user needs
        // to verify it via verifyOtp method
        return { ok: true };
      }
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }, [users, useDevMock]);

  const logout = useCallback(async () => {
    userService.setSession(null);
    setSessionState(null);
    
    // Also sign out from the appropriate auth system
    if (useDevMock) {
      developmentOtpAuth.signOut();
    } else {
      try {
        const supabase = await getSupabase();
        if (supabase) {
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.error('Error signing out from Supabase:', err);
      }
    }
  }, [useDevMock]);

  const hasRole = useCallback(
    (...roles: Role[]) => (session ? roles.includes(session.role) : false),
    [session],
  );

  const value = useMemo(
    () => ({ 
      user, 
      appUser: user ? {
        id: user.id,
        name: user.name,
        role: user.role,
        restaurantIds: user.restaurantIds,
        contact: user.contact,
        createdAt: user.createdAt,
      } as AppUser : null,
      session, 
      isAuthenticated: Boolean(session), 
      hasRole, 
      sendOtp,
      verifyOtp,
      resendOtp,
      canResendOtp,
      checkPhoneExists,
      loginWithVerifiedPhone,
      signup,
      logout 
    }),
    [user, session, hasRole, sendOtp, verifyOtp, resendOtp, canResendOtp, checkPhoneExists, loginWithVerifiedPhone, signup, logout],
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