import { describe, expect, it } from 'vitest';
import { drawEraNameSuggestions, isValidEraName } from '../index';

describe('era name', () => {
  it('UC-CORE-011 accepts exactly 2 Han characters', () => {
    for (const ok of ['承平', '天祿']) expect(isValidEraName(ok)).toBe(true);
    for (const bad of ['', '承', '承平元', 'ab', '承a', ' 承平', '承 ', '12', '<b']) {
      expect(isValidEraName(bad)).toBe(false);
    }
  });

  it('UC-CORE-011 draws 3 distinct suggestions from the pool, the same for the same seed', () => {
    const pool = ['甲乙', '丙丁', '戊己', '庚辛', '壬癸'];
    const first = drawEraNameSuggestions(9, pool);
    expect(first).toHaveLength(3);
    expect(new Set(first).size).toBe(3);
    expect(first.every((name) => pool.includes(name))).toBe(true);
    expect(drawEraNameSuggestions(9, pool)).toEqual(first);
  });

  it('returns the whole pool when it is smaller than count', () => {
    expect([...drawEraNameSuggestions(1, ['甲乙', '丙丁'])].sort()).toEqual(['丙丁', '甲乙']);
  });
});
