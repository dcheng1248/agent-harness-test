import type { PalaceId } from '@emperor/core';

/** Button centre for each palace, as a percentage of the map image's width and height. */
export const PALACE_ANCHORS: Record<PalaceId, { x: number; y: number }> = {
  chongwen: { x: 22, y: 15 },
  yuhuayuan: { x: 50, y: 11 },
  yanwu: { x: 18, y: 70 },
  yangxin: { x: 50, y: 33 },
  xuanzheng: { x: 50, y: 50 },
};
