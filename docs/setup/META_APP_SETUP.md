# Configuración de la App Meta (Instagram + Facebook)

Guía paso a paso para registrar y configurar la aplicación en Meta for Developers,
habilitar los productos necesarios y conectar las cuentas de Instagram y Facebook
al calendario de publicaciones de QYRO.

> **Requisito previo**: necesitas acceso de administrador a una cuenta de Meta Business
> Manager (business.facebook.com). La app debe ser de tipo **Business**, no Consumer.
> Las apps Consumer no tienen acceso a la Graph API de Instagram ni a la Marketing API.

---

## 1. Crear la aplicación en Meta for Developers

1. Ve a [developers.facebook.com](https://developers.facebook.com) e inicia sesión con
   la cuenta que administra el Business Manager de QYRO.
2. Clic en **My Apps → Create App**.
3. En la pantalla de selección de tipo:
   - Selecciona **Business** (no "Consumer" ni "None").
   - Esto habilita Instagram Graph API y Marketing API desde el principio.
4. Rellena los datos básicos:
   - **Display name**: `QYRO Social Calendar` (o el nombre que aparecerá ante los usuarios
     durante el OAuth).
   - **App contact email**: email del equipo técnico de QYRO.
   - **Business account**: selecciona el Business Manager de QYRO.
5. Haz clic en **Create App** y completa el captcha si aparece.

Anota el **App ID** y el **App Secret** (Settings → Basic) — los necesitarás para las
variables de entorno.

---

## 2. Añadir productos a la app

Desde el panel de la app, ve a **Add a Product** y añade los siguientes tres productos
en este orden:

### 2.1 Facebook Login for Business

1. Clic en **Set Up** junto a *Facebook Login for Business*.
2. En la sección **OAuth Redirect URIs**, añade:
   ```
   https://{tu-dominio}/auth/meta/callback
   http://localhost:3001/auth/meta/callback
   ```
   La primera es la URI de producción; la segunda, la de desarrollo local.
   La ruta `/auth/meta/callback` está registrada en `apps/api/src/routes/oauth/meta.ts`.
3. En **Client OAuth Settings**, asegúrate de que están activados:
   - *Client OAuth Login*: **On**
   - *Web OAuth Login*: **On**
   - *Enforce HTTPS*: **On** (sólo se puede desactivar para localhost en dev)
4. Guarda los cambios.

### 2.2 Instagram Graph API

1. Clic en **Set Up** junto a *Instagram Graph API*.
2. No requiere configuración adicional en este paso; los permisos se gestionan
   en la pantalla de App Review (sección 5).
3. Comprueba que la versión por defecto de la API es **v21.0** o superior:
   Settings → Advanced → Upgrade API Calls.

### 2.3 Marketing API

1. Clic en **Set Up** junto a *Marketing API*.
2. Acepta las Condiciones de Servicio de Marketing API si se solicita.
3. La Marketing API es necesaria para crear y gestionar Boost / Spark Ads desde
   el calendario (Fase 6). Sin ella, el módulo de boost quedará en modo mock.

---

## 3. URIs de redirección OAuth

El flujo OAuth de Meta en este proyecto usa **ventana emergente** (popup), no
redirección de página completa. Esto permite que el calendario permanezca abierto
en segundo plano mientras el usuario autoriza la conexión.

El backend genera la URL de autorización y el frontend la abre con `window.open()`.
Cuando Meta redirige a la callback URI, la ventana popup recibe el código, lo envía
al backend vía `window.opener.postMessage()` y se cierra sola.

### URIs que debes registrar

| Entorno | URI |
|---------|-----|
| Producción | `https://{tu-dominio}/auth/meta/callback` |
| Staging | `https://staging.{tu-dominio}/auth/meta/callback` |
| Desarrollo local | `http://localhost:3001/auth/meta/callback` |

> **Importante**: Meta valida la URI de redirección de forma exacta (incluyendo
> trailing slash). Registra exactamente la misma cadena que usas en el parámetro
> `redirect_uri` de la petición OAuth.

---

## 4. Permisos requeridos

Estos son los permisos (scopes) que el calendario solicita durante el flujo OAuth.
Se configuran en la solicitud de autorización y deben estar aprobados en App Review
para usuarios fuera del equipo de desarrollo.

### Permisos de Instagram

| Permiso | Para qué se usa |
|---------|-----------------|
| `instagram_basic` | Leer perfil y contenido existente |
| `instagram_content_publish` | Publicar Reels, Carruseles e imágenes |

### Permisos de Facebook Pages

| Permiso | Para qué se usa |
|---------|-----------------|
| `pages_show_list` | Listar las Pages vinculadas a la cuenta |
| `pages_read_engagement` | Leer métricas de la Page (likes, comentarios, reach) |
| `pages_manage_posts` | Publicar en la Page y programar posts |
| `business_management` | Acceder a activos del Business Manager |

### Permisos de Marketing / Boost

| Permiso | Para qué se usa |
|---------|-----------------|
| `ads_management` | Crear y gestionar campañas de boost |
| `ads_read` | Consultar métricas de gasto y rendimiento de ads |

### Cómo añadir los permisos en la consola

1. Ve a **App Review → Permissions and Features**.
2. Busca cada permiso por nombre y haz clic en **Request**.
3. Para los permisos avanzados (`instagram_content_publish`, `ads_management`,
   `pages_manage_posts`) deberás enviarlos a revisión formal (ver sección 5).
4. Los permisos básicos (`instagram_basic`, `pages_show_list`, `pages_read_engagement`)
   están disponibles en modo desarrollo sin revisión.

---

## 5. App Review

### Qué permisos necesitan revisión formal

Los permisos marcados como **Advanced Access** requieren que Meta revise la app antes
de poder usarlos con cuentas reales fuera del equipo de desarrollo:

- `instagram_content_publish`
- `pages_manage_posts`
- `ads_management`
- `business_management`

### Qué hay que enviar a Meta

Para cada permiso en revisión, Meta pide:

1. **Descripción del caso de uso** (en inglés): explica exactamente para qué usa la app
   ese permiso. Sé específico: "We use `instagram_content_publish` to publish scheduled
   Reels and image posts to the connected Instagram Business account on behalf of the
   account owner."
2. **Screencast / vídeo de demostración**: graba el flujo completo en la app:
   - Login con Facebook.
   - Uso del permiso solicitado (p.ej., publicar un post).
   - Resultado visible en Instagram / Facebook.
   - El vídeo debe mostrar la UI real de la app, no un boceto.
3. **Política de privacidad**: URL accesible públicamente con la política de privacidad
   de QYRO. Debe mencionar explícitamente qué datos de Meta se almacenan y cómo.
4. **Instrucciones de prueba para el revisor**: credenciales de una cuenta de prueba
   que el revisor de Meta pueda usar para probar el flujo en tu app.

### Plazo estimado

- Primera revisión: **1–4 semanas** (habitualmente 2 semanas para apps nuevas).
- Si Meta solicita cambios, el contador puede reiniciarse.
- Mantén el modo de desarrollo activo durante la espera: puedes añadir hasta 25 testers
  en la app y probar con cuentas reales dentro de ese límite.

### Usar cuentas de prueba mientras esperas la revisión

Mientras la app está en modo **Development**:

1. Ve a **Roles → Test Users** y crea usuarios de prueba.
2. Estos usuarios pueden autorizar la app y publicar en sus cuentas de prueba sin
   necesitar aprobación de App Review.
3. También puedes añadir personas reales del equipo en **Roles → Testers** para que
   puedan conectar sus cuentas de Instagram/Facebook reales.

> **Límite importante**: en modo Development, la app sólo puede interactuar con las
> cuentas de testers registrados. Cualquier cuenta que no esté en la lista recibirá
> un error de permisos.

---

## 6. Variables de entorno

Añade estas variables al fichero `.env` de `apps/api`. El `.env.example` del repositorio
ya las incluye con placeholders.

```dotenv
# Meta App credentials
META_APP_ID=123456789012345
META_APP_SECRET=abc123def456ghi789jkl012mno345pq

# URI de redirección — debe coincidir exactamente con la registrada en la consola
META_REDIRECT_URI=https://tu-dominio.com/auth/meta/callback

# En desarrollo local
# META_REDIRECT_URI=http://localhost:3001/auth/meta/callback
```

> **Nunca** comitas el valor real de `META_APP_SECRET` al repositorio.
> Usa variables de entorno en CI/CD (GitHub Actions secrets) y en el servidor de producción.

---

## 7. Intercambio de tokens: corta duración → larga duración

### Flujo de tokens de Meta

Meta emite dos tipos de access token:

| Tipo | Duración | Cuándo se obtiene |
|------|----------|-------------------|
| Short-lived token | ~1 hora | Directamente del callback OAuth |
| Long-lived token | 60 días | Intercambiando el short-lived por la Graph API |

### Cómo hacer el intercambio (v21.0)

El backend realiza el intercambio automáticamente justo después de recibir el código
de autorización en `/auth/meta/callback`. El endpoint de la Graph API es:

```
GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={META_APP_ID}
  &client_secret={META_APP_SECRET}
  &fb_exchange_token={short_lived_token}
```

Ejemplo de respuesta:
```json
{
  "access_token": "EAAxxxxxx...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

El token resultante y su fecha de expiración (`expires_at = now + expires_in`) se
almacenan cifrados en la tabla `SocialAccount` de la base de datos usando AES-256-GCM
(clave `TOKEN_ENCRYPTION_KEY`).

### Cuándo renovar el token

- El worker de métricas (`apps/worker/src/jobs/metrics-pull.ts`) comprueba en cada
  ejecución si el token expira en menos de **10 días**.
- Si es así, llama al mismo endpoint de intercambio con el token actual para obtener
  uno nuevo (Meta permite renovar el long-lived token antes de que expire).
- Si el token ya expiró, la cuenta queda en estado `TOKEN_EXPIRED` y se muestra un
  banner de reconexión en el dashboard.

```
GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={META_APP_ID}
  &client_secret={META_APP_SECRET}
  &fb_exchange_token={current_long_lived_token}
```

> Los Page Access Tokens derivados del User Access Token **no expiran** mientras el
> User Access Token esté vigente. Se obtienen con:
> `GET /me/accounts?access_token={user_long_lived_token}`

---

## 8. Verificación de webhooks de Meta

La app está configurada para recibir notificaciones de Meta (cambios en publicaciones,
actualizaciones de métricas) vía webhook en `POST /webhooks/meta`.

### Configurar el webhook en la consola

1. Ve al producto **Webhooks** en el panel de la app.
2. Añade la URL del endpoint: `https://{tu-dominio}/webhooks/meta`.
3. Introduce el **Verify Token** — un string aleatorio que debes guardar en:
   ```dotenv
   META_WEBHOOK_VERIFY_TOKEN=tu-string-aleatorio-aqui
   ```
4. Selecciona los campos a los que suscribirte: `feed`, `mention`, `instagram` → `story_insights`.

### Verificación de firma

Cada webhook de Meta incluye la cabecera `X-Hub-Signature-256` con un HMAC-SHA256
del cuerpo firmado con `META_APP_SECRET`. El middleware `verifyMetaWebhook` en
`apps/api/src/middleware/webhooks.ts` verifica esta firma antes de procesar cualquier
evento. **Nunca proceses un webhook sin verificar la firma.**

---

## 9. Límites de la API a tener en cuenta

| Límite | Valor | Notas |
|--------|-------|-------|
| Posts via API (IG) | 25 por cuenta / 24 h | El scheduler comprueba este límite antes de encolar |
| Tasa de llamadas Graph API | 200 llamadas / hora / token | El adaptador usa backoff exponencial |
| Tamaño máximo caption IG | 2.200 caracteres | Validado en `packages/shared/src/schemas/instagram.ts` |
| Hashtags recomendados IG | ≤ 30 | Avisos en UI QC si se supera |
| Vídeo Reel duración | 3 s – 90 s | Validado en ingest |

---

## 10. Referencias

- [Meta for Developers — Getting Started](https://developers.facebook.com/docs/development)
- [Instagram Graph API — Content Publishing](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Graph API — Long-lived Tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived)
- [Marketing API — Overview](https://developers.facebook.com/docs/marketing-apis)
- [Webhooks — Getting Started](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
