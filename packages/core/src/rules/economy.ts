import { BALANCE } from "../model/balance";
import type { StatChange } from "../model/balance";
import type { HalfSeasonId } from "../model/calendar";
import { PLAYER_OWNER } from "../model/region";
import type { RegionState } from "../model/region";
import type { TaxLevelId } from "../model/revenue";
import { REGION_STAT_IDS, STAT_REGISTRY } from "../model/stats";
import type { NationStatValues, RegionStatValues } from "../model/stats";

export interface RegionChange {
  region: string;
  changes: StatChange[];
}
export interface EconomyReport {
  taxIncome: number;
  upkeep: number;
  wages: number;
  soldierWages: number;
  legionWages: number;
  regionChanges: RegionChange[];
}

export function regionTax(stats: RegionStatValues, level: TaxLevelId = "normal"): number {
  return Math.floor(
    (stats.population * stats.prosperity * stats.morale * BALANCE.tax.levels[level].multiplier) /
      BALANCE.tax.halfYearDivisor,
  );
}

function grownPopulation(stats: RegionStatValues): number {
  const { growAtOrAbove, shrinkAtOrBelow, ratePercent } = BALANCE.population;
  const score = stats.morale + stats.prosperity;
  const step = Math.floor((stats.population * ratePercent) / 100);
  if (score >= growAtOrAbove) return stats.population + step;
  if (score <= shrinkAtOrBelow) return Math.max(0, stats.population - step);
  return stats.population;
}

export function settleEconomy(
  nation: NationStatValues,
  regions: readonly RegionState[],
  nextHalfSeason: HalfSeasonId,
  artisans = 0,
  taxLevel: TaxLevelId = "normal",
  soldiers = 0,
  legionSoldiers = 0,
): { nation: NationStatValues; regions: RegionState[]; report: EconomyReport } {
  const upkeep = BALANCE.upkeep;
  const wages = Math.floor(artisans * BALANCE.works.wagePerArtisan);
  const soldierWages = Math.floor(soldiers * BALANCE.army.wagePerSoldier);
  const legionWages = Math.floor(
    legionSoldiers * BALANCE.army.wagePerSoldier * BALANCE.army.legionWageMultiplier,
  );
  let treasury = nation.treasury - upkeep - wages - soldierWages - legionWages;

  const next: RegionState[] = regions.map((r) => {
    if (r.owner !== PLAYER_OWNER || nextHalfSeason !== "spring-early")
      return { ...r, stats: { ...r.stats } };
    return { ...r, stats: { ...r.stats, population: grownPopulation(r.stats) } };
  });

  let taxIncome = 0;
  if (BALANCE.tax.collectOn.includes(nextHalfSeason)) {
    for (const r of next) {
      if (r.owner === PLAYER_OWNER) taxIncome += regionTax(r.stats, taxLevel);
    }
  }
  treasury += taxIncome;

  const levelMorale = BALANCE.tax.levels[taxLevel].morale;
  if (levelMorale !== 0) {
    const { min, max } = STAT_REGISTRY.find((d) => d.id === "morale")!;
    for (const r of next) {
      if (r.owner === PLAYER_OWNER) {
        r.stats.morale = Math.min(max, Math.max(min, r.stats.morale + levelMorale));
      }
    }
  }

  if (treasury < 0) {
    for (const r of next) {
      if (r.owner === PLAYER_OWNER) {
        r.stats.morale = Math.max(
          0,
          r.stats.morale - BALANCE.bankruptcyMoraleLoss,
        );
      }
    }
  }

  const regionChanges: RegionChange[] = [];
  next.forEach((r, i) => {
    const before = regions[i];
    if (!before) return;
    const changes: StatChange[] = [];
    for (const stat of REGION_STAT_IDS) {
      const amount = r.stats[stat] - before.stats[stat];
      if (amount !== 0) changes.push({ stat, amount });
    }
    if (changes.length > 0) regionChanges.push({ region: r.id, changes });
  });

  return {
    nation: { ...nation, treasury },
    regions: next,
    report: { taxIncome, upkeep, wages, soldierWages, legionWages, regionChanges },
  };
}
