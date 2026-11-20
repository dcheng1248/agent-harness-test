import { describe, expect, it } from 'vitest';
import { PALACE_IDS } from '@emperor/core';
import { PALACE_ANCHORS } from './palaceMap';

describe('palace map anchors', () => {
  it('UC-WEB-004 every palace has an anchor inside the image', () => {
    expect(Object.keys(PALACE_ANCHORS).sort()).toEqual([...PALACE_IDS].sort());
    for (const id of PALACE_IDS) {
      const { x, y } = PALACE_ANCHORS[id];
      for (const v of [x, y]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('UC-WEB-004 palace buttons do not overlap', () => {
    expect(PALACE_ANCHORS.xuanzheng).toEqual({ x: 50, y: 50 });
    for (const a of PALACE_IDS) {
      for (const b of PALACE_IDS) {
        if (a === b) continue;
        const pa = PALACE_ANCHORS[a];
        const pb = PALACE_ANCHORS[b];
        expect(Math.abs(pa.x - pb.x) >= 10 || Math.abs(pa.y - pb.y) >= 10, `${a} vs ${b}`).toBe(true);
      }
    }
  });
});
