import { describe, expect, it } from "vitest";
import { BALANCE, HALF_SEASONS, regionTax, settleEconomy } from "../index";
import type { HalfSeasonId, RegionState, RegionStatValues, TaxLevelId } from "../index";

function region(
  id: string,
  stats: RegionStatValues,
  owner = "player",
): RegionState {
  return { id, owner, stats };
}

const A = region("a", { morale: 60, population: 5000000, prosperity: 60 });

function afterPopulation(r: RegionState, next: HalfSeasonId): RegionStatValues {
  // A has 民心 + 富庶 = 120, so it grows by 2% when entering 春上
  return next === "spring-early"
    ? { ...r.stats, population: r.stats.population * 1.02 }
    : r.stats;
}

describe("settleEconomy soldier wages", () => {
  it("UC-CORE-024 soldiers are paid with upkeep", () => {
    const { report, nation } = settleEconomy({ treasury: 1000000 }, [A], "summer-early", 0, "normal", 20000);
    expect(report.soldierWages).toBe(10000);
    expect(report.wages).toBe(0);
    expect(nation.treasury).toBe(1000000 - 120000 - 10000);
    expect(settleEconomy({ treasury: 1000000 }, [A], "summer-early", 0, "normal", 1).report.soldierWages).toBe(0);
    expect(settleEconomy({ treasury: 1000000 }, [A], "summer-early").report.soldierWages).toBe(0);
  });
  it("UC-CORE-024 unpaid soldier wages trigger bankruptcy", () => {
    const { regions } = settleEconomy({ treasury: 125000 }, [A], "summer-early", 0, "normal", 20000);
    expect(regions[0]?.stats.morale).toBe(A.stats.morale - BALANCE.bankruptcyMoraleLoss);
  });
});

describe("settleEconomy 軍團 wages", () => {
  it("UC-CORE-026 軍團 soldiers cost double", () => {
    const { report, nation } = settleEconomy({ treasury: 1000000 }, [A], "summer-early", 0, "normal", 10000, 10000);
    expect(report.soldierWages).toBe(5000);
    expect(report.legionWages).toBe(10000);
    expect(nation.treasury).toBe(1000000 - 120000 - 15000);
    expect(settleEconomy({ treasury: 1000000 }, [A], "summer-early", 0, "normal", 10000).report.legionWages).toBe(0);
  });
});

describe("settleEconomy wages", () => {
  it("UC-CORE-015 pays wages with upkeep and reports them", () => {
    const { report, nation } = settleEconomy({ treasury: 1000000 }, [A], "summer-early", 100000);
    expect(report.wages).toBe(50000);
    expect(nation.treasury).toBe(1000000 - BALANCE.upkeep - 50000);
  });
  it("UC-CORE-015 wages are 0 without 工匠 and round down", () => {
    expect(settleEconomy({ treasury: 1000000 }, [A], "summer-early").report.wages).toBe(0);
    expect(settleEconomy({ treasury: 1000000 }, [A], "summer-early", 1).report.wages).toBe(0);
  });
  it("UC-CORE-015 unpaid wages cost 民心", () => {
    const { regions } = settleEconomy({ treasury: BALANCE.upkeep }, [A], "summer-early", 10000);
    expect(regions[0]?.stats.morale).toBe(60 - BALANCE.bankruptcyMoraleLoss);
  });
});

describe("regionTax", () => {
  it("UC-CORE-015 regionTax follows the formula", () => {
    expect(
      regionTax({ morale: 60, population: 5000000, prosperity: 60 }),
    ).toBe(90000);
    expect(
      regionTax({ morale: 65, population: 4500000, prosperity: 75 }),
    ).toBe(109687);
  });
});

