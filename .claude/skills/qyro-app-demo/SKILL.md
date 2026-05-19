---
name: qyro-app-demo
description: Genera demos de la interfaz de QYRO vía HyperFrames (HTML → MP4 local, coste 0 en API). Composición determinista de las pantallas reales con animaciones. Invoca cuando el usuario pide "demo de la app", "screen recording", "tutorial visual", "interfaz".
---

# QYRO App Demo (HyperFrames)

## Cuándo usar esta skill

- El usuario quiere mostrar **la interfaz de QYRO** en uso.
- El contenido es demostrativo del producto: Life Score subiendo,
  hábitos completándose, foto→macros, asistente IA respondiendo.
- Formato: **vertical 9:16, 15-25s**.

## Cuándo NO usar

- Persona narrando a cámara → `qyro-ugc-testimonial`.
- Lifestyle cinematográfico sin app → `qyro-lifestyle`.
- Lanzamiento alta energía → `qyro-hypermotion`.

## Decisión de stack

**HyperFrames obligatorio** (no Higgsfield). Razones:

- **Coste 0 en API** — solo CPU local con FFmpeg.
- **Determinista y brand-accurate** — la UI es exactamente la real,
  no una alucinación del modelo.
- **Animable** — Life Score 25→70 controlable al fotograma.
- **Versionable** — el TSX vive en `apps/creative-studio/hyperframes-projects/qyro-components/`
  y evoluciona con el design system real.

`RouterDecision.tool = 'hyperframes'`, `model = 'native'`, coste 0.

## Hard rules

1. **Datos reales o plausibles**: no inventar features. Usa los datos
   del modelo real de QYRO (Life Score 0-100, hábitos preset reales,
   macros calculadas con Mifflin-St Jeor, 1RM real).
2. **Marco iPhone obligatorio** vía `<QyroPhoneFrame>` — nunca
   pantalla pelada sin chrome.
3. **Una idea por pantalla** — no mezcles 5 features en un mismo
   plano. Anima una, transición, anima la siguiente.
4. **Paleta QYRO estricta**. Status colors definidos en
   `src/brain/brand/tokens.ts` (DRAFT, IN_REVIEW, …, FAILED).
5. **Brand lockup solo al cierre** (último 1-2 segundos).
6. **Subtítulos en safe zone**: top 150px + bottom 250px libres para
   UI nativa de TikTok/Reels.

## Receta canónica (15-25s, §6.3 del brief)

| Beat       | Tiempo  | Pantalla                | Animación clave                        |
|------------|---------|-------------------------|----------------------------------------|
| Lock notif | 0:00-0:02 | Pantalla bloqueo iPhone | Push QYRO entra: "3 hábitos pendientes" |
| Dashboard  | 0:02-0:06 | Home: Life Score donut + Activity Rings | Score 25→70/100, anillos rellenándose |
| Tab Hoy    | 0:06-0:10 | Hoy: 3 `<QyroHabitRow>` | Checks animados: Meditar → Ejercicio → Deep Work |
| Tab Entrenos | 0:10-0:14 | Workout set | Peso/reps apareciendo, **PR ticker** "Nuevo 1RM: 110kg" + confetti suave |
| Tab Nutrición | 0:14-0:17 | Comidas | Foto del plato → IA → kcal/proteína/carbos/grasa rellenándose |
| Tab Objetivos | 0:17-0:20 | Objetivo "Ganar músculo" | Donut 25→70%, parámetros: 2933 kcal · 220g proteína · 3 sesiones |
| Asistente IA | 0:20-0:23 | Chat | "Analiza mi semana" → respuesta animada |
| Cierre     | 0:23-0:25 | `<QyroBrandLockup>` + tagline "Vive mejor. QYRO." |

## Componentes disponibles

Ver `apps/creative-studio/hyperframes-projects/qyro-components/README.md`.

Primitivos listos:
- `<QyroPhoneFrame>` — contenedor obligatorio
- `<QyroLifeScoreDonut score={…} />`
- `<QyroActivityRings progress={[habitos, entrenos, nutricion]} />`
- `<QyroHabitRow emoji name timeLabel checked streak />`
- `<QyroStreakBadge days />`
- `<QyroBrandLockup size withWordmark />`

Pendientes (TODO en otra iteración): `<QyroMacroBar>`,
`<QyroWorkoutSet>`, `<QyroAIChat>`, `<QyroPhotoToMacros>`,
`<QyroMoodHeatmap>`.

## Qué preguntar al usuario

1. **Persona** objetivo.
2. **Beat principal**: ¿qué módulo es el héroe? (Life Score / Hábitos
   / Foto→Macros / IA / Streak).
3. **Datos concretos**: ¿qué score animar de qué a qué? ¿Cuántos días
   de streak? ¿Qué PR mostrar?
4. **Plataformas** (todas 9:16: TikTok / IG Reel / FB Reel).

## Cuando termines

- Pipeline: `format: 'app_demo'`.
- `spec` = ruta al template TSX compuesto, p.ej.
  `qyro-app-demo-optimizador-lifescore-25-70.tsx`.
- `durationS` 15-25.
- `creativeRunMetadata.hyperframes_template` = path al template, para
  reproducibilidad.
