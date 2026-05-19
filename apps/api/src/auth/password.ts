import { hash, verify } from 'argon2';

/** argon2id con parámetros razonables. Coste ajustable si latencia molesta. */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain, { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  return verify(hashed, plain);
}
