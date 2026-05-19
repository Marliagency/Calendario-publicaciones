import { PLATFORM_LIMITS, type PlatformVariantKind, VARIANT_TO_PLATFORM } from '@qyro/shared';

/**
 * Evaluadores automáticos de reglas QC.
 *
 * 4 reglas son auto-evaluables (las que aplican límites técnicos verificables).
 * Las otras 4 (HOOK_IN_3S, CTA_PRESENT, MUSIC_LICENSE, THUMBNAIL_TEXT_READABLE)
 * requieren juicio humano y la UI muestra checkboxes manuales.
 */

export type QCIssueSeverity = 'BLOCKER' | 'WARNING' | 'INFO';

export interface QCIssue {
  ruleId: string;
  ruleType: string;
  severity: QCIssueSeverity;
  platform: PlatformVariantKind | null;
  message: string;
}

export interface VariantSnapshot {
  kind: PlatformVariantKind;
  ratio: string;
  durationS: number | null;
  caption: string | null;
  hashtags: string[];
  musicRef: string | null;
}

export interface QCRuleSnapshot {
  id: string;
  ruleType: string;
  severity: QCIssueSeverity;
  enabled: boolean;
}

/**
 * Ejecuta las reglas automáticas sobre el conjunto de variantes de una pieza.
 * Las reglas manuales se devuelven con `severity: INFO` para que la UI las
 * muestre como checkboxes humanos.
 */
export function evaluateAutomaticRules(
  rules: QCRuleSnapshot[],
  variants: VariantSnapshot[],
): QCIssue[] {
  const issues: QCIssue[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    switch (rule.ruleType) {
      case 'PLATFORM_RATIO':
        for (const v of variants) {
          const allowed = PLATFORM_LIMITS[v.kind].ratios;
          if (!allowed.includes(v.ratio as never)) {
            issues.push({
              ruleId: rule.id,
              ruleType: rule.ruleType,
              severity: rule.severity,
              platform: v.kind,
              message: `Ratio ${v.ratio} no soportado en ${v.kind}. Permitidos: ${allowed.join(', ')}.`,
            });
          }
        }
        break;

      case 'PLATFORM_DURATION':
        for (const v of variants) {
          const limits = PLATFORM_LIMITS[v.kind].durationSec;
          if (!limits) continue;
          if (v.durationS === null) {
            issues.push({
              ruleId: rule.id,
              ruleType: rule.ruleType,
              severity: rule.severity,
              platform: v.kind,
              message: `Falta duración para ${v.kind} (rango ${limits.min}-${limits.max}s).`,
            });
          } else if (v.durationS < limits.min || v.durationS > limits.max) {
            issues.push({
              ruleId: rule.id,
              ruleType: rule.ruleType,
              severity: rule.severity,
              platform: v.kind,
              message: `${v.durationS}s fuera del rango ${limits.min}-${limits.max}s en ${v.kind}.`,
            });
          }
        }
        break;

      case 'HASHTAG_LIMIT':
        for (const v of variants) {
          const max = PLATFORM_LIMITS[v.kind].hashtagMax;
          const recommended = PLATFORM_LIMITS[v.kind].hashtagRecommended;
          const count = v.hashtags.length;
          if (count > max) {
            issues.push({
              ruleId: rule.id,
              ruleType: rule.ruleType,
              severity: 'BLOCKER',
              platform: v.kind,
              message: `${count} hashtags supera el máximo ${max} de ${v.kind}.`,
            });
          } else if (count > recommended) {
            issues.push({
              ruleId: rule.id,
              ruleType: rule.ruleType,
              severity: 'WARNING',
              platform: v.kind,
              message: `${count} hashtags supera el recomendado ${recommended} en ${v.kind}.`,
            });
          }
        }
        break;

      case 'MUSIC_LICENSE':
        // Auto-warning si hay música declarada y plataforma=TikTok.
        // (Comprobación real requiere catálogo de pistas comerciales; aquí avisamos.)
        for (const v of variants) {
          if (VARIANT_TO_PLATFORM[v.kind] === 'tiktok' && v.musicRef) {
            issues.push({
              ruleId: rule.id,
              ruleType: rule.ruleType,
              severity: 'WARNING',
              platform: v.kind,
              message: `TikTok: verifica manualmente que "${v.musicRef}" está en la biblioteca comercial.`,
            });
          }
        }
        break;

      // Reglas manuales: la UI las muestra como checkboxes. No emitimos issues automáticos.
      case 'HOOK_IN_3S':
      case 'CTA_PRESENT':
      case 'THUMBNAIL_TEXT_READABLE':
      case 'CAPTION_TYPOS':
        break;

      default:
        break;
    }
  }

  return issues;
}

export function hasBlockers(issues: QCIssue[]): boolean {
  return issues.some((i) => i.severity === 'BLOCKER');
}
