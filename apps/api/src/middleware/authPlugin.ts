import { createHash } from 'node:crypto';
import { type WorkspaceRole, prisma } from '@qyro/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { type AccessTokenClaims, verifyAccessToken } from '../auth/jwt.js';

interface WorkspaceCtx {
  id: string;
  slug: string;
  name: string;
  role: WorkspaceRole | 'service';
  brandColorPrimary: string;
  dailyBoostCapEur: number;
  monthlyBoostCapEur: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AccessTokenClaims;
    workspace?: WorkspaceCtx;
  }
  interface FastifyInstance {
    requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireWorkspaceMember: (
      minRole?: WorkspaceRole,
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireWorkspaceApiKey: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const ROLE_RANK: Record<WorkspaceRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

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

  app.decorate(
    'requireWorkspaceMember',
    (minRole: WorkspaceRole = 'VIEWER') =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.user) {
          reply.code(401);
          throw new Error('UNAUTHENTICATED');
        }
        const slug =
          (req.headers['x-workspace-slug'] as string | undefined) ??
          (req.query as Record<string, string>)['ws'];
        if (!slug) {
          reply.code(400);
          throw new Error('MISSING_WORKSPACE');
        }

        const membership = await prisma.workspaceMember.findFirst({
          where: {
            workspace: { slug },
            userId: req.user.sub,
            acceptedAt: { not: null },
          },
          include: { workspace: true },
        });

        if (!membership) {
          reply.code(403);
          throw new Error('NOT_A_MEMBER');
        }

        if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
          reply.code(403);
          throw new Error('INSUFFICIENT_ROLE');
        }

        await prisma.workspaceMember.update({
          where: { id: membership.id },
          data: { lastActiveAt: new Date() },
        });

        req.workspace = {
          id: membership.workspaceId,
          slug: membership.workspace.slug,
          name: membership.workspace.name,
          role: membership.role,
          brandColorPrimary: membership.workspace.brandColorPrimary,
          dailyBoostCapEur: Number(membership.workspace.dailyBoostCapEur),
          monthlyBoostCapEur: Number(membership.workspace.monthlyBoostCapEur),
        };
      },
  );

  // Para el ingest del Estudio Creativo: autenticación por API key de workspace.
  app.decorate('requireWorkspaceApiKey', async (req: FastifyRequest, reply: FastifyReply) => {
    const raw = req.headers['x-service-api-key'];
    if (!raw || typeof raw !== 'string') {
      reply.code(401);
      throw new Error('UNAUTHENTICATED');
    }
    const keyHash = createHash('sha256').update(raw).digest('hex');
    const apiKey = await prisma.workspaceApiKey.findUnique({
      where: { keyHash },
      include: { workspace: true },
    });
    if (!apiKey || apiKey.revokedAt) {
      reply.code(401);
      throw new Error('INVALID_API_KEY');
    }
    await prisma.workspaceApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });
    req.workspace = {
      id: apiKey.workspaceId,
      slug: apiKey.workspace.slug,
      name: apiKey.workspace.name,
      role: 'service',
      brandColorPrimary: apiKey.workspace.brandColorPrimary,
      dailyBoostCapEur: Number(apiKey.workspace.dailyBoostCapEur),
      monthlyBoostCapEur: Number(apiKey.workspace.monthlyBoostCapEur),
    };
  });
});
