# Integración entre el Estudio Creativo y el Calendario Social

Este documento describe el contrato de integración entre el **Estudio Creativo de QYRO**
(SESIÓN 2) y el **Calendario de Publicaciones Sociales** (este repositorio). Está pensado
para los desarrolladores de ambos extremos de la integración.

---

## Visión general

El Estudio Creativo genera piezas de contenido (vídeos, imágenes, carruseles) y las
empuja al calendario para que pasen por el flujo de QC humano, se programen y se
publiquen en las plataformas sociales.

```
Estudio Creativo
      │
      │  POST /api/v1/content-pieces/ingest
      │  (X-Service-API-Key: sk_ws_...)
      ▼
Calendario Social
      │
      ├── Validación cruzada por plataforma
      ├── Cola de QC humano
      ├── Programación
      └── Publicación → IG / FB / TikTok
              │
              │  POST {webhook_url}   (cambios de estado)
              ▼
      Estudio Creativo
```

El flujo es **asíncrono**: el Estudio Creativo hace el push, recibe un `201` con el
`content_piece_id` y puede olvidarse hasta que el calendario le notifique un cambio
de estado via webhook.

---

## Autenticación

### API Keys por workspace

Cada workspace del Estudio Creativo tiene su propia API Key para el calendario. Las
claves se generan en **Ajustes del workspace → API & Webhooks** dentro del calendario.

**Formato de la clave**:
```
sk_ws_{prefijo_12_chars}_{aleatorio}
```

Ejemplo: `sk_ws_qyromain2024_a1b2c3d4e5f6g7h8i9j0k1l2`

**Propiedades de la clave**:
- Una clave por workspace. Si se regenera, la anterior queda invalidada inmediatamente.
- La clave codifica el `workspace_id` internamente; el servidor lo resuelve en cada
  petición sin necesidad de enviar el ID por separado.
- Se almacena hasheada (bcrypt) en la base de datos; sólo el hash, nunca el valor
  en claro.

### Cómo enviar la clave

Incluye la API Key en la cabecera HTTP `X-Service-API-Key` de cada petición:

```http
POST /api/v1/content-pieces/ingest HTTP/1.1
Host: api.qyro-calendar.com
Content-Type: application/json
X-Service-API-Key: sk_ws_qyromain2024_a1b2c3d4e5f6g7h8i9j0k1l2
```

No uses `Authorization: Bearer` para las service keys — ese header está reservado
para los JWT de los usuarios humanos del dashboard.

---

## Configuración por workspace

En el lado del Estudio Creativo, configura las variables de entorno por workspace:

```dotenv
# Workspace QYRO principal
QYRO_SOCIAL_CALENDAR_URL=https://api.qyro-calendar.com
QYRO_SOCIAL_CALENDAR_API_KEY=sk_ws_qyromain2024_a1b2c3d4e5f6g7h8i9j0k1l2
QYRO_BRAND_BRAIN_PATH=creative-studio/brain/qyro/

# Workspace Diego personal
DIEGO_SOCIAL_CALENDAR_URL=https://api.qyro-calendar.com
DIEGO_SOCIAL_CALENDAR_API_KEY=sk_ws_diegoperso_z9y8x7w6v5u4t3s2r1q0p9o8
DIEGO_BRAND_BRAIN_PATH=creative-studio/brain/diego-personal/

# Webhook secret compartido (el calendario lo usa para firmar los callbacks)
SOCIAL_CALENDAR_WEBHOOK_SECRET=whs_shared_secret_aqui
```

---

## Endpoint de ingest

### `POST /api/v1/content-pieces/ingest`

Recibe una pieza de contenido del Estudio Creativo. Ejecuta validación cruzada por
plataforma y crea la pieza en estado `IN_REVIEW` si todo es correcto.

#### Payload completo

