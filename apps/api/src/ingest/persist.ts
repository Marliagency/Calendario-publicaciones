import { type ContentPiece, type PlatformVariant, type Prisma, prisma } from '@qyro/db';
import type { IngestPayload, PlatformVariantKind } from '@qyro/shared';
import { notificationBus } from '../notifications/bus.js';
import { type ValidationIssue, inferMediaType } from './validate.js';

const PLATFORM_KINDS: PlatformVariantKind[] = [
  'tiktok',
  'instagram_reel',
  'instagram_feed',
  'instagram_story',
  'facebook_feed',
  'facebook_reel',
];

export interface PersistResult {
  contentPiece: ContentPiece & { variants: PlatformVariant[] };
  duplicated: boolean;
}

/**
 * Persiste el payload de ingest:
 *   - Si ya existe `ContentPiece` con ese `external_ref`, devuelve el existente sin
 *     duplicar (idempotencia §5 del brief).
 *   - Si no existe, crea `ContentPiece` + `PlatformVariant`s en una transacción.
 *   - Estado inicial: `IN_REVIEW` (el estudio ya hizo su QC interno; falta el humano).
 *   - Si trae `suggested_schedule`, lo guarda en cada variante (pero la pieza sigue
 *     en `IN_REVIEW` hasta aprobación).
 *   - Persiste warnings en `qcChecklistJson` para la UI de QC.
 *   - Loguea el cambio de estado en `AuditLog`.
 *   - Emite evento `content-piece.ingested` al bus de notificaciones.
 */
export async function persistIngest(
  payload: IngestPayload,
  warnings: ValidationIssue[],
): Promise<PersistResult> {
  const existing = await prisma.contentPiece.findUnique({
    where: { externalRef: payload.external_ref },
    include: { variants: true },
  });
  if (existing) {
    return { contentPiece: existing, duplicated: true };
  }

  const variantsData = buildVariantsData(payload);
  if (variantsData.length === 0) {
    throw new Error('persistIngest: payload sin variantes (ya debió bloquear validación)');
  }

  const piece = await prisma.$transaction(async (tx) => {
    const created = await tx.contentPiece.create({
      data: {
        externalRef: payload.external_ref,
        title: payload.title,
        format: payload.format,
        status: 'IN_REVIEW',
        campaignId: payload.campaign_id ?? null,
        conceptId: payload.concept_id ?? null,
        frameworkUsed: payload.framework_used ?? null,
        hookUsed: payload.hook_used ?? null,
        qcChecklistJson: { warnings } as unknown as Prisma.InputJsonValue,
        creativeRunMetadata: (payload.creative_run_metadata ??
          null) as unknown as Prisma.InputJsonValue,
        createdBy: 'estudio-creativo',
        buyerPersonas:
          payload.buyer_persona_ids.length > 0
            ? {
                create: payload.buyer_persona_ids.map((id) => ({ buyerPersonaId: id })),
              }
            : undefined,
        variants: { create: variantsData },
      },
      include: { variants: true },
    });

    await tx.auditLog.create({
      data: {
        entityType: 'ContentPiece',
        entityId: created.id,
        contentPieceId: created.id,
        fromStatus: null,
        toStatus: 'IN_REVIEW',
        actorUserId: null,
        comment: 'Ingest desde Estudio Creativo',
        metadataJson: { external_ref: payload.external_ref } as unknown as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  await notificationBus.emitEvent({
    kind: 'content-piece.ingested',
    data: {
      contentPieceId: piece.id,
      externalRef: payload.external_ref,
      title: payload.title,
      format: payload.format,
      previewMediaUrl: piece.variants[0]?.mediaUrl ?? null,
      suggestedSchedule: payload.suggested_schedule
        ? (payload.suggested_schedule as Record<string, string | undefined>)
        : null,
    },
  });

  return { contentPiece: piece, duplicated: false };
}

function buildVariantsData(
  payload: IngestPayload,
): Prisma.PlatformVariantCreateWithoutContentPieceInput[] {
  const out: Prisma.PlatformVariantCreateWithoutContentPieceInput[] = [];
  for (const kind of PLATFORM_KINDS) {
    const v = payload.platform_variants[kind];
    if (!v) continue;
    const scheduledIso = payload.suggested_schedule?.[kind];
    out.push({
      kind,
      mediaUrl: v.media_url,
      mediaType: inferMediaType(v),
      ratio: v.ratio,
      durationS: v.duration_s ?? null,
      caption: v.caption ?? null,
      hashtags: v.hashtags ?? [],
      firstComment: v.first_comment ?? null,
      musicRef: v.music_ref ?? null,
      scheduledAt: scheduledIso ? new Date(scheduledIso) : null,
    });
  }
  return out;
}
