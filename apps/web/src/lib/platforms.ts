export type PlatformKind =
  | 'tiktok'
  | 'instagram_reel'
  | 'instagram_feed'
  | 'instagram_story'
  | 'facebook_feed'
  | 'facebook_reel';

export const PLATFORM_LABEL: Record<PlatformKind, string> = {
  tiktok: 'TikTok',
  instagram_reel: 'IG Reel',
  instagram_feed: 'IG Feed',
  instagram_story: 'IG Story',
  facebook_feed: 'FB Feed',
  facebook_reel: 'FB Reel',
};

/** Letras identificativas para el icono circular. */
export const PLATFORM_BADGE: Record<PlatformKind, { letter: string; color: string }> = {
  tiktok: { letter: 'T', color: '#000000' },
  instagram_reel: { letter: 'IR', color: '#E1306C' },
  instagram_feed: { letter: 'IG', color: '#E1306C' },
  instagram_story: { letter: 'IS', color: '#833AB4' },
  facebook_feed: { letter: 'F', color: '#1877F2' },
  facebook_reel: { letter: 'FR', color: '#1877F2' },
};