```json
{
  "external_ref": "550e8400-e29b-41d4-a716-446655440000",
  "title": "El hábito que cambió mi energía en 30 días",
  "format": "short_video",
  "buyer_persona_ids": ["optimizador-consciente"],
  "campaign_id": "camp_enero_2026",
  "concept_id": "concept_habitos_energia_001",
  "framework_used": "HOOK_PROBLEM_SOLUTION_CTA",
  "hook_used": "¿Alguna vez has sentido que el cansancio es tu estado normal?",
  "platform_variants": {
    "tiktok": {
      "media_url": "https://storage.qyro.io/pieces/550e8400/tiktok.mp4",
      "ratio": "9:16",
      "duration_s": 47,
      "caption": "El hábito que nadie te cuenta 👇 #bienestar #habitos #energia",
      "hashtags": ["bienestar", "habitos", "energia", "qyro"],
      "first_comment": "Cuéntame en los comentarios cuál es tu mayor reto con la energía 💪",
      "music_ref": null
    },
    "instagram_reel": {
      "media_url": "https://storage.qyro.io/pieces/550e8400/ig_reel.mp4",
      "ratio": "9:16",
      "duration_s": 47,
      "caption": "El hábito que cambió mi energía en 30 días ✨\n\nSi llevas tiempo sintiéndote agotado sin razón aparente, puede que no sea falta de sueño.\n\nEn este reel te cuento el cambio que marca la diferencia. 👇\n\n#bienestar #habitos #energia #saludmental #optimizacion",
      "hashtags": ["bienestar", "habitos", "energia", "saludmental", "optimizacion"],
      "first_comment": null,
      "music_ref": "spotify:track:4uLU6hMCjMI75M1A2tKUQC"
    },
    "instagram_feed": {
      "media_url": "https://storage.qyro.io/pieces/550e8400/ig_feed.jpg",
      "ratio": "4:5",
      "duration_s": null,
      "caption": "30 días. Un hábito. Un cambio real.\n\nNo hace falta una transformación total. A veces basta con un ajuste pequeño y consistente.\n\nDesliza para ver los 3 pasos →\n\n#bienestar #habitos #qyro",
      "hashtags": ["bienestar", "habitos", "qyro"],
      "first_comment": null,
      "music_ref": null
    },
    "instagram_story": {
      "media_url": "https://storage.qyro.io/pieces/550e8400/ig_story.mp4",
      "ratio": "9:16",
      "duration_s": 15,
      "caption": null,
      "hashtags": [],
      "first_comment": null,
      "music_ref": null
    },
    "facebook_feed": {
      "media_url": "https://storage.qyro.io/pieces/550e8400/fb_feed.mp4",
      "ratio": "16:9",
      "duration_s": 47,
      "caption": "El hábito que cambió mi energía en 30 días. ¿Te ha pasado que el cansancio parece tu estado normal? En este vídeo te cuento qué cambié y por qué funcionó.",
      "hashtags": ["bienestar", "habitos"],
      "first_comment": null,
      "music_ref": null
    },
    "facebook_reel": {
      "media_url": "https://storage.qyro.io/pieces/550e8400/fb_reel.mp4",
      "ratio": "9:16",
      "duration_s": 47,
      "caption": "El hábito que nadie te cuenta 👇",
      "hashtags": ["bienestar", "habitos", "energia"],
      "first_comment": null,
      "music_ref": null
    }
  },
  "suggested_schedule": {
    "tiktok": "2026-01-15T19:00:00+01:00",
    "instagram_reel": "2026-01-15T20:00:00+01:00",
    "instagram_feed": "2026-01-16T10:00:00+01:00",
    "instagram_story": "2026-01-15T21:00:00+01:00",
    "facebook_feed": "2026-01-15T20:30:00+01:00",
    "facebook_reel": "2026-01-16T09:00:00+01:00"
  },
  "creative_run_metadata": {
    "model": "claude-opus-4-5",
    "credits_spent": 0.0234,
    "prompt_hash": "sha256:a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5"
  }
}
```

