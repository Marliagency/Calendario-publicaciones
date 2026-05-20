import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@qyro/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

/**
 * Workspace endpoints:
 *   GET  /workspaces                          → mis workspaces
 *   POST /workspaces                          → crear workspace
 *   GET  /workspaces/:slug                    → detalle (con mi rol)
 *   PATCH /workspaces/:slug                   → actualizar settings (ADMIN+)
 *   GET  /workspaces/:slug/api-keys           → listar API keys (ADMIN+)
 *   POST /workspaces/:slug/api-keys           → crear API key (ADMIN+)
 *   DELETE /workspaces/:slug/api-keys/:keyId  → revocar API key (ADMIN+)
 */
export default async function workspacesRoutes(app: FastifyInstance) {
  // ── Listar mis workspaces ─────────────────────────────────────────────────
  app.get('/workspaces', { preHandler: [app.requireUser] }, async (req) => {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user!.sub, acceptedAt: { not: null } },
      include: {
        workspace: {
          include: {
            _count: { select: { contentPieces: { where: { status: 'IN_REVIEW' } } } },
          },
        },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    const items = memberships.map((m) => ({
      id: m.workspace.id,
      slug: m.workspace.slug,
      name: m.workspace.name,
      description: m.workspace.description,
      brandColorPrimary: m.workspace.brandColorPrimary,
      brandColorSecondary: m.workspace.brandColorSecondary,
      brandLogoUrl: m.workspace.brandLogoUrl,
      status: m.workspace.status,
      role: m.role,
      inReviewCount: m.workspace._count.contentPieces,
      lastActiveAt: m.lastActiveAt,
    }));

    return { items };
  });

  // ── Crear workspace ───────────────────────────────────────────────────────
  const createSchema = z.object({
    name: z.string().min(1).max(80),
    slug: z
      .string()
      .min(2)
      .max(40)
      .regex(/^[a-z0-9-]+$/),
    description: z.string().max(300).optional(),
    brandColorPrimary: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    brandColorSecondary: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    defaultTimezone: z.string().optional(),
    dailyBoostCapEur: z.number().positive().max(100).optional(),
    monthlyBoostCapEur: z.number().positive().max(5000).optional(),
  });

  app.post('/workspaces', { preHandler: [app.requireUser] }, async (req, reply) => {
    const body = createSchema.parse(req.body);

    const slugExists = await prisma.workspace.findUnique({ where: { slug: body.slug } });
    if (slugExists) {
      reply.code(409);
      return { error: 'SLUG_TAKEN' };
    }

    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          slug: body.slug,
          name: body.name,
          description: body.description,
          brandColorPrimary: body.brandColorPrimary ?? '#3B82F6',
          brandColorSecondary: body.brandColorSecondary ?? '#7C5CFC',
          defaultTimezone: body.defaultTimezone ?? 'Europe/Madrid',
          dailyBoostCapEur: body.dailyBoostCapEur ?? 5,
          monthlyBoostCapEur: body.monthlyBoostCapEur ?? 150,
          createdByUserId: req.user!.sub,
        },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: ws.id, userId: req.user!.sub, role: 'OWNER', acceptedAt: new Date() },
      });
      return ws;
    });

    reply.code(201);
    return { workspace };
  });

  // ── Check slug disponible ─────────────────────────────────────────────────
  app.get('/workspaces/slug-check', { preHandler: [app.requireUser] }, async (req, reply) => {
    const { slug } = z.object({ slug: z.string().min(2).max(40) }).parse(req.query);
    const exists = await prisma.workspace.findUnique({ where: { slug } });
    reply.code(200);
    return { available: !exists };
  });

  // ── Detalle de workspace ──────────────────────────────────────────────────
  app.get(
    '/workspaces/:slug',
    { preHandler: [app.requireUser, app.requireWorkspaceMember()] },
    async (req) => {
      const workspace = await prisma.workspace.findUnique({
        where: { id: req.workspace!.id },
        include: {
          members: { include: { user: { select: { id: true, email: true, displayName: true } } } },
          _count: { select: { contentPieces: true, socialAccounts: true } },
        },
      });
      return { workspace, role: req.workspace!.role };
    },
  );

  // ── Actualizar workspace ──────────────────────────────────────────────────
  const patchSchema = z.object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(300).optional(),
    brandColorPrimary: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    brandColorSecondary: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    brandLogoUrl: z.string().url().nullable().optional(),
    defaultTimezone: z.string().optional(),
    defaultLanguage: z.string().optional(),
    dailyBoostCapEur: z.number().positive().max(100).optional(),
    monthlyBoostCapEur: z.number().positive().max(5000).optional(),
  });

  app.patch(
    '/workspaces/:slug',
    { preHandler: [app.requireUser, app.requireWorkspaceMember('ADMIN')] },
    async (req) => {
      const body = patchSchema.parse(req.body);
      const updated = await prisma.workspace.update({
        where: { id: req.workspace!.id },
        data: body,
      });
      return { workspace: updated };
    },
  );

  // ── API Keys ──────────────────────────────────────────────────────────────
  app.get(
    '/workspaces/:slug/api-keys',
    { preHandler: [app.requireUser, app.requireWorkspaceMember('ADMIN')] },
    async (req) => {
      const keys = await prisma.workspaceApiKey.findMany({
        where: { workspaceId: req.workspace!.id, revokedAt: null },
        select: { id: true, prefix: true, name: true, lastUsedAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      return { keys };
    },
  );

  app.post(
    '/workspaces/:slug/api-keys',
    { preHandler: [app.requireUser, app.requireWorkspaceMember('ADMIN')] },
    async (req, reply) => {
      const { name } = z.object({ name: z.string().min(1).max(80).default('Estudio Creativo') }).parse(req.body ?? {});
      const raw = `sk_ws_${randomBytes(18).toString('hex')}`;
      const prefix = raw.slice(0, 12);
      const keyHash = createHash('sha256').update(raw).digest('hex');

      const key = await prisma.workspaceApiKey.create({
        data: { workspaceId: req.workspace!.id, keyHash, prefix, name },
      });

      reply.code(201);
      // El `raw` se devuelve UNA SOLA VEZ. Nunca se puede recuperar.
      return { id: key.id, prefix: key.prefix, name: key.name, raw, createdAt: key.createdAt };
    },
  );

  app.delete(
    '/workspaces/:slug/api-keys/:keyId',
    { preHandler: [app.requireUser, app.requireWorkspaceMember('ADMIN')] },
    async (req, reply) => {
      const { keyId } = z.object({ keyId: z.string().min(1) }).parse(req.params);
      const key = await prisma.workspaceApiKey.findFirst({
        where: { id: keyId, workspaceId: req.workspace!.id },
      });
      if (!key) {
        reply.code(404);
        return { error: 'NOT_FOUND' };
      }
      await prisma.workspaceApiKey.update({
        where: { id: keyId },
        data: { revokedAt: new Date() },
      });
      return { ok: true };
    },
  );
}
