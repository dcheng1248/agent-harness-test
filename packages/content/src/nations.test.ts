import { describe, expect, it } from 'vitest';
import { PLAYER_OWNER } from '@emperor/core';
import { gameText } from './index';

describe('nations', () => {
  const nations = gameText.nations;
  it('UC-CONTENT-005 lists 本朝 first, then the four foreign nations in order', () => {
    expect(nations.map((n) => n.name)).toEqual(['本朝', '契丹', '吐蕃', '高麗', '南詔']);
    expect(nations[0]!.id).toBe(PLAYER_OWNER);
  });
  it('UC-CONTENT-005 IDs are unique and colours are unique hex values', () => {
    expect(new Set(nations.map((n) => n.id)).size).toBe(nations.length);
    expect(new Set(nations.map((n) => n.color.toLowerCase())).size).toBe(nations.length);
    for (const n of nations) expect(n.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('UC-CONTENT-005 every region owner is a nation and every nation owns a region', () => {
    const ids = nations.map((n) => n.id);
    for (const r of gameText.regions) expect(ids).toContain(r.owner);
    for (const id of ids) expect(gameText.regions.some((r) => r.owner === id)).toBe(true);
  });
});
