import { describe, expect, it } from 'vitest';
import { buildPlatformVariants } from './variants.js';

describe('buildPlatformVariants', () => {
  it('construye variantes válidas y omite ratios incompatibles', () => {
    const r = buildPlatformVariants({
      source: { url: 'https://cdn.test/v.mp4', ratio: '9:16', durationS: 22 },
      targets: ['tiktok', 'instagram_reel', 'instagram_feed', 'facebook_feed'],
      copyByPlatform: {
        tiktok: { caption: 'POV TT', hashtags: ['qyro', 'tt'] },
      },
      fallbackCopy: { caption: 'POV', hashtags: ['qyro'] },
    });

    expect(r.built.map((b) => b.kind)).toEqual(['tiktok', 'instagram_reel']);
    expect(r.skipped.map((s) => s.kind).sort()).toEqual(['facebook_feed', 'instagram_feed'].sort());
    expect(r.built[0]?.caption).toBe('POV TT');
    expect(r.built[1]?.caption).toBe('POV'); // fallback
  });

  it('omite variantes con duración fuera de rango', () => {
    const r = buildPlatformVariants({
      source: { url: 'https://cdn.test/v.mp4', ratio: '9:16', durationS: 600 },
      targets: ['tiktok', 'instagram_reel'],
      copyByPlatform: {},
      fallbackCopy: { caption: 'x', hashtags: [] },
    });
    expect(r.built.map((b) => b.kind)).toEqual(['tiktok']); // IG reel max 90s
    expect(r.skipped[0]?.reason).toMatch(/Duración 600s/);
  });

  it('recorta hashtags al máximo permitido', () => {
    const many = Array.from({ length: 50 }, (_, i) => `tag${i}`);
    const r = buildPlatformVariants({
      source: { url: 'https://cdn.test/v.mp4', ratio: '9:16', durationS: 22 },
      targets: ['instagram_story'],
      copyByPlatform: {},
      fallbackCopy: { caption: 'x', hashtags: many },
    });
    expect(r.built[0]?.hashtags).toHaveLength(10); // IG story max
  });

  it('recorta caption al máximo permitido', () => {
    const huge = 'a'.repeat(3000);
    const r = buildPlatformVariants({
      source: { url: 'https://cdn.test/v.mp4', ratio: '9:16', durationS: 22 },
      targets: ['tiktok'],
      copyByPlatform: {},
      fallbackCopy: { caption: huge, hashtags: [] },
    });
    expect(r.built[0]?.caption?.length).toBe(2200);
    expect(r.built[0]?.caption?.endsWith('…')).toBe(true);
  });
});