#### Descripción de los campos

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `external_ref` | UUID v4 | Sí | Identificador de idempotencia. Si se reenvía el mismo `external_ref`, el servidor devuelve `409` con el `content_piece_id` original. |
| `title` | string | Sí | Título interno de la pieza (no necesariamente el caption). Máx. 200 chars. |
| `format` | enum | Sí | `short_video`, `image`, `carousel`, `story`. |
| `buyer_persona_ids` | string[] | No | IDs de las buyer personas objetivo. Deben existir en la base de datos del calendario. |
| `campaign_id` | string | No | ID de la campaña en el Estudio Creativo. |
| `concept_id` | string | No | ID del concepto creativo que originó la pieza. |
| `framework_used` | string | No | Framework narrativo aplicado. |
| `hook_used` | string | No | Hook utilizado (primeras palabras del contenido). |
| `platform_variants` | object | Sí | Variantes por plataforma. Al menos una requerida. |
| `suggested_schedule` | object | No | Horarios sugeridos por plataforma en ISO 8601. El gestor puede modificarlos en QC. |
| `creative_run_metadata` | object | No | Metadatos del modelo de IA y coste de la generación. |

#### Variantes de plataforma (`platform_variants`)

Cada clave del objeto `platform_variants` corresponde a un slot de plataforma:

| Clave | Plataforma |
|-------|-----------|
| `tiktok` | TikTok (vídeo vertical) |
| `instagram_reel` | Instagram Reel |
| `instagram_feed` | Instagram Feed (imagen o vídeo) |
| `instagram_story` | Instagram Story |
| `facebook_feed` | Facebook Page Feed |
| `facebook_reel` | Facebook Reel |

Todos los slots siguen la misma estructura:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `media_url` | string (URL) | URL accesible del archivo multimedia. Debe ser HTTPS en producción. |
| `ratio` | string | Ratio de aspecto: `"9:16"`, `"16:9"`, `"4:5"`, `"1:1"`. |
| `duration_s` | number \| null | Duración en segundos. `null` para imágenes estáticas. |
| `caption` | string \| null | Texto del post para esa plataforma. |
| `hashtags` | string[] | Lista de hashtags sin el `#`. |
| `first_comment` | string \| null | Texto del primer comentario (sólo TikTok e IG). |
| `music_ref` | string \| null | Referencia musical (Spotify URI u otro). Informativo. |

---

## Respuestas del endpoint

### `201 Created` — Pieza ingresada correctamente

```json
{
  "content_piece_id": "cp_01HXYZ123456789ABCDEFGHIJ",
  "external_ref": "550e8400-e29b-41d4-a716-446655440000",
  "status": "IN_REVIEW",
  "workspace_id": "ws_01HABC987654321ZYXWVUTSR",
  "variants": [
    {
      "id": "var_01HXYZ_tiktok",
      "platform": "tiktok",
      "status": "PENDING_QC",
      "scheduled_at": "2026-01-15T19:00:00+01:00"
    },
    {
      "id": "var_01HXYZ_ig_reel",
      "platform": "instagram_reel",
      "status": "PENDING_QC",
      "scheduled_at": "2026-01-15T20:00:00+01:00"
    }
  ],
  "qc_url": "https://app.qyro-calendar.com/qc/cp_01HXYZ123456789ABCDEFGHIJ"
}
```

El campo `qc_url` apunta directamente al panel de QC de esa pieza en el dashboard del
calendario (útil para abrir desde el Estudio Creativo o para incluir en notificaciones).

### `409 Conflict` — `external_ref` duplicado (idempotencia)

Devuelve los mismos datos que el `201` original. El cliente puede tratar el `409`
como un éxito: la pieza ya existe y tiene el mismo `content_piece_id`.

```json
{
  "content_piece_id": "cp_01HXYZ123456789ABCDEFGHIJ",
  "external_ref": "550e8400-e29b-41d4-a716-446655440000",
  "status": "IN_REVIEW",
  "workspace_id": "ws_01HABC987654321ZYXWVUTSR",
  "duplicate": true
}
```

### `400 Bad Request` — Error de validación

```json
{
  "error": "VALIDATION_FAILED",
  "message": "La pieza de contenido no supera la validación de plataforma.",
  "blockers": [
    {
      "platform": "instagram_reel",
      "field": "caption",
      "code": "CAPTION_TOO_LONG",
      "detail": "El caption tiene 2.314 caracteres. El máximo para Instagram es 2.200."
    },
    {
      "platform": "tiktok",
      "field": "hashtags",
      "code": "TOO_MANY_HASHTAGS",
      "detail": "Se han enviado 11 hashtags. TikTok recomienda un máximo de 8 para optimizar el alcance."
    }
  ]
}
```

