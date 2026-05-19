import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouterDecision } from '../router/model-router.js';
import { HyperFramesProducer, type HyperFramesRunner } from './hyperframes.js';
import { ProducerError } from './types.js';

const decision: RouterDecision = {
  tool: 'hyperframes',
  model: 'native',
  estimatedCostUnit: 'free',
  estimatedCost: 0,
  rationale: 'app demo',
  isPremium: false,
};

let outDir: string;

beforeEach(async () => {
  outDir = await mkdtemp(path.join(tmpdir(), 'creative-studio-hf-'));
});

afterEach(async () => {
  await rm(outDir, { recursive: true, force: true });
});

describe('HyperFramesProducer', () => {
  it('dry-run escribe placeholder MP4 sin invocar runner', async () => {
    const runner: HyperFramesRunner = { invoke: vi.fn() };
    const p = new HyperFramesProducer('/fake/project', runner);
    const res = await p.produce({
      decision,
      spec: 'qyro-app-demo.tsx',
      outputDir: outDir,
      externalRef: 'ext-1',
      dryRun: true,
      durationS: 25,
      ratio: '9:16',
    });
    expect(res.dryRun).toBe(true);
    expect(res.creditsSpent).toBe(0);
    expect(res.costUnit).toBe('free');
    expect(res.mediaPath).toMatch(/ext-1-hyperframes\.mp4$/);
    const content = JSON.parse(await readFile(res.mediaPath, 'utf-8'));
    expect(content.producer).toBe('hyperframes');
    expect(runner.invoke).not.toHaveBeenCalled();
  });

  it('rechaza decisión de otra tool', async () => {
    const p = new HyperFramesProducer('/fake', { invoke: vi.fn() });
    await expect(
      p.produce({
        decision: { ...decision, tool: 'higgsfield' },
        spec: 'x',
        outputDir: outDir,
        externalRef: 'e',
        dryRun: true,
      }),
    ).rejects.toBeInstanceOf(ProducerError);
  });

  it('modo real: invoca CLI con args y devuelve output_path', async () => {
    const runner: HyperFramesRunner = {
      invoke: vi.fn().mockResolvedValue({
        output_path: '/tmp/render/out.mp4',
        duration_s: 25,
        raw: { frames: 600 },
      }),
    };
    const p = new HyperFramesProducer(outDir, runner);
    const res = await p.produce({
      decision,
      spec: 'qyro-app-demo.tsx',
      outputDir: outDir,
      externalRef: 'ext-real',
      dryRun: false,
      durationS: 25,
      ratio: '9:16',
    });
    expect(res.dryRun).toBe(false);
    expect(res.mediaPath).toBe('/tmp/render/out.mp4');
    expect(res.durationS).toBe(25);
    const args = (runner.invoke as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string[];
    expect(args[0]).toBe('render');
    expect(args).toContain('--ratio');
    expect(args).toContain('9:16');
  });

  it('modo real falla si el projectDir no existe', async () => {
    const p = new HyperFramesProducer('/this/path/does/not/exist', { invoke: vi.fn() });
    await expect(
      p.produce({
        decision,
        spec: 'x.tsx',
        outputDir: outDir,
        externalRef: 'e',
        dryRun: false,
      }),
    ).rejects.toBeInstanceOf(ProducerError);
  });
});
