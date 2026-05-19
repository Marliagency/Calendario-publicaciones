import type { IngestPayload } from '@qyro/shared';
import { describe, expect, it } from 'vitest';
import { hasBlockers, inferMediaType, validateIngestPayload } from './validate.js';

function payload(overrides: Partial<IngestPayload> = {}): IngestPayload {
  return {
    external_ref: '11111111-1111-4111-8111-111111111111',
    title: 'demo',
    format: 'reel',
    buyer_persona_ids: [],
    platform_variants: {
      tiktok: {
        media_url: 'https://example.com/v.mp4',
        ratio: '9:16',
        duration_s: 18,
        hashtags: [],
      },
    },
    ...overrides,
  };
}

describe('validateIngestPayload', () => {
  it('valida payload mínimo correcto sin issues', () => {
    expect(validateIngestPayload(payload())).toEqual([]);
  });

  it('bloquea si no hay variantes', () => {
    const issues = validateIngestPayload(payload({ platform_variants: {} }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('NO_VARIANTS');
    expect(hasBlockers(issues)).toBe(true);
  });

  it('bloquea ratio inválido para TikTok', () => {
    const issues = validateIngestPayload(
      payload({
        platform_variants: {
          tiktok: { media_url: 'https://x/v.mp4', ratio: '1:1', duration_s: 20, hashtags: [] },
        },
      }),
    );
    expect(issues.some((i) => i.code === 'INVALID_RATIO')).toBe(true);
  });

  it('bloquea duración fuera de rango en Instagram Reel', () => {
    const issues = validateIngestPayload(
      payload({
        platform_variants: {
          instagram_reel: {
            media_url: 'https://x/v.mp4',
            ratio: '9:16',
            duration_s: 200,
            hashtags: [],
          },
        },
      }),
    );
    expect(issues.some((i) => i.code === 'DURATION_OUT_OF_RANGE')).toBe(true);
  });

  it('exige duration_s en formato vídeo', () => {
    const issues = validateIngestPayload(
      payload({
        platform_variants: {
          tiktok: { media_url: 'https://x/v.mp4', ratio: '9:16', hashtags: [] },
        },
      }),
    );
    expect(issues.some((i) => i.code === 'DURATION_REQUIRED')).toBe(true);
  });

  it('warns si hashtags supera el recomendado pero no el máximo en IG', () => {
    const issues = validateIngestPayload(
      payload({
        platform_variants: {
          instagram_reel: {
            media_url: 'https://x/v.mp4',
            ratio: '9:16',
            duration_s: 20,
            hashtags: Array.from({ length: 15 }, (_, i) => `#tag${i}`),
          },
        },
      }),
    );
    expect(issues.some((i) => i.code === 'HASHTAGS_OVER_RECOMMENDED')).toBe(true);
    expect(hasBlockers(issues)).toBe(false);
  });

  it('bloquea si hashtags supera el máximo de IG', () => {
    const issues = validateIngestPayload(
      payload({
        platform_variants: {
          instagram_reel: {
            media_url: 'https://x/v.mp4',
            ratio: '9:16',
            duration_s: 20,
            hashtags: Array.from({ length: 31 }, (_, i) => `#tag${i}`),
          },
        },
      }),
    );
    expect(issues.some((i) => i.code === 'TOO_MANY_HASHTAGS')).toBe(true);
    expect(hasBlockers(issues)).toBe(true);
  });

  it('bloquea caption demasiado larga', () => {
    const issues = validateIngestPayload(
      payload({
        platform_variants: {
          tiktok: {
            media_url: 'https://x/v.mp4',
            ratio: '9:16',
            duration_s: 20,
            caption: 'a'.repeat(2300),
            hashtags: [],
          },
        },
      }),
    );
    expect(issues.some((i) => i.code === 'CAPTION_TOO_LONG')).toBe(true);
  });
});

describe('inferMediaType', () => {
  it('vídeo si trae duration_s', () => {
    expect(inferMediaType({ media_url: 'x', ratio: '9:16', duration_s: 10, hashtags: [] })).toBe(
      'video',
    );
  });
  it('imagen si no trae duration_s', () => {
    expect(inferMediaType({ media_url: 'x', ratio: '1:1', hashtags: [] })).toBe('image');
  });
});
