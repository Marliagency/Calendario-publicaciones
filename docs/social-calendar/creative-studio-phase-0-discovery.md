# Fase 0 — Discovery del Estudio Creativo (SESIÓN 2)

Este documento es el punto de arranque de SESIÓN 2. Cuando abras la
sesión de Claude Code en el repo de la app QYRO, **léelo primero** y
úsalo como input directo para construir `creative-studio/brain/`.

Generado: 2026-05-19. Fuentes: este repo (`Calendario-publicaciones`)
en commit `f4e20e4`.

---

## 1. Assets de marca QYRO disponibles en este repo

Inventario real (no estimación). Lo que está aquí se puede copiar; lo
que falta hay que producirlo o pedirlo al equipo de marca.

### 1.1 Logo / favicon

| Asset | Ruta | Estado |
|-------|------|--------|
| Favicon QYRO (Q blanca sobre cuadrado azul) | `apps/web/public/favicon.svg` | ✅ Existe, mínimo viable |
| Isotipo Q en degradado azul→cian→púrpura | — | ❌ Falta — el favicon usa azul plano `#3B82F6`, no el degradado del brief |
| Wordmark "QYRO" sans-serif geométrica | — | ❌ Falta |
| Variantes blancas (para overlay sobre vídeo oscuro) | — | ❌ Falta |

El favicon actual sirve como placeholder para overlay de watermark,
pero **no representa fielmente** la identidad descrita en §0 del
brief de SESIÓN 2 (degradado azul→cian→púrpura). El primer entregable
de Fase 2 del estudio creativo debe ser reproducir/recibir los SVG
oficiales.

### 1.2 Design tokens (oficiales y consumibles)

Fuente: `packages/ui/src/tokens.ts`. Estos son los tokens reales que
ya usa la PWA del calendario. **Cópialos tal cual** al brand brain
del estudio creativo:

```typescript
colors.qyro = {
  blue:   { 500: '#3B82F6', 600: '#2563EB' },
  purple: { 500: '#7C5CFC' },
  green:  { 500: '#22C55E' },
  amber:  { 500: '#F59E0B' },
  red:    { 500: '#EF4444' },
  bg:     { canvas: '#F4F6FB', surface: '#FFFFFF' },
  text:   { primary: '#0B1220', muted: '#64748B' },
  border: { subtle: '#E5E7EB' },
}

radii = { card: '20px', cardSm: '16px', pill: '12px', input: '10px' }

shadows = {
  soft:     '0 1px 2px rgba(11,18,32,0.04), 0 1px 1px rgba(11,18,32,0.02)',
  elevated: '0 8px 24px rgba(11,18,32,0.06)',
}

fontFamily.sans = ['Inter', '-apple-system', 'system-ui',
                   'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
```

Mapeo a los status colors usados en la UI (útil para los
`<QyroStatusBadge>` en los demos HyperFrames):

| Status            | Color           |
|-------------------|-----------------|
| DRAFT             | `#94A3B8`       |
| IN_REVIEW         | `#F59E0B` amber |
| CHANGES_REQUESTED | `#F59E0B` amber |
| REJECTED          | `#EF4444` red   |
| APPROVED          | `#3B82F6` blue  |
| SCHEDULED         | `#7C5CFC` purple|
| PUBLISHED         | `#22C55E` green |
| ANALYZED          | `#7C5CFC` purple|
| FAILED            | `#EF4444` red   |

### 1.3 Capturas reales de la app QYRO

❌ **Ninguna en este repo.** Las 8 pantallas referenciadas en el brief
(home con Life Score, Hoy, Entrenos PPL, Nutrición, Objetivos, menú
Más, Analytics) viven en el repo de la app QYRO. Hay que extraerlas
de allí o regenerarlas con HyperFrames a partir del modelo de datos
real de QYRO.

### 1.4 Anuncios producidos previamente

