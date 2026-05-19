import { describe, expect, it } from 'vitest';
import { QUEUE_NAMES } from './index.js';

describe('QUEUE_NAMES', () => {
  it('declara las 3 colas previstas', () => {
    expect(QUEUE_NAMES.publish).toBe('qyro.publish');
    expect(QUEUE_NAMES.metricsPull).toBe('qyro.metrics-pull');
    expect(QUEUE_NAMES.boost).toBe('qyro.boost');
  });
});
