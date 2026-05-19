import { SignJWT, jwtVerify } from 'jose';
import { loadConfig } from '../config.js';

const config = loadConfig();
const ACCESS_SECRET = new TextEncoder().encode(config.JWT_ACCESS_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(config.JWT_REFRESH_SECRET);

export interface AccessTokenClaims {
  sub: string;
  email: string;
  isAdmin: boolean;
}

export async function signAccessToken(claims: AccessTokenClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('qyro-api')
    .setAudience('qyro-web')
    .setExpirationTime(config.JWT_ACCESS_TTL)
    .sign(ACCESS_SECRET);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET, {
    issuer: 'qyro-api',
    audience: 'qyro-web',
  });
  return {
    sub: payload.sub as string,
    email: payload.email as string,
    isAdmin: payload.isAdmin as boolean,
  };
}

export async function signRefreshToken(userId: string, jti: string): Promise<string> {
  return new SignJWT({ jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer('qyro-api')
    .setAudience('qyro-refresh')
    .setExpirationTime(config.JWT_REFRESH_TTL)
    .sign(REFRESH_SECRET);
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string; jti: string }> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET, {
    issuer: 'qyro-api',
    audience: 'qyro-refresh',
  });
  return { sub: payload.sub as string, jti: payload.jti as string };
}
