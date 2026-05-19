import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM para cifrar tokens long-lived de IG/FB/TT en reposo.
 *
 * Formato del ciphertext serializado: base64(iv | tag | data).
 * IV 12 bytes, tag 16 bytes (GCM estándar).
 *
 * La clave maestra (32 bytes hex) vive en `TOKEN_ENCRYPTION_KEY`.
 */

const IV_LEN = 12;
const TAG_LEN = 16;
const ALGO = 'aes-256-gcm';

function keyBytes(keyHex: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error('TOKEN_ENCRYPTION_KEY inválida (debe ser 32 bytes hex)');
  }
  return Buffer.from(keyHex, 'hex');
}

export function encryptToken(plaintext: string, keyHex: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, keyBytes(keyHex), iv);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, data]).toString('base64');
}

export function decryptToken(serialized: string, keyHex: string): string {
  const buf = Buffer.from(serialized, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, keyBytes(keyHex), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
