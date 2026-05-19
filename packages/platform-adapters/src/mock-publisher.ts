import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { VARIANT_TO_PLATFORM } from '@qyro/shared';
import type { InsightsResult, PublishInput, PublishResult, SocialPublisher } from './types.js';

/**
 * MockPublisher genera respuestas deterministas para desarrollo y tests.
 *
 * Mientras Meta/TikTok apps no estén aprobadas (ADR 0004), todos los
 * SocialPublishers en producción son mocks. Cuando se aprueben las apps,
 * sustituir por implementaciones reales en
 * `MetaInstagramPublisher`, `MetaFacebookPublisher`, `TikTokPublisher`.
 *
 * Comportamiento:
 *  - Latencia simulada (50-150ms).
 *  - Si el caption contiene "FORCE_FAIL_RETRYABLE" → error retryable.
 *  - Si contiene "FORCE_FAIL_PERMANENT" → error no retryable.
 *  - Caso default: éxito con platformPostId determinista basado en idempotencyKey.
 */
export class MockPublisher implements SocialPublisher {
  constructor(public readonly platform: 'instagram' | 'facebook' | 'tiktok') {}

  async publish(input: PublishInput): Promise<PublishResult> {
    await delay(50 + Math.random() * 100);

    if (input.caption?.includes('FORCE_FAIL_RETRYABLE')) {
      return {
        ok: false,
        errorCode: 'RATE_LIMIT',
        errorMessage: 'mock rate limit',
        retryable: true,
      };
    }
    if (input.caption?.includes('FORCE_FAIL_PERMANENT')) {
      return {
        ok: false,
        errorCode: 'INVALID_MEDIA',
        errorMessage: 'mock invalid media',
        retryable: false,
      };
    }

    const platformPostId = `${this.platform}_mock_${input.idempotencyKey.slice(0, 12)}`;
    return {
      ok: true,
      platformPostId,
      platformVideoId: input.mediaType === 'video' ? `vid_${randomUUID().slice(0, 8)}` : undefined,
      rawResponse: { mocked: true, kind: input.kind },
    };
  }

  async fetchInsights(): Promise<InsightsResult> {
    return {
      fetchedAt: new Date().toISOString(),
      organic: {
        impressions: rand(500, 25_000),
        reach: rand(400, 20_000),
        likes: rand(10, 1500),
        comments: rand(0, 200),
        shares: rand(0, 80),
        saves: rand(0, 500),
        video_views: rand(200, 30_000),
        avg_watch_time_s: rand(2, 20),
      },
      raw: { mocked: true, platform: this.platform },
    };
  }

  verifyWebhookSignature(args: {
    rawBody: string;
    signatureHeader: string | undefined;
    secret: string;
  }): boolean {
    if (!args.signatureHeader) return false;
    const expected = createHmac('sha256', args.secret).update(args.rawBody).digest('hex');
    const provided = args.signatureHeader.replace(/^sha256=/, '');
    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(provided, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function rand(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min));
}

/** Helper: dado el `kind` de variante, devuelve la plataforma macro. */
export function platformForKind(kind: string) {
  return VARIANT_TO_PLATFORM[kind as keyof typeof VARIANT_TO_PLATFORM];
}
