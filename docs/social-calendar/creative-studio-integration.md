# Contrato de integración — Estudio Creativo (SESIÓN 2) → Calendario (SESIÓN 1)

Este documento es la **fuente de verdad** que tiene que consumir el
cliente HTTP del estudio creativo (vive en el repo de la app QYRO,
módulo `creative-studio/clients/social_calendar.ts`). Si algo aquí
difiere del código de `apps/api/src/routes/ingest.ts`, **gana el
código** — abre PR para actualizar este doc.

Ver también: [ADR 0008](decisions/0008-creative-studio-integration.md).

---

## 1. Endpoint

```
POST {SOCIAL_CALENDAR_BASE_URL}/api/v1/content-pieces/ingest
Content-Type: application/json
X-Service-API-Key: {INGEST_SERVICE_API_KEY}
```

- `SOCIAL_CALENDAR_BASE_URL`: URL del API del calendario (ej.
  `https://calendar.qyro.app` en producción, `http://localhost:3000`
  en desarrollo local).
- `INGEST_SERVICE_API_KEY`: shared secret entre estudio y calendario.
  Mínimo 16 caracteres. Generar con
  `openssl rand -hex 32`. Rotar trimestralmente.

## 2. Schema del payload

Fuente: `packages/shared/src/schemas/ingest.ts` (Zod). Copia
sincronizada — si cambia ahí, romper este doc.

```jsonc
{
  // UUID v4. Es el creative_run_id del estudio. CLAVE de idempotencia.
  "external_ref": "550e8400-e29b-41d4-a716-446655440000",

  // Título humano-legible. 1–200 chars.
  "title": "POV: 5 apps de salud abiertas y ninguna te dice si vas bien",

  // Uno de: image | carousel | reel | ugc_video | app_demo | lifestyle_ad
  "format": "ugc_video",

  // IDs de BuyerPersona en este DB. Descubre vía GET /api/v1/buyer-personas
  // (gap pendiente; mientras tanto usar IDs del seed conocidos).
  "buyer_persona_ids": ["persona-optimizador-consciente"],

  // Opcionales
  "campaign_id": null,
  "concept_id": "concept-hypermotion-launch-01",
  "framework_used": "ugc_15s",
  "hook_used": "5-apps-fragmentadas",

  // Una o más variantes (al menos UNA, si no → 400 NO_VARIANTS).
  // El estudio decide a qué plataformas adaptar la pieza.
  "platform_variants": {
    "tiktok": {
      "media_url": "https://cdn.qyro.app/creative/abc.mp4",
      "ratio": "9:16",
      "duration_s": 22,
      "caption": "POV: tienes 5 apps de salud abiertas...",
      "hashtags": ["qyro", "productividad", "habitos"],
      "first_comment": "Link en bio 👇",
      "music_ref": "tt:original-12345"
    },
    "instagram_reel": {
      "media_url": "https://cdn.qyro.app/creative/abc-ig.mp4",
      "ratio": "9:16",
      "duration_s": 22,
      "caption": "POV: 5 apps abiertas...",
      "hashtags": ["qyro", "selfimprovement"]
    }
  },

  // ISO 8601 CON offset (ej. 2026-05-20T18:30:00+02:00). Por plataforma.
  // Si se omite, la pieza queda IN_REVIEW sin schedule (el humano la
  // programa después en la UI de QC).
  "suggested_schedule": {
    "tiktok": "2026-05-20T18:30:00+02:00",
    "instagram_reel": "2026-05-20T19:00:00+02:00"
  },

  // Cualquier metadato que el estudio quiera guardar (modelo usado,
  // créditos gastados, semilla, prompt hash, etc.). JSON libre. Se
  // persiste en ContentPiece.creativeRunMetadata.
  "creative_run_metadata": {
    "model": "seedance_2_0",
    "credits_spent": 12,
    "prompt_hash": "sha256:...",
    "router_decision": "ugc_video → seedance_2_0 (no soul-id)"
  }
}
```

### Variantes de plataforma soportadas

