# 0008 — Integración con el Estudio Creativo (SESIÓN 2)

- **Fecha**: 2026-05-19
- **Estado**: Aceptada
- **Decisores**: Diego + Claude (brief de SESIÓN 2)

## Contexto

SESIÓN 2 introduce el **Estudio Creativo**: un servicio agéntico que
genera piezas (imagen + vídeo UGC + demo de UI + lifestyle) usando
Higgsfield CLI, HeyGen Skills e HyperFrames, y las **empuja** a la cola
del calendario para QC humano antes de publicar.

Este ADR fija el límite entre el calendario (SESIÓN 1, este repo) y el
estudio creativo (SESIÓN 2). El cambio es **conceptual + contractual**,
no requiere migración de schema: el endpoint `/api/v1/content-pieces/ingest`
ya cumple Fase 2 con autenticación service-to-service, idempotencia por
`external_ref`, validación cruzada por plataforma, persistencia atómica
y emisión SSE (ver `apps/api/src/routes/ingest.ts` y ADR 0003).

## Decisión

### Ubicación del código

- El módulo `creative-studio` vive en el **repo de la app QYRO**, no en
  este. Justificación: separa el dominio de generación (depende de
  Higgsfield/HeyGen/HyperFrames) del de publicación (depende de
  Meta/TT/FB). Cambios de modelo o de presupuesto creativo no fuerzan
  redeploy del calendario.
- Este repo expone únicamente el contrato HTTP. Cualquier dependencia
  cruzada se versiona vía npm package o copia explícita del schema Zod.

### Comunicación

- **Protocolo**: HTTPS, JSON, `POST /api/v1/content-pieces/ingest`.
- **Auth**: header `X-Service-API-Key` con el valor de
  `INGEST_SERVICE_API_KEY` (compartido en secret manager, rotado
  trimestralmente). Comparación timing-safe ya implementada en
  `apps/api/src/middleware/authPlugin.ts:31`.
- **Idempotencia**: el estudio envía `external_ref` (UUID v4) por
  `creative_run`. Si la pieza ya existe, el calendario devuelve 200 con
  `duplicated: true` y el `content_piece_id` actual; no duplica ni
  modifica el estado.
- **Estado inicial**: cada pieza entra como `IN_REVIEW` (el estudio ya
  hizo su QC interno; falta el humano).

### Modo dry-run

Mientras las API keys de Higgsfield y HeyGen no estén disponibles, el
estudio funcionará en `STUDIO_DRY_RUN=true`:

- Higgsfield y HeyGen se sustituyen por mocks que devuelven URLs de
  ficheros estáticos servidos desde el bucket S3-compatible del propio
  estudio.
- HyperFrames sí puede generar renders reales desde el día 0 (coste 0
  en API).
- El push al calendario es **real** desde el día 0 — eso permite probar
  el contrato end-to-end sin gastar créditos.

Mismo patrón que SESIÓN 1 usó con Meta/TT (ADR 0004).

### Talento UGC

Sólo **avatares preset** (HeyGen Avatar V preset + Higgsfield Soul
Characters genéricos). No grabamos a Diego ni entrenamos Soul ID
personalizado. Esto fija el router de modelo del estudio:

- UGC talking-head → HeyGen Avatar V preset.
- UGC con escena dinámica → Higgsfield Seedance 2.0 con prompt-only
  (sin `--soul-id`).
- Lifestyle cinematográfico → Higgsfield Veo 3.1 / Sora 2, **bloqueado
  detrás de confirmación explícita** por su coste.

### Presupuesto de generación

- Tope mensual combinado Higgsfield + HeyGen: **50–200 €/mes** (medio).
- Hard block para modelos premium (Veo 3.1, Sora 2, Kling 3.0 premium)
  por encima del 95 % del cap mensual.
- El kill switch de **boost en redes** (5 €/día, 150 €/mes — ADR 0002)
  sigue siendo responsabilidad de este repo. Son dos presupuestos
  distintos: generar la creatividad ≠ pagarle a Meta para amplificarla.

### Lo que NO entra en este ADR

- **Subida de media**: el campo `media_url` del payload de ingest asume
  que el estudio ya alojó el fichero en un bucket público o presigned.
  No exponemos endpoint de upload desde el calendario. Si más adelante
  queremos centralizar storage, se hará en un ADR aparte.
- **Resolución de `buyer_persona_ids`**: el payload acepta IDs string
  que deben coincidir con los IDs reales de `BuyerPersona` en este DB.
  El estudio necesita poder consultarlos. Cubrir vía endpoint
  `GET /api/v1/buyer-personas` en un PR de seguimiento (gap conocido,
  ver §gaps abajo).

## Consecuencias

- **Pros**:
  - El contrato HTTP es la única superficie de acople. El estudio puede
    cambiar de stack de generación sin tocar este repo.
  - Idempotencia y dry-run permiten desarrollar SESIÓN 2 sin riesgo de
    duplicar piezas ni gastar créditos.
  - El kill switch de boost sigue donde tiene los datos (ledger en este
    DB), no se reparte.

- **Cons**:
  - Dos repos significan dos pipelines de CI. Hay que sincronizar el
    schema Zod del payload (`ingestPayloadSchema`) entre ambos. Opción
    pragmática: publicar `@qyro/shared` a un registry privado o copiar
    el schema y testear el contrato con un test de schema cross-repo.

## Gaps conocidos (a cubrir en PRs de seguimiento)

1. **`GET /api/v1/buyer-personas`** para que el estudio descubra los
   IDs vigentes. Trivial (lectura), pero necesario antes de Fase 2 de
   SESIÓN 2.
2. **Endpoint de feedback de QC al estudio**: cuando el humano marca
   `CHANGES_REQUESTED` o `REJECTED`, el estudio quiere saberlo para
   alimentar `CreativeRun.outcome`. Opciones: webhook saliente firmado
   desde este repo o consumir SSE existente con el mismo service key.
   Decisión diferida hasta que SESIÓN 2 llegue a Fase 10 (loop de
   aprendizaje).
3. **AI disclosure**: si UE/TT exigen flag en metadata, añadir
   `ai_generated: boolean` al payload de ingest y propagarlo al
   `Publisher` correspondiente.

## Sustitución por implementación real

No requiere sustitución — el endpoint ya es producción-ready desde
Fase 2. Lo único que pasa de mock a real es el lado del estudio
(Higgsfield/HeyGen vs. mocks) y el provisioning del
`INGEST_SERVICE_API_KEY` en el entorno del estudio.
