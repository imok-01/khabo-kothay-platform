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
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(plaintext: string): Promise<string> {
  return `demo-sha256:${await digestHex(plaintext)}`;
}

export async function verifyPassword(plaintext: string, storedHash: string): Promise<boolean> {
  if (!storedHash.startsWith('demo-sha256:')) return false;
  return (await hashPassword(plaintext)) === storedHash;
}
