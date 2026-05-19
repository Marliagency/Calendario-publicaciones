import { PLATFORM_LIMITS, type PlatformVariantKind } from '@qyro/shared';
import type { IngestPayload, PlatformVariantPayload } from '@qyro/shared';

export type ValidationSeverity = 'blocker' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  platform: PlatformVariantKind;
  code: string;
  message: string;
}

const PLATFORM_KINDS: PlatformVariantKind[] = [
  'tiktok',
  'instagram_reel',
  'instagram_feed',
  'instagram_story',
  'facebook_feed',
  'facebook_reel',
];

/**
 * Valida un payload de ingest contra los límites de cada plataforma.
 *
 * Devuelve issues clasificados:
 *   - `blocker` impide el ingest (HTTP 400 si hay alguno).
 *   - `warning` se persiste como aviso pero no impide el ingest.
 */
export function validateIngestPayload(payload: IngestPayload): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const variants = payload.platform_variants;
  const presentKinds = PLATFORM_KINDS.filter((k) => variants[k] !== undefined);

  if (presentKinds.length === 0) {
    issues.push({
      severity: 'blocker',
      platform: 'tiktok',
      code: 'NO_VARIANTS',
      message: 'El payload no contiene ninguna variante de plataforma.',
    });
    return issues;
  }

  for (const kind of presentKinds) {
    const variant = variants[kind];
    if (!variant) continue;
    issues.push(...validateVariant(kind, variant));
  }

  return issues;
}

function validateVariant(
  kind: PlatformVariantKind,
  variant: PlatformVariantPayload,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const limits = PLATFORM_LIMITS[kind];

  if (!limits.ratios.includes(variant.ratio)) {
    issues.push({
      severity: 'blocker',
      platform: kind,
      code: 'INVALID_RATIO',
      message: `Ratio ${variant.ratio} no soportado en ${kind}. Permitidos: ${limits.ratios.join(', ')}.`,
    });
  }

  if (limits.durationSec) {
    if (variant.duration_s === undefined) {
      issues.push({
        severity: 'blocker',
        platform: kind,
        code: 'DURATION_REQUIRED',
        message: `${kind} requiere duration_s entre ${limits.durationSec.min}-${limits.durationSec.max}s.`,
      });
    } else if (
      variant.duration_s < limits.durationSec.min ||
      variant.duration_s > limits.durationSec.max
    ) {
      issues.push({
        severity: 'blocker',
        platform: kind,
        code: 'DURATION_OUT_OF_RANGE',
        message: `${variant.duration_s}s fuera del rango ${limits.durationSec.min}-${limits.durationSec.max}s en ${kind}.`,
      });
    }
  }

  const captionLength = variant.caption?.length ?? 0;
  if (captionLength > limits.captionMaxChars) {
    issues.push({
      severity: 'blocker',
      platform: kind,
      code: 'CAPTION_TOO_LONG',
      message: `Caption de ${captionLength} chars supera el máximo ${limits.captionMaxChars} de ${kind}.`,
    });
  }

  const hashtagCount = variant.hashtags?.length ?? 0;
  if (hashtagCount > limits.hashtagMax) {
    issues.push({
      severity: 'blocker',
      platform: kind,
      code: 'TOO_MANY_HASHTAGS',
      message: `${hashtagCount} hashtags supera el máximo ${limits.hashtagMax} de ${kind}.`,
    });
  } else if (hashtagCount > limits.hashtagRecommended) {
    issues.push({
      severity: 'warning',
      platform: kind,
      code: 'HASHTAGS_OVER_RECOMMENDED',
      message: `${hashtagCount} hashtags supera el recomendado ${limits.hashtagRecommended} para ${kind}.`,
    });
  }

  return issues;
}

export function hasBlockers(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'blocker');
}

/** Deriva `MediaType` desde la variante: si trae duration_s es vídeo, si no imagen. */
export function inferMediaType(variant: PlatformVariantPayload): 'image' | 'video' {
  return variant.duration_s !== undefined ? 'video' : 'image';
}
