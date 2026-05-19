# Conectar una nueva cuenta social

> Pendiente de detallar tras Fase 1.5 (OAuth scaffolding). Esta página es un placeholder
> con el flujo previsto.

## Meta (Instagram + Facebook)

1. La cuenta de IG debe ser **Business** o **Creator** y estar vinculada a una **Página
   de Facebook**.
2. La app de Meta Developer debe tener aprobados los permisos:
   - `instagram_content_publish`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `ads_management` (si se va a usar boost)
   - `business_management`
3. En la PWA, ir a **Settings → Cuentas sociales → Conectar Meta**.
4. Redirige a Facebook Login for Business. Aceptar permisos.
5. El backend intercambia el `code` por un token long-lived (60 días), lo cifra y guarda
   en `SocialAccount`. Se almacenan también `page_id`, `ig_user_id`, `business_id`.

## TikTok

1. App registrada en TikTok for Business con la **Content Posting API** habilitada.
2. La cuenta del creador debe ser **Business** (no Personal).
3. En la PWA, ir a **Settings → Cuentas sociales → Conectar TikTok**.
4. Redirige a TikTok OAuth. Aceptar scopes `video.publish`, `video.upload`,
   `user.info.basic`, `business.creator.insights`.
5. Backend guarda tokens cifrados y `tt_advertiser_id` si se va a usar Spark Ads.
