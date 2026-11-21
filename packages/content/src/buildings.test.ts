import { describe, expect, it } from 'vitest';
import { BALANCE } from '@emperor/core';
import { gameText } from './index';
import { buildings } from './buildings';

const CATEGORIES = ['palace', 'ritual', 'education', 'garden', 'water', 'defense', 'transport'];

describe('buildings', () => {
  it('UC-CONTENT-004 has 25 entries with unique IDs and unique Han names', () => {
    expect(buildings).toHaveLength(25);
    expect(new Set(buildings.map((b) => b.id)).size).toBe(25);
    expect(new Set(buildings.map((b) => b.name)).size).toBe(25);
    for (const b of buildings) expect(b.name).toMatch(/^\p{Script=Han}+$/u);
  });
  it('UC-CONTENT-004 descriptions are one non-empty line and categories are valid', () => {
    for (const b of buildings) {
      expect(b.description.length).toBeGreaterThan(0);
      expect(b.description).not.toMatch(/[\r\n]/);
      expect(CATEGORIES).toContain(b.category);
    }
  });
  it('UC-CONTENT-004 required manpower is a positive multiple of the step and follows scale', () => {
    for (const b of buildings) {
      expect(b.required).toBeGreaterThan(0);
      expect(b.required % BALANCE.works.step).toBe(0);
    }
    expect(buildings.find((b) => b.id === 'great-wall')?.required).toBe(2000000);
    expect(buildings.some((b) => b.required <= 310000)).toBe(true);
  });
  it('UC-CONTENT-004 no building ID equals a region ID, and gameText exposes the list', () => {
    const regionIds = new Set(gameText.regions.map((r) => r.id));
    for (const b of buildings) expect(regionIds.has(b.id)).toBe(false);
    expect(gameText.buildings).toBe(buildings);
  });
});
