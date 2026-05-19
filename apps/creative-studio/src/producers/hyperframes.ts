import { spawn } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../logger.js';
import type { RouterDecision } from '../router/model-router.js';
import {
  type Producer,
  ProducerError,
  type ProductionRequest,
  type ProductionResult,
} from './types.js';

/**
 * Productor HyperFrames: renderiza vídeo HTML→MP4 local con coste 0.
 *
 * Sustituye al HeyGen Avatar V del brief original (decisión de esta
 * sesión). Cubre dos formatos del router:
 *   - app_demo                — composición HTML deterministe.
 *   - ugc_video_talking_head  — composición con avatar JSX/HTML local.
 *
 * Modo real: invoca `npx hyperframes render <projectDir>/<spec>.tsx`.
 * Dry-run: escribe placeholder, devuelve coste 0.
 */

export interface HyperFramesRunner {
  invoke(args: string[], opts: { cwd: string; timeoutMs: number }): Promise<HyperFramesCliResult>;
}

export interface HyperFramesCliResult {
  output_path: string;
  duration_s: number;
  raw: Record<string, unknown>;
}

export class HyperFramesCliRunner implements HyperFramesRunner {
  constructor(private readonly binary = 'npx') {}

  invoke(args: string[], opts: { cwd: string; timeoutMs: number }): Promise<HyperFramesCliResult> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.binary, ['hyperframes', ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: opts.cwd,
      });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new ProducerError(`hyperframes CLI timeout >${opts.timeoutMs}ms`, 'hyperframes'));
      }, opts.timeoutMs);
      proc.stdout.on('data', (c) => {
        stdout += c.toString();
      });
      proc.stderr.on('data', (c) => {
        stderr += c.toString();
      });
      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(
          new ProducerError(`hyperframes CLI spawn error: ${err.message}`, 'hyperframes', err),
        );
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(
            new ProducerError(
              `hyperframes CLI exit ${code}: ${stderr.slice(0, 500)}`,
              'hyperframes',
            ),
          );
          return;
        }
        // hyperframes imprime la ruta del MP4 al final del stdout, en JSON al
        // menos en versiones recientes. Si el contrato cambia, actualizar aquí.
        try {
          const lastLine = stdout.trim().split('\n').filter(Boolean).pop() ?? '{}';
          const parsed = JSON.parse(lastLine) as HyperFramesCliResult;
          resolve(parsed);
        } catch (err) {
          reject(
            new ProducerError(
              `hyperframes JSON parse error: ${(err as Error).message}. tail=${stdout.slice(-200)}`,
              'hyperframes',
              err,
            ),
          );
        }
      });
    });
  }
}

export class HyperFramesProducer implements Producer {
  readonly name = 'hyperframes';

  constructor(
    /** Directorio raíz del proyecto HyperFrames (donde vive `npx hyperframes init`). */
    private readonly projectDir: string,
    private readonly runner: HyperFramesRunner = new HyperFramesCliRunner(),
    private readonly defaultTimeoutMs = 5 * 60 * 1000,
  ) {}

  canHandle(decision: RouterDecision): boolean {
    return decision.tool === 'hyperframes';
  }

  async produce(req: ProductionRequest): Promise<ProductionResult> {
    if (!this.canHandle(req.decision)) {
      throw new ProducerError(
        `HyperFramesProducer no maneja tool=${req.decision.tool}`,
        'hyperframes',
      );
    }

    await mkdir(req.outputDir, { recursive: true });
    const filename = `${req.externalRef}-hyperframes.mp4`;
    const outPath = path.join(req.outputDir, filename);

    if (req.dryRun) {
      const placeholder = JSON.stringify(
        {
          dryRun: true,
          producer: 'hyperframes',
          spec: req.spec,
          ratio: req.ratio,
          durationS: req.durationS ?? 0,
        },
        null,
        2,
      );
      await writeFile(outPath, placeholder, 'utf-8');
      logger.info(
        { externalRef: req.externalRef, outPath, dryRun: true },
        'hyperframes dry-run placeholder escrito',
      );
      return {
        mediaPath: outPath,
        mediaType: 'video',
        durationS: req.durationS ?? 0,
        creditsSpent: 0,
        costUnit: 'free',
        dryRun: true,
        rawMetadata: { spec: req.spec, projectDir: this.projectDir },
      };
    }

    // Modo real
    try {
      await access(this.projectDir);
    } catch {
      throw new ProducerError(
        `HyperFrames projectDir no existe: ${this.projectDir}. Ejecuta \`npx hyperframes init\`.`,
        'hyperframes',
      );
    }

    const args = ['render', req.spec, '--out', outPath];
    if (req.ratio) args.push('--ratio', req.ratio);
    if (req.durationS) args.push('--duration', String(req.durationS));

    const cli = await this.runner.invoke(args, {
      cwd: this.projectDir,
      timeoutMs: this.defaultTimeoutMs,
    });

    return {
      mediaPath: cli.output_path,
      mediaType: 'video',
      durationS: cli.duration_s,
      creditsSpent: 0,
      costUnit: 'free',
      dryRun: false,
      rawMetadata: cli.raw,
    };
  }
}