describe("settleEconomy taxes and upkeep", () => {
  it("UC-CORE-015 taxes arrive only when entering 春上 and 秋上", () => {
    for (const next of HALF_SEASONS) {
      const { report, nation } = settleEconomy(
        { treasury: 1000000 },
        [A],
        next,
      );
      const taxed = next === "spring-early" || next === "autumn-early";
      expect(report.taxIncome).toBe(
        taxed ? regionTax(afterPopulation(A, next)) : 0,
      );
      expect(nation.treasury).toBe(1000000 - 120000 + report.taxIncome);
    }
  });

  it("UC-CORE-015 upkeep is paid every turn, and 國庫 can go below 0", () => {
    const { nation, report } = settleEconomy(
      { treasury: 50000 },
      [A],
      "spring-late",
    );
    expect(report.upkeep).toBe(120000);
    expect(nation.treasury).toBe(-70000);
  });

  it("UC-CORE-015 a negative 國庫 lowers 民心 by 3 in every player region, stopping at 0", () => {
    const LOW = region("low", { morale: 1, population: 1000, prosperity: 50 });
    const ZERO = region("zero", { morale: 0, population: 1000, prosperity: 50 });
    const { regions, report } = settleEconomy(
      { treasury: 0 },
      [A, LOW, ZERO],
      "spring-late",
    );
    expect(regions.map((r) => r.stats.morale)).toEqual([57, 0, 0]);
    expect(report.regionChanges).toEqual([
      { region: "a", changes: [{ stat: "morale", amount: -3 }] },
      { region: "low", changes: [{ stat: "morale", amount: -1 }] },
    ]);
  });

  it("UC-CORE-015 no penalty when that turn's tax brings 國庫 back to 0 or above", () => {
    const rich = region("rich", {
      morale: 80,
      population: 5000000,
      prosperity: 80,
    });
    const { nation, regions, report } = settleEconomy(
      { treasury: 0 },
      [rich],
      "autumn-early",
    );
    expect(nation.treasury).toBeGreaterThanOrEqual(0);
    expect(regions[0]?.stats.morale).toBe(80);
    expect(report.regionChanges).toEqual([]);
  });

  it("UC-CORE-015 a foreign region pays no tax and does not change", () => {
    const foreign = region(
      "f",
      { morale: 70, population: 5000000, prosperity: 70 },
      "foreign",
    );
    const { nation, regions, report } = settleEconomy(
      { treasury: 0 },
      [foreign],
      "spring-early",
    );
    expect(report.taxIncome).toBe(0);
    expect(nation.treasury).toBe(-120000);
    expect(regions).toEqual([foreign]);
    expect(report.regionChanges).toEqual([]);
  });

  it("UC-CORE-015 does not mutate its inputs", () => {
    const nation = { treasury: 0 };
    const input = [region("a", { morale: 60, population: 1000, prosperity: 60 })];
    const copy = JSON.parse(JSON.stringify(input));
    settleEconomy(nation, input, "spring-early");
    expect(nation).toEqual({ treasury: 0 });
    expect(input).toEqual(copy);
  });
});

describe("settleEconomy population", () => {
  const HIGH = region("high", { morale: 70, population: 1000000, prosperity: 60 });
  const LOWPOP = region("lowpop", { morale: 40, population: 1000000, prosperity: 40 });
  const MID = region("mid", { morale: 60, population: 1000000, prosperity: 50 });

  it("UC-CORE-016 population changes only when entering 春上", () => {
    for (const next of HALF_SEASONS) {
      const { regions } = settleEconomy(
        { treasury: 1000000 },
        [HIGH, LOWPOP, MID],
        next,
      );
      const pops = regions.map((r) => r.stats.population);
      expect(pops).toEqual(
        next === "spring-early"
          ? [1020000, 980000, 1000000]
          : [1000000, 1000000, 1000000],
      );
    }
  });

  it("UC-CORE-016 boundaries 120 grows and 80 shrinks", () => {
    const grow = region("g", { morale: 70, population: 1000000, prosperity: 50 });
    const shrink = region("s", { morale: 40, population: 1000000, prosperity: 40 });
    const { regions, report } = settleEconomy(
      { treasury: 1000000 },
      [grow, shrink],
      "spring-early",
    );
    expect(regions.map((r) => r.stats.population)).toEqual([1020000, 980000]);
    expect(report.regionChanges).toEqual([
      { region: "g", changes: [{ stat: "population", amount: 20000 }] },
      { region: "s", changes: [{ stat: "population", amount: -20000 }] },
    ]);
  });

  it("UC-CORE-016 tax on 春上 uses the population after growth", () => {
    const { report } = settleEconomy({ treasury: 0 }, [HIGH], "spring-early");
    expect(report.taxIncome).toBe(
      regionTax({ morale: 70, population: 1020000, prosperity: 60 }),
    );
  });
});

