# 0007 — Boost (Spark Ads) y métricas con kill switch reconciliado

- **Fecha**: 2026-05-19
- **Estado**: Aceptada
- **Decisores**: Claude (§2.4 y §2.5 del brief)

## Contexto

Fase 6 (boost) y Fase 7 (métricas) requieren orquestación contra Meta
Marketing API y TikTok Marketing API. Sin app review → mock. Pero la
arquitectura sí es real: el kill switch (5€/día, 150€/mes — ADR 0002)
tiene que funcionar de verdad y proteger contra gasto descontrolado
desde el primer día.

## Decisión

### Boost

- `POST /api/v1/content-pieces/:id/boost { dailyBudgetEur, durationDays, objective, audiencePresetId }`.
- Valida con `checkBudget(totalCents, platform)`:
  - Suma `BoostSpendLedger.committed_cents + spend_cents` del día/mes.
  - Si `currentCommitted + currentSpent + newBoost > cap` → 409 `BUDGET_CAP_EXCEEDED`.
- Si pasa: `commitBudget(totalCents, platform)` incrementa `committed_cents`
  y encola `BoostJob` con presupuestos en céntimos.
- `boostHandler` crea `AdCampaign(status=ACTIVE)` con IDs externos mockeados.
  Si la pieza no se ha publicado aún, lanza error retryable (BullMQ espera).

### Métricas

- `metricsHandler` (cron diario o trigger manual via `POST /api/v1/metrics/refresh`):
  1. Pull insights orgánicos para cada variante publicada (mock genera
     impressions, reach, likes, comments, shares, saves, video_views,
     avg_watch_time_s).
  2. Si hay `AdCampaign(ACTIVE)`, genera métrica `PAID` y un gasto
     simulado del día.
  3. Reconcilia ledger: `spend_cents += spentToday` y
     `committed_cents -= spentToday` → moneda comprometida pasa a
     gastada según se materializa.
- `Metric.dataJson` mantiene la respuesta cruda (un blob distinto por red).

### Hook Score / Hold Rate

Proxies derivados de métricas, no calculados a mano por la API real:
- `holdRate = avg_watch_time_s / duration_s` (clamped a 1).
- Se muestran como medias en el dashboard. Cuando haya métricas reales por
  segundo (TT Reach&Frequency, IG Insights de vídeo), se sustituye el cálculo.

### Export

CSV (compatible Excel) + HTML imprimible (Ctrl+P → PDF). Decisión consciente
ante la no disponibilidad de skills `pdf`/`xlsx` en el entorno; cero
dependencias extra, mismo resultado funcional.

## Consecuencias

- Pros: kill switch testado y reconciliado a nivel BD desde el día 0;
  cuando entren números reales, solo cambia la fuente (mock → API real)
  y el ledger ya funciona.
- Cons: los números mostrados en dashboard hasta app review son
  inventados de forma plausible. Hay un banner claro en el dashboard
  avisándolo.

## Sustitución por implementación real

1. En `metricsHandler`, sustituir la llamada al adapter mock por la real.
2. En `boostHandler`, sustituir `mockCampaignId` por la llamada a
   `POST /act_{ad_account_id}/campaigns` (Meta) o el equivalente TT.
3. El ledger y los caps siguen igual: lo único que cambia es el origen
   del `spend_cents` reportado.
