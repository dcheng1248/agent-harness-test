import { describe, expect, it } from 'vitest';
import { createInitialState, listPosts } from '@emperor/core';
import { gameText } from './index';

describe('officialNames', () => {
  it('UC-CONTENT-002 the name pool: about 100 surnames, about 200 given names, distinct Han, none reserved yet', () => {
    const { surnames, givenNames, reserved } = gameText.officialNames;
    expect(surnames.length).toBeGreaterThanOrEqual(90);
    expect(givenNames.length).toBeGreaterThanOrEqual(180);
    expect(reserved).toHaveLength(0);
    expect(new Set(surnames).size).toBe(surnames.length);
    expect(new Set(givenNames).size).toBe(givenNames.length);
    for (const n of [...surnames, ...givenNames]) expect(n).toMatch(/^\p{Script=Han}{1,2}$/u);
  });
  it('UC-CONTENT-002 a new game with the real pool has 63 officials with distinct names', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const s = createInitialState(seed, '承平', gameText.regions, gameText.officialNames);
      expect(s.officials).toHaveLength(63);
      expect(listPosts(s)).toHaveLength(33);
      expect(new Set(s.officials.map((o) => o.name)).size).toBe(63);
    }
  });
});
