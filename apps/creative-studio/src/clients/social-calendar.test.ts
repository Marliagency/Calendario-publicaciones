import type { IngestPayload } from '@qyro/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SocialCalendarClient } from './social-calendar.js';

const cfg = {
  baseUrl: 'http://calendar.test',
  serviceApiKey: '0'.repeat(32),
  timeoutMs: 100,
  maxRetries: 0,
};

function payload(): IngestPayload {
  return {
    external_ref: '00000000-0000-4000-8000-000000000001',
    title: 'test',
    format: 'ugc_video',
    buyer_persona_ids: [],
    platform_variants: {
      tiktok: {
        media_url: 'https://example.com/v.mp4',
        ratio: '9:16',
        duration_s: 20,
        hashtags: [],
      },
    },
  };
}

describe('SocialCalendarClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mapea 201 a accepted', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          accepted: true,
          content_piece_id: 'cp-1',
          external_ref: '00000000-0000-4000-8000-000000000001',
          status: 'IN_REVIEW',
          variants: [{ id: 'v-1', kind: 'tiktok', scheduled_at: null }],
          warnings: [],
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    const client = new SocialCalendarClient(cfg);
    const res = await client.ingest(payload());
    expect(res.outcome).toBe('accepted');
    if (res.outcome === 'accepted') {
      expect(res.contentPieceId).toBe('cp-1');
      expect(res.status).toBe('IN_REVIEW');
    }
    const call = fetchSpy.mock.calls[0];
    const init = call?.[1] as RequestInit | undefined;
    expect((init?.headers as Record<string, string>)['X-Service-API-Key']).toBe('0'.repeat(32));
  });

  it('mapea 200 a duplicated', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          duplicated: true,
          content_piece_id: 'cp-existing',
          external_ref: '00000000-0000-4000-8000-000000000001',
          status: 'APPROVED',
        }),
        { status: 200 },
      ),
    );
    const res = await new SocialCalendarClient(cfg).ingest(payload());
    expect(res.outcome).toBe('duplicated');
    if (res.outcome === 'duplicated') {
      expect(res.contentPieceId).toBe('cp-existing');
      expect(res.status).toBe('APPROVED');
    }
  });

  it('mapea 400 a rejected y NO reintenta', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'VALIDATION_FAILED',
          external_ref: '00000000-0000-4000-8000-000000000001',
          blockers: [
            {
              severity: 'blocker',
              platform: 'tiktok',
              code: 'INVALID_RATIO',
              message: 'fail',
            },
          ],
          warnings: [],
        }),
        { status: 400 },
      ),
    );
    const res = await new SocialCalendarClient({ ...cfg, maxRetries: 3 }).ingest(payload());
    expect(res.outcome).toBe('rejected');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('lanza IngestTransportError en 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }));
    await expect(new SocialCalendarClient(cfg).ingest(payload())).rejects.toThrow(
      /UNAUTHENTICATED/,
    );
  });

  it('reintenta en 500 hasta agotar maxRetries', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 500 }));
    // maxRetries=0 → 1 intento sólo, para no esperar el backoff real
    await expect(new SocialCalendarClient(cfg).ingest(payload())).rejects.toThrow(/500/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('rechaza payload inválido localmente antes de llamar', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const bad = { ...payload(), external_ref: 'not-a-uuid' } as unknown as IngestPayload;
    await expect(new SocialCalendarClient(cfg).ingest(bad)).rejects.toThrow(
      /payload inválido localmente/,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
