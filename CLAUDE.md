# CLAUDE.md — Fuente de verdad para futuros chats

Lee este fichero ANTES de tocar nada. Captura todas las decisiones tomadas hasta ahora
y las reglas que el proyecto NO puede romper. Si una instrucción nueva contradice algo
aquí, **para y pregunta** antes de seguir.

---

## 1. Qué es este repo

Servicio **standalone** que gestiona el calendario social de QYRO (TikTok, Instagram,
Facebook). Vive separado de la app QYRO porque la app no tiene backend propio (sus
datos viven en IndexedDB local). Decisión bloqueada: Opción B del brief de SESIÓN 1
(scaffolding aquí, no monorepo con QYRO).

Casos de uso principales:

1. Recibir piezas del Estudio Creativo (SESIÓN 2) vía `POST /api/v1/content-pieces/ingest`.
2. Cola de QC humana antes de publicar.
3. Worker que publica en IG/FB/TikTok cuando llega la hora programada.
4. Boost con presupuesto controlado (kill switch enforced).
5. Pull diario de métricas y dashboard.

## 2. Stack (bloqueado)

| Capa | Elección |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | Fastify + TypeScript |
| ORM | Prisma |
| DB | PostgreSQL 16 |
| Queue | BullMQ + Redis 7 |
| Real-time | SSE |
| Frontend | React 18 + Vite + TS + Tailwind + Framer Motion + Zustand + TanStack Query + react-router |
| PWA | vite-plugin-pwa |
| Auth interna | JWT con refresh tokens en cookie httpOnly |
| Storage media | S3-compatible (MinIO local, R2/B2 prod) |
| Encriptación tokens | AES-256-GCM, key en `TOKEN_ENCRYPTION_KEY` |
| Tests | Vitest (unit) + Playwright (E2E) + MSW (mocks IG/TT) |
| Lint/format | Biome |
| Logs | pino estructurado JSON |
| CI | GitHub Actions |

## 3. Decisiones de producto bloqueadas

- **Single-tenant**: una cuenta por red (IG, FB, TT). No multi-usuario.
- **Notificaciones**: push in-app + badge PWA. No email/Slack/Telegram por ahora.
- **Idioma UI**: `es-ES`.
- **Zona horaria**: `Europe/Madrid` por defecto en scheduling.
- **Kill switch de gasto en boost** (HARD limits, enforced antes de crear ad):
  - Diario global: **5 €**
  - Mensual global: **150 €**
- **Meta + TikTok apps**: se crean desde cero. Mientras no haya app review, se trabaja
  contra **mocks** (MSW) y cuentas de sandbox.

## 4. Estructura del repo

```
/
├── apps/
│   ├── web/       # PWA admin (React + Vite)
│   ├── api/       # Fastify REST + SSE
│   └── worker/    # BullMQ workers (publish, metrics-pull, boost)
├── packages/
│   ├── shared/             # Zod schemas, tipos, constantes (límites IG/TT/FB)
│   ├── db/                 # Prisma schema + client + seed
│   ├── ui/                 # Design tokens QYRO + componentes
│   └── platform-adapters/  # InstagramPublisher / FacebookPublisher / TikTokPublisher
├── prisma/             # (dentro de packages/db)
├── docs/social-calendar/
└── docker-compose.yml  # postgres + redis + minio
```

## 5. Identidad visual QYRO (heredada del brief)

Tokens TailwindCSS (en `packages/ui/tokens.ts`):

- `--qyro-blue`: `#3B82F6`, hover `#2563EB`
- `--qyro-purple`: `#7C5CFC`
- `--qyro-green`: `#22C55E`
- `--qyro-bg`: `#F4F6FB` (lavanda casi blanco)
- `--qyro-text`: `#0B1220`
- Radius cards: 16–20px
- Sombras muy suaves
- Sans-serif neutra con jerarquía por peso
- Estética: limpia, calmada, premium-tech. Referencias: Apple Health / Linear / Whoop.
  **No** fitness-bro, **no** wellness-pastel.

