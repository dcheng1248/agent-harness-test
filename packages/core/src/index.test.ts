import { describe, expect, it } from 'vitest';
import { nextRandom } from './index';

describe('core skeleton', () => {
  it('produces the same random sequence for the same seed', () => {
    const first = nextRandom(42);
    expect(nextRandom(42)).toEqual(first);
    expect(first.value).toBeGreaterThanOrEqual(0);
    expect(first.value).toBeLessThan(1);
    expect(first.rngState).not.toBe(42);
  });
});
