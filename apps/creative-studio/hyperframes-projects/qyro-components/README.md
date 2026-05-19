# QYRO HyperFrames components

Componentes TSX/JSX que vive aquí cada vez que el productor
`hyperframes` necesita renderizar UI determinista de QYRO a MP4 local.

> **Estado**: primitivos definidos como React components puros con
> tokens reales de marca. Para renderizar a vídeo se requiere `npx
> hyperframes init qyro-app-demos` en este directorio + `ffmpeg` en
> el PATH. Hasta entonces, sirven como **spec visual canónico** del
> sistema de diseño aplicado a los demos.

## Inventario

| Componente            | Estado | Descripción                                  |
|-----------------------|--------|----------------------------------------------|
| `<QyroPhoneFrame>`    | ✅     | Marco iPhone con notch, status bar y bottom UI. |
| `<QyroLifeScoreDonut>`| ✅     | Donut animable 0→N/100 con etiqueta central. |
| `<QyroActivityRings>` | ✅     | 3 anillos estilo Apple (hábitos/entrenos/nutrición). |
| `<QyroHabitRow>`      | ✅     | Fila de hábito (emoji + nombre + hora + check). |
| `<QyroStreakBadge>`   | ✅     | Badge de racha con número grande. |
| `<QyroBrandLockup>`   | ✅     | Isotipo + wordmark con animación de entrada. |
| `<QyroMacroBar>`      | ⏳     | TODO: barra de macros con objetivo. |
| `<QyroWorkoutSet>`    | ⏳     | TODO: fila de serie con peso/reps/RPE. |
| `<QyroMoodHeatmap>`   | ⏳     | TODO: heatmap 56 días. |
| `<QyroAIChat>`        | ⏳     | TODO: burbuja de chat con el asistente IA. |
| `<QyroPhotoToMacros>` | ⏳     | TODO: animación foto-plato → IA → macros. |

## Tokens

Los componentes leen de `../../src/brain/brand/tokens.ts`. Si necesitas
ajustar un color, hazlo allí — los componentes lo reflejan en el
siguiente render.

## Cómo añadir un componente

1. Crea `XxxComponent.tsx` con la convención de nombre `QyroXxx`.
2. Importa tokens desde `../../src/brain/brand/tokens.js` (relative
   porque hyperframes corre fuera del workspace TypeScript).
3. Exporta default + named. Documenta props con JSDoc.
4. Añade fila a este README.
