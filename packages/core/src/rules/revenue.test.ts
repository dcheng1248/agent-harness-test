import { describe, expect, it } from "vitest";
import {
  canLevy,
  createInitialState,
  enterPalace,
  expectedTax,
  levy,
  levyAmount,
  nextCollection,
  returnToMap,
  setTaxLevel,
} from "../index";
import type { GameState, TaxLevelId } from "../index";
import { TEST_BUILDINGS, TEST_NAMES } from "../testNames";

const REGIONS = [
  { id: "a", owner: "player", adjacent: [], start: { morale: 60, population: 20000000, prosperity: 60 } },
  { id: "b", owner: "player", adjacent: [], start: { morale: 60, population: 10500000, prosperity: 60 } },
  { id: "c", owner: "foreign", adjacent: [], start: { morale: 60, population: 9000000, prosperity: 60 } },
];

function court(over: Partial<GameState> = {}): GameState {
  return {
    ...enterPalace(createInitialState(1, "承平", REGIONS, TEST_NAMES, TEST_BUILDINGS), "xuanzheng"),
    ...over,
  };
}
function ok<T extends { ok: boolean; state: GameState }>(o: T): GameState {
  if (!o.ok) throw new Error("rejected");
  return o.state;
}
const morales = (s: GameState) => s.regions.map((r) => r.stats.morale);

describe("setTaxLevel", () => {
  it("UC-CORE-021 setTaxLevel sets the level during 早朝, repeatably", () => {
    const start = court();
    const first = setTaxLevel(start, "heavy");
    const second = setTaxLevel(ok(first), "light");
    expect(second).toMatchObject({ ok: true, amount: 0 });
    const end = ok(second);
    expect(end.revenue.taxLevel).toBe("light");
    expect(end.actionPoint).toBe(start.actionPoint);
    expect(end.rngState).toBe(start.rngState);
  });
  it("UC-CORE-021 setTaxLevel rejections in order", () => {
    const map = court({ location: "map" });
    expect(setTaxLevel(map, "bogus" as TaxLevelId)).toEqual({ ok: false, reason: "not-in-court", state: map });
    expect(setTaxLevel(map, "heavy").state).toBe(map);
    const dead = court({ dead: true });
    expect(setTaxLevel(dead, "heavy")).toMatchObject({ ok: false, reason: "not-in-court" });
    expect(setTaxLevel(dead, "heavy").state).toBe(dead);
    const c = court();
    const bad = setTaxLevel(c, "bogus" as TaxLevelId);
    expect(bad).toMatchObject({ ok: false, reason: "unknown-level" });
    expect(bad.state).toBe(c);
  });
});

describe("expectedTax and nextCollection", () => {
  it("UC-CORE-021 expectedTax lists player regions at a level", () => {
    expect(expectedTax(court())).toEqual([
      { region: "a", tax: 360000 },
      { region: "b", tax: 189000 },
    ]);
    expect(expectedTax(court(), "heavy")).toEqual([
      { region: "a", tax: 450000 },
      { region: "b", tax: 236250 },
    ]);
    expect(expectedTax(ok(setTaxLevel(court(), "light")))).toEqual([
      { region: "a", tax: 270000 },
      { region: "b", tax: 141750 },
    ]);
  });
  it("UC-CORE-021 nextCollection", () => {
    expect(nextCollection({ turn: 0 })).toBe("autumn-early");
    expect(nextCollection({ turn: 3 })).toBe("autumn-early");
    expect(nextCollection({ turn: 4 })).toBe("spring-early");
    expect(nextCollection({ turn: 7 })).toBe("spring-early");
  });
});

describe("extra levy", () => {
  it("UC-CORE-022 levyAmount is half a collection at the current level", () => {
    expect(levyAmount(court())).toBe(274500);
    expect(levyAmount(ok(setTaxLevel(court(), "very-heavy")))).toBe(411750);
  });
  it("UC-CORE-022 levy adds to 國庫, cuts 民心 and stamps the turn", () => {
    const start = court();
    const out = levy(start);
    expect(out).toMatchObject({ ok: true, amount: 274500 });
    const s = ok(out);
    expect(s.nation.treasury).toBe(start.nation.treasury + 274500);
    expect(morales(s)).toEqual([50, 50, 60]);
    expect(s.revenue).toEqual({ taxLevel: "normal", leviedTurn: 0 });
    expect(s.actionPoint).toBe(start.actionPoint);
    expect(s.rngState).toBe(start.rngState);
  });
  it("UC-CORE-022 levy stops 民心 at 0", () => {
    const start = court();
    const low = { ...start, regions: start.regions.map((r, i) => (i === 0 ? { ...r, stats: { ...r.stats, morale: 4 } } : r)) };
    expect(morales(ok(levy(low)))[0]).toBe(0);
  });
  it("UC-CORE-022 once per 早朝", () => {
    const used = ok(levy(court()));
    expect(canLevy(used)).toBe(false);
    expect(levy(used)).toMatchObject({ ok: false, reason: "already-used" });
    const next = enterPalace({ ...returnToMap(used), turn: 1, actionPoint: 0 }, "xuanzheng");
    expect(canLevy(next)).toBe(true);
    expect(levy(next).ok).toBe(true);
  });
  it("UC-CORE-022 rejections in order", () => {
    const map = court({ location: "map" });
    expect(levy(map)).toEqual({ ok: false, reason: "not-in-court", state: map });
    expect(levy(court({ dead: true }))).toMatchObject({ ok: false, reason: "not-in-court" });
    const used = ok(levy(court()));
    expect(levy({ ...used, location: "map" })).toMatchObject({ reason: "not-in-court" });
    expect(levy(used)).toMatchObject({ ok: false, reason: "already-used" });
  });
  it("UC-CORE-022 with no player regions the levy is 0 but allowed", () => {
    const foreign = court();
    const s = { ...foreign, regions: foreign.regions.map((r) => ({ ...r, owner: "foreign" })) };
    expect(levyAmount(s)).toBe(0);
    const out = levy(s);
    expect(out).toMatchObject({ ok: true, amount: 0 });
    expect(ok(out).revenue.leviedTurn).toBe(0);
  });
});
