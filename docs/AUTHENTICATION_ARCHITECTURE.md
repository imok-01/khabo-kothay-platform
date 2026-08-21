# Khabo Kothay Authentication Architecture Documentation

## 1. Overview

### Why Phone-First Authentication

Khabo Kothay implements phone-first authentication for the Bangladeshi market where:
- Phone numbers are the primary digital identity (not email)
- SMS OTP is the standard authentication method
- Email penetration is lower than mobile phone penetration
- Users expect instant OTP via SMS, not email links

### Current Authentication Architecture

The system uses a **dual-path authentication architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────────┐     ┌────────────┐  │
│  │   Frontend   │◄───►│   Supabase Auth  │◄───►│  Database  │  │
│  │   (React)    │     │   (GoTrue)       │     │ (PostgreSQL) │  │
│  └──────┬───────┘     └────────┬─────────┘     └──────┬──────┘  │
│         │                      │                          │       │
│         │ 1. signInWithOtp     │                          │       │
│         ├─────────────────────►│                          │       │
│         │                      │ 2. SMS via Provider      │       │
│         │                      ├─────────────────────────►│        │
│         │                      │                          │       │
│         │ 3. verifyOtp         │                          │       │
│         ├─────────────────────►│                          │       │
│         │                      │ 4. Creates auth.users    │       │
│         │                      │     ▼                    │       │
│         │                      │  TRIGGER: create user_   │       │
│         │                      │     profiles row         │       │
│         │                      │                          │       │
│         │ 5. loginWithVerifiedPhone()                      │       │
│         ├─────────────────────►│                          │       │
│         │                      │ 5a. getSession()         │       │
│         │                      │ 5b. SELECT user_profiles │       │
│         │                      │     LEFT JOIN roles      │       │
│         │                      ├─────────────────────────►│       │
│         │ 6. Creates AppUser   │                          │       │
│         │    (role from roles) │                          │       │
│         │                      │                          │       │
│         │ 7. React Context only (no localStorage session)│       │
│         ▼                      ▼                          ▼       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    REACT CONTEXT (Single Source)           │  │
│  │  • useAuth() → AppUser { id, name, role, restaurantIds }  │  │
│  │  • Derived from Supabase session + profile + roles        │  │
│  │  • No localStorage session (cache only in React state)    │  │
│  │  • localStorage used ONLY for:                            │  │
│  │    • Demo mock data (dev only)                            │  │
│  │    • Favorites/Saved cache (per-user keys, synced)        │  │
│  │    • Dev mock identity map (dev only)                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Production vs Development Philosophy

| Aspect | Production | Development |
|--------|------------|-------------|
| **Auth Mode** | Real Supabase SMS | Mock OTP (localStorage) |
| **OTP Delivery** | Real SMS via Twilio/MessageBird | Displayed in UI |
| **User Accounts** | Real Supabase auth.users | Demo accounts + generated UUIDs |
| **Role Loading** | From `roles` table + `user_profiles` | Hardcoded per demo account |
| **Session Storage** | Supabase session (IndexedDB) + React Context | localStorage + React Context |
| **Cost** | SMS charges per OTP | Free (no SMS costs) |
| **Safety** | Real phone verification | Demo accounts only |

---

## 2. Environment Separation

### Production Environment

| Property | Value |
|----------|-------|
| **URL** | `https://khabo-kothay.vercel.app` |
| **Purpose** | Real user environment |
| **Auth Mode** | `AUTH_MODE=real` (Supabase SMS) |
| **Supabase Project** | Production project (separate from dev) |
| **SMS Provider** | Twilio/MessageBird (configured in Supabase Dashboard) |

**Environment Variables (Production - Vercel Project: `khabo-kothay-kolkata`):**
```bash
VITE_APP_ENV=production
VITE_SUPABASE_URL=https://<prod-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
# VITE_DEV_AUTH_MOCK is NOT set (or explicitly false)
```

**Vercel Project:** `khabo-kothay-kolkata`  
**Production Domain:** `https://khabo-kothay.vercel.app`

