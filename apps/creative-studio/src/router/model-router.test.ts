import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config.js';
import { ModelRouter, ModelRouterPremiumBlocked } from './model-router.js';

const env = {
  SOCIAL_CALENDAR_BASE_URL: 'http://calendar.test',
  SOCIAL_CALENDAR_SERVICE_API_KEY: '0'.repeat(32),
};

describe('ModelRouter', () => {
  const router = new ModelRouter(loadConfig(env as NodeJS.ProcessEnv));

  it('UGC talking-head usa HyperFrames (no HeyGen)', () => {
    const r = router.route({ format: 'ugc_video_talking_head' });
    expect(r.tool).toBe('hyperframes');
    expect(r.estimatedCostUnit).toBe('free');
    expect(r.estimatedCost).toBe(0);
  });

  it('app_demo siempre es HyperFrames', () => {
    const r = router.route({ format: 'app_demo' });
    expect(r.tool).toBe('hyperframes');
  });

  it('static_image_with_text usa gpt_image_2 en Higgsfield', () => {
    const r = router.route({ format: 'static_image_with_text' });
    expect(r.tool).toBe('higgsfield');
    expect(r.model).toBe('gpt_image_2');
  });

  it('ugc_video_dynamic usa seedance_2_0', () => {
    const r = router.route({ format: 'ugc_video_dynamic' });
    expect(r.model).toBe('seedance_2_0');
    expect(r.isPremium).toBe(false);
  });

  it('lifestyle_video bloquea premium sin allowPremium', () => {
    expect(() => router.route({ format: 'lifestyle_video' })).toThrow(ModelRouterPremiumBlocked);
  });

  it('lifestyle_video permite premium con allowPremium=true', () => {
    const r = router.route({ format: 'lifestyle_video', allowPremium: true });
    expect(r.model).toBe('veo_3_1');
    expect(r.isPremium).toBe(true);
  });

  it('concept_test usa soul_v2 (barato para A/B/C)', () => {
    const r = router.route({ format: 'concept_test' });
    expect(r.model).toBe('soul_v2');
  });
});