## 6. Reglas de ingeniería no negociables

1. **Idempotencia** en publishing: `idempotency_key = hash(content_piece_id + platform + scheduled_at)`.
2. **Logs estructurados** con `content_piece_id` y `platform` en cada línea de publishing.
3. **Sin secretos en repo**. Sólo `.env.example` con placeholders.
4. **Rate limit awareness**: IG ≤ 25 posts API/24h/cuenta. Backoff exponencial.
5. **Migrations versionadas** Prisma para cualquier cambio de schema.
6. **Webhooks firmados verificados** antes de procesar.
7. **ADRs ligeros** en `docs/social-calendar/decisions/NNN-titulo.md` para decisiones
   arquitectónicas relevantes.
8. **Tests** en cada fase: unitarios obligatorios para QC, scheduling y adaptadores.
   Integración contra sandbox en Fase 4 y 5.

## 7. Convenciones de código

- Imports siempre con `node:` prefix para builtins (Biome lo enforcea).
- `useImportType` en TS para imports de sólo tipo.
- Single quotes, semicolons, trailing commas, line width 100.
- Sin `any` (warning de Biome).
- Sin comentarios redundantes. Sólo cuando el "porqué" no es obvio.
- Mensajes de commit en español, presente, concisos.

## 8. Plan por fases (estado actual)

- [x] **Fase 0**: discovery + decisiones de arquitectura.
- [x] **Fase 1**: scaffolding + Prisma + seed + auth + OAuth mock.
  - [x] 1.0 — Foundation: monorepo, docker-compose, docs, CI.
  - [x] 1.1 — Prisma schema completo + seed BuyerPersonas + Campaign demo.
  - [x] 1.2 — apps/api con Fastify + auth JWT + ingest stub.
  - [x] 1.3 — apps/worker con BullMQ (3 colas no-op).
  - [x] 1.4 — apps/web PWA + UI tokens QYRO + login + calendar placeholder.
  - [x] 1.5 — OAuth scaffolding Meta/TT (501 hasta app review).
  - **Validación end-to-end pendiente**: levantar docker (`pnpm infra:up`) y correr
    `pnpm db:migrate && pnpm db:seed` para verificar que el seed crea las personas,
    presets, reglas y piezas demo sin errores.
- [x] **Fase 2**: endpoint `/api/v1/content-pieces/ingest` + validación cruzada por
  plataforma + persistencia idempotente + SSE + endpoints de notificaciones.
- [ ] **Fase 3**: cola de validación + UI QC + checklist + sidebar pendientes.
- [ ] **Fase 4**: calendario visual + drag&drop + PWA + atajos + auto-refresh.
- [ ] **Fase 5**: worker de publicación + adaptadores IG/FB/TT + reintentos + webhooks.
- [ ] **Fase 6**: boost / Spark Ads + presets audiencia + control gasto.
- [ ] **Fase 7**: pull métricas + dashboard + Hook/Hold Score + export PDF/Excel.
- [ ] **Fase 8**: pulido + tests E2E sandbox + documentación operativa.

**Regla del proceso**: al terminar cada fase (no sub-fase), parar y pedir aprobación.

## 9. Branding del producto

El módulo es interno pero **debe sentirse como QYRO**. Logo QYRO en header (isotipo)
y favicon/PWA icon. Las dos buyer personas que el producto target:

1. **El Optimizador Consciente** (22-38, tono premium-inteligente).
2. **La Persona en Transición** (28-45, tono cercano-premium, target preferente de Pro).

Detalle completo (pains, JTBD, hooks) en el seed de Prisma.

## 10. Persistencia de contexto

Si en un chat futuro empiezas en frío:

1. Lee este `CLAUDE.md` entero.
2. Lee `docs/social-calendar/architecture.md`.
3. Lee los últimos 3 ADRs en `docs/social-calendar/decisions/`.
4. Mira `git log --oneline -20` para ver dónde se quedó la cosa.
5. Sólo entonces propón siguiente paso.
