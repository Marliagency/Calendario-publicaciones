import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../config.js';
import { ProducerRegistry } from './registry.js';

const env = {
  SOCIAL_CALENDAR_BASE_URL: 'http://calendar.test',
  SOCIAL_CALENDAR_SERVICE_API_KEY: '0'.repeat(32),
};

let outDir: string;

beforeEach(async () => {
  outDir = await mkdtemp(path.join(tmpdir(), 'creative-studio-reg-'));
});

afterEach(async () => {
  await rm(outDir, { recursive: true, force: true });
});

describe('ProducerRegistry', () => {
  it('routeAndProduce(ugc_video_talking_head) → hyperframes dry-run, coste 0', async () => {
    const cfg = loadConfig(env as NodeJS.ProcessEnv);
    const reg = new ProducerRegistry(cfg, {
      dryRun: true,
      outputDir: outDir,
      hyperframesProjectDir: outDir,
    });

    const { decision, result } = await reg.routeAndProduce(
      { format: 'ugc_video_talking_head' },
      {
        spec: 'qyro-ugc-testimonial.tsx',
        externalRef: 'r-1',
        durationS: 22,
        ratio: '9:16',
      },
    );

    expect(decision.tool).toBe('hyperframes');
    expect(result.creditsSpent).toBe(0);
    expect(result.costUnit).toBe('free');
    expect(result.dryRun).toBe(true);
  });

  it('routeAndProduce(ugc_video_dynamic) → higgsfield seedance_2_0 dry-run', async () => {
    const cfg = loadConfig(env as NodeJS.ProcessEnv);
    const reg = new ProducerRegistry(cfg, {
      dryRun: true,
      outputDir: outDir,
      hyperframesProjectDir: outDir,
    });

    const { decision, result } = await reg.routeAndProduce(
      { format: 'ugc_video_dynamic' },
      {
        spec: 'persona-optimizador-pov',
        externalRef: 'r-2',
        durationS: 22,
        ratio: '9:16',
      },
    );

    expect(decision.tool).toBe('higgsfield');
    expect(decision.model).toBe('seedance_2_0');
    expect(result.dryRun).toBe(true);
    expect(result.creditsSpent).toBe(0); // dry-run no descuenta
    expect(result.rawMetadata.wouldHaveSpent).toBe(12);
  });

  it('routeAndProduce(static_image_with_text) → higgsfield gpt_image_2 dry-run', async () => {
    const cfg = loadConfig(env as NodeJS.ProcessEnv);
    const reg = new ProducerRegistry(cfg, {
      dryRun: true,
      outputDir: outDir,
      hyperframesProjectDir: outDir,
    });

    const { decision, result } = await reg.routeAndProduce(
      { format: 'static_image_with_text' },
      { spec: 'mockup iPhone con Life Score 70', externalRef: 'r-3', ratio: '1:1' },
    );

    expect(decision.tool).toBe('higgsfield');
    expect(decision.model).toBe('gpt_image_2');
    expect(result.mediaType).toBe('image');
  });
});
