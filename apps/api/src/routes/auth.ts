import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '@qyro/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/jwt.js';
import { verifyPassword } from '../auth/password.js';
import { loadConfig } from '../config.js';

const config = loadConfig();
const REFRESH_COOKIE = 'refresh_token';
const ACCESS_COOKIE = 'access_token';

function hashRefresh(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

export default async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (req, reply) => {
    const body = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(user.passwordHash, body.password))) {
      reply.code(401);
      return { error: 'INVALID_CREDENTIALS' };
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    });
    const jti = randomUUID();
    const refreshToken = await signRefreshToken(user.id, jti);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefresh(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    reply
      .setCookie(ACCESS_COOKIE, accessToken, cookieOptions())
      .setCookie(REFRESH_COOKIE, refreshToken, cookieOptions());
    return { user: { id: user.id, email: user.email, displayName: user.displayName } };
  });

  app.post('/refresh', async (req, reply) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      reply.code(401);
      return { error: 'NO_REFRESH_TOKEN' };
    }

    let claims: { sub: string; jti: string };
    try {
      claims = await verifyRefreshToken(token);
    } catch {
      reply.code(401);
      return { error: 'INVALID_REFRESH_TOKEN' };
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefresh(token) },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      reply.code(401);
      return { error: 'REFRESH_TOKEN_REVOKED' };
    }

    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user) {
      reply.code(401);
      return { error: 'USER_NOT_FOUND' };
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    });
    reply.setCookie(ACCESS_COOKIE, accessToken, cookieOptions());
    return { ok: true };
  });

  app.post('/logout', async (req, reply) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) {
      await prisma.refreshToken
        .updateMany({
          where: { tokenHash: hashRefresh(token), revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => undefined);
    }
    reply.clearCookie(ACCESS_COOKIE, { path: '/' }).clearCookie(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/me', { preHandler: [app.requireUser] }, async (req) => {
    return { user: req.user };
  });
}
