import { describe, expect, it } from 'vitest';
import { PERSONA_IDS } from '../personas/index.js';
import {
  CONTENT_PILLARS,
  HOOKS,
  ORGANIC_ONLY_HOOK_IDS,
  PILLAR_TARGET_MIX,
  getHookById,
  getHooksByPersona,
  nextSlot,
} from './index.js';

describe('hooks library', () => {
  it('todo hook tiene id, text y pillar', () => {
    for (const h of HOOKS) {
      expect(h.id).toBeTruthy();
      expect(h.text.length).toBeGreaterThan(0);
      expect(h.pillar).toBeTruthy();
    }
  });

  it('getHooksByPersona devuelve persona-específicos + transversales', () => {
    const r = getHooksByPersona(PERSONA_IDS.OPTIMIZADOR_CONSCIENTE);
    expect(r.some((h) => h.persona === PERSONA_IDS.OPTIMIZADOR_CONSCIENTE)).toBe(true);
    expect(r.some((h) => h.persona === null)).toBe(true);
    expect(
      r.every((h) => h.persona === null || h.persona === PERSONA_IDS.OPTIMIZADOR_CONSCIENTE),
    ).toBe(true);
  });

  it('hooks anti-competencia están marcados como orgánico-only', () => {
    expect(ORGANIC_ONLY_HOOK_IDS.has('vs-habitica')).toBe(true);
    expect(ORGANIC_ONLY_HOOK_IDS.has('vs-myfitnesspal')).toBe(true);
    expect(ORGANIC_ONLY_HOOK_IDS.has('vs-chatgpt')).toBe(true);
  });

  it('getHookById localiza un hook concreto', () => {
    expect(getHookById('pov-5-apps-fragmentadas')?.text).toMatch(/5 apps de salud/);
    expect(getHookById('inexistente')).toBeUndefined();
  });
});

describe('content pillars', () => {
  it('targetShares suman ≈ 1.0', () => {
    const sum = PILLAR_TARGET_MIX.reduce((acc, p) => acc + p.share, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  it('todos los pilares tienen al menos 1 ejemplo', () => {
    for (const p of Object.values(CONTENT_PILLARS)) {
      expect(p.exampleAngles.length).toBeGreaterThan(0);
    }
  });
});

describe('posting times', () => {
  it('nextSlot devuelve fecha futura para Optimizador en TikTok', () => {
    const ref = new Date('2026-05-18T06:00:00+02:00'); // lunes 06:00
    const slot = nextSlot(PERSONA_IDS.OPTIMIZADOR_CONSCIENTE, 'tiktok', ref);
    expect(slot).not.toBeNull();
    if (slot) expect(slot.getTime()).toBeGreaterThan(ref.getTime());
  });

  it('nextSlot devuelve null si la persona no tiene slots en esa plataforma', () => {
    // Optimizador no tiene facebook_feed configurado
    const slot = nextSlot(PERSONA_IDS.OPTIMIZADOR_CONSCIENTE, 'facebook_feed');
    expect(slot).toBeNull();
  });
});