❌ **Ninguno en este repo.** Los 3 que el brief menciona (creator
podcast-style, grid 2×2 features, long-form vertical "Vive mejor.
QYRO. By Diego") no están aquí.

## 2. Buyer Personas — IDs reales para `buyer_persona_ids`

Hallazgo importante que **invalida un gap** que documenté en ADR 0008.
Las personas están en el seed de Prisma (`packages/db/prisma/seed.ts`),
así que el estudio puede usar sus IDs directamente sin necesitar el
endpoint `GET /api/v1/buyer-personas`:

| ID (string usable en `buyer_persona_ids`) | Nombre |
|--------------------------------------------|--------|
| `persona-01-optimizador-consciente`        | El Optimizador Consciente (22–38, no Pro target) |
| `persona-02-en-transicion`                 | La Persona en Transición (28–45, **isProTarget: true**) |

Los registros completos (pains, JTBD, tone, preferredPlatforms,
workingHooks) están en `packages/db/prisma/seed.ts:39-101`. Esa es la
fuente canónica — si el estudio quiere extender la lista de hooks o
tone, abrir PR aquí, no duplicar en el brand brain.

### Audience presets para boost (referencia, no se usa en ingest)

| ID                                       | Persona                  |
|------------------------------------------|--------------------------|
| `audience_preset_qyro_optimizador_es`    | Optimizador (ES/MX/AR/CO/CL, 22–38) |
| `audience_preset_qyro_transicion_es`     | Transición (ES/MX/AR/CO/CL, 28–45)  |

## 3. Contrato del ingest — verificado funcional

Smoke test ejecutado con la suite Vitest del API (`pnpm --filter
@qyro/api test`, 25/25 ✅). Cobertura específica del endpoint:

| Caso                                                | Estado |
|-----------------------------------------------------|--------|
| Falta `X-Service-API-Key` → 401                     | ✅ |
| Payload válido → 201 con `accepted: true`           | ✅ |
| Payload con blockers (ratio inválido) → 400         | ✅ |
| Mismo `external_ref` repetido → 200 `duplicated`    | ✅ |
| Payload no parseable Zod → 400 `INVALID_PAYLOAD`    | ✅ |

Detalle completo del contrato:
[`creative-studio-integration.md`](creative-studio-integration.md).

Decisiones que lo rigen:
[`decisions/0008-creative-studio-integration.md`](decisions/0008-creative-studio-integration.md).

## 4. Variables de entorno que el estudio necesita aprovisionar

```bash
# Calendario
SOCIAL_CALENDAR_BASE_URL=https://...           # URL pública del API
SOCIAL_CALENDAR_SERVICE_API_KEY=...            # mismo valor que INGEST_SERVICE_API_KEY de este repo
SOCIAL_CALENDAR_TIMEOUT_S=10
SOCIAL_CALENDAR_MAX_RETRIES=3

# Generación (dry-run hasta tener cuentas)
STUDIO_DRY_RUN=true
HIGGSFIELD_API_KEY=                            # pendiente — crear cuenta
HEYGEN_API_KEY=                                # pendiente — crear cuenta
HIGGSFIELD_MONTHLY_CREDIT_BUDGET=100           # cap medio elegido por Diego
HEYGEN_MONTHLY_USD_BUDGET=100                  # cap medio elegido por Diego
HIGGSFIELD_PREMIUM_MODELS=veo_3_1,sora_2,kling_3_0_premium
```

El `INGEST_SERVICE_API_KEY` se genera con `openssl rand -hex 32` y
**el mismo valor** se aprovisiona en ambos repos vía secret manager.

## 5. Gap-list priorizada

### P0 — Bloqueantes para arrancar Fase 1 del estudio

1. **Crear cuentas Higgsfield y HeyGen** y generar API keys (Diego).
2. **Hostear el calendario** en una URL accesible para el estudio (o
   acordar túnel local en desarrollo). Hoy el API solo corre local.
3. **Generar `INGEST_SERVICE_API_KEY`** y aprovisionarlo en ambos
   secret managers.

### P1 — Bloqueantes para producir piezas reales

4. **Bucket S3-compatible** del estudio (MinIO local, R2/B2 prod)
   para alojar la media antes de pasarla por `media_url` al ingest.
   El calendario asume URL ya servible.
5. **Logos QYRO oficiales** (isotipo Q con degradado, wordmark, ambos
   en blanco) — necesarios para el overlay que cubre watermarks de
   Higgsfield/HeyGen y para los `<QyroBrandLockup>` de HyperFrames.
6. **Capturas/recreaciones de las 8 pantallas** de la app QYRO para
   los demos de UI (mejor recrearlas con HyperFrames a partir del
   modelo de datos real, así son animables y siempre actualizadas).

### P2 — Mejora antes de Fase 10 (loop de aprendizaje)

7. **Webhook saliente de feedback de QC** desde el calendario al
   estudio cuando el humano marca `CHANGES_REQUESTED` / `REJECTED`.
   Alternativa: suscribirse al SSE existente con el service key.
8. **Campo `ai_generated: boolean`** en el payload de ingest y en
   `ContentPiece`, si UE/TT lo exigen.
9. **Endpoint de update de variante** si una pieza ya pusheada
   necesita reemplazar el `media_url` (hoy la idempotencia bloquea
   reescrituras vía el mismo `external_ref`).

### Re-clasificado a "no es gap"

- ~~`GET /api/v1/buyer-personas`~~ → Las personas están hard-coded en
  el seed con IDs estables (`persona-01-optimizador-consciente`,
  `persona-02-en-transicion`). El estudio puede importarlos como
  constante. Si en el futuro se vuelven dinámicas, se añade el
  endpoint entonces.

## 6. Checklist de salida de Fase 0

- [x] Inventariar assets QYRO en este repo.
- [x] Resolver IDs reales de BuyerPersona.
- [x] Verificar contrato del endpoint de ingest (25/25 tests).
- [x] Documentar gaps priorizados.
- [ ] Cuentas Higgsfield + HeyGen creadas (P0 #1) — **bloqueado en Diego**.
- [ ] Calendario desplegado en URL accesible (P0 #2) — **bloqueado en
      infra/deploy**.
- [ ] `INGEST_SERVICE_API_KEY` provisionado (P0 #3) — depende de #2.

Cuando los tres P0 estén verdes, el estudio puede arrancar **Fase 1
del brief de SESIÓN 2** (instalación de Higgsfield CLI + skills,
HeyGen Skills + HyperFrames, prueba de humo).

## 7. Cómo continuar en el repo de QYRO

1. Abre Claude Code on the web en el repo de la app QYRO.
2. Pega el brief completo de SESIÓN 2 como primer turno.
3. Como segundo turno, pega un enlace o copia de:
   - Este fichero (discovery).
   - `creative-studio-integration.md` (contrato HTTP).
   - `decisions/0008-creative-studio-integration.md` (decisiones).
4. Pide arrancar **Fase 1** del brief (no Fase 0 otra vez — ya está
   hecha desde aquí).
