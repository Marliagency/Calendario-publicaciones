/**
 * Plataforma "macro" (a nivel de cuenta social).
 */
export const PLATFORMS = ['instagram', 'facebook', 'tiktok'] as const;
export type Platform = (typeof PLATFORMS)[number];

/**
 * Variante específica (placement) dentro de una plataforma. Un mismo `ContentPiece`
 * puede tener varias variantes — p.ej. reel + feed + story en Instagram.
 */
export const PLATFORM_VARIANT_KINDS = [
  'tiktok',
  'instagram_reel',
  'instagram_feed',
  'instagram_story',
  'facebook_feed',
  'facebook_reel',
] as const;
export type PlatformVariantKind = (typeof PLATFORM_VARIANT_KINDS)[number];

export const VARIANT_TO_PLATFORM: Record<PlatformVariantKind, Platform> = {
  tiktok: 'tiktok',
  instagram_reel: 'instagram',
  instagram_feed: 'instagram',
  instagram_story: 'instagram',
  facebook_feed: 'facebook',
  facebook_reel: 'facebook',
};
