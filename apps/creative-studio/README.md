# @qyro/creative-studio

Estudio creativo agéntico de QYRO. Genera y empaqueta creatividades
(imagen, vídeo UGC, demos de UI, lifestyle) y las **empuja** a la
cola de QC del Social Calendar como `IN_REVIEW`.

> Vive en `apps/creative-studio` por restricciones de sandbox: el plan
> original era el repo de la app QYRO (ADR 0008). Cuando esa
> separación sea viable, el módulo se mueve sin reescritura — sólo
> depende de `@qyro/shared` (el schema Zod del payload de ingest) y
> de variables de entorno.

## Estado actual

| Pieza | Estado |
|-------|--------|
| Cliente HTTP `SocialCalendarClient` (201/200/400/401/5xx + retries) | ✅ Tests |
| Router de modelo (Higgsfield + HyperFrames, HeyGen fuera) | ✅ Tests |
| Brand brain (personas con IDs reales, tokens, claims) | ✅ Stub |
| Higgsfield CLI instalado y autenticado | ⏳ Pendiente (sandbox + manual) |
| Skills oficiales Higgsfield (4) | ⏳ Pendiente |
| HyperFrames init + componentes Qyro\* | ⏳ Fase 5 del brief |
| Branding overlay (cubrir watermark) | ⏳ Fase 3 del brief |
| Storage S3-compatible para `media_url` | ⏳ Pendiente |
| Pipeline brief → concept → variantes → push | ⏳ Fase 7-9 del brief |

## Decisión clave de esta sesión

**HeyGen Avatar V queda fuera del stack.** Todo el vídeo se reparte
entre Higgsfield (lifestyle / UGC dinámico) e HyperFrames (UGC
talking-head + demos de UI), open-source y coste 0 en API. Esto
recorta el presupuesto generativo y elimina una dependencia externa.
Ver `src/router/model-router.ts`.

## Variables de entorno

Documentadas en `src/config.ts`. Mínimo viable:

```bash
SOCIAL_CALENDAR_BASE_URL=http://localhost:3000
SOCIAL_CALENDAR_SERVICE_API_KEY=<mismo valor que INGEST_SERVICE_API_KEY del API>
STUDIO_DRY_RUN=true
HIGGSFIELD_MONTHLY_CREDIT_BUDGET=2000
```

## CLI

```bash
# Comprobar que el calendario responde
pnpm --filter @qyro/creative-studio dev healthcheck

# Pedir al router qué modelo usar
pnpm --filter @qyro/creative-studio dev route ugc_video_talking_head
pnpm --filter @qyro/creative-studio dev route lifestyle_video --premium

# Smoke test: empujar una pieza dummy al calendario
pnpm --filter @qyro/creative-studio dev smoke
```

## Tests

```bash
pnpm --filter @qyro/creative-studio test
```

Cobertura actual:

- `clients/social-calendar.test.ts` — mapeo de respuestas 201/200/400,
  no-retry en 401, retry en 5xx, validación local del payload.
- `router/model-router.test.ts` — router devuelve la herramienta
  esperada por formato, bloquea premium sin `allowPremium`.
- `brain/compliance/claims.test.ts` — `assertClaimsAllowed` filtra
  claims médicos / hardware inexistente y deja pasar los oficiales.

## Próximos pasos (Fase 1 del brief de SESIÓN 2)

1. Instalar Higgsfield CLI localmente:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh | sh
   higgsfield auth login
   higgsfield model list --json > apps/creative-studio/src/brain/higgsfield-model-catalog.json
   ```
2. Instalar skills oficiales:
   ```bash
   npx skills add higgsfield-ai/skills
   ```
3. Inicializar proyecto HyperFrames:
   ```bash
   mkdir -p apps/creative-studio/hyperframes-projects
   cd apps/creative-studio/hyperframes-projects
   npx hyperframes init qyro-app-demos
   ```
4. Smoke test triple: 1 imagen Higgsfield + 1 MP4 HyperFrames 5s
   (sustituye el HeyGen del brief original).

Cualquier instalación que requiera OAuth o claves no se ha hecho aún
porque el sandbox de esta sesión es efímero y no persiste credenciales.
