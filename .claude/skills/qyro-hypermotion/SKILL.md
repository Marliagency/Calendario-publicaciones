---
name: qyro-hypermotion
description: Genera vídeos QYRO estilo Hypermotion (lanzamiento de producto, cortes secos, zooms agresivos, alta energía) usando Higgsfield Marketing Studio. Invoca cuando el usuario pide un "video hypermotion", "lanzamiento", "ad estilo Apple keynote" o equivalente para QYRO.
---

# QYRO Hypermotion

## Cuándo usar esta skill

- El usuario pide explícitamente "hypermotion".
- Se quiere comunicar un **lanzamiento o feature flagship** con energía
  alta y ritmo de keynote/teaser.
- Formato típico: **vertical 9:16, 12-25s, TikTok o IG Reels**.

## Cuándo NO usar

- UGC casual / testimonial → usa `qyro-ugc-testimonial`.
- Lifestyle cinematográfico estilo Nike → usa `qyro-lifestyle`.
- Demo de la interfaz → usa `qyro-app-demo`.

## Hard rules (no se rompen sin permiso explícito)

1. **No duplicar texto on-screen**: cada plano lleva un único mensaje
   visible. Nunca dos cuñas tipográficas a la vez.
2. **Logo QYRO no antes del segundo 3**: los 3 primeros segundos son
   hook + tensión sin marca. El logo aparece en el cierre o, como
   muy pronto, a partir de 0:03.
3. **Paleta QYRO obligatoria**: `#3B82F6` azul, `#7C5CFC` púrpura,
   `#22C55E` verde, fondo `#F4F6FB` o blanco. NUNCA color fuera de
   esta paleta. Acentos cálidos (naranja/rojo) sólo para hábitos
   `#F97316` / `#EF4444`.
4. **Mockup de iPhone presente en al menos 2 cortes** distintos
   mostrando la UI real de QYRO.
5. **Sin claims prohibidos**: ver `src/brain/compliance/claims.ts`.
   En particular: nada de "perder X kg", nada de hardware Apple
   Watch/Fitbit, nada de "sincronizado en la nube".
6. **Música**: TikTok solo biblioteca comercial de TikTok. IG/FB
   biblioteca Meta o pista licenciada. Nunca pista con copyright
   abierto.
7. **Duración**: 12-25s para Reel/TT; 8-15s si lifestyle de hook.

## Receta de prompt para Higgsfield Marketing Studio

Modelo recomendado: **Soul V2** (barato para iteración) o **Seedance
2.0** (mejor calidad). Veo 3.1 solo si el usuario pasa `--premium`.

Plantilla:

```
A high-energy Hypermotion-style product launch teaser for QYRO,
a personal-OS PWA. Style: clean premium tech (Apple Health / Linear /
Whoop). Vertical 9:16, [12-25]s.

Beats:
- 0-3s: kinetic typography reveal of the central promise:
  "[HOOK_TEXT]". No logo yet. Background #F4F6FB.
- 3-8s: hard-cut to mockup of iPhone showing [QYRO_MODULE]
  (e.g. Life Score donut animating 25→70, activity rings filling).
  Tight zoom + parallax. UI in palette: #3B82F6 #7C5CFC #22C55E.
- 8-15s: second hard-cut to a different QYRO screen (e.g. nutrition
  photo→macros animation OR streak counter ticking up).
- 15-22s: stacked feature ticker overlay (max 3 features):
  "Hábitos · Entrenos · Nutrición · IA · Diario". Sub-second flashes.
- 22-25s: brand lockup. Q-mark gradient (#2C7BFF → #5AC8FA → #7B61FF)
  + "QYRO" wordmark. Tagline: "[OFFICIAL_TAGLINE]".

Forbidden: any text in colors outside the QYRO palette, any logo or
mockup before second 3, any health/medical claims, any third-party
hardware (Apple Watch, Fitbit), gamified emoji stickers, wellness-
pastel colors.

Camera: handheld controlled chaos, snappy push-ins, no slow drone
shots. Audio sync to typography reveals.
```

## Qué preguntar al usuario ANTES de generar

1. **Persona** objetivo (Optimizador Consciente / Persona en Transición).
2. **Hook** elegido — propón 2-3 de `src/brain/frameworks/hooks.ts`
   filtrando por la persona.
3. **Módulo central** a destacar (Life Score / Hábitos / Nutrición / IA / Entrenos).
4. **Plataformas objetivo** (TikTok / IG Reel / FB Reel — todas 9:16).
5. **Permiso para Veo 3.1** (premium) — por defecto NO.

## Cuando termines

- Llama al pipeline: `format: 'ugc_video_dynamic'` o `'lifestyle_video'`
  según necesidad.
- Pasa el prompt completo en `spec`.
- Registra el hook en `creative_run_metadata.hook_used`.
