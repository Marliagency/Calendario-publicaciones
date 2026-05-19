# Extender el checklist de QC

> Pendiente de detallar tras Fase 3 (cola de validación). Esta página es un placeholder.

## Diseño previsto

Las reglas de QC son **configurables y persistidas** en la tabla `QCRule`:

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | string | Nombre legible. |
| `applies_to_formats` | enum[] | Formatos a los que aplica (`reel`, `image`, ...). |
| `applies_to_platforms` | enum[] | Plataformas a las que aplica. |
| `rule_type` | enum | `HOOK_IN_3S`, `CTA_PRESENT`, `HASHTAG_LIMIT`, `CAPTION_TYPOS`, `MUSIC_LICENSE`, `CUSTOM_SCRIPT`, etc. |
| `params_json` | jsonb | Parámetros específicos del tipo de regla. |
| `severity` | enum | `BLOCKER` / `WARNING` / `INFO`. |

Para añadir un nuevo tipo de regla:

1. Añadir el valor al enum `QCRuleType` en `packages/db/prisma/schema.prisma`.
2. Implementar el evaluador en `apps/api/src/qc/evaluators/{rule-type}.ts`.
3. Registrarlo en `apps/api/src/qc/registry.ts`.
4. Test unitario en `apps/api/src/qc/evaluators/{rule-type}.test.ts`.
5. UI: el formulario de creación de reglas en `apps/web/src/pages/qc/RulesPage.tsx`
   detecta el nuevo tipo automáticamente vía schema Zod compartido.