---

### Development Environment

| Property | Value |
|----------|-------|
| **URL** | `https://khabo-kothay-dev.vercel.app` |
| **Purpose** | Internal QA/testing |
| **Auth Mode** | `AUTH_MODE=mock` (Development OTP) |
| **Demo Accounts** | Enabled (5 pre-seeded accounts) |
| **OTP Display** | Visible in UI (no SMS sent) |

**Environment Variables (Development - Vercel Project: `khabo-kothay-dev`):**
```bash
VITE_APP_ENV=development
VITE_DEV_AUTH_MOCK=true
VITE_SUPABASE_URL=https://jmtpqznzfaoklpdmldnc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

**Vercel Project:** `khabo-kothay-dev`  
**Development Domain:** `https://khabo-kothay-dev.vercel.app`

---

### Environment Separation Logic

**The two domains share the same codebase but intentionally have different authentication behavior.**

```
┌─────────────────────────────────────────────────────────────────┐
│              SAME CODEBASE, DIFFERENT ENVIRONMENTS              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐           ┌─────────────────┐             │
│  │   PRODUCTION    │           │   DEVELOPMENT   │             │
│  │  khabo-kothay   │           │ khabo-kothay-dev│             │
│  │ .vercel.app     │           │ .vercel.app     │             │
│  └────────┬────────┘           └────────┬────────┘             │
│           │                             │                       │
│           ▼                             ▼                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    SAME CODEBASE                         │   │
│  │                                                         │   │
│  │  const appEnv = import.meta.env.VITE_APP_ENV || 'prod'  │   │
│  │                                                         │   │
│  │  if (appEnv === 'production') {                         │   │
│  │    // REAL SMS AUTH PATH                                 │   │
│  │    useSupabaseAuth()                                    │   │
│  │    VITE_DEV_AUTH_MOCK = false                           │   │
│  │  } else {                                               │   │
│  │    // MOCK OTP PATH (development)                       │   │
│  │    useDevelopmentOtpAdapter()                           │   │
│  │    VITE_DEV_AUTH_MOCK = true                            │   │
│  │  }                                                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Why Environment Separation Exists

### 1. Developers Need Safe Testing Without Real SMS Cost
- Each OTP SMS costs money (Twilio: ~$0.0075/SMS in Bangladesh)
- QA cycles require hundreds of test logins per day
- Mock OTP eliminates SMS costs entirely during development

### 2. Production Must Never Accidentally Use Mock Authentication
- Real users must receive real SMS OTPs
- Mock OTPs displayed in UI would be a security breach
- Phone numbers could be exposed in browser console
- **Security guard** prevents this at runtime

### 3. Security Guard Prevents Accidental Production Mock Mode
```typescript
// src/context/AuthContext.tsx
const appEnv = import.meta.env.VITE_APP_ENV || 'production';

if (useDevMock && appEnv === 'production') {
  console.error('SECURITY ERROR: VITE_DEV_AUTH_MOCK is enabled in production environment!');
  throw new Error('VITE_DEV_AUTH_MOCK cannot be enabled in production environment');
}
```

**This guard:**
- Runs at AuthProvider initialization (before any render)
- Checks `VITE_APP_ENV` explicitly (not `import.meta.env.PROD`)
- Throws immediately if dev mock is enabled in production
- Cannot be bypassed without changing code

---

## 4. Security Guard Implementation

### File: `src/context/AuthContext.tsx`

### Previous Approach (Broken)
```typescript
// BROKEN: Used Vercel's PROD flag
const useDevMock = import.meta.env.VITE_DEV_AUTH_MOCK === 'true';

if (useDevMock && import.meta.env.PROD) {
  throw new Error('VITE_DEV_AUTH_MOCK cannot be enabled in production');
}
```

**Problem:** Vercel marks **both** production AND preview deployments as `import.meta.env.PROD = true`. This meant dev deployments (which are preview deployments) were incorrectly blocked.

### Final Approach (Fixed)

```typescript
// src/context/AuthContext.tsx:107-118

