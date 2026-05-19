# 0004 — OAuth Meta/TikTok: scaffolding mockeado en Fase 1

- **Fecha**: 2026-05-19
- **Estado**: Aceptada (revisable cuando se aprueben las apps)
- **Decisores**: Diego

## Contexto

Sub-fase 1.5 monta el contrato de URLs OAuth (`/auth/meta/start`, `/auth/callback/meta`,
`/auth/tiktok/start`, `/auth/callback/tiktok`) pero ninguna llama a la API real porque:

1. Las apps de Meta Developer y TikTok for Business aún no existen — se crean desde
   cero (decisión tomada en Fase 0).
2. Los permisos críticos (`instagram_content_publish`, `video.publish`) requieren
   app review, que tarda semanas.

## Decisión

Las rutas existen y responden `501 Not Implemented` con un mensaje que indica al
operador qué falta. La PWA y el resto del backend pueden referenciarlas y enlazar
contra ellas sin riesgo: cuando las apps estén aprobadas, basta con sustituir el cuerpo
de las handlers sin tocar el contrato.

Para desarrollo y tests usaremos **MSW** (Fase 5) interceptando las llamadas a Graph
API / TikTok Content Posting API, no a estas rutas internas.

## Consecuencias

- Pros: trabajo en paralelo posible. Fases 2, 3 y 4 no se bloquean por app review.
- Cons: el flujo end-to-end real (login → conectar cuenta IG → publicar) no se puede
  demo-ear hasta Fase 5 con app review aprobada o cuentas sandbox de Meta/TikTok.

## Trabajo pendiente al aprobarse apps

1. Rellenar `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT_URI`,
   `META_WEBHOOK_VERIFY_TOKEN` y los equivalentes TikTok en `.env`.
2. Implementar `routes/oauth.ts` con el flujo real (intercambio de `code` por token
   long-lived, persistencia cifrada en `SocialAccount`).
3. Documentar el flujo paso a paso en `docs/social-calendar/connect-new-account.md`.
