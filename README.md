# QYRO Social Calendar

Módulo standalone para gestionar el calendario de publicaciones sociales de **QYRO** en
TikTok, Instagram y Facebook. Incluye cola de validación humana (QC), scheduling con
worker, publicación real vía APIs oficiales, boost con presupuesto controlado y
analítica post-publicación.

Construido como servicio separado porque la app QYRO no tiene backend propio (sus datos
viven en IndexedDB local).

## Estado

🚧 En desarrollo. Sigue el plan por fases en `docs/social-calendar/README.md`.

## Stack

- **Backend**: Fastify + TypeScript + Prisma + PostgreSQL
- **Queue**: BullMQ + Redis
- **Frontend**: React 18 + Vite + TypeScript + Tailwind + Framer Motion + Zustand + TanStack Query
- **PWA**: vite-plugin-pwa
- **Storage**: S3-compatible (MinIO en dev)
- **Monorepo**: pnpm workspaces + Turborepo
- **Tests**: Vitest + Playwright + MSW
- **Lint/format**: Biome

## Quick start

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar infra local (postgres + redis + minio)
pnpm infra:up

# 3. Copiar variables de entorno
cp .env.example .env
# Edita .env y rellena los secrets generados con:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Migraciones + seed
pnpm db:migrate
pnpm db:seed

# 5. Arrancar todo (api + worker + web)
pnpm dev
```

Web PWA: http://localhost:5173 · API: http://localhost:3001 · MinIO console: http://localhost:9001

## Documentación

- [Arquitectura](docs/social-calendar/architecture.md)
- [Conectar nueva cuenta social](docs/social-calendar/connect-new-account.md)
- [Añadir nueva red](docs/social-calendar/add-new-platform.md)
- [Extender el checklist de QC](docs/social-calendar/extend-qc-checklist.md)
- [Design system QYRO](docs/design-system.md)
- [Decisiones arquitectónicas (ADRs)](docs/social-calendar/decisions/)
