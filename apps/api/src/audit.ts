import { type Prisma, prisma } from '@qyro/db';

/**
 * Helper único para registrar cambios de estado en AuditLog.
 * Centralizado para evitar olvidar campos importantes y mantener formato consistente.
 */
export async function recordStatusChange(params: {
  contentPieceId: string;
  workspaceId: string;
  fromStatus: string | null;
  toStatus: string;
  actorUserId: string | null;
  comment?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      entityType: 'ContentPiece',
      entityId: params.contentPieceId,
      contentPieceId: params.contentPieceId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      actorUserId: params.actorUserId,
      comment: params.comment ?? null,
      metadataJson: (params.metadata ?? null) as unknown as Prisma.InputJsonValue,
    },
  });
}
