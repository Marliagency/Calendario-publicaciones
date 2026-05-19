import type { RouterDecision } from '../router/model-router.js';

/**
 * Productores: dada una decisión del router + un prompt, devuelven un
 * fichero de media listo para subir al bucket del estudio (que después
 * pasa por el branding overlay y se referencia en el ingest como
 * `media_url`).
 */

export interface ProductionRequest {
  /** Decisión del router (qué herramienta + modelo). */
  decision: RouterDecision;
  /** Prompt o spec en string. Para HyperFrames es la ruta al template HTML. */
  spec: string;
  /** Directorio de salida absoluto. Se crea si no existe. */
  outputDir: string;
  /** UUID del CreativeRun, usado como nombre de fichero. */
  externalRef: string;
  /** Si true, no se invoca la CLI: devuelve placeholder determinista. */
  dryRun: boolean;
  /** Duración objetivo en segundos (vídeo). Ignorado en imagen. */
  durationS?: number;
  /** Ratio (9:16, 1:1, 4:5, 16:9). Necesario para la inferencia del producer. */
  ratio?: '9:16' | '1:1' | '4:5' | '16:9';
}

export interface ProductionResult {
  /** Ruta absoluta al fichero generado (o placeholder). */
  mediaPath: string;
  /** Tipo del fichero. */
  mediaType: 'image' | 'video';
  /** Duración real en segundos (0 para imagen). */
  durationS: number;
  /** Coste real. Para dry-run, el coste que SE HABRÍA gastado. */
  creditsSpent: number;
  costUnit: 'credits' | 'usd' | 'free';
  /** Si fue dry-run. */
  dryRun: boolean;
  /** Metadatos crudos del productor para CreativeRun.creativeRunMetadata. */
  rawMetadata: Record<string, unknown>;
}

export interface Producer {
  readonly name: string;
  canHandle(decision: RouterDecision): boolean;
  produce(req: ProductionRequest): Promise<ProductionResult>;
}

export class ProducerError extends Error {
  constructor(
    msg: string,
    public readonly producer: string,
    public override readonly cause?: unknown,
  ) {
    super(msg);
    this.name = 'ProducerError';
  }
}
