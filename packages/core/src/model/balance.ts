import type { HalfSeasonId } from "./calendar";
import type { ActionId } from "./catalog";
import type { EmperorStatId, OfficialStatId, StatId } from "./stats";

export interface StatChange {
  stat: StatId;
  amount: number;
}

export interface ActionEffect {
  stat: EmperorStatId;
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
      { stat: "learning", amount: 3 },
      { stat: "health", amount: -1 },
    ],
    arts: [{ stat: "arts", amount: 3 }],
    riding: [
      { stat: "health", amount: 2 },
      { stat: "resolve", amount: 2 },
    ],
    rest: [{ stat: "health", amount: 3 }],
  } as Record<ActionId, readonly ActionEffect[]>,
  startingTreasury: 500000,
  tax: {
    halfYearDivisor: 200000,
    collectOn: ["spring-early", "autumn-early"] as readonly HalfSeasonId[],
  },
  upkeep: 120000,
  bankruptcyMoraleLoss: 3,
  population: { growAtOrAbove: 120, shrinkAtOrBelow: 80, ratePercent: 2 },
  aging: { startAge: 40, baseLoss: 1, yearsPerStep: 5 },
  recommendation: { notableBase: 0.03, notableBonus: 0.05 },
  officials: {
    startingIdle: 30,
    outlierChance: 0.1,
    ordinary: {
      administration: { min: 40, max: 70 },
      military: { min: 40, max: 70 },
      ambition: { min: 0, max: 80 },
      loyalty: { min: 30, max: 80 },
    } as Record<OfficialStatId, { min: number; max: number }>,
    outlier: {
      administration: { min: 20, max: 85 },
      military: { min: 20, max: 85 },
      ambition: { min: 0, max: 95 },
      loyalty: { min: 10, max: 95 },
    } as Record<OfficialStatId, { min: number; max: number }>,
    maxNameDraws: 1000,
  },
};
