# Arquitectura — QYRO Social Calendar

> Esta página describe el "qué" y el "cómo" a nivel macro. Para el "porqué" de
> decisiones concretas, consulta los ADRs en `decisions/`.

## 1. Visión de conjunto

```
┌───────────────────────────┐         ┌──────────────────────────────┐
│ Estudio Creativo (SES.2)  │ ──POST─▶│  apps/api  (Fastify)         │
│ (servicio aparte)         │         │   /api/v1/content-pieces/    │
└───────────────────────────┘         │   ingest                     │
                                      │                              │
┌───────────────────────────┐         │  /api/v1/calendar/*          │
│ Admin (Diego) en PWA      │ ◀──────▶│  /api/v1/qc/*                │
│  apps/web (React+Vite)    │  SSE +  │  /api/v1/auth/*              │
│  http://localhost:5173    │  REST   │  /sse/notifications          │
└───────────────────────────┘         └──────────┬───────────────────┘
                                                 │
                                  ┌──────────────┼───────────────┐
                                  ▼              ▼               ▼
                         ┌─────────────┐  ┌────────────┐  ┌────────────┐
                         │ PostgreSQL  │  │   Redis    │  │  S3/MinIO  │
                         │ (Prisma)    │  │ (BullMQ +  │  │ (media     │
                         │             │  │  cache)    │  │  re-host)  │
                         └─────────────┘  └─────┬──────┘  └────────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              ▼                 ▼                 ▼
                       ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                       │ publish      │  │ metrics-pull │  │ boost        │
                       │ worker       │  │ worker       │  │ worker       │
                       │ (BullMQ)     │  │ (BullMQ)     │  │ (BullMQ)     │
                       └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                              │                 │                 │
                              ▼                 ▼                 ▼
                       ┌──────────────────────────────────────────────┐
                       │ packages/platform-adapters                   │
                       │   InstagramPublisher / FacebookPublisher /   │
                       │   TikTokPublisher                            │
                       └──────────────────────────────────────────────┘
                              │
                              ▼
                       Meta Graph API · TikTok Content Posting API
                       Meta Marketing API · TikTok Marketing API (Spark Ads)
```

## 2. Componentes

### apps/api

Fastify + TypeScript. Expone:

- REST autenticado con JWT (cookie httpOnly) para el admin de la PWA.
- Endpoint de ingest autenticado con `INGEST_SERVICE_API_KEY` (service-to-service).
- SSE en `/sse/notifications` para empujar eventos a la PWA (pieza nueva en revisión,
  publicación exitosa/fallida, métricas actualizadas).
- Webhooks de Meta y TikTok bajo `/webhooks/{meta,tiktok}` con verificación de firma.

### apps/worker

Proceso(s) BullMQ. Tres colas principales:

- **`publish`**: piezas `SCHEDULED` cuya hora llegó → adaptador correspondiente.
- **`metrics-pull`**: cron diario (configurable) que recoge insights orgánicos y de ads.
- **`boost`**: creación de campañas Meta Ads / Spark Ads tras la publicación orgánica.

Idempotencia vía `idempotency_key` derivado del `PublishJob` para evitar duplicados en
reintentos.

### apps/web

PWA (vite-plugin-pwa) con calendario visual, cola de QC, dashboard. Conecta con
`apps/api` vía fetch + SSE. Reutiliza tokens y componentes de `packages/ui`.

### packages/db

Prisma schema, migraciones, cliente generado, seed (BuyerPersonas, Campaign demo, 3
ContentPiece). Exporta el cliente tipado para api y worker.

### packages/shared

- Schemas Zod (cuerpos de request, payload de ingest, eventos SSE).
- Constantes: límites por plataforma (caption, hashtags, ratio, duración) en un único
  fichero. Son la verdad usada tanto por validación de ingest como por UI de QC.
- Tipos compartidos.

### packages/ui

Design tokens (paleta QYRO, radii, sombras) y primitives reutilizables (Button, Card,
Badge, DonutChart, etc.). Permite mantener coherencia visual sin depender del repo de
QYRO.

### packages/platform-adapters

Una interfaz `SocialPublisher` y tres implementaciones (Instagram, Facebook, TikTok).
Cada una conoce los detalles de su API (containers Meta, Direct Post TikTok, etc.) y
expone el mismo contrato al worker.

## 3. Flujo de una pieza (happy path)

1. **Ingest**: Estudio Creativo manda `POST /api/v1/content-pieces/ingest` con
   `external_ref` y variantes por plataforma. La pieza entra como `IN_REVIEW`.
2. **Notificación**: SSE empuja evento a la PWA → badge PWA + sidebar pendientes.
3. **Revisión humana**: admin abre pieza, ejecuta checklist QC, aprueba.
4. **Programación**: pieza pasa a `SCHEDULED` con `scheduled_at` por variante. Worker
   crea `PublishJob`s en BullMQ con delay = `scheduled_at - now()`.
5. **Publicación**: worker invoca el adaptador, recibe `platform_post_id`, marca
   `PUBLISHED`. SSE notifica a la PWA.
6. **Boost** (opcional): si `boost_budget_eur > 0`, encola job de `boost` que verifica
   el kill switch (5€/día, 150€/mes) y crea la campaña.
7. **Métricas**: job diario `metrics-pull` actualiza tabla `Metric`. Tras 7 días en
   `PUBLISHED`, la pieza pasa a `ANALYZED`.

## 4. Estados de `ContentPiece`

```
DRAFT ──┐
        ├──▶ IN_REVIEW ──▶ APPROVED ──▶ SCHEDULED ──▶ PUBLISHED ──▶ ANALYZED
        │                      ▲                          │
        │                      └── (REJECTED/CHANGES_REQUESTED)
        │                                                 │
        │                                                 ▼
        └────────────────────────────────────────────▶ FAILED
```

Todo cambio queda registrado en `AuditLog`.

## 5. Reglas de seguridad

- Tokens de IG/FB/TT cifrados con AES-256-GCM en `SocialAccount.access_token_encrypted`.
- `TOKEN_ENCRYPTION_KEY` nunca en repo, sólo en secret manager / `.env` local.
- `INGEST_SERVICE_API_KEY` rotable. Comparación timing-safe.
- Webhooks: HMAC verificado antes de cualquier side-effect.
- Cookies httpOnly + SameSite=Lax + Secure en prod.

## 6. Observabilidad

- `pino` con `content_piece_id` y `platform` en cada log de publishing/metrics/boost.
- Healthcheck en `/health` con estado de DB, Redis, S3.
- OpenTelemetry en Fase 7+ si hace falta.