describe("tax level", () => {
  const withMorale = (morale: number, owner = "player") =>
    region("A", { morale, population: 5000000, prosperity: 60 }, owner);
  const morale = (r: { regions: RegionState[] }) => r.regions[0]?.stats.morale;

  it("UC-CORE-021 regionTax scales by the level", () => {
    const levels: TaxLevelId[] = ["very-light", "light", "normal", "heavy", "very-heavy"];
    expect(levels.map((l) => regionTax(A.stats, l))).toEqual([45000, 67500, 90000, 112500, 135000]);
    expect(regionTax(A.stats)).toBe(regionTax(A.stats, "normal"));
  });

  it("UC-CORE-021 collection uses the level and moves 民心 after the tax", () => {
    const heavy = settleEconomy({ treasury: 1000000 }, [A], "autumn-early", 0, "heavy");
    expect(heavy.report.taxIncome).toBe(112500);
    expect(morale(heavy)).toBe(59);
    const light = settleEconomy({ treasury: 1000000 }, [A], "autumn-early", 0, "very-light");
    expect(light.report.taxIncome).toBe(45000);
    expect(morale(light)).toBe(62);
    const normal = settleEconomy({ treasury: 1000000 }, [A], "autumn-early", 0, "normal");
    expect(morale(normal)).toBe(60);
    expect(normal.report.regionChanges).toEqual([]);
  });

  it("UC-CORE-021 民心 changes every half-season", () => {
    const heavy = settleEconomy({ treasury: 1000000 }, [A], "summer-early", 0, "very-heavy");
    expect(heavy.report.taxIncome).toBe(0);
    expect(morale(heavy)).toBe(58);
    expect(heavy.report.regionChanges).toEqual([{ region: "a", changes: [{ stat: "morale", amount: -2 }] }]);
    expect(morale(settleEconomy({ treasury: 1000000 }, [A], "summer-early", 0, "light"))).toBe(61);
    const normal = settleEconomy({ treasury: 1000000 }, [A], "summer-early", 0, "normal");
    expect(morale(normal)).toBe(60);
    expect(normal.report.regionChanges).toEqual([]);
  });

  it("UC-CORE-021 clamps 民心 at turn end", () => {
    for (const next of ["autumn-early", "summer-early"] as const) {
      expect(morale(settleEconomy({ treasury: 1000000 }, [withMorale(100)], next, 0, "very-light"))).toBe(100);
      expect(morale(settleEconomy({ treasury: 1000000 }, [withMorale(1)], next, 0, "very-heavy"))).toBe(0);
    }
  });

  it("UC-CORE-021 foreign regions are untouched", () => {
    for (const next of ["autumn-early", "summer-early"] as const) {
      const out = settleEconomy({ treasury: 1000000 }, [withMorale(60, "foreign")], next, 0, "very-heavy");
      expect(morale(out)).toBe(60);
    }
  });

  it("UC-CORE-021 bankruptcy follows the level change", () => {
    const poor = region("A", { morale: 60, population: 1000, prosperity: 60 });
    const run = (next: HalfSeasonId, level: TaxLevelId) =>
      morale(settleEconomy({ treasury: 0 }, [poor], next, 0, level));
    expect(run("autumn-early", "very-light")).toBe(59);
    expect(run("summer-early", "very-heavy")).toBe(55);
    expect(run("summer-early", "very-light")).toBe(59);
  });
});
