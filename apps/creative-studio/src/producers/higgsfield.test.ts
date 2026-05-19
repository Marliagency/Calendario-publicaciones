import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouterDecision } from '../router/model-router.js';
import { BudgetExceededError, HiggsfieldBudgetGuard } from './budget-guard.js';
import { HiggsfieldProducer, type HiggsfieldRunner } from './higgsfield.js';
import { ProducerError } from './types.js';

const guardCfg = {
  HIGGSFIELD_MONTHLY_CREDIT_BUDGET: 1000,
  HIGGSFIELD_SOFT_WARN_AT_PCT: 70,
  HIGGSFIELD_HARD_BLOCK_AT_PCT: 95,
  HIGGSFIELD_PREMIUM_MODELS: ['veo_3_1', 'sora_2'],
};

const videoDecision: RouterDecision = {
  tool: 'higgsfield',
  model: 'seedance_2_0',
  estimatedCostUnit: 'credits',
  estimatedCost: 12,
  rationale: 'test',
  isPremium: false,
};

const imageDecision: RouterDecision = {
  tool: 'higgsfield',
  model: 'gpt_image_2',
  estimatedCostUnit: 'credits',
  estimatedCost: 3,
  rationale: 'test',
  isPremium: false,
};

let outDir: string;

beforeEach(async () => {
  outDir = await mkdtemp(path.join(tmpdir(), 'creative-studio-test-'));
});

afterEach(async () => {
  await rm(outDir, { recursive: true, force: true });
});

describe('HiggsfieldProducer dry-run', () => {
  it('genera placeholder mp4 para modelo de vídeo', async () => {
    const guard = new HiggsfieldBudgetGuard(guardCfg);
    const runner: HiggsfieldRunner = { invoke: vi.fn() };
    const p = new HiggsfieldProducer(guard, runner);

    const res = await p.produce({
      decision: videoDecision,
      spec: 'POV: 5 apps abiertas',
      outputDir: outDir,
      externalRef: 'ext-1',
      dryRun: true,
      durationS: 22,
      ratio: '9:16',
    });

    expect(res.dryRun).toBe(true);
    expect(res.mediaType).toBe('video');
    expect(res.creditsSpent).toBe(0);
    expect(res.costUnit).toBe('free');
    expect(res.mediaPath).toMatch(/ext-1-seedance_2_0\.mp4$/);
    expect(res.rawMetadata.wouldHaveSpent).toBe(12);

    const content = JSON.parse(await readFile(res.mediaPath, 'utf-8')) as { dryRun: boolean };
    expect(content.dryRun).toBe(true);
    expect(runner.invoke).not.toHaveBeenCalled();
  });

  it('genera placeholder png para modelo de imagen', async () => {
    const guard = new HiggsfieldBudgetGuard(guardCfg);
    const p = new HiggsfieldProducer(guard, { invoke: vi.fn() });
    const res = await p.produce({
      decision: imageDecision,
      spec: 'mockup iPhone',
      outputDir: outDir,
      externalRef: 'ext-2',
      dryRun: true,
      ratio: '1:1',
    });
    expect(res.mediaType).toBe('image');
    expect(res.mediaPath).toMatch(/ext-2-gpt_image_2\.png$/);
  });

  it('rechaza decisión que no es higgsfield', async () => {
    const guard = new HiggsfieldBudgetGuard(guardCfg);
    const p = new HiggsfieldProducer(guard, { invoke: vi.fn() });
    await expect(
      p.produce({
        decision: { ...videoDecision, tool: 'hyperframes' },
        spec: 'x',
        outputDir: outDir,
        externalRef: 'e',
        dryRun: true,
      }),
    ).rejects.toBeInstanceOf(ProducerError);
  });

  it('respeta el BudgetGuard: hard block lanza BudgetExceededError sin invocar runner', async () => {
    const guard = new HiggsfieldBudgetGuard(guardCfg, 990); // 99%
    const runner: HiggsfieldRunner = { invoke: vi.fn() };
    const p = new HiggsfieldProducer(guard, runner);
    await expect(
      p.produce({
        decision: videoDecision,
        spec: 'x',
        outputDir: outDir,
        externalRef: 'e',
        dryRun: true,
      }),
    ).rejects.toBeInstanceOf(BudgetExceededError);
    expect(runner.invoke).not.toHaveBeenCalled();
  });
});

describe('HiggsfieldProducer modo real', () => {
  it('invoca CLI con args correctos y registra spend', async () => {
    const guard = new HiggsfieldBudgetGuard(guardCfg);
    const runner: HiggsfieldRunner = {
      invoke: vi.fn().mockResolvedValue({
        output_url: 'https://higgsfield.example.com/out/abc.mp4',
        credits_spent: 12,
        duration_s: 22,
        raw: { jobId: 'job-1' },
      }),
    };
    const p = new HiggsfieldProducer(guard, runner);

    const res = await p.produce({
      decision: videoDecision,
      spec: 'POV',
      outputDir: outDir,
      externalRef: 'ext-real',
      dryRun: false,
      durationS: 22,
      ratio: '9:16',
    });

    expect(res.dryRun).toBe(false);
    expect(res.creditsSpent).toBe(12);
    expect(res.mediaPath).toBe('https://higgsfield.example.com/out/abc.mp4');
    expect(runner.invoke).toHaveBeenCalledOnce();
    const args = (runner.invoke as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string[];
    expect(args).toContain('--model');
    expect(args).toContain('seedance_2_0');
    expect(args).toContain('--ratio');
    expect(args).toContain('9:16');
    expect(args).toContain('--duration');
    expect(args).toContain('22');
    expect(guard.status().spent).toBe(12);
  });

  it('propaga error del CLI envuelto como ProducerError', async () => {
    const guard = new HiggsfieldBudgetGuard(guardCfg);
    const runner: HiggsfieldRunner = {
      invoke: vi.fn().mockRejectedValue(new ProducerError('cli broke', 'higgsfield')),
    };
    const p = new HiggsfieldProducer(guard, runner);
    await expect(
      p.produce({
        decision: videoDecision,
        spec: 'x',
        outputDir: outDir,
        externalRef: 'e',
        dryRun: false,
      }),
    ).rejects.toBeInstanceOf(ProducerError);
    expect(guard.status().spent).toBe(0);
  });
});
