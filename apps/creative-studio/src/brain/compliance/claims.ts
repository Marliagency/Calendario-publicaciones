/**
 * Reglas de claims permitidos / prohibidos para QYRO.
 * Fuente: §3 del brief de SESIÓN 2.
 *
 * Toda copy generada por el estudio pasa por `assertClaimsAllowed` antes
 * del push al calendario.
 */

const FORBIDDEN_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /(perder?|pierde[sn]?|baja(r|s|n)?)\s+\d+\s*kg/i,
    reason: 'claim de pérdida de peso específica',
  },
  { pattern: /reduce\s+(cortisol|inflamaci[oó]n)/i, reason: 'claim médico / fisiológico' },
  { pattern: /mejora\s+tu\s+salud\s+mental/i, reason: 'claim clínico de salud mental' },
  { pattern: /(curativo|terap[eé]utico|diagn[oó]stico)/i, reason: 'claim médico' },
  { pattern: /apple\s*watch|fitbit|garmin/i, reason: 'integración hardware inexistente' },
  { pattern: /sincronizad[oa]\s+en\s+la\s+nube/i, reason: 'no hay sync cloud todavía' },
  { pattern: /funciona\s+offline\s+siempre/i, reason: 'la IA necesita conexión + API key' },
];

const REQUIRED_DISCLOSURES = {
  testimonial: 'Resultados individuales pueden variar',
} as const;

export interface ClaimsCheck {
  ok: boolean;
  violations: Array<{ pattern: string; reason: string }>;
}

export function assertClaimsAllowed(copy: string): ClaimsCheck {
  const violations: ClaimsCheck['violations'] = [];
  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (pattern.test(copy)) {
      violations.push({ pattern: pattern.toString(), reason });
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Mensajes oficiales por objetivo del usuario QYRO (§3 del brief).
 * Usar como base para hooks declarativos.
 */
export const OFFICIAL_MESSAGES_BY_GOAL = {
  gain_muscle: 'Tu gym, tu dieta y tu progreso en un solo lugar. QYRO sabe cuánto levantaste ayer.',
  lose_fat: 'Foto a tu plato, IA que cuenta las calorías. Así de fácil con QYRO.',
  productivity: '¿5 apps distintas? Una sola. QYRO unifica tus hábitos, tareas y metas.',
  reduce_stress:
    'El diario que sabe cómo te has sentido los últimos 30 días. QYRO te ayuda a entenderte.',
  improve_habits: 'El 80% de la gente abandona sus hábitos en 2 semanas. QYRO cambia eso.',
} as const;

export { REQUIRED_DISCLOSURES };
