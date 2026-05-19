#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { PERSONA_IDS } from './brain/personas/index.js';
import { SocialCalendarClient } from './clients/social-calendar.js';
import { loadConfig } from './config.js';
import { logger } from './logger.js';
import { ModelRouter } from './router/model-router.js';

/**
 * CLI mínimo del Estudio Creativo. Subcomandos:
 *   - healthcheck → comprueba que el calendario responde 401 sin key.
 *   - route       → pide al router el modelo para un formato dado.
 *   - smoke       → ingest dry-run de una pieza dummy en el calendario.
 */

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd || cmd === 'help' || cmd === '--help') {
    printHelp();
    return;
  }

  const cfg = loadConfig();

  if (cmd === 'healthcheck') {
    const client = new SocialCalendarClient({
      baseUrl: cfg.SOCIAL_CALENDAR_BASE_URL,
      serviceApiKey: cfg.SOCIAL_CALENDAR_SERVICE_API_KEY,
      timeoutMs: cfg.SOCIAL_CALENDAR_TIMEOUT_S * 1000,
      maxRetries: 0,
    });
    const h = await client.healthcheck();
    logger.info(h, 'healthcheck');
    process.exitCode = h.ok ? 0 : 1;
    return;
  }

  if (cmd === 'route') {
    const format = args[0];
    if (!format) {
      console.error('Uso: route <format> [--premium]');
      process.exitCode = 2;
      return;
    }
    const allowPremium = args.includes('--premium');
    const router = new ModelRouter(cfg);
    const decision = router.route({
      format: format as Parameters<typeof router.route>[0]['format'],
      allowPremium,
    });
    console.log(JSON.stringify(decision, null, 2));
    return;
  }

  if (cmd === 'smoke') {
    const client = new SocialCalendarClient({
      baseUrl: cfg.SOCIAL_CALENDAR_BASE_URL,
      serviceApiKey: cfg.SOCIAL_CALENDAR_SERVICE_API_KEY,
      timeoutMs: cfg.SOCIAL_CALENDAR_TIMEOUT_S * 1000,
      maxRetries: cfg.SOCIAL_CALENDAR_MAX_RETRIES,
    });
    const externalRef = randomUUID();
    const result = await client.ingest({
      external_ref: externalRef,
      title: 'Smoke test del Estudio Creativo',
      format: 'ugc_video',
      buyer_persona_ids: [PERSONA_IDS.OPTIMIZADOR_CONSCIENTE],
      framework_used: 'ugc_15s',
      hook_used: '5-apps-fragmentadas',
      platform_variants: {
        tiktok: {
          media_url: 'https://placeholder.qyro.app/creative/smoke.mp4',
          ratio: '9:16',
          duration_s: 20,
          caption: 'POV: 5 apps de salud abiertas y ninguna te dice si vas bien',
          hashtags: ['qyro', 'productividad', 'habitos'],
        },
      },
      creative_run_metadata: {
        smoke_test: true,
        dry_run: cfg.STUDIO_DRY_RUN,
      },
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.outcome === 'rejected' ? 1 : 0;
    return;
  }

  console.error(`Comando desconocido: ${cmd}`);
  printHelp();
  process.exitCode = 2;
}

function printHelp() {
  console.log(`
@qyro/creative-studio CLI

Subcomandos:
  healthcheck                Verifica que el Social Calendar responde.
  route <format> [--premium] Pregunta al router qué modelo usar.
                             Formatos: static_image_with_text, static_image_lifestyle,
                             ugc_video_talking_head, ugc_video_dynamic,
                             lifestyle_video, app_demo, concept_test
  smoke                      Ingest dry-run de una pieza dummy.
  help                       Esta ayuda.
`);
}

main().catch((err) => {
  logger.error({ err }, 'CLI falló');
  process.exitCode = 1;
});
