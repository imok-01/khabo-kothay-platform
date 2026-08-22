/**
 * Demo credential helpers.
 *
 * Passwords are hashed with SHA-256 via the Web Crypto API — never stored in
 * plaintext. This is NOT production-grade authentication: SHA-256 alone is
 * not a password KDF, there is no salt, no session expiry, and sessions are
 * client-side. A real backend must own authentication; this only keeps the
 * demo honest about not storing raw passwords.
 */

async function digestHex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  
  // Web Crypto API requires a secure context (HTTPS or localhost).
  // In some dev environments, crypto.subtle may be unavailable.
  // Use a fallback for development only; production must have Web Crypto.
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for environments without Web Crypto (e.g., certain dev contexts).
  // This is a simple non-cryptographic hash — ONLY for development/demo.
  // Production MUST have Web Crypto API available in a secure context.
  if (import.meta.env.DEV) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    // Convert to hex-like string to maintain format compatibility
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
  
  throw new Error('Web Crypto API (crypto.subtle) is required but unavailable. This environment must be a secure context (HTTPS or localhost).');
}

export async function hashPassword(plaintext: string): Promise<string> {
  return `demo-sha256:${await digestHex(plaintext)}`;
}

export async function verifyPassword(plaintext: string, storedHash: string): Promise<boolean> {
  if (!storedHash.startsWith('demo-sha256:')) return false;
  return (await hashPassword(plaintext)) === storedHash;
}
