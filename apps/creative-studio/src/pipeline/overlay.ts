import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../logger.js';

/**
 * Branding overlay: cubre la zona donde los generadores (Higgsfield) ponen
 * watermark, y firma con el logo QYRO en posición canónica por plataforma.
 *
 * Implementación real (futura, requiere ffmpeg + isotipo SVG con degradado):
 *
 *   ffmpeg -i input.mp4 -i qyro-watermark-cover.png \
 *     -filter_complex "[0:v][1:v]overlay=W-w-20:H-h-20:format=auto" \
 *     -c:a copy output.mp4
 *
 * Hoy: identity (copia el fichero) y devuelve metadata describiendo lo que
 * el overlay habría hecho. Esto permite ejecutar el pipeline completo y
 * verificar el contrato sin ffmpeg ni los assets oficiales.
 */

export type PlatformOverlayPosition = 'bottom-right-default' | 'tiktok-raised' | 'reel-raised';

export interface OverlayRequest {
  inputPath: string;
  outputPath: string;
  /** Plataforma de destino para ajustar safe zone. */
  platform:
    | 'tiktok'
    | 'instagram_reel'
    | 'instagram_feed'
    | 'instagram_story'
    | 'facebook_feed'
    | 'facebook_reel';
  dryRun: boolean;
}

export interface OverlayResult {
  outputPath: string;
  applied: boolean;
  position: PlatformOverlayPosition;
  dryRun: boolean;
  /** Razón si applied=false. */
  note?: string;
}

const POSITION_BY_PLATFORM: Record<OverlayRequest['platform'], PlatformOverlayPosition> = {
  tiktok: 'tiktok-raised',
  instagram_reel: 'reel-raised',
  facebook_reel: 'reel-raised',
  instagram_feed: 'bottom-right-default',
  instagram_story: 'tiktok-raised',
  facebook_feed: 'bottom-right-default',
};

export class BrandingOverlay {
  async apply(req: OverlayRequest): Promise<OverlayResult> {
    const position = POSITION_BY_PLATFORM[req.platform];
    await mkdir(path.dirname(req.outputPath), { recursive: true });

    if (req.dryRun) {
      await copyFile(req.inputPath, req.outputPath);
      logger.info(
        { input: req.inputPath, output: req.outputPath, platform: req.platform, position },
        'overlay dry-run: identity copy',
      );
      return {
        outputPath: req.outputPath,
        applied: false,
        position,
        dryRun: true,
        note: 'dry-run: overlay no aplicado, fichero copiado tal cual',
      };
    }

    // TODO real: spawn ffmpeg con el filtro overlay y el PNG del isotipo QYRO.
    // Requiere:
    //   1. apps/creative-studio/assets/qyro-isotype-gradient.svg → PNG renderizado.
    //   2. ffmpeg en PATH.
    // Hasta entonces, en producción esto debe lanzar para evitar publicar
    // creatividades con watermark de Higgsfield expuesto.
    throw new Error(
      'BrandingOverlay.apply real mode no implementado: requiere ffmpeg + isotipo PNG. Usa dryRun=true por ahora.',
    );
  }
}