El array `blockers` enumera todos los errores de validación encontrados. El Estudio
Creativo puede usar estos mensajes para corregir la pieza antes de reenviarla.

### `401 Unauthorized` — API Key inválida o expirada

```json
{
  "error": "UNAUTHORIZED",
  "message": "API Key no válida o revocada."
}
```

### `429 Too Many Requests` — Rate limit

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Has superado el límite de 100 ingestas por minuto.",
  "retry_after": 42
}
```

---

## Webhook de salida: notificaciones de cambio de estado

Cuando una pieza cambia de estado, el calendario envía un `POST` a la URL de webhook
configurada en los ajustes del workspace.

### Configuración del webhook

En **Ajustes del workspace → API & Webhooks** del calendario:

- **Webhook URL**: la URL en el Estudio Creativo que recibirá los eventos.
- **Webhook Secret**: un string aleatorio que el calendario usará para firmar el payload.
  Guárdalo como `SOCIAL_CALENDAR_WEBHOOK_SECRET` en el Estudio Creativo.

### Eventos disponibles para suscripción

| Evento | Cuándo se dispara |
|--------|-------------------|
| `piece.status_changed` | Cualquier cambio de estado de la pieza |
| `variant.published` | Una variante de plataforma se publica correctamente |
| `variant.failed` | Una variante falla en la publicación (agotados los reintentos) |
| `variant.scheduled` | El gestor aprueba y programa una variante |
| `boost.activated` | Se activa un boost en una variante |
| `boost.completed` | El boost finaliza (presupuesto agotado o fecha fin) |

### Formato del payload

```json
{
  "event": "variant.published",
  "timestamp": "2026-01-15T19:03:42.123Z",
  "workspace_id": "ws_01HABC987654321ZYXWVUTSR",
  "workspace_slug": "qyro-main",
  "content_piece_id": "cp_01HXYZ123456789ABCDEFGHIJ",
  "external_ref": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "variant_id": "var_01HXYZ_tiktok",
    "platform": "tiktok",
    "previous_status": "SCHEDULED",
    "new_status": "PUBLISHED",
    "platform_post_id": "7321234567890123456",
    "published_at": "2026-01-15T19:00:08.000Z",
    "post_url": "https://www.tiktok.com/@qyro/video/7321234567890123456"
  }
}
```

### Verificación de la firma

Cada webhook incluye la cabecera `X-Calendar-Signature` con un HMAC-SHA256 del body
firmado con el Webhook Secret.

```typescript
// Verificación en el Estudio Creativo (ejemplo TypeScript)
import { createHmac, timingSafeEqual } from 'node:crypto';

