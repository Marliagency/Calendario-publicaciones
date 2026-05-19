import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { IngestPayload, PlatformVariantKind, Ratio } from '@qyro/shared';
import type { PersonaId } from '../brain/personas/index.js';
import type {
  IngestResult,
  SocialCalendarClient,
} from '../clients/social-calendar.js';
import { logger } from '../logger.js';
import type { ProducerRegistry } from '../producers/registry.js';
import type { CreativeFormat } from '../router/model-router.js';
import { BrandingOverlay } from './overlay.js';
import type { Storage } from './storage.js';
import { buildPlatformVariants, type PlatformCopy } from './variants.js';

/**
 * Orquestador del pipeline brief → ingest. Cierra el bucle:
 *
 *   brief
 *     → ProducerRegistry.routeAndProduce
 *     → BrandingOverlay (uno por variante de plataforma)
 *     → Storage.upload
 *     → buildPlatformVariants
 *     → SocialCalendarClient.ingest
 *     → CreativeRun
 *
 * En STUDIO_DRY_RUN todo el pipeline corre: producer placeholder,
 * overlay identity, storage file:// (o fake https si el calendario
 * rechaza file://), ingest real contra el server del calendario.
 *
 * Esto permite que el contrato funcione end-to-end SIN Higgsfield,
 * SIN ffmpeg, SIN bucket. La única cosa que cambia al pasar a real
 * es flip a STUDIO_DRY_RUN=false y aprovisionar las dependencias.
 */

export interface Brief {
  format: CreativeFormat;
  /** Prompt (Higgsfield) o ruta a template (HyperFrames). */
  spec: string;
  /** Título humano legible. */
  title: string;
  buyerPersonaIds: PersonaId[];
  /** Plataformas objetivo. La pieza se adapta a estas. */
  targetPlatforms: PlatformVariantKind[];
  /** Copy por plataforma (caption/hashtags/etc). Si falta una, usa fallback. */
  copyByPlatform: Partial<Record<PlatformVariantKind, PlatformCopy>>;
  fallbackCopy: PlatformCopy;
  /** Ratio del fichero generado. Por defecto 9:16 (el más común). */
  ratio?: Ratio;
  /** Duración en segundos (vídeo). */
  durationS?: number;
  /** Permite premium en lifestyle_video. */
  allowPremium?: boolean;
  /** Opcionales que se persisten en ContentPiece. */
  campaignId?: string;
  conceptId?: string;
  frameworkUsed?: string;
  hookUsed?: string;
}

export interface CreativeRun {
  /** UUID v4 = external_ref del ingest. */
  externalRef: string;
  brief: Brief;
  decision: { tool: string; model: string; estimatedCost: number; rationale: string };
  production: {
    mediaPath: string;
    mediaType: 'image' | 'video';
    creditsSpent: number;
    dryRun: boolean;
  };
  overlay: { applied: boolean; dryRun: boolean };
  storage: { url: string };
  variants: { built: PlatformVariantKind[]; skipped: Array<{ kind: PlatformVariantKind; reason: string }> };
  ingest: IngestResult;
  startedAt: string;
  finishedAt: string;
}

export interface OrchestratorDeps {
  registry: ProducerRegistry;
  storage: Storage;
  overlay: BrandingOverlay;
  client: SocialCalendarClient;
  /** Workdir para overlay output antes del upload. */
  overlayWorkDir: string;
  /** Si el pipeline es dry-run (afecta overlay; el producer y registry tienen su propio dryRun). */
  dryRun: boolean;
}

export class PipelineOrchestrator {
  constructor(private readonly deps: OrchestratorDeps) {}

