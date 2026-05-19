# 0002 — Kill switch de gasto en boost

- **Fecha**: 2026-05-19
- **Estado**: Aceptada
- **Decisores**: Diego

## Contexto

El módulo permite promocionar piezas con presupuestos pequeños (1–2 €/día) vía Meta
Marketing API y TikTok Spark Ads. Sin límites globales, un bug, un mal preset o una
acción accidental podría disparar el gasto.

## Decisión

Hard limits globales del sistema, enforced ANTES de crear cualquier ad:

- **Diario global**: `5 €`
- **Mensual global**: `150 €`

Configurables vía variables de entorno `BUDGET_DAILY_CAP_EUR` y
`BUDGET_MONTHLY_CAP_EUR` para no requerir despliegue al ajustarlos.

Implementación:

- Antes de encolar el job de boost, el API consulta el gasto acumulado (orgánico + ya
  programado) y rechaza con `BUDGET_CAP_EXCEEDED` si el siguiente boost lo supera.
- Cron diario reconcilia gasto real reportado por Meta/TikTok contra el contabilizado.
- UI: indicador permanente "Hoy: X€ / 5€ · Mes: Y€ / 150€" en la barra superior cuando
  se navegue por secciones de boost.

## Consecuencias

- Positivo: imposible que un fallo o acción accidental gaste más de 150 €/mes.
- Positivo: el indicador en UI educa sobre cuánto queda.
- Negativo: si en el futuro queremos campañas mayores hay que subir los caps explícitamente.

## Alternativas descartadas

- Sin kill switch: descartado por riesgo.
- Caps por plataforma: añadía complejidad sin valor — los caps globales son suficientes
  porque el volumen total es bajo.
