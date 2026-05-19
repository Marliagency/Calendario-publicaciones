# Estudio Creativo (SESIÓN 2)

> Módulo que vive en `apps/creative-studio/`. Genera y empaqueta
> creatividades (imagen, vídeo UGC, demo de UI, lifestyle), las adapta
> a las plataformas objetivo y las empuja a la cola de QC del Social
> Calendar como `IN_REVIEW`.
>
> Ubicado **provisionalmente** en este monorepo. Plan: extraer al repo
> de la app QYRO cuando sea viable (ADR 0008). El código depende solo
> de `@qyro/shared` (Zod schemas) y env vars, portable sin reescritura.

## Índice

- [Arquitectura](#arquitectura)
- [Pipeline brief → ingest](#pipeline-brief--ingest)
- [Stack creativo: Higgsfield + HyperFrames](#stack-creativo-higgsfield--hyperframes)
- [Control de gasto](#control-de-gasto)
- [Skills custom](#skills-custom)
- [Brand brain](#brand-brain)
- [Componentes HyperFrames](#componentes-hyperframes)
- [Cómo añadir una persona / hook / componente](#extensiones)
- [Comandos CLI](#comandos-cli)
- [Troubleshooting](#troubleshooting)

## Arquitectura

```
brief (persona + format + spec)
   │
   ▼
ModelRouter           ── selecciona herramienta+modelo según formato
   │ RouterDecision { tool: 'higgsfield'|'hyperframes', model, estimatedCost }
   ▼
HiggsfieldBudgetGuard ── check soft/hard cap mensual antes de gastar
   │
   ▼
Producer              ── Higgsfield CLI o HyperFrames render
   │ ProductionResult { mediaPath, mediaType, creditsSpent }
   ▼
BrandingOverlay       ── cubre watermark + firma con logo QYRO
   │ outputPath
   ▼
Storage               ── upload al bucket S3-compatible
   │ url
   ▼
buildPlatformVariants ── adapta a N targets, recorta a PLATFORM_LIMITS
   │
   ▼
SocialCalendarClient  ── POST /api/v1/content-pieces/ingest (idempotente)
   │ IngestResult
   ▼
CreativeRun           ── rastro de auditoría completo
```

## Pipeline brief → ingest

El orquestador (`src/pipeline/orchestrator.ts`) ejecuta los 7 pasos.
En `STUDIO_DRY_RUN=true` cada paso produce un placeholder/identity,
pero la llamada al calendario es **real** — eso permite verificar el
contrato end-to-end sin Higgsfield, sin ffmpeg, sin bucket.

Test de integración real: `src/pipeline/orchestrator.integration.test.ts`
arranca `@qyro/api` en proceso (Prisma mockeado), corre 5 pipelines
completos y verifica los `CreativeRun` resultantes.

## Stack creativo: Higgsfield + HyperFrames

| Tarea                          | Herramienta                         | Coste     |
|--------------------------------|-------------------------------------|-----------|
| Imagen promocional (texto)     | Higgsfield `gpt_image_2`            | ~3 créds  |
| Imagen lifestyle               | Higgsfield `nano_banana_2`          | ~2 créds  |
| UGC talking-head               | **HyperFrames** (no HeyGen)         | 0         |
| UGC dinámico                   | Higgsfield `seedance_2_0`           | ~12 créds |
| Lifestyle cinematográfico      | Higgsfield `veo_3_1` (premium)      | ~40 créds |
| Demo UI determinista           | **HyperFrames**                     | 0         |
| Concept test A/B/C             | Higgsfield `soul_v2`                | ~1 créd   |

**HeyGen Avatar V queda fuera del stack** (decisión de esta sesión).
Razón: HyperFrames es open source, coste 0 y determinista. Si se
reintroduce, el ModelRouter case `ugc_video_talking_head` apunta a
`hyperframes` — cambiar en un sitio.

### Instalación local (no automatizable en sandbox)

```bash
# 1. Higgsfield CLI
curl -fsSL https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh | sh
higgsfield auth login
higgsfield model list --json > apps/creative-studio/src/brain/higgsfield-model-catalog.json

# 2. HyperFrames (open source de HeyGen, sin keys)
cd apps/creative-studio/hyperframes-projects
npx hyperframes init qyro-app-demos
```

## Control de gasto

`src/producers/budget-guard.ts` implementa:

| Estado            | Umbral                                       | Acción |
|-------------------|----------------------------------------------|--------|
| `allowed`         | < 70%                                        | OK silencioso |
| `warn_threshold`  | 70% - 95%                                    | Log warn, sigue |
| `premium_blocked` | ≥ 85% si el modelo está en `HIGGSFIELD_PREMIUM_MODELS` | Lanza `BudgetExceededError` |
| `hard_block`      | ≥ 95%                                        | Lanza `BudgetExceededError` |

Premium models por defecto: `veo_3_1, sora_2, kling_3_0_premium`.

> **Estado**: in-memory. Cuando exista persistencia, mover a una
> tabla `CreativeCost` con consultas por mes natural. Hasta entonces,
> el guard se reinicia cada vez que arranca el CLI.

## Skills custom

Cuatro skills en `.claude/skills/qyro-*` que encapsulan el prompt
template + hard rules de cada formato:

- `qyro-hypermotion` — lanzamiento, cortes secos.
- `qyro-ugc-testimonial` — talking-head (HyperFrames, no HeyGen).
- `qyro-lifestyle` — anuncio cinematográfico estilo Nike.
- `qyro-app-demo` — demo de UI vía HyperFrames.

Si Claude Code no las invoca tras crearlas, **cierra y reabre Claude
Code** — los SKILL.md se leen al arrancar.

## Brand brain

Vive en `src/brain/`:

| Fichero                              | Contiene                                     |
|--------------------------------------|----------------------------------------------|
| `personas/index.ts`                  | 2 personas con `PERSONA_IDS` sincronizados con el seed de Prisma del calendario. |
| `brand/tokens.ts`                    | Espejo de `packages/ui/src/tokens.ts`. Colores, radii, sombras, font stack, isotipo gradient. |
| `compliance/claims.ts`               | Regex de claims prohibidos. `assertClaimsAllowed(copy)` antes de cualquier ingest. |
| `frameworks/hooks.ts`                | Hook library: ~20 hooks con persona / pain / módulo / pilar. |
| `frameworks/content-pillars.ts`      | 5 pilares con `targetShare` (40/25/15/10/10). |
| `frameworks/posting-times.ts`        | Slots por (persona × plataforma) + `nextSlot()`. |

Assets de marca en `assets/brand/`:

- `qyro-isotype-gradient.svg` — isotipo Q con degradado oficial.
- `qyro-isotype-white.svg` — variante para fondos oscuros.
- `qyro-wordmark.svg` / `qyro-wordmark-white.svg` — wordmark.
- `qyro-watermark-cover.svg` — chip 240×80 para cubrir watermarks de
  Higgsfield (Fase 3 del brief: branding overlay).

## Componentes HyperFrames

`apps/creative-studio/hyperframes-projects/qyro-components/`:

| Componente            | Estado |
|-----------------------|--------|
| `<QyroPhoneFrame>`    | ✅     |
| `<QyroLifeScoreDonut>`| ✅     |
| `<QyroActivityRings>` | ✅     |
| `<QyroHabitRow>`      | ✅     |
| `<QyroStreakBadge>`   | ✅     |
| `<QyroBrandLockup>`   | ✅     |
| `<QyroMacroBar>`      | ⏳ TODO |
| `<QyroWorkoutSet>`    | ⏳ TODO |
| `<QyroMoodHeatmap>`   | ⏳ TODO |
| `<QyroAIChat>`        | ⏳ TODO |
| `<QyroPhotoToMacros>` | ⏳ TODO |

Tokens leídos desde `../../src/brain/brand/tokens.ts`. Cambiar
colores ahí actualiza todos los componentes en el siguiente render.

## Extensiones

### Cómo añadir una persona

1. Define la persona como `BuyerPersona` en el seed de Prisma
   (`packages/db/prisma/seed.ts`) con un `id` estable.
2. Añade su ID y brief a `apps/creative-studio/src/brain/personas/index.ts`.
3. Añade hooks específicos en `frameworks/hooks.ts`.
4. Añade slots de posting en `frameworks/posting-times.ts`.
5. Re-ejecuta `pnpm db:seed`.

### Cómo crear una skill `qyro-*` nueva

1. Crea `.claude/skills/qyro-XXXX/SKILL.md` con front-matter `name` y
   `description` y secciones: cuándo usar, cuándo NO, hard rules,
   plantilla de prompt, qué preguntar al usuario, cuando termines.
2. Si la skill mapea a un `CreativeFormat` nuevo, añadirlo a
   `src/router/model-router.ts` con su rama del `switch`.
3. Reinicia Claude Code.

### Cómo cambiar el router de modelo

Edita `src/router/model-router.ts`. Toda decisión está en un único
`switch` por formato. Cubre con test en `router/model-router.test.ts`.

### Cómo añadir un componente HyperFrames

Ver `hyperframes-projects/qyro-components/README.md`.

## Comandos CLI

Desde la raíz del monorepo:

```bash
# Healthcheck contra el calendario (esperado 401 = endpoint vivo)
pnpm --filter @qyro/creative-studio cli healthcheck

# Preguntar al router qué modelo usar
pnpm --filter @qyro/creative-studio cli route ugc_video_talking_head
pnpm --filter @qyro/creative-studio cli route lifestyle_video --premium

# Producir una pieza individual (sin ingest)
pnpm --filter @qyro/creative-studio cli produce app_demo qyro-demo.tsx \
  --ratio 9:16 --duration 22

# Pipeline completo: route → produce → overlay → storage → ingest
pnpm --filter @qyro/creative-studio cli pipeline ugc_video_talking_head

# Smoke test: ingest dry-run de pieza dummy
pnpm --filter @qyro/creative-studio cli smoke
```

## Troubleshooting

### "Calendar returned 500 after N attempts"
El server del calendario está respondiendo pero falla persistencia.
Verifica que el calendario tenga Postgres + Redis arriba
(`pnpm infra:up`) y migraciones aplicadas (`pnpm db:migrate`).

### "UNAUTHENTICATED: revisa INGEST_SERVICE_API_KEY"
Las claves del calendario y del estudio no coinciden. **Mismo valor**
en `INGEST_SERVICE_API_KEY` (calendario) y
`SOCIAL_CALENDAR_SERVICE_API_KEY` (estudio).

### "BudgetGuard bloqueó producción"
Cap mensual al 95% o pieza premium con cap al 85%. Opciones:
- Esperar al cambio de mes (el guard se reiniciará).
- Subir `HIGGSFIELD_MONTHLY_CREDIT_BUDGET` en `.env`.
- Generar con un modelo no-premium pasando otro `format` al router.

### "BrandingOverlay.apply real mode no implementado"
Estás en modo no-dry-run pero el overlay real requiere `ffmpeg` en
PATH + isotipo PNG renderizado desde el SVG en `assets/brand/`.
Hasta que ambos existan, mantén `STUDIO_DRY_RUN=true`.

### "hyperframes CLI spawn error"
HyperFrames no está instalado. Ejecuta
`cd apps/creative-studio/hyperframes-projects && npx hyperframes init qyro-app-demos`.
Requiere FFmpeg también (`apt install ffmpeg`).

### Cobertura de tests
`pnpm --filter @qyro/creative-studio test` corre tests unitarios e
integración (50+). Si el integration test falla, busca primero
errores level=50 en stdout del API mockeado.