// Determine if we should use development OTP mock
const useDevMock = import.meta.env.VITE_DEV_AUTH_MOCK === 'true';

// Determine app environment from explicit config (not Vercel's PROD flag)
// VITE_APP_ENV can be 'production' or 'development'
const appEnv = import.meta.env.VITE_APP_ENV || 'production';

// Production safety guard: prevent dev mock from running in production environment
if (useDevMock && appEnv === 'production') {
  console.error('SECURITY ERROR: VITE_DEV_AUTH_MOCK is enabled in production environment!');
  throw new Error('VITE_DEV_AUTH_MOCK cannot be enabled in production environment');
}
```

### Logic Table

| `VITE_APP_ENV` | `VITE_DEV_AUTH_MOCK` | Result |
|----------------|----------------------|--------|
| `production` | `true` | 🚫 **BLOCKED** - Security error thrown |
| `production` | `false` / unset | ✅ Allowed - Real SMS path |
| `development` | `true` | ✅ Allowed - Mock OTP enabled |
| `development` | `false` / unset | ✅ Allowed - Real SMS path (in dev) |
| `undefined` | `true` | 🚫 **BLOCKED** - Defaults to production |
| `undefined` | `false` / unset | ✅ Allowed - Real SMS path |

### Why Not `import.meta.env.PROD`?

| Environment | `import.meta.env.PROD` | `VITE_APP_ENV` |
|-------------|------------------------|----------------|
| Production (vercel.app) | `true` | `production` |
| Preview Deploy (vercel.app) | `true` | `preview` / unset |
| Dev Domain (khabo-kothay-dev.vercel.app) | `true` | `development` |
| Localhost (npm run dev) | `false` | `development` |

**Vercel marks BOTH production AND preview deployments as `PROD=true`.** Only explicit `VITE_APP_ENV` correctly distinguishes environments.

---

## 5. Deployment Architecture

### Vercel Projects

| Project | ID | Purpose | Domain | Branch |
|---------|-----|---------|--------|--------|
| `khabo-kothay-kolkata` | `prj_CU2X7YxGO7lFS2bOfurRJX5DlBru` | **Production** | `khabo-kothay.vercel.app` | `main` (via `chore/repository-restructure`) |
| `khabo-kothay-dev` | `prj_LvslEsP660CeoWH3ScPxnM10bHtX` | **Development/QA** | `khabo-kothay-dev.vercel.app` | `develop` (when configured) |

### Current Deployment State (as of checkpoint)

| Project | Latest Deploy | Status | Domain |
|---------|---------------|--------|--------|
| `khabo-kothay-kolkata` | `dpl_5Pk8Ahh8fQMQdCB4LjuBdgGUAR6f` | ✅ Production | `khabo-kothay.vercel.app` |
| `khabo-kothay-dev` | `dpl_AzYQfte4KXYQkozyufWfqSbFQjp4` | ✅ Ready | `khabo-kothay-dev.vercel.app` |

### Branch Configuration (Current)
```
chore/repository-restructure  →  Production (khabo-kothay.vercel.app)
develop branch (when created) →  Development (khabo-kothay-dev.vercel.app)
```

### Recommended Git Flow (Future)
```
feature branch
       │
       ▼
develop branch → Auto-deploy to DEV (khabo-kothay-dev.vercel.app)
       │
       ▼
QA Approval / Testing
       │
       ▼
PR: develop → main
       │
       ▼
