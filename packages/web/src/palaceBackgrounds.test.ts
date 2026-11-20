import { describe, expect, it } from 'vitest';
import { PALACE_IDS } from '@emperor/core';
import { PALACE_BACKGROUNDS } from './palaceBackgrounds';

describe('palace backgrounds', () => {
  it('UC-WEB-004 every palace has a background image', () => {
    expect(Object.keys(PALACE_BACKGROUNDS).sort()).toEqual([...PALACE_IDS].sort());
    for (const id of PALACE_IDS) expect(PALACE_BACKGROUNDS[id]).toMatch(new RegExp(`background-${id}\\.jpg`));
  });
});
