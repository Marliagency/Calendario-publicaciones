import { describe, expect, it } from 'vitest';
import { OFFICIAL_MESSAGES_BY_GOAL, assertClaimsAllowed } from './claims.js';

describe('assertClaimsAllowed', () => {
  it('acepta copy estándar', () => {
    const r = assertClaimsAllowed('Tu sistema operativo personal. Vive mejor. QYRO.');
    expect(r.ok).toBe(true);
  });

  it('rechaza claim de pérdida de peso específica', () => {
    const r = assertClaimsAllowed('Pierde 10 kg en 4 semanas con QYRO');
    expect(r.ok).toBe(false);
    expect(r.violations[0]?.reason).toMatch(/p[eé]rdida de peso/);
  });

  it('rechaza mención a hardware inexistente', () => {
    const r = assertClaimsAllowed('Sincroniza con tu Apple Watch sin esfuerzo');
    expect(r.ok).toBe(false);
  });

  it('rechaza claim médico de salud mental', () => {
    const r = assertClaimsAllowed('QYRO mejora tu salud mental en 30 días');
    expect(r.ok).toBe(false);
  });

  it('todos los mensajes oficiales pasan validación', () => {
    for (const msg of Object.values(OFFICIAL_MESSAGES_BY_GOAL)) {
      const r = assertClaimsAllowed(msg);
      expect(r.ok, `Mensaje oficial fallaría: ${msg}`).toBe(true);
    }
  });
});
