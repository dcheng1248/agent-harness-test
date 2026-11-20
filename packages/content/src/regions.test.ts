import { describe, expect, it } from 'vitest';
import { CENTRAL_POST_IDS, MINISTRY_DEPARTMENT_IDS, PLAYER_OWNER, regionTax } from '@emperor/core';
import { gameText } from './index';

describe('regions', () => {
  it('UC-CONTENT-001 has the 9 home regions in order, all owned by the player', () => {
    expect(gameText.regions.map((r) => r.name)).toEqual([
      '關中', '河東', '河北', '中原', '山東', '江南', '荊楚', '巴蜀', '嶺南',
    ]);
    expect(gameText.regions.every((r) => r.owner === PLAYER_OWNER)).toBe(true);
    expect(new Set(gameText.regions.map((r) => r.id)).size).toBe(9);
  });
  it('UC-CONTENT-001 adjacency is symmetric, known and never self', () => {
    for (const r of gameText.regions) {
      for (const id of r.adjacent) {
        const other = gameText.regions.find((o) => o.id === id);
        expect(other, `${r.id} → ${id}`).toBeDefined();
        expect(other!.adjacent).toContain(r.id);
        expect(id).not.toBe(r.id);
      }
    }
  });
  it('UC-CONTENT-001 only 關中 is the capital, and starting values are in range', () => {
    expect(gameText.regions.filter((r) => r.capital).map((r) => r.id)).toEqual(['guanzhong']);
    for (const r of gameText.regions) {
      expect(r.start.morale).toBeGreaterThanOrEqual(0);
      expect(r.start.morale).toBeLessThanOrEqual(100);
      expect(r.start.prosperity).toBeGreaterThanOrEqual(0);
      expect(r.start.prosperity).toBeLessThanOrEqual(100);
      expect(r.start.population).toBeGreaterThan(0);
      expect(Number.isInteger(r.start.population)).toBe(true);
    }
  });
  it('UC-CONTENT-001 the starting regions yield 547437 taels per collection', () => {
    expect(gameText.regions.reduce((sum, r) => sum + regionTax(r.start), 0)).toBe(547437);
  });
  it('UC-CONTENT-002 region IDs never equal a 部 or central post ID', () => {
    const reserved: readonly string[] = [...MINISTRY_DEPARTMENT_IDS, ...CENTRAL_POST_IDS];
    for (const r of gameText.regions) expect(reserved).not.toContain(r.id);
  });
});
