import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { type AccessTokenClaims, verifyAccessToken } from '../auth/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AccessTokenClaims;
  }
  interface FastifyInstance {
    requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireServiceKey: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async function authPlugin(app: FastifyInstance) {
  app.decorate('requireUser', async (req: FastifyRequest, reply: FastifyReply) => {
    const token =
      req.cookies?.access_token ?? req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      reply.code(401);
      throw new Error('UNAUTHENTICATED');
    }
    try {
      req.user = await verifyAccessToken(token);
    } catch {
      reply.code(401);
      throw new Error('UNAUTHENTICATED');
    }
  });

  app.decorate('requireServiceKey', async (req: FastifyRequest, reply: FastifyReply) => {
    const provided = req.headers['x-service-api-key'];
    const expected = process.env.INGEST_SERVICE_API_KEY ?? '';
    if (!provided || typeof provided !== 'string') {
      reply.code(401);
      throw new Error('UNAUTHENTICATED');
    }
    // timing-safe comparison
    if (provided.length !== expected.length) {
      reply.code(401);
      throw new Error('UNAUTHENTICATED');
    }
    let mismatch = 0;
    for (let i = 0; i < provided.length; i++) {
      mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    if (mismatch !== 0) {
      reply.code(401);
      throw new Error('UNAUTHENTICATED');
    }
  });
});
