import type { PlatformVariantKind } from '@qyro/shared';

/**
 * Contrato común a todos los publicadores (Instagram, Facebook, TikTok).
 *
 * Cada implementación encapsula los detalles específicos de su API real
 * (containers de Meta, Direct Post de TikTok, etc.) y expone una superficie
 * uniforme al worker.
 */
export interface PublishInput {
  /** Variante específica (placement). */
  kind: PlatformVariantKind;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'carousel';
  caption?: string | null;
  hashtags: string[];
  firstComment?: string | null;
  musicRef?: string | null;
  /** Tokens cifrados ya descifrados antes de pasar al adapter. */
  accessToken: string;
  /** Para IG: igUserId; para FB: pageId; para TT: openId del creator. */
  externalAccountId: string;
  /** Llave de idempotencia ya calculada por el worker. */
  idempotencyKey: string;
}

export interface PublishOk {
  ok: true;
  platformPostId: string;
  platformVideoId?: string;
  rawResponse?: unknown;
}

export interface PublishErr {
  ok: false;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
  rawResponse?: unknown;
}

export type PublishResult = PublishOk | PublishErr;

export interface InsightsResult {
  fetchedAt: string;
  organic: Record<string, number>;
  paid?: Record<string, number>;
  raw?: unknown;
}

export interface SocialPublisher {
  /** Identificador legible: instagram, facebook, tiktok. */
  readonly platform: 'instagram' | 'facebook' | 'tiktok';

  publish(input: PublishInput): Promise<PublishResult>;
  fetchInsights(args: {
    platformPostId: string;
    accessToken: string;
    externalAccountId: string;
  }): Promise<InsightsResult>;

  /** Verifica la firma HMAC del webhook entrante. */
  verifyWebhookSignature(args: {
    rawBody: string;
    signatureHeader: string | undefined;
    secret: string;
  }): boolean;
}