`tiktok` · `instagram_reel` · `instagram_feed` · `instagram_story` ·
`facebook_feed` · `facebook_reel`

### Ratios

`1:1` · `4:5` · `9:16` · `16:9`

## 3. Límites por plataforma (validación cruzada)

Fuente: `packages/shared/src/platform-limits.ts`. Estos límites se
aplican on-ingest. Romperlos devuelve **400 con `blocker`**; superar
los recomendados devuelve **`warning`** y la pieza entra igualmente.

| Variante           | Ratios permitidos | Duración (s) | Caption máx | Hashtags máx | Hashtags recom. | Carrusel |
|--------------------|-------------------|--------------|-------------|--------------|------------------|----------|
| `tiktok`           | 9:16              | 3–600        | 2200        | 100          | 8                | No       |
| `instagram_reel`   | 9:16              | 3–90         | 2200        | 30           | 10               | No       |
| `instagram_feed`   | 1:1, 4:5          | (imagen)     | 2200        | 30           | 10               | Sí       |
| `instagram_story`  | 9:16              | 1–60         | 2200        | 10           | 3                | No       |
| `facebook_feed`    | 1:1, 4:5, 16:9    | 1–240        | 63206       | 30           | 5                | Sí       |
| `facebook_reel`    | 9:16              | 3–90         | 63206       | 30           | 8                | No       |

`duration_s` es **obligatorio** si la variante es vídeo (el endpoint
infiere `MediaType` desde su presencia).

## 4. Respuestas

### 201 Created — pieza nueva

```json
{
  "accepted": true,
  "content_piece_id": "ckxz...",
  "external_ref": "550e8400-...",
  "status": "IN_REVIEW",
  "variants": [
    { "id": "ckyz...", "kind": "tiktok", "scheduled_at": "2026-05-20T18:30:00.000Z" }
  ],
  "warnings": [
    { "severity": "warning", "platform": "instagram_reel", "code": "HASHTAGS_OVER_RECOMMENDED", "message": "..." }
  ]
}
```

### 200 OK — duplicado idempotente

Pieza con ese `external_ref` ya existe. El calendario **no** modifica
nada; devuelve el estado actual para que el estudio pueda actualizar
su `CreativeRun.delivered_to_calendar_at` y seguir.

```json
{
  "duplicated": true,
  "content_piece_id": "ckxz...",
  "external_ref": "550e8400-...",
  "status": "APPROVED"
}
```

Casos especiales:

- **Race condition** (dos requests concurrentes con el mismo
  `external_ref`): se resuelve también como 200 duplicado, con
  `note: "Procesamiento concurrente detectado."`.

### 400 INVALID_PAYLOAD

Falló el schema Zod. Detalle Zod-flatten en `details`.

```json
{
  "error": "INVALID_PAYLOAD",
  "details": { "fieldErrors": { "external_ref": ["Invalid uuid"] } }
}
```

### 400 VALIDATION_FAILED

Pasó el schema pero falló la validación cruzada por plataforma. El
estudio debe regenerar **solo las variantes con blockers**, mantener
las demás.

```json
{
  "error": "VALIDATION_FAILED",
  "external_ref": "550e8400-...",
  "blockers": [
    { "severity": "blocker", "platform": "tiktok", "code": "DURATION_OUT_OF_RANGE", "message": "601s fuera del rango 3-600s en tiktok." }
  ],
  "warnings": []
}
```

Códigos de blocker actuales:
`NO_VARIANTS` · `INVALID_RATIO` · `DURATION_REQUIRED` ·
`DURATION_OUT_OF_RANGE` · `CAPTION_TOO_LONG` · `TOO_MANY_HASHTAGS`.

### 401 UNAUTHENTICATED

`X-Service-API-Key` ausente o incorrecto. Sin body útil.

### 500 INTERNAL

Fallo persistiendo. **Retryable** con el mismo `external_ref` — la
idempotencia garantiza que un reintento exitoso no duplica.

```json
{ "error": "INTERNAL", "external_ref": "550e8400-..." }
```

