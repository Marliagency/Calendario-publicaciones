import { setTimeout as sleep } from 'node:timers/promises';
import { logger } from '../logger.js';
import type { HiggsfieldCliResult, HiggsfieldRunner } from './higgsfield.js';
import { ProducerError } from './types.js';

/**
 * Runner HTTP de Higgsfield — alternativa al CLI runner.
 *
 * Higgsfield expone su plataforma vía API REST con auth de pareja
 * (`HIGGSFIELD_API_ID` + `HIGGSFIELD_API_SECRET`). Usa esta clase
 * en lugar de `HiggsfieldCliRunner` cuando NO quieras depender
 * del binario local — útil para producción / docker.
 *
 * Contrato asumido (a ajustar contra docs oficiales una vez
 * confirmemos endpoints):
 *
 *   POST {baseUrl}/v1/generations
 *   Headers:
 *     X-Api-Id: <UUID>
 *     X-Api-Secret: <64-hex>
 *     Content-Type: application/json
 *   Body: { model, prompt, ratio?, duration_s? }
 *
 *   Respuesta inmediata (job creation):
 *     202 { id, status: "queued", poll_url: "/v1/generations/{id}" }
 *
 *   Polling hasta status="completed":
 *     200 { id, status, output_url?, credits_spent?, duration_s? }
 *
 * Si la API real difiere (otro path, otros headers de auth como
 * Basic, otro shape JSON), basta tocar este fichero. El resto
 * del pipeline NO cambia.
 */

export interface HiggsfieldHttpRunnerOptions {
  baseUrl: string;
  apiId: string;
  apiSecret: string;
  /** Polling interval mientras el job no esté completed. */
  pollIntervalMs?: number;
  /** Timeout total del polling (default 5 min). */
  pollTimeoutMs?: number;
  /** Override para tests. */
  fetchImpl?: typeof fetch;
}

interface JobResponse {
  id?: string;
  status?: string;
  output_url?: string;
  credits_spent?: number;
  duration_s?: number;
  poll_url?: string;
  error?: string;
  raw?: Record<string, unknown>;
}

export class HiggsfieldHttpRunner implements HiggsfieldRunner {
  private readonly fetchImpl: typeof fetch;
  private readonly pollIntervalMs: number;
  private readonly pollTimeoutMs: number;

  constructor(private readonly opts: HiggsfieldHttpRunnerOptions) {
    if (!opts.apiId || !opts.apiSecret) {
      throw new ProducerError(
        'HiggsfieldHttpRunner: faltan HIGGSFIELD_API_ID o HIGGSFIELD_API_SECRET',
        'higgsfield',
      );
    }
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.pollIntervalMs = opts.pollIntervalMs ?? 4_000;
    this.pollTimeoutMs = opts.pollTimeoutMs ?? 5 * 60 * 1000;
  }

  async invoke(args: string[], opts: { timeoutMs: number }): Promise<HiggsfieldCliResult> {
    // Parsear los args en formato CLI a parámetros HTTP.
    // El runner CLI usa: generate --model X --prompt Y --ratio R --duration N --json
    const payload = parseCliArgsToBody(args);

    const submitUrl = new URL('/v1/generations', this.opts.baseUrl).toString();
    logger.info({ submitUrl, model: payload.model }, 'higgsfield HTTP submit');

    const submit = await this.fetchImpl(submitUrl, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });

    if (!submit.ok) {
      const text = await safeText(submit);
      throw new ProducerError(
        `higgsfield HTTP submit failed ${submit.status}: ${text.slice(0, 500)}`,
        'higgsfield',
      );
    }

    const job = (await submit.json()) as JobResponse;
    if (!job.id) {
      throw new ProducerError('higgsfield HTTP submit returned no id', 'higgsfield');
    }

    // Si la respuesta inmediata ya trae el output_url (modelo sync), devolver.
    if (job.status === 'completed' && job.output_url) {
      return this.toResult(job);
    }

    // Polling.
    const pollUrl = job.poll_url
      ? new URL(job.poll_url, this.opts.baseUrl).toString()
      : new URL(`/v1/generations/${job.id}`, this.opts.baseUrl).toString();

    const startedAt = Date.now();
    const overallTimeout = Math.min(this.pollTimeoutMs, opts.timeoutMs);

    while (Date.now() - startedAt < overallTimeout) {
      await sleep(this.pollIntervalMs);
      const pollRes = await this.fetchImpl(pollUrl, {
        method: 'GET',
        headers: this.authHeaders(),
      });
      if (!pollRes.ok) {
        const text = await safeText(pollRes);
        // Errores 5xx → seguir polleando; 4xx → abortar.
        if (pollRes.status >= 500) {
          logger.warn({ status: pollRes.status, jobId: job.id }, 'higgsfield poll 5xx, retry');
          continue;
        }
        throw new ProducerError(
          `higgsfield HTTP poll failed ${pollRes.status}: ${text.slice(0, 500)}`,
          'higgsfield',
        );
      }
      const status = (await pollRes.json()) as JobResponse;
      if (status.status === 'completed' && status.output_url) {
        return this.toResult({ ...status, id: job.id });
      }
      if (status.status === 'failed' || status.error) {
        throw new ProducerError(
          `higgsfield job ${job.id} failed: ${status.error ?? 'unknown'}`,
          'higgsfield',
        );
      }
      logger.debug({ jobId: job.id, status: status.status }, 'higgsfield job pending');
    }

    throw new ProducerError(`higgsfield job ${job.id} timeout >${overallTimeout}ms`, 'higgsfield');
  }

  private authHeaders(): Record<string, string> {
    // Probamos primero con headers explícitos X-Api-Id / X-Api-Secret.
    // Si la API real usa Authorization: Basic, cambiar aquí.
    return {
      'Content-Type': 'application/json',
      'X-Api-Id': this.opts.apiId,
      'X-Api-Secret': this.opts.apiSecret,
    };
  }

  private toResult(job: JobResponse): HiggsfieldCliResult {
    if (!job.output_url) {
      throw new ProducerError('higgsfield job completed without output_url', 'higgsfield');
    }
    return {
      output_url: job.output_url,
      credits_spent: job.credits_spent ?? 0,
      duration_s: job.duration_s ?? 0,
      raw: { jobId: job.id, ...(job.raw ?? {}) },
    };
  }
}

interface HiggsfieldHttpBody {
  model: string;
  prompt: string;
  ratio?: string;
  duration_s?: number;
}

function parseCliArgsToBody(args: string[]): HiggsfieldHttpBody {
  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const model = get('--model') ?? '';
  const prompt = get('--prompt') ?? '';
  const ratio = get('--ratio');
  const durationStr = get('--duration');
  const body: HiggsfieldHttpBody = { model, prompt };
  if (ratio) body.ratio = ratio;
  if (durationStr) body.duration_s = Number(durationStr);
  return body;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<no body>';
  }
}
