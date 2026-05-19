/**
 * Design tokens QYRO.
 *
 * Esta es la única fuente de verdad para colores, radii, sombras y tipografía
 * usada por `apps/web`. Si el design system de QYRO cambia upstream, se actualiza
 * aquí y se propaga.
 */

export const colors = {
  qyro: {
    blue: { 500: '#3B82F6', 600: '#2563EB' },
    purple: { 500: '#7C5CFC' },
    green: { 500: '#22C55E' },
    amber: { 500: '#F59E0B' },
    red: { 500: '#EF4444' },
    bg: { canvas: '#F4F6FB', surface: '#FFFFFF' },
    text: { primary: '#0B1220', muted: '#64748B' },
    border: { subtle: '#E5E7EB' },
  },
} as const;

export const radii = {
  card: '20px',
  cardSm: '16px',
  pill: '12px',
  input: '10px',
} as const;

export const shadows = {
  soft: '0 1px 2px rgba(11,18,32,0.04), 0 1px 1px rgba(11,18,32,0.02)',
  elevated: '0 8px 24px rgba(11,18,32,0.06)',
} as const;

export const fontFamily = {
  sans: ['Inter', '-apple-system', 'system-ui', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
} as const;

export const statusColor = {
  DRAFT: '#94A3B8',
  IN_REVIEW: colors.qyro.amber[500],
  CHANGES_REQUESTED: colors.qyro.amber[500],
  REJECTED: colors.qyro.red[500],
  APPROVED: colors.qyro.blue[500],
  SCHEDULED: colors.qyro.purple[500],
  PUBLISHED: colors.qyro.green[500],
  ANALYZED: colors.qyro.purple[500],
  FAILED: colors.qyro.red[500],
} as const;
