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
});