function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const expectedBuffer = Buffer.from(`sha256=${expected}`, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

// En el handler del webhook:
const signature = req.headers['x-calendar-signature'] as string;
const isValid = verifyWebhookSignature(req.rawBody, signature, process.env.SOCIAL_CALENDAR_WEBHOOK_SECRET!);
if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

**Nunca proceses un webhook sin verificar la firma.** Usa `timingSafeEqual` para
evitar ataques de timing.

### Política de reintentos del webhook

Si el Estudio Creativo devuelve un status >= 400 o la conexión falla, el calendario
reintenta el webhook con backoff exponencial:

| Intento | Espera antes del reintento |
|---------|---------------------------|
| 1 | 30 segundos |
| 2 | 2 minutos |
| 3 | 10 minutos |
| 4 | 1 hora |
| 5 | 6 horas |

Tras 5 intentos fallidos, el webhook queda en estado `DEAD` y se registra una alerta
en el dashboard del calendario. El Estudio Creativo puede consultar el estado de los
webhooks en **Ajustes → API & Webhooks → Historial de eventos**.

---

## Reglas de validación por plataforma

El endpoint de ingest valida cada variante contra las restricciones técnicas de cada
plataforma antes de persistir la pieza. Todas las reglas están definidas en
`packages/shared/src/schemas/`.

### Instagram (Reel, Feed, Story)

| Campo | Regla | Error |
|-------|-------|-------|
| `caption` | Máximo 2.200 caracteres | `CAPTION_TOO_LONG` |
| `hashtags` | Máximo 30 (aviso en QC si > 10) | `TOO_MANY_HASHTAGS` |
| `ratio` (Reel) | `9:16` requerido | `INVALID_RATIO` |
| `ratio` (Feed imagen) | `1:1`, `4:5` o `1.91:1` | `INVALID_RATIO` |
| `duration_s` (Reel) | Entre 3 y 90 segundos | `INVALID_DURATION` |
| `duration_s` (Story vídeo) | Máximo 60 segundos | `INVALID_DURATION` |
| `media_url` | HTTPS obligatorio en producción | `INSECURE_MEDIA_URL` |

### TikTok

| Campo | Regla | Error |
|-------|-------|-------|
| `caption` | Máximo 2.200 caracteres | `CAPTION_TOO_LONG` |
| `hashtags` | < 8 recomendado (aviso, no blocker) | `TOO_MANY_HASHTAGS` |
| `ratio` | `9:16` requerido | `INVALID_RATIO` |
| `duration_s` | Entre 3 y 600 segundos | `INVALID_DURATION` |
| `media_url` | HTTPS obligatorio en producción | `INSECURE_MEDIA_URL` |

### Facebook (Feed, Reel)

| Campo | Regla | Error |
|-------|-------|-------|
| `caption` | Máximo 63.206 caracteres | `CAPTION_TOO_LONG` |
| `hashtags` | Máximo 30 (aviso si > 5) | `TOO_MANY_HASHTAGS` |
| `ratio` (Reel) | `9:16` requerido | `INVALID_RATIO` |
| `duration_s` (Reel) | Entre 3 y 90 segundos | `INVALID_DURATION` |

> Los errores de tipo **aviso** (warnings) se registran en la respuesta del `201` bajo
> la clave `warnings` pero no bloquean el ingest. Los errores de tipo **blocker**
> devuelven `400` e impiden la creación de la pieza.

---

## Ejemplo de integración completa

El siguiente ejemplo muestra el flujo completo desde el Estudio Creativo usando
el SDK de fetch nativo de Node.js (sin dependencias externas):

```typescript
// creative-studio/src/services/social-calendar-client.ts

const CALENDAR_API_URL = process.env.QYRO_SOCIAL_CALENDAR_URL!;
const CALENDAR_API_KEY = process.env.QYRO_SOCIAL_CALENDAR_API_KEY!;

interface IngestResult {
  content_piece_id: string;
  external_ref: string;
  status: string;
  duplicate?: boolean;
}

export async function ingestContentPiece(
  payload: ContentPiecePayload,
): Promise<IngestResult> {
  const response = await fetch(`${CALENDAR_API_URL}/api/v1/content-pieces/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-API-Key': CALENDAR_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 201 || response.status === 409) {
    return response.json() as Promise<IngestResult>;
  }

  if (response.status === 400) {
    const error = await response.json();
    throw new ValidationError(error.blockers);
  }

  throw new Error(`Calendar API error: ${response.status} ${response.statusText}`);
}
```

---

## Versionado de la API

El endpoint de ingest está bajo el prefijo `/api/v1/`. Cuando se introduzcan cambios
incompatibles (breaking changes), se creará un nuevo prefijo `/api/v2/` manteniendo
la v1 activa durante al menos 6 meses para dar tiempo a la migración.

Los cambios compatibles (nuevos campos opcionales, nuevos eventos de webhook) no
incrementan la versión.

---

## Soporte y depuración

- **Historial de ingestas**: en el dashboard del calendario → **API & Webhooks →
  Historial de ingestas**, puedes ver todos los requests recibidos, su resultado y
  el payload completo (útil para depurar).
- **Logs estructurados**: todos los eventos de ingest se registran con `content_piece_id`,
  `external_ref` y `workspace_id` para facilitar la correlación entre sistemas.
- **Estado de salud del calendario**: `GET /api/v1/health` — no requiere autenticación.
  Devuelve el estado de la base de datos, Redis y las colas de BullMQ.
