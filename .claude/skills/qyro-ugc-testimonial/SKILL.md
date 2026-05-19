---
name: qyro-ugc-testimonial
description: Genera UGC talking-head testimonial de QYRO vía HyperFrames (no HeyGen). Persona narra a cámara su problema y cómo QYRO lo resuelve. Invoca cuando el usuario pide "UGC", "talking head", "testimonial", "POV" para QYRO.
---

# QYRO UGC Testimonial

## Cuándo usar esta skill

- El usuario pide un **UGC casual estilo creator**: persona a cámara,
  primer plano, hablando directo al espectador.
- Tono: real, cercano, no producido. Anti-corporativo.
- Formato: **vertical 9:16, 15-30s, TikTok o IG Reels**.

## Cuándo NO usar

- Lanzamiento de producto con energía → `qyro-hypermotion`.
- Anuncio cinematográfico tipo Nike → `qyro-lifestyle`.
- Demo de pantalla de QYRO → `qyro-app-demo`.

## Decisión de stack (importante)

**HeyGen Avatar V queda fuera del stack.** El UGC talking-head se
genera con **HyperFrames** (HTML → MP4 local, coste 0). Pipeline:

- `RouterDecision.tool = 'hyperframes'`
- `RouterDecision.model = 'native'`
- `RouterDecision.estimatedCost = 0`

Esto significa que el avatar es un componente TSX que renderizamos
con una foto + lip-sync sintético, o con un loop visual sin lip-sync
para casos donde el audio es voiceover de banco.

## Hard rules

1. **Hook en los 3 primeros segundos**: cara hablando + on-screen text
   grande + sin intro de marca. Sin logo QYRO en los primeros 3s.
2. **Estructura 15-30s** (§6.1 del brief):
   - 0:00-0:03 — Hook (cara + texto grande, anti-scroll).
   - 0:03-0:10 — Problema/agitación. Una sola idea.
   - 0:10-0:20 — Solución (QYRO). Demo rapidísima de máx 2 features.
     Beneficio antes que feature.
   - 0:20-0:27 — Prueba. Resultado concreto, número, antes/después.
   - 0:27-0:30 — CTA. 1 acción, baja fricción.
3. **Subtítulos quemados, grandes, en `#0B1220`** sobre fondo blanco
   o `#F4F6FB`. Safe zones por plataforma (TikTok: subir 250px desde
   abajo; IG Stories: top + bottom 250px).
4. **Persona consistente**: no rotar el avatar dentro de un mismo
   spot. Si hay serie, mantén el mismo personaje (preset HeyGen o
   Soul Character fijo).
5. **AI disclosure**: si el avatar es AI-generated, considerar flag
   en metadata según jurisdicción (UE empieza a exigir esto en pago).
6. **Claims**: pasar la copy por `assertClaimsAllowed` antes de
   renderizar. Nada de "perder 10 kg" ni claims clínicos.

## Estructura del prompt para HyperFrames

HyperFrames recibe un template TSX. El componente base vive en
`apps/creative-studio/hyperframes-projects/qyro-components/`.

Para un UGC testimonial, monta:

```tsx
<QyroPhoneFrame>
  {/* Foto/clip del avatar a pantalla completa */}
  <AvatarLayer src={avatarVideoSrc} mouthShape={lipSync(audioSrc, frame)} />
  {/* Subtítulos sincronizados */}
  <CaptionsLayer
    chunks={subtitleChunks}
    safeZoneFromBottom={250}
    font="Inter 800 64px"
    color="#0B1220"
    backgroundChip="#FFFFFF"
  />
  {/* Brand lockup SOLO en el cierre */}
  {frame > durationSeconds * 0.9 * fps && (
    <QyroBrandLockup size={120} />
  )}
</QyroPhoneFrame>
```

## Qué preguntar al usuario

1. **Persona** (Optimizador Consciente / Persona en Transición).
2. **Hook** de la librería (`getHooksByPersona`).
3. **Pain → solución** específica:
   - ¿Qué módulo de QYRO resuelve el pain?
   - ¿Qué número/prueba quieres mostrar al final?
4. **CTA** (Probar gratis / Instalar como PWA / Link en bio).

## Cuando termines

- Pipeline: `format: 'ugc_video_talking_head'`.
- `spec` = ruta al template TSX que compusiste, p.ej.
  `qyro-ugc-testimonial-optimizador-pov-5apps.tsx`.
- `durationS` entre 15 y 30.