Auto-deploy to PROD (khabo-kothay.vercel.app)
```

### Environment Variables by Project

| Variable | Production Project | Dev Project |
|----------|-------------------|-------------|
| `VITE_APP_ENV` | `production` | `development` |
| `VITE_DEV_AUTH_MOCK` | (not set) | `true` (Development) |
| `VITE_SUPABASE_URL` | Prod Supabase URL | Dev Supabase URL (same currently) |
| `VITE_SUPABASE_ANON_KEY` | Prod anon key | Dev anon key |
| `VITE_SUPABASE_ANON_KEY` | Prod anon key | Dev anon key |

---

## 6. Authentication Flow

### Complete Production Signup Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION SIGNUP FLOW                          │
└────────────────────────────────────────────────────────────────────────┘

User enters phone number
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│ sendOtp(phone) → supabase.auth.signInWithOtp({ phone })            │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
    SMS sent via Supabase → Twilio/MessageBird → User's phone
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│ User enters 6-digit OTP                                             │
        │
        ▼
verifyOtp(phone, code) → supabase.auth.verifyOtp({ phone, token, type: 'sms' })
        │
        ▼
    OTP verified → auth.users row created (if new)
        │
        ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ DATABASE TRIGGER: on_auth_user_created                      │
    │   INSERT INTO user_profiles (user_id, display_name, phone) │
    │   VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.phone) │
    │   INSERT INTO roles (user_id, role_name) VALUES (NEW.id, 'user') │
    └─────────────────────────────────────────────────────────────┘
        │
        ▼
    loginWithVerifiedPhone(phone)
        │
        ▼
    getSession() → supabase.auth.getSession()
        │
        ▼
    SELECT user_profiles.*, roles(role_name, restaurant_id)
    FROM user_profiles
    LEFT JOIN roles ON roles.user_id = user_profiles.user_id
    WHERE user_id = auth.uid()
        │
        ▼
    Build AppUser { id, name, role, restaurantIds }
        │
        ▼
    React Context State ← AppUser (role from roles table!)
        │
        ▼
    User enters platform with correct permissions
```

### Development Signup Flow (Mock)

```
User enters phone (e.g., 01712345678)
        │
        ▼
sendOtp() → developmentOtpAuth.signInWithOtp()
        │
        ▼
    OTP generated locally (e.g., "123456") + displayed in UI
        │
        ▼
    User enters OTP
        │
        ▼
verifyOtp() → developmentOtpAuth.verifyOtp()
        │
        ▼
    Creates stable UUID via getOrCreateDevUserId(phone)
    Stores in localStorage: khabo-kothay:dev:user-identity
        │
        ▼
    loginWithVerifiedPhone() → developmentOtpAuth.getSession()
        │
        ▼
    Phone-first lookup in demo users:
    users.find(u => normalize(u.contact) === normalizedPhone)
        │
        ▼
    Found demo account (exec-kk, owner-arsalan, etc.)
        │
        ▼
    Restores demo user with CORRECT role:
    - 01712345678 → KK Executive (executive)
    - 01812345678 → Restaurant Admin Seasonal Tastes (restaurant_admin)
    - 01912345678 → Restaurant Admin Almajlis (restaurant_admin)
    - 01612345678 → Regular User (user)
    - 01512345678 → Regular User (user)
        │
        ▼
    Session created with correct role + restaurantIds
```

---

## 7. Demo Account System

### Development Demo Accounts (QA Only)

| Phone | Role | Restaurant | ID |
|-------|------|------------|----|
| `01712345678` | `executive` | — | `exec-kk` |
| `01812345678` | `restaurant_admin` | Seasonal Tastes | `owner-arsalan` |
| `01912345678` | `restaurant_admin` | Almajlis Arabian Restaurant | `owner-bhojohori` |
| `01612345678` | `user` | — | `user-ananya` |
| `01512345678` | `user` | — | `user-rahul` |

**All use password:** `demo123` (hashed in demo store)

### Important Rules

| Rule | Enforcement |
|------|-------------|
| Demo accounts **only exist in development** | `VITE_DEV_AUTH_MOCK=true` required |
| Production **never seeds** demo accounts | AuthContext seeding only runs when `useDevMock` |
| Demo accounts **never reach production database** | Separate Supabase projects |
| Demo accounts have **stable IDs** | `exec-kk`, `owner-arsalan`, etc. |
| Demo accounts have **real roles** | `executive`, `restaurant_admin`, `user` |

### Production Must Never Depend on Demo Accounts

