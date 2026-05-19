import type { Config } from '../config.js';

/**
 * Router de modelo para el Estudio Creativo.
 *
 * Decisión clave (sesión actual): HeyGen Avatar V queda fuera del stack.
 * El UGC talking-head se cubre con HyperFrames (HTML → MP4 local, coste 0).
 * El UGC con escena dinámica sigue en Higgsfield Seedance 2.0.
 *
 * Modelos premium (Veo 3.1, Sora 2, Kling 3.0 premium) están en la lista
 * `premiumModels` y NO se pueden seleccionar automáticamente — requieren
 * `allowPremium: true` explícito en el call site.
 */

export type CreativeFormat =
  | 'static_image_with_text'
  | 'static_image_lifestyle'
  | 'ugc_video_talking_head'
  | 'ugc_video_dynamic'
  | 'lifestyle_video'
  | 'app_demo'
  | 'concept_test';

export type RenderTool = 'higgsfield' | 'hyperframes';

export interface RouterInput {
  format: CreativeFormat;
  allowPremium?: boolean;
}

export interface RouterDecision {
  tool: RenderTool;
  /** Identificador del modelo dentro de la tool. Para hyperframes es 'native'. */
  model: string;
  /** Estimación de créditos/USD/0. */
  estimatedCostUnit: 'credits' | 'usd' | 'free';
  estimatedCost: number;
  /** Razón legible de la decisión, queda en CreativeRun.routerDecision. */
  rationale: string;
  /** Si el modelo es premium y se ha permitido vía allowPremium. */
  isPremium: boolean;
}

export class ModelRouter {
  constructor(private readonly cfg: Config) {}

  route(input: RouterInput): RouterDecision {
    const premium = new Set(this.cfg.HIGGSFIELD_PREMIUM_MODELS);

    switch (input.format) {
      case 'static_image_with_text':
        return {
          tool: 'higgsfield',
          model: 'gpt_image_2',
          estimatedCostUnit: 'credits',
          estimatedCost: 3,
          rationale: 'product-photoshoot con gpt_image_2 — limpio para texto on-image',
          isPremium: false,
        };
      case 'static_image_lifestyle':
        return {
          tool: 'higgsfield',
          model: 'nano_banana_2',
          estimatedCostUnit: 'credits',
          estimatedCost: 2,
          rationale: 'lifestyle sin texto — nano_banana_2 más barato fotorealista',
          isPremium: false,
        };
      case 'ugc_video_talking_head':
        return {
          tool: 'hyperframes',
          model: 'native',
          estimatedCostUnit: 'free',
          estimatedCost: 0,
          rationale: 'UGC talking-head vía HyperFrames (HTML→MP4 local, sin HeyGen). Coste 0.',
          isPremium: false,
        };
      case 'ugc_video_dynamic':
        return {
          tool: 'higgsfield',
          model: 'seedance_2_0',
          estimatedCostUnit: 'credits',
          estimatedCost: 12,
          rationale: 'UGC dinámico — seedance_2_0 (mejor física, cámara handheld)',
          isPremium: false,
        };
      case 'lifestyle_video': {
        const model = 'veo_3_1';
        const isPremium = premium.has(model);
        if (isPremium && !input.allowPremium) {
          throw new ModelRouterPremiumBlocked(
            `lifestyle_video requiere ${model} (premium). Pasa allowPremium: true para confirmar.`,
            model,
          );
        }
        return {
          tool: 'higgsfield',
          model,
          estimatedCostUnit: 'credits',
          estimatedCost: 40,
          rationale: 'lifestyle cinematográfico — veo_3_1 (premium, autorizado)',
          isPremium,
        };
      }
      case 'app_demo':
        return {
          tool: 'hyperframes',
          model: 'native',
          estimatedCostUnit: 'free',
          estimatedCost: 0,
          rationale: 'demo de UI determinista — HyperFrames, brand-accurate',
          isPremium: false,
        };
      case 'concept_test':
        return {
          tool: 'higgsfield',
          model: 'soul_v2',
          estimatedCostUnit: 'credits',
          estimatedCost: 1,
          rationale: 'concept test A/B/C — soul_v2 barato antes de gastar en premium',
          isPremium: false,
        };
    }
  }
}

export class ModelRouterPremiumBlocked extends Error {
  constructor(
    msg: string,
    public readonly model: string,
  ) {
    super(msg);
    this.name = 'ModelRouterPremiumBlocked';
  }
}
