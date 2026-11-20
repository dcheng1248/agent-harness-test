import type { ActionId } from './catalog';
import type { StatId } from './stats';

export interface StatChange {
  stat: StatId;
  amount: number;
}

export const BALANCE = {
  ascensionAge: 16,
  turnsPerYear: 8,
  actionPointsPerTurn: 4,
  startingStats: { budget: 150, min: 15, max: 70 },
  actionVariance: 1,
  actions: {
    study: [
      { stat: 'learning', amount: 3 },
      { stat: 'health', amount: -1 },
    ],
    arts: [{ stat: 'arts', amount: 3 }],
    riding: [
      { stat: 'health', amount: 2 },
      { stat: 'resolve', amount: 2 },
    ],
    rest: [{ stat: 'health', amount: 3 }],
  } as Record<ActionId, readonly StatChange[]>,
  aging: { startAge: 40, baseLoss: 1, yearsPerStep: 5 },
};