| Check | Enforcement |
|-------|-------------|
| No demo accounts in production DB | Separate Supabase project |
| No `VITE_DEV_AUTH_MOCK` in production env | Security guard blocks it |
| Demo accounts only in dev localStorage | `khabo-kothay:demo:users` key |
| Production uses real Supabase users | `auth.users` + `user_profiles` + `roles` |

---

## 8. SMS Provider Future Integration

### Current State: Code Ready, Infrastructure Pending

The frontend code is **production-ready** for real SMS. Only Supabase Dashboard configuration is needed.

### Integration Steps (When Ready)

```bash
# 1. In Supabase Dashboard → Authentication → Settings → SMS Provider
# Select provider: Twilio / MessageBird / Vonage / etc.

# 2. Configure provider credentials:
# Twilio:
#   Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
#   Auth Token:  your_auth_token
#   Messaging Service SID: MGxxxxxxxxxxxxxxxxxxxxxxxxx
#   (or From Number: +15551234567)

# 3. Configure OTP Settings:
#    - OTP Length: 6 digits
#    - OTP Expiry: 300 seconds (5 minutes)
#    - Rate Limit: 3 OTP/hour, 10 OTP/day per phone
#    - Resend Cooldown: 60 seconds

# 4. SMS Template (Supabase Dashboard → Auth → Templates):
#    "Your Khabo Kothay verification code is {{ .Code }}. 
#     Valid for 5 minutes. Do not share with anyone."
```

### No Frontend Code Changes Required

The frontend already:
- Calls `supabase.auth.signInWithOtp({ phone })` 
- Calls `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`
- Handles `supabase.auth.onAuthStateChange` for session restore
- Uses `supabase.auth.signOut()` for logout

**All Supabase Auth SDK calls are already implemented.**

### What Needs Dashboard Configuration Only

| Setting | Location | Status |
|---------|----------|--------|
| SMS Provider | Supabase Dashboard → Auth → Settings | ❌ Not configured |
| SMS Template | Supabase Dashboard → Auth → Templates | ❌ Not configured |
| Rate Limits | Supabase Dashboard → Auth → Rate Limits | ❌ Defaults only |
| OTP Expiry | Supabase Dashboard → Auth → Settings | ❌ Defaults only |
| RLS Policies | SQL migrations (applied via SQL Editor) | ❌ Not applied |

---

## 9. Troubleshooting Guide

### Problem: White Screen in Production

**Symptoms:**
- Page loads blank/white
- Console shows: `SECURITY ERROR: VITE_DEV_AUTH_MOCK is enabled in production environment!`
- Build fails during prerender with security error

**Cause:**
`VITE_DEV_AUTH_MOCK=true` is set in Vercel Production environment variables.

**Root Cause:**
Someone accidentally added `VITE_DEV_AUTH_MOCK=true` to Vercel Production environment variables.

**Fix:**
```bash
# In Vercel Dashboard → Project Settings → Environment Variables
# 1. Find VITE_DEV_AUTH_MOCK in Production environment
# 2. DELETE it (or set to "false")
# 2. Ensure VITE_APP_ENV=production is set
# 4. Redeploy
```

**Verification:**
```bash
# Check deployed env vars
vercel env ls --project khabo-kothay-kolkata
# Should show:
# VITE_APP_ENV = production (Production)
# VITE_DEV_AUTH_MOCK = (not present in Production)
```

---

### Problem: Dev Environment Blocked / White Screen

**Symptoms:**
- Dev URL (`khabo-kothay-dev.vercel.app`) shows white screen
- Console: `SECURITY ERROR: VITE_DEV_AUTH_MOCK is enabled in production environment!`

**Cause:**
`VITE_APP_ENV` is set to `production` (or missing) in the **Development** Vercel project, but `VITE_DEV_AUTH_MOCK=true`.

**Fix:**
```bash
# In Vercel Dashboard → Project: khabo-kothay-dev
# 1. Ensure VITE_APP_ENV = "development" (Environment: Development)
# 2. Ensure VITE_DEV_AUTH_MOCK = "true" (Environment: Development)
# 3. Ensure NO VITE_DEV_AUTH_MOCK in Production environment
# 4. Redeploy
```

