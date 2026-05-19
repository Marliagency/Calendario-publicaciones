import { PLATFORM_LIMITS, type PlatformVariantKind, type Ratio } from '@qyro/shared';

/**
 * Adapta una pieza producida a las variantes por plataforma.
 *
 * Reglas (§7.2 del brief):
 *   - Cada plataforma recibe ratio nativo si es compatible; si no, omitida
 *     (el caller decide regenerar con ratio nativo).
 *   - Caption se reescribe por plataforma desde un brief de copy + reglas.
 *   - Hashtags se podan al máximo permitido.
 *   - Duración: si la producción supera el max de la plataforma, omitida.
 */

export interface VariantSourceMedia {
  url: string;
  /** Ratio del fichero subido. Si no coincide con el ratio nativo de la
   *  plataforma y la plataforma sólo soporta un ratio, la variante se omite. */
  ratio: Ratio;
  /** Para vídeo. Undefined para imagen. */
  durationS?: number;
}

export interface PlatformCopy {
  caption: string;
  hashtags: string[];
  firstComment?: string;
  musicRef?: string;
}

export interface VariantsRequest {
  source: VariantSourceMedia;
  targets: PlatformVariantKind[];
  /** Copy por plataforma. Si una plataforma no tiene entrada, se usa fallback. */
  copyByPlatform: Partial<Record<PlatformVariantKind, PlatformCopy>>;
  fallbackCopy: PlatformCopy;
}

export interface PlatformVariantBuild {
  kind: PlatformVariantKind;
  media_url: string;
  ratio: Ratio;
  duration_s?: number;
  caption?: string;
  hashtags: string[];
  first_comment?: string;
  music_ref?: string;
}

export interface VariantsResult {
  built: PlatformVariantBuild[];
  skipped: Array<{ kind: PlatformVariantKind; reason: string }>;
}

export function buildPlatformVariants(req: VariantsRequest): VariantsResult {
  const built: PlatformVariantBuild[] = [];
  const skipped: VariantsResult['skipped'] = [];

  for (const kind of req.targets) {
    const limits = PLATFORM_LIMITS[kind];

    if (!limits.ratios.includes(req.source.ratio)) {
      skipped.push({
        kind,
        reason: `Ratio ${req.source.ratio} no soportado en ${kind} (permitidos: ${limits.ratios.join(', ')}).`,
      });
      continue;
    }

    if (limits.durationSec && req.source.durationS !== undefined) {
      if (
        req.source.durationS < limits.durationSec.min ||
        req.source.durationS > limits.durationSec.max
      ) {
        skipped.push({
          kind,
          reason: `Duración ${req.source.durationS}s fuera de ${limits.durationSec.min}-${limits.durationSec.max}s para ${kind}.`,
        });
        continue;
      }
    }

    const copy = req.copyByPlatform[kind] ?? req.fallbackCopy;
    const caption = capCaption(copy.caption, limits.captionMaxChars);
    const hashtags = copy.hashtags.slice(0, limits.hashtagMax);

    built.push({
      kind,
      media_url: req.source.url,
      ratio: req.source.ratio,
      duration_s: req.source.durationS,
      caption,
      hashtags,
      first_comment: copy.firstComment,
      music_ref: copy.musicRef,
    });
  }

  return { built, skipped };
}

function capCaption(caption: string, maxChars: number): string {
  if (caption.length <= maxChars) return caption;
  return `${caption.slice(0, maxChars - 1)}…`;
}
