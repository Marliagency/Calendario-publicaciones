/**
 * Límites técnicos por plataforma/variante.
 *
 * Estos valores son la verdad usada tanto por la validación on-ingest del API como
 * por la UI de QC y por los adaptadores antes de invocar la API real.
 *
 * Si una plataforma cambia un límite, se cambia aquí y se propaga.
 */

import type { PlatformVariantKind } from './platforms.js';

export type Ratio = '1:1' | '4:5' | '9:16' | '16:9';

export interface PlatformVariantLimits {
  /** Ratios soportados por esta variante. */
  ratios: Ratio[];
  /** Si es vídeo: duración mínima y máxima en segundos. `null` si no aplica. */
  durationSec: { min: number; max: number } | null;
  /** Longitud máxima del caption/descripción. */
  captionMaxChars: number;
  /** Máximo de hashtags. */
  hashtagMax: number;
  /** Hashtags recomendados (para warning, no blocker). */
  hashtagRecommended: number;
  /** ¿Acepta carrusel multi-imagen? */
  supportsCarousel: boolean;
  /** Tamaño máximo del fichero en MB. */
  maxFileSizeMb: number;
}

export const PLATFORM_LIMITS: Record<PlatformVariantKind, PlatformVariantLimits> = {
  // Fuentes:
  //   IG/FB → developers.facebook.com/docs/instagram-platform/content-publishing
  //   TT    → developers.tiktok.com/doc/content-posting-api-reference-upload-video
  tiktok: {
    ratios: ['9:16'],
    durationSec: { min: 3, max: 600 },
    captionMaxChars: 2200,
    hashtagMax: 100,
    hashtagRecommended: 8,
    supportsCarousel: false,
    maxFileSizeMb: 4096,
  },
  instagram_reel: {
    ratios: ['9:16'],
    durationSec: { min: 3, max: 90 },
    captionMaxChars: 2200,
    hashtagMax: 30,
    hashtagRecommended: 10,
    supportsCarousel: false,
    maxFileSizeMb: 1024,
  },
  instagram_feed: {
    ratios: ['1:1', '4:5'],
    durationSec: null,
    captionMaxChars: 2200,
    hashtagMax: 30,
    hashtagRecommended: 10,
    supportsCarousel: true,
    maxFileSizeMb: 1024,
  },
  instagram_story: {
    ratios: ['9:16'],
    durationSec: { min: 1, max: 60 },
    captionMaxChars: 2200,
    hashtagMax: 10,
    hashtagRecommended: 3,
    supportsCarousel: false,
    maxFileSizeMb: 1024,
  },
  facebook_feed: {
    ratios: ['1:1', '4:5', '16:9'],
    durationSec: { min: 1, max: 240 },
    captionMaxChars: 63206,
    hashtagMax: 30,
    hashtagRecommended: 5,
    supportsCarousel: true,
    maxFileSizeMb: 4096,
  },
  facebook_reel: {
    ratios: ['9:16'],
    durationSec: { min: 3, max: 90 },
    captionMaxChars: 63206,
    hashtagMax: 30,
    hashtagRecommended: 8,
    supportsCarousel: false,
    maxFileSizeMb: 4096,
  },
};

/** Rate limits a respetar al invocar la API de cada plataforma. */
export const PLATFORM_RATE_LIMITS = {
  /** IG Graph API: 25 posts API por cuenta cada 24h. */
  instagram_posts_per_24h: 25,
  /** TT Content Posting API: 30 publicaciones por cuenta cada 24h (conservador). */
  tiktok_posts_per_24h: 30,
} as const;
