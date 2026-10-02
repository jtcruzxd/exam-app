/**
 * Lightweight password hashing using the Web Crypto API (Edge-compatible).
 * Uses PBKDF2-SHA256 with 100,000 iterations.
 * Format stored in DB: "pbkdf2:<iterations>:<hex-salt>:<hex-hash>"
 */

const ITERATIONS = 100_000;
const KEY_LENGTH = 32; // bytes

async function importKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await importKey(password);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    key,
    KEY_LENGTH * 8
  );
  const hashHex = Buffer.from(bits).toString('hex');
  const saltHex = Buffer.from(salt).toString('hex');
  return `pbkdf2:${ITERATIONS}:${saltHex}:${hashHex}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], 'hex');
  const expectedHash = parts[3];

  const key = await importKey(password);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    KEY_LENGTH * 8
  );
  const hashHex = Buffer.from(bits).toString('hex');
  return hashHex === expectedHash;
}
