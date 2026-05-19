# 0001 — Stack y layout de monorepo

- **Fecha**: 2026-05-19
- **Estado**: Aceptada
- **Decisores**: Diego (producto), Claude (implementación)

## Contexto

El módulo de calendario social tiene que vivir fuera de la app QYRO porque la app no
tiene backend propio (datos en IndexedDB). El brief planteaba tres opciones:

- **A**: monorepo dentro de QYRO compartiendo design system y tipos.
- **B**: repo separado standalone.
- **C**: edge/serverless.

Al arrancar, el repo `Calendario-publicaciones` está vacío y aislado: no hay codebase
de QYRO con el que compartir nada en este momento.

## Decisión

Adoptamos **Opción B (standalone)**. Replicamos la identidad visual QYRO mediante
tokens en `packages/ui` y la documentamos en `docs/design-system.md`.

Stack:

- **Monorepo**: pnpm workspaces + Turborepo.
- **Backend**: Fastify + TypeScript + Prisma + PostgreSQL.
- **Queue**: BullMQ + Redis.
- **Frontend**: React 18 + Vite + TS + Tailwind + Framer Motion + Zustand +
  TanStack Query + vite-plugin-pwa.
- **Storage**: S3-compatible (MinIO local, R2/B2 prod).
- **Lint/format**: Biome.
- **Tests**: Vitest + Playwright + MSW.

## Consecuencias

- Positivo: arrancamos rápido, sin dependencias externas.
- Positivo: mismas tecnologías que QYRO declara → en el futuro la migración a Opción A
  sería gradual (mover apps a workspaces del monorepo de QYRO).
- Negativo: cualquier evolución del design system de QYRO hay que portarla manualmente
  aquí hasta que se unifiquen los repos.
- Mitigación: tokens centralizados en `packages/ui/tokens.ts` para minimizar la fricción
  de port.

## Alternativas descartadas

- **A** (monorepo con QYRO): no hay acceso al repo QYRO desde aquí.
- **C** (edge/serverless): añade complejidad de plataforma (KV/D1) sin beneficios claros
  para single-tenant y volumen bajo. Reconsiderar si en el futuro se vende como SaaS.
