/**
 * Brand tokens QYRO — espejo de `packages/ui/src/tokens.ts`.
 *
 * Copia explícita, no import directo, porque el estudio puede acabar
 * extrayéndose a otro repo. Si los tokens cambian aquí o allá, hay un
 * test de paridad (TODO) que debe romperse.
 */

export const QYRO_COLORS = {
  blue: { 500: '#3B82F6', 600: '#2563EB' },
  purple: { 500: '#7C5CFC' },
  green: { 500: '#22C55E' },
  amber: { 500: '#F59E0B' },
  red: { 500: '#EF4444' },
  bg: { canvas: '#F4F6FB', surface: '#FFFFFF' },
  text: { primary: '#0B1220', muted: '#64748B' },
  border: { subtle: '#E5E7EB' },
} as const;

export const QYRO_RADII = {
  card: '20px',
  cardSm: '16px',
  pill: '12px',
  input: '10px',
} as const;

export const QYRO_SHADOWS = {
  soft: '0 1px 2px rgba(11,18,32,0.04), 0 1px 1px rgba(11,18,32,0.02)',
  elevated: '0 8px 24px rgba(11,18,32,0.06)',
} as const;

export const QYRO_FONT_STACK = [
  'Inter',
  '-apple-system',
  'system-ui',
  'BlinkMacSystemFont',
  'Segoe UI',
  'sans-serif',
] as const;

/**
 * Degradado oficial del isotipo Q descrito en §0 del brief de SESIÓN 2.
 * El favicon actual del calendario es plano `#3B82F6` — usar este
 * degradado para el watermark cover y los lockups de HyperFrames.
 */
export const QYRO_ISOTYPE_GRADIENT = {
  stops: [
    { offset: 0, color: '#2C7BFF' },
    { offset: 0.5, color: '#5AC8FA' },
    { offset: 1, color: '#7B61FF' },
  ],
} as const;
