import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, createInitialState, nextRandom } from './index';

describe('core skeleton', () => {
  it('creates a versioned initial state', () => {
    expect(createInitialState(42)).toEqual({ schemaVersion: SCHEMA_VERSION, seed: 42, rngState: 42 });
  });

  it('produces the same random sequence for the same seed', () => {
    const first = nextRandom(42);
    expect(nextRandom(42)).toEqual(first);
    expect(first.value).toBeGreaterThanOrEqual(0);
    expect(first.value).toBeLessThan(1);
    expect(first.rngState).not.toBe(42);
  });
});
