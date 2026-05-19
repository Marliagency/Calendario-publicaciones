# 0006 — Worker de publicación + adaptadores mock

- **Fecha**: 2026-05-19
- **Estado**: Aceptada (revisable al aprobarse las apps Meta/TT)
- **Decisores**: Claude (a partir del §2.3 del brief)

## Contexto

El brief requería implementar publicación real a IG/FB/TT con OAuth real,
webhooks firmados, retries y rate limit awareness. Las apps Meta Developer y
TikTok for Business no están creadas todavía (ADR 0004) → trabajamos contra
mocks hasta app review.

## Decisión

Estructura en tres capas:

1. **`packages/platform-adapters`**: interfaz `SocialPublisher` con métodos
   `publish`, `fetchInsights`, `verifyWebhookSignature`. Hoy todos los
   publishers son instancias de `MockPublisher` (latencia simulada,
   respuestas deterministas). El registry resuelve por `PlatformVariantKind`.

2. **`apps/api/scheduler.ts`**: al aprobar una pieza con todas las variantes
   programadas (transición `IN_REVIEW → SCHEDULED`), encola un `PublishJob`
   por variante en BullMQ con:
   - `jobId = idempotencyKey = sha256(content_piece_id|variant_kind|scheduled_at)`
   - `delay = scheduled_at - now`
   - `attempts: 5`, backoff exponencial 30s
   - Crea fila en tabla `PublishJob` para idempotencia + auditoría.

3. **`apps/worker/publishHandler.ts`**: handler que invoca al adapter:
   - Verifica rate limit (IG ≤ 25 posts/24h, TT ≤ 30 posts/24h del brief).
   - Marca `PublishJob.RUNNING` + incrementa `attempt`.
   - Persiste `platformPostId` y `publishedAt` al éxito.
   - Distingue errores retryable (`RATE_LIMIT`, transitorios) vs permanentes
     (`INVALID_MEDIA`). Permanente → `ContentPiece.FAILED`.
   - Cuando todas las variantes de la pieza están publicadas → `PUBLISHED`.

## Webhooks

- `GET /webhooks/meta` responde al handshake `hub.challenge` (verify token).
- `POST /webhooks/meta` y `/webhooks/tiktok` verifican HMAC SHA256
  (`x-hub-signature-256` y `tiktok-signature` respectivamente) antes de
  cualquier side-effect. Si la pieza ya está marcada como publicada,
  reconcilia (`publishedAt`) — no duplica registros.

## Sustitución por adapters reales

Cuando se aprueben las apps:
1. Implementar `MetaInstagramPublisher`, `MetaFacebookPublisher`,
   `TikTokPublisher` siguiendo el contrato `SocialPublisher`.
2. Cambiar `packages/platform-adapters/src/registry.ts` para construir las
   reales en lugar de `MockPublisher`.
3. Sustituir `accessToken = 'mock-token'` en `publishHandler.ts` por
   `decryptToken(variant.socialAccount.accessTokenEncrypted, TOKEN_ENCRYPTION_KEY)`.
4. Cero cambios en API ni en frontend.

## Consecuencias

- Pros: Fases 2-7 pueden desarrollarse y probarse sin esperar app review.
  El contrato del adapter está cerrado, los tests cubren los caminos
  retryable/permanent/success, idempotencia funciona contra DB real.
- Cons: el "publicado" hoy es ficticio. Sin app review, no podemos enseñar
  a un usuario externo el flujo completo posteado a su feed real.
