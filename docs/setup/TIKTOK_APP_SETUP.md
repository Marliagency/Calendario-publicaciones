# Configuración de la App TikTok for Business

Guía paso a paso para registrar y configurar la aplicación en TikTok for Business
Developers, habilitar Login Kit, Content Posting API y Marketing API (Spark Ads),
y conectar la cuenta de TikTok al calendario de publicaciones de QYRO.

> **Requisito previo**: necesitas una cuenta de TikTok Business y acceso a
> [developers.tiktok.com](https://developers.tiktok.com). El proceso de registro
> de app requiere verificar que la app tiene un caso de uso legítimo de negocio.

---

## 1. Crear la aplicación en TikTok for Business

1. Ve a [developers.tiktok.com](https://developers.tiktok.com) e inicia sesión con
   la cuenta de TikTok Business de QYRO.
2. En el panel, clic en **Manage Apps → Create an App**.
3. Rellena los datos básicos:
   - **App Name**: `QYRO Social Calendar`
   - **App Description**: describe el caso de uso de forma concisa (publicar contenido
     programado en TikTok Business desde una herramienta interna de gestión de redes).
   - **App Category**: `Social Media Management Tool`
   - **Platform**: selecciona **Web** (el flujo OAuth usa popup en el navegador).
4. Sube los assets requeridos:
   - **App Icon**: 512×512 px, formato PNG, fondo no transparente.
   - **Privacy Policy URL** y **Terms of Service URL**: deben estar activas y ser
     accesibles públicamente.
5. Haz clic en **Submit** para crear la app en modo Sandbox.

Anota el **Client Key** y el **Client Secret** desde la sección *App info* — los
necesitarás para las variables de entorno.

---

## 2. Añadir productos: Login Kit y Content Posting API

### 2.1 Login Kit

Login Kit es el equivalente de TikTok al OAuth 2.0 estándar. Es obligatorio para
cualquier flujo de autorización.

1. En el panel de tu app, ve a **Add Products** y añade **Login Kit**.
2. En la configuración de Login Kit, añade las URIs de redirección (ver sección 3).
3. Activa los scopes básicos:
   - `user.info.basic` — obtener información pública del perfil (avatar, display name).

### 2.2 Content Posting API

Content Posting API permite publicar vídeos en TikTok desde la app.

1. Añade el producto **Content Posting API** desde **Add Products**.
2. En la configuración del producto, activa los scopes:
   - `video.publish` — publicar directamente en el perfil del usuario (Direct Post).
   - `video.upload` — subir el vídeo a la bandeja de entrada del usuario para que
     él lo revise antes de publicar (Upload to Inbox / Creator Post).

> El scope `video.list` no es necesario para publicar, pero puede añadirse si en el
> futuro se quiere listar los vídeos publicados para el pull de métricas.

### 2.3 Marketing API (para Spark Ads)

El módulo de Boost usa la TikTok Marketing API para convertir vídeos orgánicos en
anuncios Spark Ads.

1. Solicita acceso a la **TikTok Marketing API** en [ads.tiktok.com/marketing_api/](https://ads.tiktok.com/marketing_api/).
2. El proceso requiere verificación de empresa y puede tardar entre 3 y 10 días hábiles.
3. Los scopes adicionales necesarios son:
   - Acceso de anunciante a la cuenta de TikTok Ads Manager de QYRO.
   - Permisos para crear y gestionar campañas (`CAMPAIGN_CREATE`, `ADGROUP_CREATE`,
     `AD_CREATE`) — estos se gestionan a nivel de cuenta de Ads Manager, no como
     scopes OAuth.

---

## 3. URI de redirección OAuth

El flujo OAuth de TikTok en este proyecto usa **ventana emergente** (popup), igual
que el flujo de Meta. El calendario permanece abierto mientras el usuario autoriza
en la ventana emergente.

### URIs que debes registrar en Login Kit

| Entorno | URI |
|---------|-----|
| Producción | `https://{tu-dominio}/auth/tiktok/callback` |
| Staging | `https://staging.{tu-dominio}/auth/tiktok/callback` |
| Desarrollo local | `http://localhost:3001/auth/tiktok/callback` |

> TikTok **no** permite `localhost` en URIs de producción. Para desarrollo local,
> debes añadir explícitamente la URI de localhost en el panel de la app mientras
> esté en modo Sandbox.

### Flujo de autorización (resumen técnico)

```
1. Frontend abre popup → backend genera state + code_verifier (PKCE)
2. Popup redirige a: https://www.tiktok.com/v2/auth/authorize/
     ?client_key={TIKTOK_CLIENT_KEY}
     &scope=user.info.basic,video.publish,video.upload
     &response_type=code
     &redirect_uri={TIKTOK_REDIRECT_URI}
     &state={state}
     &code_challenge={code_challenge}
     &code_challenge_method=S256
3. Usuario autoriza en TikTok
4. TikTok redirige al callback con ?code=...&state=...
5. Backend intercambia code por access_token + refresh_token
6. Popup envía postMessage al opener y se cierra
```

TikTok usa **PKCE** (Proof Key for Code Exchange) para el flujo de autorización.
El `code_verifier` y `code_challenge` se generan en `apps/api/src/routes/oauth/tiktok.ts`.

---

## 4. Dos flujos de publicación en TikTok

TikTok ofrece dos modos de publicación distintos a través de la Content Posting API.
El calendario soporta ambos, seleccionable por pieza de contenido durante el QC.

### 4.1 Direct Post (publicación directa)

El vídeo se publica inmediatamente en el perfil del usuario, visible para sus seguidores.

**Cuándo usarlo**: publicaciones programadas normales donde QYRO controla el momento
exacto de publicación.

**Endpoint**:
```
POST https://open.tiktokapis.com/v2/post/publish/video/init/
```

**Flujo**:
1. Inicializar el post: el servidor envía los metadatos del vídeo y recibe un
   `publish_id` y una `upload_url`.
2. Subir el vídeo: PUT del fichero binario a la `upload_url` (puede ser una URL de S3
   si el vídeo ya está en la nube — TikTok lo descarga directamente).
3. Verificar el estado: polling a `/v2/post/publish/status/fetch/` hasta que el estado
   sea `PUBLISH_COMPLETE` o un error.

```typescript
// Simplificado — ver apps/worker/src/adapters/tiktok.ts
const { publish_id, upload_url } = await initDirectPost({
  access_token,
  title: caption,
  privacy_level: 'PUBLIC_TO_EVERYONE',
  video_url: mediaUrl,         // URL de S3 — TikTok hace pull del vídeo
});
```

**Limitaciones**:
- El vídeo debe tener entre 3 y 600 segundos.
- El caption (título) tiene un límite de **2.200 caracteres** (igual que IG).
- El número de hashtags recomendado es **< 8** para no penalizar el alcance.

### 4.2 Upload to Inbox (bandeja de entrada del creador)

El vídeo se sube a la bandeja de entrada de borradores del usuario en TikTok. El
usuario recibe una notificación y debe revisar y publicar manualmente desde la app.

**Cuándo usarlo**: cuando se quiere que el creador revise el vídeo antes de publicar
(por ejemplo, piezas de alta visibilidad o con contenido sensible).

**Endpoint**:
```
POST https://open.tiktokapis.com/v2/post/publish/inbox/video/init/
```

El flujo de subida es idéntico al Direct Post; la diferencia está únicamente en el
endpoint de inicialización y en que el estado final es `RECEIVED_BY_CREATOR` en lugar
de `PUBLISH_COMPLETE`.

> En el calendario, el modo se selecciona en el campo `tiktok_post_mode` de la pieza
> de contenido (`DIRECT` | `INBOX`). El valor por defecto es `DIRECT`.

---

## 5. Spark Ads: boosting de publicaciones orgánicas

Spark Ads es el formato de anuncio de TikTok que usa un vídeo orgánico ya publicado
como creativo del anuncio. Esto conserva los likes, comentarios y shares originales
del post y suele tener mejor rendimiento que los anuncios de vídeo estándar.

### Flujo para crear un Spark Ad desde el calendario

1. **El vídeo se publica** via Direct Post → TikTok devuelve un `item_id` (el ID del
   vídeo orgánico en la plataforma).
2. **El gestor de QYRO activa el boost** desde la UI del calendario, seleccionando
   presupuesto, audiencia preset y duración.
3. **El worker de boost** (`apps/worker/src/jobs/boost.ts`) llama a la Marketing API
   de TikTok:
   ```
   POST https://business-api.tiktok.com/open_api/v1.3/spark/ad/get/
   ```
   Primero obtiene el `spark_ads_code` del post orgánico y luego crea la campaña:
   ```
   POST https://business-api.tiktok.com/open_api/v1.3/campaign/create/
   POST https://business-api.tiktok.com/open_api/v1.3/adgroup/create/
   POST https://business-api.tiktok.com/open_api/v1.3/ad/create/
   ```
4. **Kill switch**: antes de crear el ad, el worker verifica que el gasto diario y
   mensual no supera los límites definidos (5 €/día, 150 €/mes). Si se supera, el
   ad no se crea y se registra un aviso en el dashboard.

### Autenticación en Marketing API

La Marketing API de TikTok usa un token separado del token de usuario OAuth. Se
obtiene a través del flujo de autorización de TikTok Ads Manager y se almacena como
`tiktok_ads_access_token` en la tabla `SocialAccount`.

---

## 6. Variables de entorno

Añade estas variables al fichero `.env` de `apps/api`:

```dotenv
# TikTok App credentials
TIKTOK_CLIENT_KEY=aw1234567890abcd
TIKTOK_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqrst678

# URI de redirección — debe coincidir exactamente con la registrada en Login Kit
TIKTOK_REDIRECT_URI=https://tu-dominio.com/auth/tiktok/callback

# En desarrollo local
# TIKTOK_REDIRECT_URI=http://localhost:3001/auth/tiktok/callback

# TikTok Ads Manager (Marketing API) — se obtiene por separado
TIKTOK_ADS_APP_ID=1234567890123456789
TIKTOK_ADS_SECRET=xyz789abc123def456ghi789
TIKTOK_ADS_ADVERTISER_ID=1234567890123456789
```

> **Client Key** es el equivalente de TikTok al App ID de Meta. **Client Secret** es
> confidencial y nunca debe aparecer en el frontend ni en el repositorio.

---

## 7. App Review

### Qué permisos necesitan revisión

En modo Sandbox, la app sólo puede usarse con cuentas de prueba añadidas manualmente.
Para usar la app con cuentas reales, necesitas pasar el proceso de App Review de TikTok.

Los scopes que requieren aprobación:
- `video.publish` — **obligatorio** para publicar en producción.
- `video.upload` — si se usa el flujo de bandeja de entrada.
- `user.info.basic` — generalmente aprobado con facilidad.

### Qué hay que incluir en la solicitud

1. **Descripción del caso de uso**: explica en inglés para qué usa cada scope.
   Ejemplo para `video.publish`:
   > "QYRO Social Calendar uses `video.publish` to publish scheduled short-form video
   > content to a TikTok Business account on behalf of the account owner, at the
   > time specified during content planning."
2. **Vídeo de demostración** (requisito crítico para TikTok):
   - Duración recomendada: 2–5 minutos.
   - Debe mostrar el flujo completo: login con TikTok → programar contenido →
     publicación real en la cuenta → resultado visible en TikTok.
   - Graba con herramientas como Loom o OBS. TikTok es especialmente estricto con
     este requisito — sin vídeo, la revisión será rechazada automáticamente.
3. **Política de privacidad**: URL pública con mención explícita al manejo de tokens
   de TikTok y datos de vídeo.
4. **Capturas de pantalla de la app**: al menos 3–5 pantallas mostrando la UI.

### Plazo estimado

- Primera revisión: **2–6 semanas** (TikTok es más lento que Meta).
- Los rechazos son frecuentes en la primera ronda; prepara una versión detallada
  del vídeo de demostración.
- TikTok puede pedir una llamada de revisión adicional para apps con Marketing API.

---

## 8. Cuentas sandbox mientras esperas la revisión

Durante el proceso de revisión, puedes trabajar con cuentas de prueba en modo Sandbox:

1. En el panel de tu app → **Sandbox** → **Add Test Accounts**.
2. Introduce el username de TikTok de la cuenta de prueba.
3. La cuenta de prueba debe **aceptar la invitación** desde la app TikTok (recibirá
   una notificación).
4. Las cuentas sandbox pueden autorizar la app y usar todos los scopes sin aprobación
   de App Review.

**Límite de cuentas sandbox**: 20 cuentas de prueba por app.

> El entorno de desarrollo del calendario usa **MSW** (Mock Service Worker) para
> simular las respuestas de la API de TikTok cuando `TIKTOK_MOCK_MODE=true` está
> activo. Esto permite desarrollar sin necesidad de cuentas sandbox reales.

---

## 9. Tokens: expiración y renovación

TikTok tiene una política de expiración de tokens más agresiva que Meta.

| Tipo de token | Duración | Cuándo se usa |
|---------------|----------|---------------|
| `access_token` | **24 horas** (actualmente) | Llamadas a la API de contenido |
| `refresh_token` | **365 días** | Renovar el access_token sin re-autorización |
| `open_id` | Permanente | Identificador único del usuario en la app |

> TikTok puede cambiar la duración de los tokens. Comprueba siempre la documentación
> oficial y el valor de `expires_in` que devuelve el endpoint de token.

### Renovación automática del access_token

El worker de métricas comprueba en cada ejecución si el `access_token` expira en
menos de **2 horas**. Si es así, llama al endpoint de refresh:

```
POST https://open.tiktokapis.com/v2/oauth/token/
Content-Type: application/x-www-form-urlencoded

client_key={TIKTOK_CLIENT_KEY}
&client_secret={TIKTOK_CLIENT_SECRET}
&grant_type=refresh_token
&refresh_token={refresh_token}
```

Ejemplo de respuesta:
```json
{
  "access_token": "act.example12345...",
  "expires_in": 86400,
  "open_id": "xxxxxxxxxxxxxxxxxxx",
  "refresh_token": "rft.example67890...",
  "refresh_expires_in": 31536000,
  "scope": "user.info.basic,video.publish,video.upload",
  "token_type": "Bearer"
}
```

El nuevo `access_token` y `refresh_token` se almacenan cifrados en `SocialAccount`
con AES-256-GCM.

### Qué pasa cuando el refresh_token expira

Si el `refresh_token` (365 días) expira, no es posible renovar el `access_token` de
forma silenciosa. La cuenta queda en estado `TOKEN_EXPIRED` en la base de datos y
se muestra un banner en el dashboard solicitando al usuario que reconecte su cuenta
TikTok.

---

## 10. Límites de la Content Posting API

| Límite | Valor | Notas |
|--------|-------|-------|
| Posts por día (vía API) | 50 por cuenta | Reiniciado a medianoche UTC |
| Caption (título del vídeo) | 2.200 caracteres | Validado en ingest |
| Hashtags recomendados | < 8 | Más de 8 puede penalizar alcance; aviso en QC |
| Duración mínima vídeo | 3 segundos | Validado en ingest |
| Duración máxima vídeo (Direct Post) | 600 segundos | Validado en ingest |
| Peso máximo del fichero | 4 GB | Poco probable de alcanzar; check en ingest |
| Ratio de aspecto recomendado | 9:16 | El resto se acepta pero puede recortarse |

---

## 11. Referencias

- [TikTok for Business — Getting Started](https://developers.tiktok.com/doc/getting-started-create-an-app)
- [Login Kit — Authorization](https://developers.tiktok.com/doc/login-kit-manage-user-access-tokens)
- [Content Posting API — Direct Post](https://developers.tiktok.com/doc/content-posting-api-get-started-with-direct-post)
- [Content Posting API — Upload to Inbox](https://developers.tiktok.com/doc/content-posting-api-get-started-with-web-upload)
- [TikTok Marketing API — Spark Ads](https://ads.tiktok.com/marketing_api/docs?id=1701890979375137)
- [OAuth 2.0 Token Management](https://developers.tiktok.com/doc/oauth-user-access-token-management)
