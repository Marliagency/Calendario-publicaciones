import { describe, expect, it, vi } from 'vitest';
import { HiggsfieldHttpRunner } from './higgsfield-http.js';
import { ProducerError } from './types.js';

const baseOpts = {
  baseUrl: 'https://platform.higgsfield.test',
  apiId: '00000000-0000-4000-8000-000000000000',
  apiSecret: 'a'.repeat(64),
  pollIntervalMs: 1,
  pollTimeoutMs: 200,
};

function mockFetch(responses: Array<{ status: number; body: unknown }>) {
  let i = 0;
  return vi.fn(async () => {
    const r = responses[i++] ?? responses[responses.length - 1];
    if (!r) throw new Error('mockFetch exhausted');
    return new Response(JSON.stringify(r.body), {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

describe('HiggsfieldHttpRunner', () => {
  it('lanza si faltan credenciales', () => {
    expect(() => new HiggsfieldHttpRunner({ ...baseOpts, apiId: '' })).toThrow(ProducerError);
  });

  it('caso sync: respuesta inmediata completed con output_url', async () => {
    const fetchMock = mockFetch([
      {
        status: 200,
        body: {
          id: 'job-1',
          status: 'completed',
          output_url: 'https://higgsfield.test/out/abc.mp4',
          credits_spent: 12,
          duration_s: 22,
        },
      },
    ]);
    const r = new HiggsfieldHttpRunner({ ...baseOpts, fetchImpl: fetchMock });
    const res = await r.invoke(
      [
        'generate',
        '--model',
        'seedance_2_0',
        '--prompt',
        'POV',
        '--ratio',
        '9:16',
        '--duration',
        '22',
        '--json',
      ],
      { timeoutMs: 5_000 },
    );
    expect(res.output_url).toBe('https://higgsfield.test/out/abc.mp4');
    expect(res.credits_spent).toBe(12);
    expect(fetchMock as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();
  });

  it('caso async: submit + polling hasta completed', async () => {
    const fetchMock = mockFetch([
      { status: 202, body: { id: 'job-2', status: 'queued', poll_url: '/v1/generations/job-2' } },
      { status: 200, body: { id: 'job-2', status: 'processing' } },
      {
        status: 200,
        body: {
          id: 'job-2',
          status: 'completed',
          output_url: 'https://higgsfield.test/out/xyz.mp4',
          credits_spent: 40,
          duration_s: 30,
        },
      },
    ]);
    const r = new HiggsfieldHttpRunner({ ...baseOpts, fetchImpl: fetchMock });
    const res = await r.invoke(['generate', '--model', 'veo_3_1', '--prompt', 'cinematic'], {
      timeoutMs: 5_000,
    });
    expect(res.output_url).toBe('https://higgsfield.test/out/xyz.mp4');
    expect(res.credits_spent).toBe(40);
  });

  it('caso fail: status=failed propaga ProducerError', async () => {
    const fetchMock = mockFetch([
      { status: 202, body: { id: 'job-3', status: 'queued' } },
      { status: 200, body: { id: 'job-3', status: 'failed', error: 'NSFW content detected' } },
    ]);
    const r = new HiggsfieldHttpRunner({ ...baseOpts, fetchImpl: fetchMock });
    await expect(
      r.invoke(['generate', '--model', 'seedance_2_0', '--prompt', 'x'], { timeoutMs: 5_000 }),
    ).rejects.toBeInstanceOf(ProducerError);
  });

  it('caso 401: lanza ProducerError sin reintentar', async () => {
    const fetchMock = mockFetch([{ status: 401, body: { error: 'invalid credentials' } }]);
    const r = new HiggsfieldHttpRunner({ ...baseOpts, fetchImpl: fetchMock });
    await expect(
      r.invoke(['generate', '--model', 'seedance_2_0', '--prompt', 'x'], { timeoutMs: 5_000 }),
    ).rejects.toThrow(/401/);
  });

  it('headers de auth incluyen X-Api-Id y X-Api-Secret', async () => {
    const fetchMock = mockFetch([
      {
        status: 200,
        body: { id: 'j', status: 'completed', output_url: 'u', credits_spent: 1, duration_s: 1 },
      },
    ]);
    const r = new HiggsfieldHttpRunner({ ...baseOpts, fetchImpl: fetchMock });
    await r.invoke(['generate', '--model', 'x', '--prompt', 'y'], { timeoutMs: 5_000 });
    const call = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = call?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Api-Id']).toBe(baseOpts.apiId);
    expect(headers['X-Api-Secret']).toBe(baseOpts.apiSecret);
  });
});
