# Añadir una nueva red social

> Pendiente de detallar tras Fase 5 (adaptadores). Esta página es un placeholder.

## Pasos previstos

1. Crear `packages/platform-adapters/src/{red}.ts` que implementa la interfaz
   `SocialPublisher` (`publish`, `delete`, `getInsights`, `refreshToken`).
2. Añadir el enum `Platform` en `packages/db/prisma/schema.prisma` y migración.
3. Añadir constantes de límites en `packages/shared/src/platform-limits.ts`:
   caption max, hashtag max, ratios soportados, duración mín/máx, formatos válidos.
4. Añadir el icono en `packages/ui/icons/`.
5. Registrar el adaptador en `apps/worker/src/publishers/registry.ts`.
6. Añadir OAuth flow en `apps/api/src/routes/auth/{red}.ts`.
7. Tests con MSW mockeando la API real.
8. Documentar el flujo de app review en `connect-new-account.md`.