## 5. Política de reintentos (recomendada para el cliente del estudio)

Tres intentos con backoff exponencial:

| Intento | Espera |
|---------|--------|
| 1       | inmediato |
| 2       | 5 s   |
| 3       | 30 s  |
| 4       | 5 min |

Reintentar **solo** en:

- Errores de red / DNS / TCP / TLS.
- 500 / 502 / 503 / 504.
- Timeout del cliente (recomendado: 10 s).

**No** reintentar en 400 / 401 — es un bug del estudio, abre alerta.

Tras 4 intentos fallidos: poner el `CreativeRun` en bandeja
`INGEST_REJECTED` con el último error y notificar a Diego.

## 6. Idempotencia — reglas duras

1. `external_ref` = `creative_run_id` (UUID v4). **Uno por
   `CreativeRun`**, nunca reutilizar.
2. Si se regenera UNA variante de una pieza ya pusheada, **NO** mandar
   un nuevo ingest con el mismo `external_ref` esperando que la
   reemplace — el endpoint no actualiza, devuelve 200 duplicado. En
   ese caso usar el endpoint de actualización de variante (no existe
   aún; hasta entonces gestionar manualmente en la UI de QC).
3. Si el estudio nunca recibió respuesta (timeout, kill del proceso),
   reintentar con **el mismo `external_ref`** está siempre a salvo.

## 7. Efectos colaterales en el calendario

Al aceptar un ingest exitoso, el calendario:

1. Crea `ContentPiece` con `status = IN_REVIEW`.
2. Crea N `PlatformVariant` (una por entrada de `platform_variants`),
   con `scheduledAt` si vino en `suggested_schedule`.
3. Persiste warnings en `qcChecklistJson` para que la UI los muestre.
4. Crea entrada en `AuditLog` con
   `fromStatus=null → toStatus=IN_REVIEW`, `actorUserId=null`,
   `comment="Ingest desde Estudio Creativo"`.
5. Emite SSE `content-piece.ingested` al bus de notificaciones (ver
   ADR 0005) y badge de la PWA. Esto es lo que despierta a Diego.

## 8. Gaps conocidos

Documentados en ADR 0008. Resumen:

1. No existe `GET /api/v1/buyer-personas` — el estudio debe conocer
   los IDs por otro medio hasta que se exponga.
2. No existe webhook de feedback de QC (`CHANGES_REQUESTED` →
   estudio). Posible suscripción al SSE existente con el service key.
3. No existe campo `ai_generated` — añadirlo cuando UE/TT lo exijan.
4. No hay endpoint de upload de media — el estudio aloja en su propio
   bucket y pasa `media_url` ya servible.

## 9. Variables de entorno necesarias en el estudio

```bash
SOCIAL_CALENDAR_BASE_URL=https://calendar.qyro.app
SOCIAL_CALENDAR_SERVICE_API_KEY=<el mismo INGEST_SERVICE_API_KEY de este repo>
SOCIAL_CALENDAR_TIMEOUT_S=10
SOCIAL_CALENDAR_MAX_RETRIES=3
```

## 10. Smoke test mínimo

`curl` que tiene que devolver 201 contra una instancia local:

```bash
curl -X POST "$SOCIAL_CALENDAR_BASE_URL/api/v1/content-pieces/ingest" \
  -H "Content-Type: application/json" \
  -H "X-Service-API-Key: $INGEST_SERVICE_API_KEY" \
  -d @- <<'JSON'
{
  "external_ref": "00000000-0000-4000-8000-000000000001",
  "title": "Smoke test ingest",
  "format": "ugc_video",
  "buyer_persona_ids": [],
  "platform_variants": {
    "tiktok": {
      "media_url": "https://example.com/v.mp4",
      "ratio": "9:16",
      "duration_s": 20,
      "caption": "test",
      "hashtags": ["qyro"]
    }
  }
}
JSON
```

Repetir con el mismo `external_ref` → debe devolver 200 `duplicated: true`.
