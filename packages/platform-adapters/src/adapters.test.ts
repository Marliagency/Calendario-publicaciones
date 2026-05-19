import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken } from './crypto.js';
import { MockPublisher } from './mock-publisher.js';

const KEY = '0'.repeat(64);

describe('encryptToken / decryptToken', () => {
  it('round-trip', () => {
    const plain = 'meta_token_abc_long_lived';
    const enc = encryptToken(plain, KEY);
    expect(enc).not.toContain(plain);
    expect(decryptToken(enc, KEY)).toBe(plain);
  });

  it('rechaza clave malformada', () => {
    expect(() => encryptToken('x', 'short')).toThrow();
  });

  it('falla descifrado con clave distinta', () => {
    const enc = encryptToken('x', KEY);
    expect(() => decryptToken(enc, '1'.repeat(64))).toThrow();
  });
});

describe('MockPublisher', () => {
  it('devuelve éxito con platformPostId determinista', async () => {
    const p = new MockPublisher('tiktok');
    const r = await p.publish({
      kind: 'tiktok',
      mediaUrl: 'x',
      mediaType: 'video',
      hashtags: [],
      accessToken: 'tok',
      externalAccountId: 'acct',
      idempotencyKey: 'idem-abc-12345678',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.platformPostId).toContain('tiktok_mock_');
  });

  it('FORCE_FAIL_RETRYABLE devuelve error retryable', async () => {
    const p = new MockPublisher('instagram');
    const r = await p.publish({
      kind: 'instagram_reel',
      mediaUrl: 'x',
      mediaType: 'video',
      caption: 'FORCE_FAIL_RETRYABLE',
      hashtags: [],
      accessToken: 'tok',
      externalAccountId: 'acct',
      idempotencyKey: 'idem',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryable).toBe(true);
  });

  it('FORCE_FAIL_PERMANENT devuelve error no retryable', async () => {
    const p = new MockPublisher('facebook');
    const r = await p.publish({
      kind: 'facebook_feed',
      mediaUrl: 'x',
      mediaType: 'image',
      caption: 'FORCE_FAIL_PERMANENT',
      hashtags: [],
      accessToken: 'tok',
      externalAccountId: 'acct',
      idempotencyKey: 'idem',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryable).toBe(false);
  });

  it('verifyWebhookSignature acepta firma válida', () => {
    const p = new MockPublisher('instagram');
    const secret = 'wh-secret';
    const body = '{"event":"x"}';
    const expected = require('node:crypto').createHmac('sha256', secret).update(body).digest('hex');
    expect(
      p.verifyWebhookSignature({ rawBody: body, signatureHeader: `sha256=${expected}`, secret }),
    ).toBe(true);
    expect(
      p.verifyWebhookSignature({ rawBody: body, signatureHeader: 'sha256=deadbeef', secret }),
    ).toBe(false);
  });
});
