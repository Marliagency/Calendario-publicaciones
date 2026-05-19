# Design System QYRO — Social Calendar

> Este documento sustituye al skill `frontend-design` (no disponible en este entorno).
> Es la referencia para que la UI del módulo se sienta como QYRO, no como una
> herramienta interna genérica.

## Tono visual

- Limpia, calmada, premium-tech.
- Referencias deseadas: Apple Health, Linear, Whoop.
- A evitar: estética "fitness-bro" agresiva (rojos, mayúsculas, fuentes condensed),
  estética "wellness-pastel" cursi (acuarelas, scripts, beige).

## Paleta

| Token | Hex | Uso |
|---|---|---|
| `qyro.blue.500` | `#3B82F6` | Acento principal, botones primarios, links. |
| `qyro.blue.600` | `#2563EB` | Hover de blue.500. |
| `qyro.purple.500` | `#7C5CFC` | Acento secundario, gráficos, métricas premium. |
| `qyro.green.500` | `#22C55E` | Éxito, estado `PUBLISHED`/`APPROVED`. |
| `qyro.bg.canvas` | `#F4F6FB` | Fondo de página (lavanda casi blanco). |
| `qyro.bg.surface` | `#FFFFFF` | Superficie de cards. |
| `qyro.text.primary` | `#0B1220` | Texto principal. |
| `qyro.text.muted` | `#64748B` | Texto secundario, labels. |
| `qyro.border.subtle` | `#E5E7EB` | Bordes de cards y separadores. |
| `qyro.amber.500` | `#F59E0B` | Warning de QC. |
| `qyro.red.500` | `#EF4444` | Estado `FAILED`/`REJECTED`. |

## Tipografía

- Familia: `Inter` (system fallback `-apple-system, system-ui, sans-serif`).
- Jerarquía por **peso**, no por familia:
  - h1: 32 / 700
  - h2: 24 / 600
  - h3: 18 / 600
  - body: 14–15 / 400
  - caption: 12 / 500 uppercase letter-spacing 0.02em

## Espaciado y forma

- Radius:
  - Cards principales: 20px
  - Cards secundarios: 16px
  - Botones / pills: 12px
  - Inputs: 10px
- Sombras (muy suaves, casi imperceptibles):
  - `shadow-soft`: `0 1px 2px rgba(11,18,32,0.04), 0 1px 1px rgba(11,18,32,0.02)`
  - `shadow-elevated`: `0 8px 24px rgba(11,18,32,0.06)`
- Espaciado base: múltiplos de 4 (4, 8, 12, 16, 24, 32, 48).

## Componentes clave del módulo

- **Card**: superficie blanca, radius 20, padding 20–24, sombra `soft`.
- **Badge de estado**: pill con color de la paleta + ícono.
  - DRAFT: gris · IN_REVIEW: amber · APPROVED: blue · SCHEDULED: purple ·
    PUBLISHED: green · FAILED/REJECTED: red.
- **Icono de plataforma**: círculo plano 24px con isotipo monocromo.
- **Donut chart**: usado para Hook Score / completion rate; grosor 8px, fondo
  `border.subtle`, color `qyro.blue.500` o `qyro.purple.500`.
- **Calendar cell**: thumbnail 16:9 o 9:16 con overlay degradado al pie mostrando
  hora + plataforma + boost badge si aplica.
- **Header**: 64px alto, isotipo QYRO a la izquierda, búsqueda al centro,
  notificaciones + avatar a la derecha.
- **Bottom nav móvil**: 4 ítems, iconos circulares planos, indicador activo en
  `qyro.blue.500`.

## Animación

- Framer Motion. Transiciones cortas (150–250ms), `ease-out`.
- Sin animaciones decorativas. Sólo feedback funcional (drag&drop, swipe de
  aprobación, fade-in al cargar).

## Accesibilidad

- Contraste AA mínimo (texto/fondo).
- Estado focus visible (`outline: 2px solid qyro.blue.500; outline-offset: 2px`).
- Targets táctiles ≥ 44×44px en móvil.
