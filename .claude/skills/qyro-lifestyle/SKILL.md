---
name: qyro-lifestyle
description: Genera anuncios lifestyle de QYRO estilo Nike (persona viviendo su día "optimizado", QYRO aparece como facilitador). Cinematográfico, sin urgencia agresiva. Invoca cuando el usuario pide "lifestyle", "estilo Nike", "anuncio cinematográfico", "brand spot".
---

# QYRO Lifestyle Ad

## Cuándo usar esta skill

- El usuario quiere un **brand spot** que comunique aspiración, no
  features.
- Tono: cinematográfico, calmado, premium-tech. Referencias: Apple
  Health TV, Whoop launch, Linear marketing.
- Formato: **vertical 9:16 o cuadrado 1:1, 20-45s**.

## Cuándo NO usar

- Energía alta de lanzamiento → `qyro-hypermotion`.
- Cara hablando a cámara → `qyro-ugc-testimonial`.
- Demo de UI → `qyro-app-demo`.

## Decisión de stack

**Higgsfield obligatorio** para la calidad cinematográfica. Modelos:

- **Veo 3.1** (premium): mejor planos cinematográficos, mejor luz.
  Requiere `allowPremium: true` explícito. ~40 créditos por spot.
- **Sora 2** (premium): alternativa si Veo 3.1 no está disponible.
- **Seedance 2.0** (no-premium): aceptable, más barato. Default si no
  hay aprobación de premium.

El BudgetGuard bloquea premium si el cap mensual está al 85% o más
(ver `src/producers/budget-guard.ts`).

## Hard rules

1. **Apertura sin app**: los primeros 5-8 segundos NO muestran QYRO.
   Persona en su contexto vital: gym a las 6:30 AM, escritorio a
   medianoche, cocina preparando comida, journal a mano en café.
2. **Tensión visual**: el spot construye una pregunta o conflicto
   antes de mostrar la solución. Ejemplo: persona mirando 5 apps
   distintas, frustración silenciosa, no exagerada.
3. **QYRO aparece como facilitador, no como héroe**. Máximo 2 planos
   de UI. La persona sigue siendo el sujeto.
4. **Cierre con declarativo limpio**: una frase + logo limpio. Sin
   CTA agresivo. Opciones:
   - "Tu sistema operativo personal."
   - "Tu vida, optimizada por IA."
   - "Vive mejor. QYRO."
5. **Paleta QYRO** + neutros cinematográficos (negros, grises cálidos,
   acentos `#3B82F6` / `#7C5CFC`). Nada de wellness pastel.
6. **Música**: licenciada o de biblioteca comercial. Estilo: cinematic
   ambient, no electrónica agresiva.
7. **Claims**: lifestyle implica testimonio implícito → si se muestra
   transformación, añadir disclaimer "Resultados individuales pueden
   variar" en metadata (no en pantalla salvo plataforma lo exija).

## Plantilla de prompt para Higgsfield

```
A cinematic 9:16 lifestyle ad for QYRO, a personal-OS PWA. Style:
calm premium-tech (Apple Health TV, Whoop launch, Linear marketing).
[20-45]s. Strong narrative arc.

Beats:
- 0-8s: Open on [SCENE_WITHOUT_APP]. Natural light. Persona alone,
  doing [LIFE_MOMENT]. No phones visible. Soft ambient audio. Wide
  shots, slow handheld.
- 8-18s: Tension. [STRUGGLE_OR_QUESTION]. Could be: scattered notes,
  half-finished gym routine, missed breakfast, scrolling 5 apps with
  growing frustration. Frame the question wordlessly.
- 18-26s: First QYRO appearance. Persona opens QYRO on phone. UI
  visible: Life Score donut or Hábitos hoy. Resolution beat. NOT a
  hard cut — same room, same light. The app feels embedded in the
  day.
- 26-38s: Persona continues their day with intent. Habits done.
  Workout logged. Meal photographed → macros appear. Streak ticking.
  No voiceover required — visual storytelling.
- 38-45s: Brand close. QYRO lockup with gradient Q-mark, tagline
  "[TAGLINE]". Hold 2 seconds. Cut.

Forbidden: fitness-bro intensity, wellness-pastel washed colors,
testimonial talking-head shots, on-screen feature lists, urgency
copy ("download now"), hardware overlays (Apple Watch, Garmin),
health/medical claims.

Camera: handheld but controlled. Tasteful focus pulls. Anamorphic
flare ok in moderation. Audio: ambient + diegetic only, no music
voiceover except possibly a single line near the end.
```

## Qué preguntar al usuario

1. **Persona** y momento vital concreto a representar.
2. **Tagline** de cierre (lista oficial en §0 del brief de SESIÓN 2).
3. **Permiso explícito para Veo 3.1 / Sora 2** (premium).
4. **Duración objetivo** (20-45s).
5. **Plataformas**: 9:16 para Reels/TT, 1:1 para FB Feed.

## Cuando termines

- Pipeline: `format: 'lifestyle_video'`.
- `allowPremium: true` SOLO si el usuario lo confirmó.
- `durationS` entre 20 y 45.
- `hookUsed`: id del tagline de cierre.
