/**
 * Anonymous player credentials. A secret is 120 random bits; the database keeps only its SHA-256,
 * so a leaked database can't be used to load anyone's saves. A slow hash (scrypt) isn't needed
 * because the secret is random, not a password a person chose.
 */
import { createHash, randomBytes } from 'node:crypto';
import { SECRET_BYTES, encodeSecret, parsePlayerCode } from '@app/save/protocol';

/** A new player secret. */
export function newSecret(): string {
  return encodeSecret(randomBytes(SECRET_BYTES));
}

/** What the database stores for a secret. */
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

/** The secret in an `Authorization: Bearer …` header (a raw secret or a player code), or null. */
export function bearerSecret(header: string | undefined): string | null {
  const m = /^Bearer\s+(\S.*)$/i.exec(header ?? '');
  return m ? parsePlayerCode(m[1]!) : null;
}
