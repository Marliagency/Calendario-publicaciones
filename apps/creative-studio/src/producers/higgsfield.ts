import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../logger.js';
import type { RouterDecision } from '../router/model-router.js';
import { type BudgetCheckResult, BudgetExceededError, type HiggsfieldBudgetGuard } from './budget-guard.js';
import { type Producer, ProducerError, type ProductionRequest, type ProductionResult } from './types.js';

/**
 * Productor Higgsfield. En modo real invoca `higgsfield generate --json`
 * y parsea la respuesta. En dry-run, devuelve un placeholder determinista
 * basado en hash(externalRef + model + spec) — útil para tests sin CLI.
 *
 * Modelos de Higgsfield esperados por router:
 *   gpt_image_2, nano_banana_2, seedance_2_0, veo_3_1, soul_v2.
 */

const VIDEO_MODELS = new Set([
  'seedance_2_0',
  'veo_3_1',
  'sora_2',
  'kling_3_0_premium',
  'soul_v2',
]);

export interface HiggsfieldRunner {
  /** Invoca el CLI de Higgsfield y devuelve el JSON parseado. */
  invoke(args: string[], opts: { timeoutMs: number }): Promise<HiggsfieldCliResult>;
}

export interface HiggsfieldCliResult {
  output_url: string;
  credits_spent: number;
  duration_s: number;
  raw: Record<string, unknown>;
}

/** Runner real: ejecuta el binario `higgsfield` por child_process. */
export class HiggsfieldCliRunner implements HiggsfieldRunner {
  constructor(private readonly binary = 'higgsfield') {}

  invoke(args: string[], opts: { timeoutMs: number }): Promise<HiggsfieldCliResult> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new ProducerError(`higgsfield CLI timeout >${opts.timeoutMs}ms`, 'higgsfield'));
      }, opts.timeoutMs);
      proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(new ProducerError(`higgsfield CLI spawn error: ${err.message}`, 'higgsfield', err));
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(
            new ProducerError(
              `higgsfield CLI exit ${code}: ${stderr.slice(0, 500)}`,
              'higgsfield',
            ),
          );
          return;
        }
        try {
          const parsed = JSON.parse(stdout) as HiggsfieldCliResult;
          resolve(parsed);
        } catch (err) {
          reject(
            new ProducerError(
              `higgsfield CLI JSON parse error: ${(err as Error).message}. stdout=${stdout.slice(0, 200)}`,
              'higgsfield',
              err,
            ),
          );
        }
      });
    });
  }
}

export class HiggsfieldProducer implements Producer {
  readonly name = 'higgsfield';

  constructor(
    private readonly budgetGuard: HiggsfieldBudgetGuard,
    private readonly runner: HiggsfieldRunner = new HiggsfieldCliRunner(),
    private readonly defaultTimeoutMs = 5 * 60 * 1000,
  ) {}

  canHandle(decision: RouterDecision): boolean {
    return decision.tool === 'higgsfield';
  }

  async produce(req: ProductionRequest): Promise<ProductionResult> {
    if (!this.canHandle(req.decision)) {
      throw new ProducerError(
        `HiggsfieldProducer no maneja tool=${req.decision.tool}`,
        'higgsfield',
      );
    }

    const check = this.budgetGuard.check(req.decision.estimatedCost, req.decision.model);
    if (!check.allowed) {
      logger.warn({ check, externalRef: req.externalRef }, 'BudgetGuard bloqueó producción');
      throw new BudgetExceededError(check.message ?? 'budget exceeded', check);
    }
    if (check.reason === 'warn_threshold') {
      logger.warn({ check, externalRef: req.externalRef }, 'BudgetGuard warn — sigue adelante');
    }

    await mkdir(req.outputDir, { recursive: true });
    const isVideo = VIDEO_MODELS.has(req.decision.model);
    const ext = isVideo ? 'mp4' : 'png';
    const filename = `${req.externalRef}-${req.decision.model}.${ext}`;
    const outPath = path.join(req.outputDir, filename);

    if (req.dryRun) {
      return this.dryRunResult(req, outPath, isVideo, check);
    }

    const args = ['generate', '--model', req.decision.model, '--prompt', req.spec, '--json'];
    if (req.ratio) args.push('--ratio', req.ratio);
    if (req.durationS && isVideo) args.push('--duration', String(req.durationS));

    const cli = await this.runner.invoke(args, { timeoutMs: this.defaultTimeoutMs });

    // TODO: descargar cli.output_url a outPath cuando integremos storage.
    // De momento devolvemos el output_url como mediaPath (asume URL servible).
    this.budgetGuard.recordSpend(cli.credits_spent, {
      model: req.decision.model,
      externalRef: req.externalRef,
    });

    return {
      mediaPath: cli.output_url,
      mediaType: isVideo ? 'video' : 'image',
      durationS: cli.duration_s,
      creditsSpent: cli.credits_spent,
      costUnit: 'credits',
      dryRun: false,
      rawMetadata: cli.raw,
    };
  }

  private async dryRunResult(
    req: ProductionRequest,
    outPath: string,
    isVideo: boolean,
    check: BudgetCheckResult,
  ): Promise<ProductionResult> {
    const hash = createHash('sha256')
      .update(`${req.externalRef}|${req.decision.model}|${req.spec}`)
      .digest('hex')
      .slice(0, 16);

    // Placeholder: fichero sintético con metadata para inspección manual.
    const placeholder = JSON.stringify(
      {
        dryRun: true,
        producer: 'higgsfield',
        model: req.decision.model,
        promptHash: hash,
        ratio: req.ratio,
        durationS: req.durationS ?? 0,
      },
      null,
      2,
    );
    await writeFile(outPath, placeholder, 'utf-8');

    this.budgetGuard.recordSpend(0, {
      model: `${req.decision.model}__dryrun`,
      externalRef: req.externalRef,
    });

    return {
      mediaPath: outPath,
      mediaType: isVideo ? 'video' : 'image',
      durationS: req.durationS ?? 0,
      creditsSpent: 0,
      costUnit: 'free',
      dryRun: true,
      rawMetadata: {
        wouldHaveSpent: req.decision.estimatedCost,
        budgetCheck: check,
        promptHash: hash,
        cliArgsPreview: ['generate', '--model', req.decision.model, '--prompt', '<spec>', '--json'],
      },
    };
  }
}