**Verification:**
```bash
vercel env ls --project khabo-kothay-dev
# Should show:
# VITE_APP_ENV = development (Development)
# VITE_DEV_AUTH_MOCK = true (Development)
# VITE_DEV_AUTH_MOCK = true (Production)  ← This is OK for dev project!
```

---

### Problem: OTP Not Sending (Production)

**Symptoms:**
- User clicks "Send OTP"
- No SMS received
- No error message (or generic timeout)

**Possible Causes & Fixes:**

| Cause | Check | Fix |
|-------|-------|-----|
| SMS provider not configured | Supabase Dashboard → Auth → Settings → SMS Provider | Configure Twilio/MessageBird |
| Invalid Twilio credentials | Supabase Dashboard → Auth → Settings → SMS Provider | Verify Account SID, Auth Token, Messaging Service SID |
| Phone number format | User enters `01712345678` | Ensure `+8801712345678` format (handled by normalizePhone) |
| Rate limit exceeded | Supabase Dashboard → Auth → Rate Limits | Check limits: 3/hr, 10/day |
| Phone number not verified | Supabase Dashboard → Authentication → Users | Check if user exists in auth.users |
| Supabase project not linked | Supabase Dashboard → Project Settings | Verify correct project reference |

**Debug Steps:**
```javascript
// Browser console - check Supabase client creation
import { getSupabase } from './integrations/supabase/client';
const client = await getSupabase();
console.log('Supabase configured:', !!client);

// Check auth state
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// Test OTP send manually
const { error } = await supabase.auth.signInWithOtp({ phone: '+8801712345678' });
console.log('OTP send error:', error);
```

---

### Problem: Role Not Loading (Production)

**Symptoms:**
- User logs in successfully
- But gets `role: 'user'` instead of `restaurant_admin` or `executive`
- Cannot access admin features

**Cause:**
`loginWithVerifiedPhone` / auth state listener not joining `roles` table.

**Fix:**
```typescript
// AuthContext.tsx - loginWithVerifiedPhone and auth state listener
const { data: profile, error } = await supabase
  .from('user_profiles')
  .select('*, roles(role_name, restaurant_id)')  // ← JOIN roles table
  .eq('user_id', supabaseSession.user.id)
  .single();

// Then extract role:
const roles = profile.roles as Array<{ role_name: string; restaurant_id: string }> | null;
const roleName = roles?.[0]?.role_name || 'user';
const restaurantId = roles?.[0]?.restaurant_id || null;
const role = roleMap[roleName] ?? 'user';
```

**Verify `roles` table has data:**
```sql
SELECT * FROM roles WHERE user_id = '<user-uuid>';
-- Should return: role_name = 'restaurant_admin', restaurant_id = 'seasonal-tastes'
```

---

### Problem: Duplicate Phone Allowed in Production

**Symptoms:**
- User can sign up with phone that already has an account
- No error shown until after OTP verification

**Cause:**
`checkPhoneExists` returns `false` in production (not implemented).

**Fix:**
```typescript
// AuthContext.tsx: checkPhoneExists
const checkPhoneExists = useCallback(async (phoneNumber: string) => {
  try {
    const normalizedPhone = normalizePhone(phoneNumber);
    
    if (useDevMock) {
      return users.some(u => {
        const storedContact = u.contact?.replace(/\D/g, '');
        const normalizedStored = storedContact ? normalizePhone(storedContact) : '';
        return normalizedStored === normalizedPhone;
      });
    } else {
      // Production: query user_profiles via Supabase
      const supabase = await getSupabase();
      if (!supabase) return false;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();
      
      return !error && !!data;
    }
  } catch {
    return false;
  }
}, [users, useDevMock]);
```

---

## 10. Stable Checkpoint

### Stable Checkpoint Record

