import { describe, expect, it } from 'vitest';
import { CENTRAL_POST_IDS, MINISTRY_DEPARTMENT_IDS, PLAYER_OWNER, regionNeighbours, regionTax } from '@emperor/core';
import { gameText } from './index';

describe('regions', () => {
  const regions = gameText.regions;
  const home = regions.filter((r) => r.owner === PLAYER_OWNER);
  const byOwner = (o: string) => regions.filter((r) => r.owner === o);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  it('UC-CONTENT-001 has 9 home regions first, then 28 in total grouped by nation', () => {
    expect(regions.slice(0, 9).map((r) => r.name)).toEqual([
      '關中', '河東', '河北', '中原', '山東', '江南', '荊楚', '巴蜀', '嶺南',
    ]);
    expect(regions.slice(0, 9).every((r) => r.owner === PLAYER_OWNER)).toBe(true);
    expect(regions.slice(9).some((r) => r.owner === PLAYER_OWNER)).toBe(false);
    expect(regions).toHaveLength(28);
    expect(byOwner('khitan')).toHaveLength(8);
    expect(byOwner('tibet')).toHaveLength(6);
    expect(byOwner('goryeo')).toHaveLength(3);
    expect(byOwner('nanzhao')).toHaveLength(2);
    const order = gameText.nations.map((n) => n.id);
    const idx = regions.slice(9).map((r) => order.indexOf(r.owner));
    for (let i = 1; i < idx.length; i++) expect(idx[i]).toBeGreaterThanOrEqual(idx[i - 1]!);
  });
  it('UC-CONTENT-001 IDs and names are unique', () => {
    expect(new Set(regions.map((r) => r.id)).size).toBe(28);
    expect(new Set(regions.map((r) => r.name)).size).toBe(28);
  });
  it('UC-CONTENT-001 no two regions share a cell and cells are non-negative integers', () => {
    expect(new Set(regions.map((r) => `${r.cell.x},${r.cell.y}`)).size).toBe(28);
    for (const r of regions) {
      for (const v of [r.cell.x, r.cell.y]) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('UC-CONTENT-001 each nation forms one connected block', () => {
    for (const n of gameText.nations) {
      const own = byOwner(n.id);
      const seen = new Set([own[0]!.id]);
      const queue = [own[0]!.id];
      while (queue.length) {
        for (const id of regionNeighbours(regions, queue.shift()!)) {
          if (!seen.has(id) && own.some((r) => r.id === id)) {
            seen.add(id);
            queue.push(id);
          }
        }
      }
      expect(seen.size, n.name).toBe(own.length);
    }
  });
  it('UC-CONTENT-001 高麗 shares no edge with a home region', () => {
    for (const r of byOwner('goryeo')) {
      for (const id of regionNeighbours(regions, r.id)) {
        expect(regions.find((o) => o.id === id)!.owner).not.toBe(PLAYER_OWNER);
      }
    }
  });
  it('UC-CONTENT-001 foreign regions sit in rough real geography', () => {
    const homeX = home.map((r) => r.cell.x);
    const homeY = home.map((r) => r.cell.y);
    for (const r of byOwner('khitan')) expect(r.cell.y).toBeLessThan(Math.min(...homeY));
    for (const r of byOwner('tibet')) expect(r.cell.x).toBeLessThan(Math.min(...homeX));
    const khitanMaxX = Math.max(...byOwner('khitan').map((r) => r.cell.x));
    for (const r of byOwner('goryeo')) {
      expect(r.cell.x).toBeGreaterThan(Math.max(...homeX));
      expect(r.cell.x).toBeGreaterThanOrEqual(khitanMaxX);
    }
    for (const r of byOwner('nanzhao')) {
      expect(r.cell.x).toBeLessThan(mean(homeX));
      expect(r.cell.y).toBeGreaterThan(mean(homeY));
    }
  });
  it('UC-CONTENT-001 foreign stats stay within the home range and 人口 averages lower', () => {
    const foreign = regions.filter((r) => r.owner !== PLAYER_OWNER);
    for (const key of ['morale', 'prosperity'] as const) {
      const vals = home.map((r) => r.start[key]);
      for (const r of foreign) {
        expect(r.start[key]).toBeGreaterThanOrEqual(Math.min(...vals));
        expect(r.start[key]).toBeLessThanOrEqual(Math.max(...vals));
      }
    }
    expect(mean(foreign.map((r) => r.start.population))).toBeLessThan(mean(home.map((r) => r.start.population)));
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
    expect(gameText.regions.filter((r) => r.owner === PLAYER_OWNER).reduce((sum, r) => sum + regionTax(r.start), 0)).toBe(547437);
  });
  it('UC-CONTENT-002 region IDs never equal a 部 or central post ID', () => {
    const reserved: readonly string[] = [...MINISTRY_DEPARTMENT_IDS, ...CENTRAL_POST_IDS];
    for (const r of gameText.regions) expect(reserved).not.toContain(r.id);
  });
});
