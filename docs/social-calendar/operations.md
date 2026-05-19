# Operativa — QYRO Social Calendar

Guía resumida para uso diario del módulo.

## Arranque local

```bash
git pull
pnpm install
cp .env.example .env
# Rellena los secrets (4× hex 32 bytes + ADMIN_PASSWORD)
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

pnpm infra:up                  # postgres + redis + minio
pnpm db:migrate                # primera vez: te pedirá nombre, p.ej. "init"
pnpm db:seed                   # personas QYRO + 3 piezas demo + presets + reglas QC
pnpm dev                       # api :3001 + worker + web :5173
```

Web PWA: `http://localhost:5173`. Login con `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

## Flujos cubiertos

### 1. Ingest desde el Estudio Creativo

Hoy el Estudio Creativo (SESIÓN 2) llama a:

```http
POST /api/v1/content-pieces/ingest
X-Service-API-Key: <INGEST_SERVICE_API_KEY>
```

Si pasa validación cruzada → pieza creada en `IN_REVIEW` y SSE empuja
evento a la PWA (badge se actualiza, sidebar aparece). Si suggested_schedule
viene en el payload, las variantes ya tienen `scheduledAt` asignado (pero
la pieza sigue en `IN_REVIEW` hasta aprobación humana).

### 2. Revisión humana (admin)

1. PWA abre directamente en el calendario. Sidebar izquierda muestra top
   5 piezas `IN_REVIEW`.
2. Click → drawer con previews por plataforma, checklist QC y botones.
3. Atajos: `J/K` siguiente/anterior semana, `T` hoy, `R` ir a primera
   pieza en revisión.
4. Checklist QC mezcla reglas automáticas (`PLATFORM_RATIO`,
   `PLATFORM_DURATION`, `HASHTAG_LIMIT`, `MUSIC_LICENSE`) y manuales
   (`HOOK_IN_3S`, `CTA_PRESENT`, etc., checkboxes humanos).
5. Decisiones: Aprobar / Pedir cambios (comentario obligatorio) / Rechazar
   (motivo obligatorio).

### 3. Programación + drag&drop

- En vista Semana, arrastra una tarjeta a otro slot horario → llama a
  `PATCH /api/v1/content-pieces/:id/variants/:variantId/schedule`.
- En vista Mes, arrastra a otro día (se programa a las 12:00 por defecto).
- En vista Kanban, arrastra a la columna `Aprobada` → `useApprove` mutation.
- Si al aprobar todas las variantes tienen `scheduledAt`, el sistema:
  - Marca `ContentPiece.SCHEDULED`.
  - Encola `PublishJob` en BullMQ por cada variante con delay correcto.
  - Idempotency key garantiza que reintentos no duplican.

### 4. Publicación

Worker BullMQ procesa los jobs cuando llega la hora. Hoy todos los
publishers son mocks (ADR 0006); las piezas se marcan como `PUBLISHED`
con `platformPostId` ficticio. Rate limits respetados (IG ≤ 25/24h).

### 5. Boost

- Drawer de la pieza `PUBLISHED` muestra el panel "Promocionar (boost)".
- Presets rápidos: 1€/día×3 días o 2€/día×5 días.
- Audiencias: seedeadas (Optimizador / Persona en Transición).
- Antes de confirmar, el sistema chequea el kill switch (5€/día, 150€/mes).
  Si lo supera → botón deshabilitado y aviso.
- Confirmar → reserva en `BoostSpendLedger.committed_cents` y encola
  `BoostJob`.

### 6. Métricas + dashboard

- `/dashboard` muestra cards (total, ratio aprobación, tiempo medio QC,
  hold rate medio), top posts, kill switch en vivo y export.
- "Refrescar métricas" encola `metrics-pull` que rellena `Metric`
  (organic+paid) y reconcilia el ledger.
- Export: CSV (Excel) y HTML imprimible (Ctrl+P → PDF).

## Sanity checks rápidos

```bash
# Health
curl http://localhost:3001/health
curl http://localhost:3001/health/ready    # debe devolver db:ok

# Lista de piezas
curl -b /tmp/cookies.txt http://localhost:3001/api/v1/content-pieces?status=IN_REVIEW | jq

# Estado del kill switch
curl -b /tmp/cookies.txt http://localhost:3001/api/v1/boost/spend-summary | jq

# Dashboard agregado
curl -b /tmp/cookies.txt http://localhost:3001/api/v1/dashboard | jq

# Refrescar métricas (encola job en BullMQ)
curl -b /tmp/cookies.txt -X POST http://localhost:3001/api/v1/metrics/refresh | jq
```

## Logs

- API: `pnpm --filter @qyro/api dev` (pino pretty en development).
- Worker: `pnpm --filter @qyro/worker dev`.
- Cada línea de publishing incluye `contentPieceId` y `platform` (regla §5
  del brief).

## Cuando lleguen las apps Meta/TikTok aprobadas

Mira ADR 0006: el cambio se localiza en `packages/platform-adapters/registry.ts`
y `apps/worker/publishHandler.ts` (1 línea: descifrar `accessToken`).
Cero cambios en API ni en frontend.

## Variables de entorno críticas

| Variable | Por qué |
|---|---|
| `INGEST_SERVICE_API_KEY` | Estudio Creativo → ingest. Comparación timing-safe. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Auth de la PWA. |
| `TOKEN_ENCRYPTION_KEY` | AES-256-GCM para tokens IG/FB/TT (32 bytes hex). |
| `BUDGET_DAILY_CAP_EUR` (5) | Kill switch boost diario. |
| `BUDGET_MONTHLY_CAP_EUR` (150) | Kill switch boost mensual. |
| `META_APP_*`, `TIKTOK_*` | Vacíos hasta app review. |
