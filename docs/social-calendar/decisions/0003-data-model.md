# 0003 — Modelo de datos

- **Fecha**: 2026-05-19
- **Estado**: Aceptada
- **Decisores**: Claude (a partir del §3 del brief)

## Contexto

El brief propuso un modelo de datos en pseudo-código en §3. Hay que aterrizarlo en
Prisma + Postgres con tipos correctos, índices y reglas de borrado en cascada.

## Decisiones concretas

1. **`PlatformVariant` como tabla separada** (no JSON dentro de ContentPiece). Razón:
   cada variante tiene su propio `scheduled_at`, `published_at`, `platform_post_id` y
   sus propios jobs, ads y métricas. Modelar como tabla hace los JOIN naturales.
2. **`@@unique([contentPieceId, kind])`** en `PlatformVariant`: una pieza tiene como
   máximo una variante por placement. Si quieres re-publicar el mismo asset en otro
   horario, creas otra `ContentPiece`.
3. **Estados de `ContentPiece` como enum**, no string libre. Estados explícitos en
   §4 del documento de arquitectura.
4. **Campañas y personas con `onDelete: SetNull`/`Cascade` distintos**: borrar una
   pieza no borra la campaña ni la persona. Borrar una pieza sí borra sus variantes,
   jobs, métricas y audit logs.
5. **`BoostSpendLedger` separado de `AdCampaign`**: el ledger es la fuente de verdad
   para el kill switch (5€/día, 150€/mes). Se reconcilia diariamente contra Meta/TT,
   pero la decisión de aceptar/rechazar un nuevo boost mira `committed_cents +
   spend_cents` del ledger del día, no las campañas individuales.
6. **`idempotencyKey` único en `PublishJob`**: aplica la regla §5 del brief
   (`hash(content_piece_id + platform + scheduled_at)`).
7. **`Metric.dataJson` como blob**: cada red devuelve campos distintos y van mutando.
   No vale la pena tipar columnas para algo que cambia 4 veces al año. Si una métrica
   se vuelve crítica (ej. spend), se promueve a columna.
8. **`AuditLog`** centralizado para todas las entidades (no una tabla por tipo). Index
   por `(entityType, entityId)`.

## Consecuencias

- Pros: schema completo cubre las fases 1–7 sin nuevas migraciones de fondo. Cambios
  futuros serán aditivos (índices, columnas), no destructivos.
- Cons: hay tablas que en Fase 1 quedan vacías (`Metric`, `PublishJob`, `AdCampaign`).
  Es aceptable: tener el schema completo desde el inicio evita migraciones complejas
  más adelante y permite a la SESIÓN 2 saber a qué se conecta.

## Decisión revisable

- `Decimal(8,2)` para `boostBudgetEur` da hasta 999.999,99 €. Más que suficiente.
- Si en Fase 7 las métricas crecen mucho, considerar mover `Metric` a una tabla
  particionada por mes o a una BD aparte (ClickHouse/Timescale). Hoy no merece la pena.
