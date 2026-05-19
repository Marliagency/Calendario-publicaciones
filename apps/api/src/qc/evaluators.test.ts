import { describe, expect, it } from 'vitest';
import {
  type QCRuleSnapshot,
  type VariantSnapshot,
  evaluateAutomaticRules,
  hasBlockers,
} from './evaluators.js';

const allRules: QCRuleSnapshot[] = [
  { id: 'r-ratio', ruleType: 'PLATFORM_RATIO', severity: 'BLOCKER', enabled: true },
  { id: 'r-dur', ruleType: 'PLATFORM_DURATION', severity: 'BLOCKER', enabled: true },
  { id: 'r-hash', ruleType: 'HASHTAG_LIMIT', severity: 'WARNING', enabled: true },
  { id: 'r-music', ruleType: 'MUSIC_LICENSE', severity: 'WARNING', enabled: true },
  { id: 'r-hook', ruleType: 'HOOK_IN_3S', severity: 'BLOCKER', enabled: true },
];

function variant(overrides: Partial<VariantSnapshot> = {}): VariantSnapshot {
  return {
    kind: 'tiktok',
    ratio: '9:16',
    durationS: 22,
    caption: 'hola',
    hashtags: [],
    musicRef: null,
    ...overrides,
  };
}

describe('evaluateAutomaticRules', () => {
  it('variante válida no produce issues', () => {
    expect(evaluateAutomaticRules(allRules, [variant()])).toHaveLength(0);
  });

  it('detecta ratio inválido en TikTok', () => {
    const issues = evaluateAutomaticRules(allRules, [variant({ ratio: '1:1' })]);
    expect(issues.some((i) => i.ruleType === 'PLATFORM_RATIO')).toBe(true);
    expect(hasBlockers(issues)).toBe(true);
  });

  it('detecta duración fuera de rango en Instagram Reel', () => {
    const issues = evaluateAutomaticRules(allRules, [
      variant({ kind: 'instagram_reel', durationS: 200 }),
    ]);
    expect(issues.some((i) => i.ruleType === 'PLATFORM_DURATION')).toBe(true);
  });

  it('promociona hashtags a BLOCKER si supera el máximo, WARNING si solo el recomendado', () => {
    const warn = evaluateAutomaticRules(allRules, [
      variant({ kind: 'instagram_reel', hashtags: Array(15).fill('#x') }),
    ]);
    expect(warn[0]?.severity).toBe('WARNING');

    const block = evaluateAutomaticRules(allRules, [
      variant({ kind: 'instagram_reel', hashtags: Array(35).fill('#x') }),
    ]);
    expect(block[0]?.severity).toBe('BLOCKER');
  });

  it('avisa de licencia de música en TikTok cuando hay musicRef', () => {
    const issues = evaluateAutomaticRules(allRules, [
      variant({ kind: 'tiktok', musicRef: 'spotify:track:xyz' }),
    ]);
    expect(issues.some((i) => i.ruleType === 'MUSIC_LICENSE')).toBe(true);
  });

  it('reglas manuales (HOOK_IN_3S etc.) no emiten issues automáticos', () => {
    const issues = evaluateAutomaticRules(
      [{ id: 'r-hook', ruleType: 'HOOK_IN_3S', severity: 'BLOCKER', enabled: true }],
      [variant()],
    );
    expect(issues).toHaveLength(0);
  });

  it('reglas deshabilitadas no se evalúan', () => {
    const issues = evaluateAutomaticRules(
      [{ id: 'r-ratio', ruleType: 'PLATFORM_RATIO', severity: 'BLOCKER', enabled: false }],
      [variant({ ratio: '1:1' })],
    );
    expect(issues).toHaveLength(0);
  });
});
