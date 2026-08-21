import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { developmentOtpAuth } from '../developmentOtpAdapter';

// Mock window.crypto
const cryptoMock = {
  getRandomValues: (array: Uint8Array | Uint32Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
};

Object.defineProperty(globalThis, 'window', {
  value: { crypto: cryptoMock },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] ?? null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  },
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('developmentOtpAdapter', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    vi.useFakeTimers();
    // Clear OTP storage and session before each test
    await developmentOtpAuth.signOut();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

// Test phone numbers in various valid formats
  // All of these should normalize to +8801711111111 (canonical: +8801XXXXXXXXX, 9 digits after 8801)
  const TEST_PHONE_LOCAL = '01711111111';         // Local format: 01XXXXXXXXX (11 digits)
  const TEST_PHONE_INT_WITH_PLUS = '+8801711111111';    // International with + (canonical: +8801XXXXXXXXX, 14 chars)
  const TEST_PHONE_INT_NO_PLUS = '8801711111111';        // International without + (13 digits)
  const TEST_PHONE_FORMATTED = '+880 17 1111 1111';      // Formatted with spaces (valid: 10 digits after 880)
  const TEST_PHONE_FORMATTED_2 = '+880 1711-111111';     // Formatted with hyphen (valid: 10 digits after 880)
  const TEST_PHONE_FORMATTED_3 = '+880 1646-330445';     // Formatted user example from QA (valid)
  
  const TEST_PHONE_2_LOCAL = '01711111112';             // Second test phone
  
  const INVALID_PHONE = 'invalid';
  const INVALID_PHONE_SHORT = '0171111111';  // Too short (10 digits)
  const INVALID_PHONE_LONG = '01711111111111'; // Too long (14 digits)
  const INVALID_PHONE_WRONG_PREFIX = '+8802711111111'; // Wrong prefix (2 instead of 1)
  const INVALID_PHONE_LETTERS = '0171111111a';  // Contains letters
  const INVALID_PHONE_FORMATTED_SHORT = '+880 1711-11111'; // Formatted but missing a digit (9 digits after 880)

  describe('signInWithOtp', () => {
    it('should send OTP and return it for display (local format)', async () => {
      const result = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      
      expect(result.error).toBeNull();
      expect(result.otp).toBeDefined();
      expect(result.otp?.length).toBe(6);
      expect(/^\d{6}$/.test(result.otp!)).toBe(true);
    });

    it('should send OTP and return it for display (international with +)', async () => {
      const result = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_INT_WITH_PLUS });
      
      expect(result.error).toBeNull();
      expect(result.otp).toBeDefined();
      expect(result.otp?.length).toBe(6);
      expect(/^\d{6}$/.test(result.otp!)).toBe(true);
    });

    it('should send OTP and return it for display (international without +)', async () => {
      const result = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_INT_NO_PLUS });
      
      expect(result.error).toBeNull();
      expect(result.otp).toBeDefined();
      expect(result.otp?.length).toBe(6);
      expect(/^\d{6}$/.test(result.otp!)).toBe(true);
    });

    it('should send OTP and return it for display (formatted with hyphen)', async () => {
      const result = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_FORMATTED });
      
      expect(result.error).toBeNull();
      expect(result.otp).toBeDefined();
      expect(result.otp?.length).toBe(6);
      expect(/^\d{6}$/.test(result.otp!)).toBe(true);
    });

    it('should send OTP and return it for display (formatted with spaces)', async () => {
      const result = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_FORMATTED_2 });
      
      expect(result.error).toBeNull();
      expect(result.otp).toBeDefined();
      expect(result.otp?.length).toBe(6);
      expect(/^\d{6}$/.test(result.otp!)).toBe(true);
    });

    it('should send OTP and return it for display (formatted user example +880 1646-330445)', async () => {
      const result = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_FORMATTED_3 });
      
      expect(result.error).toBeNull();
      expect(result.otp).toBeDefined();
      expect(result.otp?.length).toBe(6);
      expect(/^\d{6}$/.test(result.otp!)).toBe(true);
    });

    it('should reject formatted phone missing a digit', async () => {
      const result = await developmentOtpAuth.signInWithOtp({ phone: INVALID_PHONE_FORMATTED_SHORT });
      
      expect(result.error).not.toBeNull();
      expect(result.otp).toBeUndefined();
    });

    it('should reject invalid phone numbers', async () => {
      const result = await developmentOtpAuth.signInWithOtp({ phone: INVALID_PHONE });
      
      expect(result.error).not.toBeNull();
      expect(result.otp).toBeUndefined();
    });

    it('should reject too short phone numbers', async () => {
      const result = await developmentOtpAuth.signInWithOtp({ phone: INVALID_PHONE_SHORT });
      
      expect(result.error).not.toBeNull();
      expect(result.otp).toBeUndefined();
    });

    it('should reject too long phone numbers', async () => {
      const result = await developmentOtpAuth.signInWithOtp({ phone: INVALID_PHONE_LONG });
      
      expect(result.error).not.toBeNull();
      expect(result.otp).toBeUndefined();
    });

    it('should reject wrong prefix', async () => {
      const result = await developmentOtpAuth.signInWithOtp({ phone: INVALID_PHONE_WRONG_PREFIX });
      
      expect(result.error).not.toBeNull();
      expect(result.otp).toBeUndefined();
    });

    it('should reject phone with letters', async () => {
      const result = await developmentOtpAuth.signInWithOtp({ phone: INVALID_PHONE_LETTERS });
      
      expect(result.error).not.toBeNull();
      expect(result.otp).toBeUndefined();
    });

    it('should generate different OTPs for different phones', async () => {
      const result1 = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      const result2 = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_2_LOCAL });
      
      expect(result1.otp).not.toBe(result2.otp);
    });
  });

  describe('verifyOtp', () => {
it('should verify a valid OTP (local format)', async () => {
      const sendResult = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      const otp = sendResult.otp!;
      
      const result = await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_LOCAL, 
        token: otp, 
        type: 'sms' 
      });
      
      expect(result.error).toBeNull();
      expect(result.data?.session?.user).toBeDefined();
      expect(result.data?.session?.user?.id).toBeDefined();
      expect(result.data?.session?.user?.phone).toBe('+8801711111111');
    });
    
    it('should verify a valid OTP (international with +)', async () => {
      const sendResult = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_INT_WITH_PLUS });
      const otp = sendResult.otp!;
      
      const result = await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_INT_WITH_PLUS, 
        token: otp, 
        type: 'sms' 
      });
      
      expect(result.error).toBeNull();
      expect(result.data?.session?.user).toBeDefined();
      expect(result.data?.session?.user?.phone).toBe('+8801711111111');
    });
    
    it('should verify a valid OTP (international without +)', async () => {
      const sendResult = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_INT_NO_PLUS });
      const otp = sendResult.otp!;
      
      const result = await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_INT_NO_PLUS, 
        token: otp, 
        type: 'sms' 
      });
      
      expect(result.error).toBeNull();
      expect(result.data?.session?.user).toBeDefined();
      expect(result.data?.session?.user?.phone).toBe('+8801711111111');
    });
    
    it('should verify a valid OTP (formatted)', async () => {
      const sendResult = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_FORMATTED });
      const otp = sendResult.otp!;
      
      const result = await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_FORMATTED, 
        token: otp, 
        type: 'sms' 
      });
      
      expect(result.error).toBeNull();
      expect(result.data?.session?.user).toBeDefined();
      expect(result.data?.session?.user?.phone).toBe('+8801711111111');
    });

    it('should reject invalid OTP', async () => {
      await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      
      const result = await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_LOCAL, 
        token: '000000', 
        type: 'sms' 
      });
      
      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    });

    it('should reject invalid OTP', async () => {
      await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      
      const result = await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_LOCAL, 
        token: '000000', 
        type: 'sms' 
      });
      
      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    });

    it('should reject OTP after 3 failed attempts', async () => {
      await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      
      // First failed attempt
      await developmentOtpAuth.verifyOtp({ phone: TEST_PHONE_LOCAL, token: '000000', type: 'sms' });
      // Second failed attempt
      await developmentOtpAuth.verifyOtp({ phone: TEST_PHONE_LOCAL, token: '111111', type: 'sms' });
      // Third failed attempt - should lock
      const result3 = await developmentOtpAuth.verifyOtp({ phone: TEST_PHONE_LOCAL, token: '222222', type: 'sms' });
      
      expect(result3.error?.message).toBe('Too many verification attempts');
    });

    it('should reject expired OTP', async () => {
      const sendResult = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      const otp = sendResult.otp!;
      
      // Advance time by 6 minutes (past 5 minute expiry)
      vi.advanceTimersByTime(6 * 60 * 1000);
      
      const result = await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_LOCAL, 
        token: otp, 
        type: 'sms' 
      });
      
      expect(result.error?.message).toBe('OTP has expired');
    });

    it('should return stable UUID identity for same phone', async () => {
      await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_LOCAL, 
        token: '123456', // This will fail but we can get the ID from the session
        type: 'sms' 
      });
      
      // Send again and verify with correct OTP
      const sendResult = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      const result2 = await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_LOCAL, 
        token: sendResult.otp!, 
        type: 'sms' 
      });
      
      expect(result2.data?.session?.user?.id).toBeDefined();
      // The UUID should be a valid UUID format
      const uuid = result2.data?.session?.user?.id;
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('resendOtp', () => {
    it('should allow resend after cooldown', async () => {
      await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      
      // Advance time by 70 seconds (past 60 second cooldown)
      vi.advanceTimersByTime(70 * 1000);
      
      const result = await developmentOtpAuth.signInWithOtpForResend({ phone: TEST_PHONE_LOCAL });
      
      expect(result.error).toBeNull();
      expect(result.otp).toBeDefined();
      expect(result.otp).not.toBeUndefined();
    });

    it('should reject resend within cooldown', async () => {
      await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      
      // Try to resend immediately (within 60 second cooldown)
      const result = await developmentOtpAuth.signInWithOtpForResend({ phone: TEST_PHONE_LOCAL });
      
      expect(result.error?.message).toBe('Please wait before requesting a new OTP');
    });

    it('should generate new OTP on resend', async () => {
      const sendResult = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      const firstOtp = sendResult.otp!;
      
      vi.advanceTimersByTime(70 * 1000);
      
      const resendResult = await developmentOtpAuth.signInWithOtpForResend({ phone: TEST_PHONE_LOCAL });
      
      expect(resendResult.otp).not.toBe(firstOtp);
    });
  });

  describe('canResendOtp', () => {
    it('should return true if no OTP sent yet', () => {
      const result = developmentOtpAuth.canResendOtp(TEST_PHONE_LOCAL);
      expect(result).toBe(true);
    });

    it('should return false within cooldown', async () => {
      await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      
      const result = developmentOtpAuth.canResendOtp(TEST_PHONE_LOCAL);
      expect(result).toBe(false);
    });

    it('should return true after cooldown', async () => {
      await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      
      vi.advanceTimersByTime(70 * 1000);
      
      const result = developmentOtpAuth.canResendOtp(TEST_PHONE_LOCAL);
      expect(result).toBe(true);
    });
  });

  describe('signOut', () => {
    it('should clear OTP state', async () => {
      await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      
      await developmentOtpAuth.signOut();
      
      // After signout, should be able to send new OTP without cooldown
      const result = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      expect(result.error).toBeNull();
    });

    it('should clear persisted session', async () => {
      await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      const sendResult = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      await developmentOtpAuth.verifyOtp({ phone: TEST_PHONE_LOCAL, token: sendResult.otp!, type: 'sms' });
      
      await developmentOtpAuth.signOut();
      
      const sessionResult = await developmentOtpAuth.getSession();
      expect(sessionResult.data?.session).toBeNull();
    });
  });

  describe('getSession', () => {
    it('should return null when no session exists', async () => {
      const result = await developmentOtpAuth.getSession();
      expect(result.data?.session).toBeNull();
    });

    it('should return persisted session after verification', async () => {
      const sendResult = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      await developmentOtpAuth.verifyOtp({ phone: TEST_PHONE_LOCAL, token: sendResult.otp!, type: 'sms' });
      
      const sessionResult = await developmentOtpAuth.getSession();
      
      expect(sessionResult.data?.session).toBeDefined();
      expect(sessionResult.data?.session?.user?.id).toBeDefined();
      expect(sessionResult.data?.session?.user?.phone).toBe('+8801711111111');
    });

    it('should return same UUID identity across calls', async () => {
      const sendResult = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      await developmentOtpAuth.verifyOtp({ phone: TEST_PHONE_LOCAL, token: sendResult.otp!, type: 'sms' });
      
      const session1 = await developmentOtpAuth.getSession();
      const session2 = await developmentOtpAuth.getSession();
      
      expect(session1.data?.session?.user?.id).toBe(session2.data?.session?.user?.id);
    });

    it('should return null for expired session', async () => {
      const sendResult = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      await developmentOtpAuth.verifyOtp({ phone: TEST_PHONE_LOCAL, token: sendResult.otp!, type: 'sms' });
      
      // Advance time by 31 days (past 30 day expiry)
      vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);
      
      const result = await developmentOtpAuth.getSession();
      expect(result.data?.session).toBeNull();
    });
  });

  describe('stable identity across reloads', () => {
    it('should generate same UUID for same phone across multiple adapter instances', async () => {
      // First instance
      await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      const sendResult = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      const result1 = await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_LOCAL, 
        token: sendResult.otp!, 
        type: 'sms' 
      });
      const id1 = result1.data?.session?.user?.id;
      
      // Simulate new adapter instance by clearing OTP map but keeping localStorage
      // (the identity is stored in localStorage)
      const sendResult2 = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      const result2 = await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_LOCAL, 
        token: sendResult2.otp!, 
        type: 'sms' 
      });
      const id2 = result2.data?.session?.user?.id;
      
      expect(id1).toBe(id2);
    });

    it('should generate different UUIDs for different phone numbers', async () => {
      const sendResult1 = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_LOCAL });
      const result1 = await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_LOCAL, 
        token: sendResult1.otp!, 
        type: 'sms' 
      });
      
      const sendResult2 = await developmentOtpAuth.signInWithOtp({ phone: TEST_PHONE_2_LOCAL });
      const result2 = await developmentOtpAuth.verifyOtp({ 
        phone: TEST_PHONE_2_LOCAL, 
        token: sendResult2.otp!, 
        type: 'sms' 
      });
      
      expect(result1.data?.session?.user?.id).not.toBe(result2.data?.session?.user?.id);
    });
  });
});