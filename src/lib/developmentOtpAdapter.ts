/**
 * Development-only OTP adapter that mimics Supabase Auth OTP methods
 * for testing without SMS provider costs.
 * 
 * ONLY to be used when VITE_DEV_AUTH_MOCK=true is set.
 * 
 * Generates and displays OTPs directly in the UI for development/testing.
 * 
 * Uses stable UUID-based identity that persists across reloads.
 * Session is persisted in isolated localStorage key.
 */

import type { User } from '@supabase/supabase-js';

const DEV_AUTH_STORAGE_KEY = 'khabo-kothay:dev:auth-session';
const DEV_USER_IDENTITY_KEY = 'khabo-kothay:dev:user-identity';

/**
 * Generate a UUID v4 using crypto.getRandomValues
 */
function generateUuid(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  // Set version (4) and variant (10xx)
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

/**
 * Get or create a stable development user identity for a phone number.
 * The identity is stored in localStorage and persists across reloads.
 */
function getOrCreateDevUserId(phoneNumber: string): string {
  try {
    const stored = localStorage.getItem(DEV_USER_IDENTITY_KEY);
    const identities: Record<string, string> = stored ? JSON.parse(stored) : {};
    
    if (identities[phoneNumber]) {
      return identities[phoneNumber];
    }
    
    const newId = generateUuid();
    identities[phoneNumber] = newId;
    localStorage.setItem(DEV_USER_IDENTITY_KEY, JSON.stringify(identities));
    return newId;
  } catch {
    // Fallback to generated UUID if localStorage fails
    return generateUuid();
  }
}

/**
 * Get the persisted development auth session
 */
function getPersistedDevSession(): { userId: string; phoneNumber: string; expiresAt: number } | null {
  try {
    const stored = localStorage.getItem(DEV_AUTH_STORAGE_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored);
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Persist the development auth session
 */
function persistDevSession(userId: string, phoneNumber: string): void {
  try {
    const session = {
      userId,
      phoneNumber,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    localStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear the development auth session
 */
function clearDevSession(): void {
  try {
    localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Development OTP storage
 */
class DevelopmentOtpStorage {
  private otpMap: Map<string, {
    code: string;
    expiresAt: number;
    attempts: number;
    sentAt: number;
    phoneNumber: string;
  }> = new Map();

  /**
   * Generate a 6-digit OTP using crypto.getRandomValues for security
   */
  private generateOtp(): string {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const otpNumber = array[0] % 1000000;
    return otpNumber.toString().padStart(6, '0');
  }

  /**
   * Normalize and validate Bangladesh phone number
   * Accepts various Bangladesh phone formats and converts to canonical +8801XXXXXXXXX format
   * Valid input formats:
   * - Local: 01XXXXXXXXX (11 digits)
   * - International with +: +8801XXXXXXXXX (14 chars including +)
   * - International without +: 8801XXXXXXXXX (13 digits)
   * - Formatted: +880 1XXX-XXXXXX, +880 1XXX XXXXXX, etc.
   * Returns canonical format: +8801XXXXXXXXX (14 chars including +)
   */
  private normalizePhone(phoneNumber: string): string {
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
  }

  /**
   * Clear all OTPs - used for sign out
   */
  public clear(): void {
    this.otpMap.clear();
  }

  /**
   * Send OTP - generates and stores it, returns success with the OTP code for display
   */
  async sendOtp(phoneNumber: string): Promise<{ ok: boolean; error?: string; otp?: string }> {
    try {
      const normalizedPhone = this.normalizePhone(phoneNumber);
      
      // Generate OTP
      const code = this.generateOtp();
      const now = Date.now();
      const expiresAt = now + 5 * 60 * 1000; // 5 minutes
      
      // Store OTP state
      this.otpMap.set(normalizedPhone, {
        code,
        expiresAt,
        attempts: 0,
        sentAt: now,
        phoneNumber: normalizedPhone
      });
      
      return { ok: true, otp: code };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(phoneNumber: string, code: string): Promise<{ 
    ok: boolean; 
    error?: string; 
    session: { user: User } | null; 
  }> {
    try {
      const normalizedPhone = this.normalizePhone(phoneNumber);
      const otpState = this.otpMap.get(normalizedPhone);
      
      if (!otpState) {
        return { ok: false, error: 'OTP not found or expired', session: null };
      }
      
      const now = Date.now();
      
      // Check if expired
      if (now > otpState.expiresAt) {
        this.otpMap.delete(normalizedPhone);
        return { ok: false, error: 'OTP has expired', session: null };
      }
      
      // Check attempts limit
      if (otpState.attempts >= 3) {
        this.otpMap.delete(normalizedPhone);
        return { ok: false, error: 'Too many verification attempts', session: null };
      }
      
      // Increment attempts
      otpState.attempts += 1;
      
      // Check if this attempt exceeds the limit
      if (otpState.attempts > 3) {
        this.otpMap.delete(normalizedPhone);
        return { ok: false, error: 'Too many verification attempts', session: null };
      }
      
      // Check if code matches
      if (code !== otpState.code) {
        // If this was the last allowed attempt, clean up
        if (otpState.attempts >= 3) {
          this.otpMap.delete(normalizedPhone);
          return { ok: false, error: 'Too many verification attempts', session: null };
        }
        return { ok: false, error: 'Invalid OTP code', session: null };
      }
      
      // OTP verified successfully - clean up
      this.otpMap.delete(normalizedPhone);
      
      // Get or create stable development user identity
      const devUserId = getOrCreateDevUserId(normalizedPhone);
      
      const mockUser: User = {
        id: devUserId,
        email: `${normalizedPhone}@dev.khabokothay.test`,
        phone: normalizedPhone,
        email_confirmed_at: undefined,
        phone_confirmed_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {
          full_name: `Dev User ${normalizedPhone.slice(-4)}`
        },
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Persist the session
      persistDevSession(devUserId, normalizedPhone);
      
      return {
        ok: true,
        session: {
          user: mockUser
        }
      };
    } catch (error: any) {
      return { ok: false, error: error.message, session: null };
    }
  }

  /**
   * Resend OTP - generates new OTP but respects cooldown
   */
  async resendOtp(phoneNumber: string): Promise<{ ok: boolean; error?: string; otp?: string }> {
    try {
      const normalizedPhone = this.normalizePhone(phoneNumber);
      const otpState = this.otpMap.get(normalizedPhone);
      const now = Date.now();
      
      // Check if OTP exists and if cooldown has passed (60 seconds)
      if (otpState && (now - otpState.sentAt) < 60 * 1000) {
        return { ok: false, error: 'Please wait before requesting a new OTP' };
      }
      
      // Generate new OTP
      const newCode = this.generateOtp();
      const expiresAt = now + 5 * 60 * 1000; // 5 minutes
      
      // Update OTP state
      this.otpMap.set(normalizedPhone, {
        code: newCode,
        expiresAt,
        attempts: 0,
        sentAt: now,
        phoneNumber: normalizedPhone
      });
      
      return { ok: true, otp: newCode };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }

  /**
   * Check if OTP can be resent (cooldown passed)
   */
  canResendOtp(phoneNumber: string): boolean {
    try {
      const normalizedPhone = this.normalizePhone(phoneNumber);
      const otpState = this.otpMap.get(normalizedPhone);
      const now = Date.now();
      
      if (!otpState) {
        return true;
      }
      
      return (now - otpState.sentAt) >= 60 * 1000;
    } catch {
      return false;
    }
  }
}

// Singleton instance
const developmentOtpStorage = new DevelopmentOtpStorage();

/**
 * Development OTP adapter that mimics the Supabase Auth OTP interface
 */
export const developmentOtpAuth = {
  async signInWithOtp(params: { phone: string }): Promise<{ error: null | { message: string }; otp?: string }> {
    const result = await developmentOtpStorage.sendOtp(params.phone);
    return {
      error: result.ok ? null : { message: result.error ?? 'Unknown error' },
      otp: result.otp
    };
  },
  
  async verifyOtp(params: { 
    phone: string; 
    token: string; 
    type: 'sms' 
  }): Promise<{ 
    error: null | { message: string }; 
    data: { session: { user: User } | null } | null 
  }> {
    const result = await developmentOtpStorage.verifyOtp(params.phone, params.token);
    return {
      error: result.ok ? null : { message: result.error ?? 'Unknown error' },
      data: result.ok ? { session: result.session } : null
    };
  },
  
  async signInWithOtpForResend(params: { phone: string }): Promise<{ error: null | { message: string }; otp?: string }> {
    const result = await developmentOtpStorage.resendOtp(params.phone);
    return {
      error: result.ok ? null : { message: result.error ?? 'Unknown error' },
      otp: result.otp
    };
  },
  
  async signOut(): Promise<{ error: null | { message: string } }> {
    developmentOtpStorage.clear();
    clearDevSession();
    return { error: null };
  },
  
  async getSession(): Promise<{ data: { session: { user: User } | null } | null; error: null | { message: string } }> {
    const persisted = getPersistedDevSession();
    if (!persisted) {
      return { data: { session: null }, error: null };
    }
    
    // Reconstruct mock user from persisted session
    const mockUser: User = {
      id: persisted.userId,
      email: `${persisted.phoneNumber}@dev.khabokothay.test`,
      phone: persisted.phoneNumber,
      email_confirmed_at: undefined,
      phone_confirmed_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {
        full_name: `Dev User ${persisted.phoneNumber.slice(-4)}`
      },
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return {
      data: { session: { user: mockUser } },
      error: null
    };
  },
  
  canResendOtp(phone: string): boolean {
    return developmentOtpStorage.canResendOtp(phone);
  }
};

export default developmentOtpAuth;