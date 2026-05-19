import { setTimeout as sleep } from 'node:timers/promises';
import { type IngestPayload, ingestPayloadSchema } from '@qyro/shared';
import { logger } from '../logger.js';

/**
 * Cliente HTTP del Estudio Creativo contra el Social Calendar.
 *
 * Implementa el contrato versionado en
 * `docs/social-calendar/creative-studio-integration.md`:
 *   - Auth via `X-Service-API-Key`.
 *   - Idempotencia por `external_ref` (UUID v4).
 *   - Retries exponenciales 5s/30s/5min para errores transitorios.
 *   - Sin retries en 400/401 (bug del estudio, propagar fallo).
 */

export interface SocialCalendarConfig {
  baseUrl: string;
  serviceApiKey: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface IngestAccepted {
  outcome: 'accepted';
  contentPieceId: string;
  externalRef: string;
  status: string;
  variants: Array<{ id: string; kind: string; scheduledAt: string | null }>;
  warnings: Array<{ severity: string; platform: string; code: string; message: string }>;
}

export interface IngestDuplicated {
  outcome: 'duplicated';
  contentPieceId: string | null;
  externalRef: string;
  status: string | null;
}

export interface IngestRejected {
  outcome: 'rejected';
  externalRef: string;
  error: string;
  blockers: Array<{ severity: string; platform: string; code: string; message: string }>;
  warnings: Array<{ severity: string; platform: string; code: string; message: string }>;
  /** Raw response body for diagnostics. */
  raw: unknown;
}

export type IngestResult = IngestAccepted | IngestDuplicated | IngestRejected;

export class IngestTransportError extends Error {
  constructor(
    msg: string,
    public readonly attempts: number,
    public readonly lastStatus?: number,
  ) {
    super(msg);
    this.name = 'IngestTransportError';
  }
}

const BACKOFF_MS = [0, 5_000, 30_000, 300_000] as const;

export class SocialCalendarClient {
  constructor(private readonly cfg: SocialCalendarConfig) {
    if (!cfg.baseUrl) throw new Error('SocialCalendarClient: baseUrl required');
    if (!cfg.serviceApiKey || cfg.serviceApiKey.length < 16) {
      throw new Error('SocialCalendarClient: serviceApiKey too short');
    }
  }

  /**
   * POST /api/v1/content-pieces/ingest.
   *
   * Garantías:
   *   - Si la red falla o el server devuelve 5xx → retry con backoff
   *     hasta `maxRetries` veces. La idempotencia del endpoint protege
   *     contra duplicados si un intento sí llegó pero no recibimos
   *     respuesta (el siguiente verá `duplicated: true`).
   *   - 400/401 nunca se reintenta: es un bug del estudio.
   */
  async ingest(payload: IngestPayload): Promise<IngestResult> {
    const parsed = ingestPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(
        `SocialCalendarClient.ingest: payload inválido localmente: ${JSON.stringify(parsed.error.flatten())}`,
      );
    }
    const url = new URL('/api/v1/content-pieces/ingest', this.cfg.baseUrl).toString();
    const maxAttempts = Math.max(1, this.cfg.maxRetries + 1);

    let lastStatus: number | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const wait = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
      if (wait && wait > 0) {
        logger.info(
          { externalRef: payload.external_ref, attempt, waitMs: wait },
          'reintentando ingest tras backoff',
        );
        await sleep(wait);
      }

      const ac = new AbortController();
      const timer = globalThis.setTimeout(() => ac.abort(), this.cfg.timeoutMs);
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Service-API-Key': this.cfg.serviceApiKey,
          },
          body: JSON.stringify(payload),
          signal: ac.signal,
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        logger.warn({ externalRef: payload.external_ref, attempt, reason }, 'ingest network error');
        if (attempt === maxAttempts) {
          throw new IngestTransportError(`Network error: ${reason}`, attempt);
        }
        continue;
      } finally {
        globalThis.clearTimeout(timer);
      }

      lastStatus = res.status;
      const body = await safeJson(res);

      if (res.status === 201) {
        return {
          outcome: 'accepted',
          contentPieceId: str(body, 'content_piece_id', ''),
          externalRef: str(body, 'external_ref', payload.external_ref),
          status: str(body, 'status', 'IN_REVIEW'),
          variants: arrOf(body, 'variants') as IngestAccepted['variants'],
          warnings: arrOf(body, 'warnings') as IngestAccepted['warnings'],
        };
      }
      if (res.status === 200) {
        return {
          outcome: 'duplicated',
          contentPieceId: strOrNull(body, 'content_piece_id'),
          externalRef: str(body, 'external_ref', payload.external_ref),
          status: strOrNull(body, 'status'),
        };
      }
      if (res.status === 400) {
        return {
          outcome: 'rejected',
          externalRef: payload.external_ref,
          error: str(body, 'error', 'BAD_REQUEST'),
          blockers: arrOf(body, 'blockers') as IngestRejected['blockers'],
          warnings: arrOf(body, 'warnings') as IngestRejected['warnings'],
          raw: body,
        };
      }
      if (res.status === 401) {
        throw new IngestTransportError(
          'UNAUTHENTICATED: revisa INGEST_SERVICE_API_KEY',
          attempt,
          401,
        );
      }
      // 5xx u otros — reintentable
      logger.warn(
        { externalRef: payload.external_ref, attempt, status: res.status, body },
        'ingest retryable error',
      );
      if (attempt === maxAttempts) {
        throw new IngestTransportError(
          `Calendar returned ${res.status} after ${attempt} attempts`,
          attempt,
          res.status,
        );
      }
    }

    throw new IngestTransportError('Exhausted retries', maxAttempts, lastStatus);
  }

  /** Healthcheck barato: HEAD a /api/v1/content-pieces/ingest devuelve 401 si responde. */
  async healthcheck(): Promise<{ ok: boolean; reachable: boolean; authConfigured: boolean }> {
    const url = new URL('/api/v1/content-pieces/ingest', this.cfg.baseUrl).toString();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      // Sin key → 401 esperado. Si responde 401, el endpoint está vivo.
      if (res.status === 401) return { ok: true, reachable: true, authConfigured: true };
      return { ok: false, reachable: true, authConfigured: false };
    } catch {
      return { ok: false, reachable: false, authConfigured: false };
    }
  }
}

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function str(body: Record<string, unknown> | null, key: string, fallback: string): string {
  const v = body?.[key];
  return typeof v === 'string' ? v : fallback;
}

function strOrNull(body: Record<string, unknown> | null, key: string): string | null {
  const v = body?.[key];
  return typeof v === 'string' ? v : null;
}

function arrOf(body: Record<string, unknown> | null, key: string): unknown[] {
  const v = body?.[key];
  return Array.isArray(v) ? v : [];
}
