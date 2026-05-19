import { describe, expect, it } from 'vitest';
import { PLATFORM_LIMITS } from './platform-limits.js';
import { PLATFORM_VARIANT_KINDS } from './platforms.js';

describe('PLATFORM_LIMITS', () => {
  it('cubre todas las variantes declaradas', () => {
    for (const kind of PLATFORM_VARIANT_KINDS) {
      expect(PLATFORM_LIMITS[kind]).toBeDefined();
    }
  });

  it('TikTok solo acepta 9:16', () => {
    expect(PLATFORM_LIMITS.tiktok.ratios).toEqual(['9:16']);
  });

  it('Instagram Reel limita duración a 90s', () => {
    expect(PLATFORM_LIMITS.instagram_reel.durationSec?.max).toBe(90);
  });

  it('Instagram limita hashtags a 30', () => {
    expect(PLATFORM_LIMITS.instagram_reel.hashtagMax).toBe(30);
    expect(PLATFORM_LIMITS.instagram_feed.hashtagMax).toBe(30);
  });

  it('IG y TT comparten caption max de 2200', () => {
    expect(PLATFORM_LIMITS.instagram_reel.captionMaxChars).toBe(2200);
    expect(PLATFORM_LIMITS.tiktok.captionMaxChars).toBe(2200);
  });

  it('Facebook tiene caption max muy alto (63206)', () => {
    expect(PLATFORM_LIMITS.facebook_feed.captionMaxChars).toBe(63206);
  });
});