  async run(brief: Brief): Promise<CreativeRun> {
    const externalRef = randomUUID();
    const startedAt = new Date().toISOString();
    logger.info({ externalRef, format: brief.format }, 'pipeline arrancando');

    // 1) Routear + producir
    const { decision, result: production } = await this.deps.registry.routeAndProduce(
      { format: brief.format, allowPremium: brief.allowPremium },
      {
        spec: brief.spec,
        externalRef,
        durationS: brief.durationS,
        ratio: brief.ratio,
      },
    );

    // 2) Overlay (una vez — usamos la primera plataforma como ref de safe zone;
    //    para producción multi-platform-overlay habría que generar uno por kind).
    const primaryPlatform = brief.targetPlatforms[0] ?? 'tiktok';
    const overlayOutPath = path.join(
      this.deps.overlayWorkDir,
      `${externalRef}-overlay${path.extname(production.mediaPath) || '.bin'}`,
    );
    const overlay = await this.deps.overlay.apply({
      inputPath: production.mediaPath,
      outputPath: overlayOutPath,
      platform: primaryPlatform,
      dryRun: this.deps.dryRun,
    });

    // 3) Storage
    const url = await this.deps.storage.upload(
      overlay.outputPath,
      `${externalRef}${path.extname(overlay.outputPath) || ''}`,
    );

    // 4) Adaptar a variantes
    const ratio = brief.ratio ?? '9:16';
    const { built, skipped } = buildPlatformVariants({
      source: { url, ratio, durationS: brief.durationS },
      targets: brief.targetPlatforms,
      copyByPlatform: brief.copyByPlatform,
      fallbackCopy: brief.fallbackCopy,
    });

    if (built.length === 0) {
      throw new Error(
        `Pipeline: ninguna variante construida. Razones: ${skipped.map((s) => `${s.kind}: ${s.reason}`).join('; ')}`,
      );
    }

    // 5) Construir payload de ingest
    const platform_variants: IngestPayload['platform_variants'] = {};
    for (const v of built) {
      platform_variants[v.kind] = {
        media_url: v.media_url,
        ratio: v.ratio,
        duration_s: v.duration_s,
        caption: v.caption,
        hashtags: v.hashtags,
        first_comment: v.first_comment,
        music_ref: v.music_ref,
      };
    }

    const payload: IngestPayload = {
      external_ref: externalRef,
      title: brief.title,
      format: this.mapCreativeFormatToContentFormat(brief.format, production.mediaType),
      buyer_persona_ids: brief.buyerPersonaIds,
      campaign_id: brief.campaignId,
      concept_id: brief.conceptId,
      framework_used: brief.frameworkUsed,
      hook_used: brief.hookUsed,
      platform_variants,
      creative_run_metadata: {
        decision,
        production: {
          mediaPath: production.mediaPath,
          creditsSpent: production.creditsSpent,
          dryRun: production.dryRun,
        },
        overlay: { applied: overlay.applied, dryRun: overlay.dryRun, position: overlay.position },
        skipped,
      },
    };

    // 6) Ingest
    const ingest = await this.deps.client.ingest(payload);
    const finishedAt = new Date().toISOString();

    const run: CreativeRun = {
      externalRef,
      brief,
      decision: {
        tool: decision.tool,
        model: decision.model,
        estimatedCost: decision.estimatedCost,
        rationale: decision.rationale,
      },
      production: {
        mediaPath: production.mediaPath,
        mediaType: production.mediaType,
        creditsSpent: production.creditsSpent,
        dryRun: production.dryRun,
      },
      overlay: { applied: overlay.applied, dryRun: overlay.dryRun },
      storage: { url },
      variants: { built: built.map((b) => b.kind), skipped },
      ingest,
      startedAt,
      finishedAt,
    };

    logger.info(
      {
        externalRef,
        ingestOutcome: ingest.outcome,
        variantsBuilt: built.length,
        variantsSkipped: skipped.length,
      },
      'pipeline completo',
    );
    return run;
  }

  /**
   * Mapea el CreativeFormat (interno) al ContentFormat del calendario.
   * El calendario solo acepta: image | carousel | reel | ugc_video | app_demo | lifestyle_ad.
   */
  private mapCreativeFormatToContentFormat(
    format: CreativeFormat,
    mediaType: 'image' | 'video',
  ): IngestPayload['format'] {
    if (format === 'app_demo') return 'app_demo';
    if (format === 'lifestyle_video') return 'lifestyle_ad';
    if (format === 'ugc_video_talking_head' || format === 'ugc_video_dynamic') return 'ugc_video';
    if (mediaType === 'image') return 'image';
    return 'reel';
  }
}
