import { describe, expect, it } from 'vitest';
import { EMPEROR_STAT_IDS, STAT_REGISTRY } from '@emperor/core';
import { gameText } from './index';

const { notables } = gameText;
const OFFICIAL_STATS = ['administration', 'military', 'ambition', 'loyalty'] as const;

describe('notables', () => {
  it('UC-CONTENT-003 about sixty entries with unique kebab-case IDs and unique 2-4 Han names', () => {
    expect(notables.length).toBeGreaterThanOrEqual(55);
    expect(notables.length).toBeLessThanOrEqual(65);
    expect(new Set(notables.map((n) => n.id)).size).toBe(notables.length);
    expect(new Set(notables.map((n) => n.name)).size).toBe(notables.length);
    for (const n of notables) {
      expect(n.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(n.name).toMatch(/^\p{Script=Han}{2,4}$/u);
    }
  });
  it('UC-CONTENT-003 every stat is within its STAT_REGISTRY bounds and gates are valid', () => {
    for (const n of notables) {
      for (const id of OFFICIAL_STATS) {
        const def = STAT_REGISTRY.find((d) => d.id === id)!;
        expect(n.stats[id]).toBeGreaterThanOrEqual(def.min);
        expect(n.stats[id]).toBeLessThanOrEqual(def.max);
      }
      expect(EMPEROR_STAT_IDS).toContain(n.gate.stat);
      expect(n.gate.min).toBeGreaterThanOrEqual(1);
      expect(n.gate.min).toBeLessThanOrEqual(100);
    }
  });
  it('UC-CONTENT-003 all three types appear and match their stat shape', () => {
    expect(new Set(notables.map((n) => n.type))).toEqual(new Set(['civil', 'military', 'both']));
    for (const n of notables) {
      const { administration: a, military: m } = n.stats;
      if (n.type === 'civil') expect(a).toBeGreaterThan(m);
      if (n.type === 'military') expect(m).toBeGreaterThan(a);
      if (n.type === 'both') { expect(a).toBeGreaterThanOrEqual(70); expect(m).toBeGreaterThanOrEqual(70); }
    }
  });
  it('UC-CONTENT-003 some are ambitious (including sima-yi) and some gates are low', () => {
    const ambitious = notables.filter((n) => n.stats.ambition >= 80);
    expect(ambitious.length).toBeGreaterThanOrEqual(5);
    expect(ambitious.map((n) => n.id)).toContain('sima-yi');
    expect(notables.filter((n) => n.gate.min <= 35).length).toBeGreaterThanOrEqual(10);
  });
  it('UC-CONTENT-003 wei-qing is gated on resolve 60', () => {
    expect(notables.find((n) => n.id === 'wei-qing')!.gate).toEqual({ stat: 'resolve', min: 60 });
  });
});