| Property | Value |
|----------|-------|
| **Commit Hash** | `d143029709419b361fe025bff05bfcdeb483f96d` |
| **Branch** | `chore/repository-restructure` |
| **Commit Message** | `Checkpoint: production auth foundation and dev environment separation complete` |
| **Date** | 2026-08-21 |
| **Purpose** | Stable authentication foundation checkpoint |

### Files Changed in Checkpoint
| File | Changes |
|--------|---------|
| `src/context/AuthContext.tsx` | `VITE_APP_ENV` based auth separation, security guard fix |
| `package.json` / `package-lock.json` | Dependency updates |
| `src/index.css` | Minor styling updates |

### Files Added (Untracked - Pipeline Scripts)
```
database/pipelines/images/import_images.js
database/pipelines/images/replace_images.js
database/pipelines/images/replace_result.json
```

---

## 11. Developer Rules

### ❌ NEVER

| Rule | Reason |
|------|--------|
| **Never enable mock authentication in production** | Security breach, exposes phone numbers, bypasses real auth |
| **Never remove the environment security guard** | Only barrier preventing dev mock in production |
| **Never use `import.meta.env.PROD` for auth decisions** | Vercel marks preview as PROD too |
| **Never share production Supabase keys in dev** | Separate projects, separate keys |
| **Never commit real Supabase keys to git** | Use Vercel environment variables only |

### ✅ ALWAYS

| Rule | Reason |
|------|--------|
| **Test auth changes in dev before production** | Dev environment mirrors production architecture |
| **Use `VITE_APP_ENV` for environment detection** | Explicit, not inferred from build flags |
| **Keep production and development behavior intentionally separate** | Prevents accidental cross-contamination |
| **Test auth changes in dev before production** | Dev environment mirrors production architecture |
| **Run full test suite before deploying** | `npm test && npm run build` |

### Code Review Checklist for Auth Changes

```markdown
- [ ] Does not modify `VITE_DEV_AUTH_MOCK` logic in production path
- [ ] Does not remove security guard in `AuthContext.tsx`
- [ ] Does not use `import.meta.env.PROD` for auth decisions
- [ ] Role loading uses `roles` table JOIN (not hardcoded)
- [ ] Profile creation uses DB trigger (not frontend)
- [ ] RLS policies tested for new tables
- [ ] Dev mock path unchanged (demo accounts work)
```

---

## Quick Reference Card

### Environment Variable Cheat Sheet

| Variable | Production | Development | Purpose |
|----------|------------|-------------|---------|
| `VITE_APP_ENV` | `production` | `development` | **Primary env detector** |
| `VITE_DEV_AUTH_MOCK` | (absent/false) | `true` | Enable mock OTP |
| `VITE_SUPABASE_URL` | Prod URL | Dev URL | Supabase project |
| `VITE_SUPABASE_ANON_KEY` | Prod key | Dev key | Supabase auth |
| `VITE_SUPABASE_URL` | Prod URL | Dev URL | Supabase DB |

### Quick Commands

```bash
# Check production env vars
vercel env ls --project khabo-kothay-kolkata

# Check dev env vars
vercel env ls --project khabo-kothay-dev

# Deploy production
git push origin main  # or: vercel --prod

# Deploy dev
git push origin develop  # or: vercel --prod --project khabo-kothay-dev

# Check deployed env vars
vercel env ls --project khabo-kothay-kolkata
vercel env ls --project khabo-kothay-dev

# View production deployment
vercel inspect khabo-kothay.vercel.app

# View dev deployment
vercel inspect khabo-kothay-dev.vercel.app
```

---

## Emergency Contacts & Escalation

| Issue | Contact | Channel |
|-------|---------|---------|
| Production auth down | Lead Engineer | PagerDuty / Slack #prod-alerts |
| SMS not sending | DevOps / Supabase Admin | Supabase Dashboard + Twilio Console |
| RLS policy blocking users | DB Admin | Supabase Dashboard → SQL Editor |
| Dev environment broken | QA Lead | Slack #dev-qa |

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-21  
**Author:** Khabo Kothay Engineering Team  
**Review Cycle:** Quarterly or after major auth changes  

---

*End of Authentication Architecture Documentation*