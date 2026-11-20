import type { ActionPointId } from './calendar';
import { ACTION_POINTS } from './calendar';

export const PALACE_IDS = ['chongwen', 'yuhuayuan', 'yanwu', 'yangxin', 'xuanzheng'] as const;
export type PalaceId = (typeof PALACE_IDS)[number];

export const ACTION_IDS = ['study', 'arts', 'riding', 'rest'] as const;
export type ActionId = (typeof ACTION_IDS)[number];

export interface Catalog {
  palaces: Record<PalaceId, { actions: readonly ActionId[] }>;
  actions: Record<ActionId, { allowedIn: readonly ActionPointId[] }>;
}

export const CATALOG: Catalog = {
  palaces: {
    chongwen: { actions: ['study', 'arts'] },
    yuhuayuan: { actions: [] },
    yanwu: { actions: ['riding'] },
    yangxin: { actions: ['rest'] },
    xuanzheng: { actions: [] },
  },
  actions: {
    study: { allowedIn: ACTION_POINTS },
    arts: { allowedIn: ACTION_POINTS },
    riding: { allowedIn: ACTION_POINTS },
    rest: { allowedIn: ACTION_POINTS },
  },
};
