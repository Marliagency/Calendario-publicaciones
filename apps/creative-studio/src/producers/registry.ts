import type { Config } from '../config.js';
import { ModelRouter, type RouterDecision, type RouterInput } from '../router/model-router.js';
import { HiggsfieldBudgetGuard } from './budget-guard.js';
import { HiggsfieldProducer } from './higgsfield.js';
import { HyperFramesProducer } from './hyperframes.js';
import { type Producer, ProducerError, type ProductionRequest, type ProductionResult } from './types.js';

/**
 * Registro de productores: une router + budget guard + producers y
 * expone `routeAndProduce(input, prompt)` como API de alto nivel.
 *
 * El estudio creativo usa esto desde la CLI (`produce`) y desde el
 * pipeline orquestado (cuando se implemente la Fase 7-8).
 */

export interface RegistryOptions {
  /** Si true (default si STUDIO_DRY_RUN), no se invoca CLI real. */
  dryRun: boolean;
  /** Dónde escribir media output. */
  outputDir: string;
  /** Dónde vive el proyecto HyperFrames. */
  hyperframesProjectDir: string;
  /** Override del BudgetGuard (útil para tests). */
  budgetGuard?: HiggsfieldBudgetGuard;
}

export class ProducerRegistry {
  readonly router: ModelRouter;
  readonly budgetGuard: HiggsfieldBudgetGuard;
  private readonly producers: Producer[];

  constructor(
    private readonly cfg: Config,
    private readonly opts: RegistryOptions,
  ) {
    this.router = new ModelRouter(cfg);
    this.budgetGuard = opts.budgetGuard ?? new HiggsfieldBudgetGuard(cfg);
    this.producers = [
      new HiggsfieldProducer(this.budgetGuard),
      new HyperFramesProducer(opts.hyperframesProjectDir),
    ];
  }

  /** Selecciona el productor apropiado para la decisión del router. */
  pickProducer(decision: RouterDecision): Producer {
    const p = this.producers.find((x) => x.canHandle(decision));
    if (!p) {
      throw new ProducerError(
        `Ningún productor maneja tool=${decision.tool}`,
        'registry',
      );
    }
    return p;
  }

  /**
   * Routea + produce en un paso. Esta es la API que usa el pipeline.
   */
  async routeAndProduce(
    input: RouterInput,
    req: Omit<ProductionRequest, 'decision' | 'dryRun' | 'outputDir'>,
  ): Promise<{ decision: RouterDecision; result: ProductionResult }> {
    const decision = this.router.route(input);
    const producer = this.pickProducer(decision);
    const result = await producer.produce({
      ...req,
      decision,
      dryRun: this.opts.dryRun,
      outputDir: this.opts.outputDir,
    });
    return { decision, result };
  }
}
