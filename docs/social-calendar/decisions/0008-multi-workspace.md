# ADR 0008 — Multi-workspace (Iteración 3)

**Estado**: Aceptado  
**Fecha**: 2026-05-20

## Contexto

El sistema nació single-tenant (una instancia = un workspace implícito). La iteración 3
introduce soporte multi-workspace: aislamiento completo por workspace, selector de workspace
en la UI, wizard de creación y API keys por workspace para el ingest del Estudio Creativo.

## Decisiones

### 1. Modelo de datos

- Nuevo modelo `Workspace` con `id` (cuid), `slug` (@unique), colores de marca, caps de boost.
- `WorkspaceMember`: join table `(workspaceId, userId)` con rol (`OWNER|ADMIN|EDITOR|VIEWER`).
- `WorkspaceApiKey`: reemplaza la variable de entorno global `INGEST_SERVICE_API_KEY`. El raw key
  se muestra una sola vez y solo se persiste el SHA-256.
- **Todas** las tablas de contenido tienen `workspaceId NOT NULL` con FK a `Workspace`.
- `NotificationDelivery` también tiene `workspaceId` para evitar fuga de eventos entre workspaces.

### 2. Identificación de workspace en la API

Se usa el header `X-Workspace-Slug` (o `?ws=` en EventSource que no puede poner headers).
El middleware `requireWorkspaceMember` resuelve slug → membership → `req.workspace` en
cada request. Se eligió sobre JWT-embed porque permite múltiples pestañas en workspaces
distintos simultáneamente.

### 3. Rutas del frontend

Las rutas pasan de `/calendar` a `/w/:slug/calendar`. La raíz `/` lee el último slug
de `localStorage` y redirige; si no hay workspace, va al wizard de creación.
`WorkspaceLayout` es el wrapper que pone el header y el color stripe de marca.

### 4. Module-level slug para api()

`getActiveWorkspaceSlug()` / `setActiveWorkspaceSlug()` permiten que la función `api()`
inyecte `X-Workspace-Slug` sin necesidad de recibir el slug como parámetro en cada llamada.
`WorkspaceLayout` lo setea al montar vía `useEffect`.

### 5. Kill switch por workspace

`Workspace.dailyBoostCapEur` / `monthlyBoostCapEur` reemplazan las env vars globales.
`checkBudget()` recibe `workspaceId` y los caps como parámetros desde `req.workspace`.
`BoostSpendLedger` tiene `@@unique([workspaceId, date, platform])`.

### 6. SSE por workspace

`/sse/notifications?ws=:slug` → middleware resuelve workspace, filtra eventos del bus
por `workspaceId`. Cada `NotificationEvent` incluye `workspaceId`.

### 7. Migración SQL

Archivo `20260520000001_workspaces/migration.sql`: inserta dos workspaces seed (`ws_qyro`
y `ws_diego-personal`), hace ALTER TABLE con `DEFAULT 'ws_qyro'` para backfill, luego
DROP DEFAULT para forzar que nuevos registros provean `workspaceId` explícitamente.

## Consecuencias

- Todo nuevo código de rutas debe incluir `workspaceId` en queries.
- La UI siempre está dentro de un contexto de workspace activo.
- Los ingest del Estudio Creativo autentican con `WorkspaceApiKey`, no con env var global.
- Dos instancias del Estudio pueden apuntar a workspaces distintos con keys distintas.
