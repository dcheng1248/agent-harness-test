import { describe, expect, it } from "vitest";
import {
  BALANCE,
  canConscript,
  conscriptSoldiers,
  createInitialState,
  enterPalace,
  freePopulation,
  maxConscript,
  maxRecruit,
  recruitArtisans,
  releaseSoldiers,
} from "../index";
import type { GameState, RegionState } from "../index";
import { TEST_BUILDINGS, TEST_NAMES } from "../testNames";

const REGIONS = [
  { id: "a", owner: "player", cell: { x: 0, y: 0 }, start: { morale: 60, population: 20000000, prosperity: 60 } },
  { id: "b", owner: "player", cell: { x: 1, y: 0 }, start: { morale: 60, population: 10500000, prosperity: 60 } },
  { id: "c", owner: "foreign", cell: { x: 2, y: 0 }, start: { morale: 60, population: 9000000, prosperity: 60 } },
];

function court(over: Partial<GameState> = {}): GameState {
  return {
    ...enterPalace(createInitialState(1, "承平", REGIONS, TEST_NAMES, TEST_BUILDINGS), "xuanzheng"),
    ...over,
  };
}
function withSoldiers(state: GameState, soldiers: number, training = state.army.training): GameState {
  return { ...state, army: { ...state.army, soldiers, training } };
}
function withPopulation(state: GameState, population: number): GameState {
  const regions: RegionState[] = state.regions.map((r, i) =>
    i === 0 ? { ...r, stats: { ...r.stats, population } } : i === 1 ? { ...r, stats: { ...r.stats, population: 0 } } : r,
  );
  return { ...state, regions };
}
function ok(outcome: { ok: boolean; state: GameState }): GameState {
  if (!outcome.ok) throw new Error("rejected");
  return outcome.state;
}

describe("UC-CORE-024 army state and pool", () => {
  it("UC-CORE-024 a new game has the starting army", () => {
    const state = createInitialState(1, "承平", REGIONS, TEST_NAMES, TEST_BUILDINGS);
    expect(state.army).toEqual({ soldiers: 20000, training: 50, conscriptedTurn: null, drillStartTurn: null });
    expect(state.schemaVersion).toBe(10);
  });
  it("UC-CORE-024 free population subtracts soldiers and 工匠", () => {
    expect(freePopulation(court())).toBe(30480000);
    expect(freePopulation(withSoldiers(court(), 500000))).toBe(30000000);
    expect(freePopulation(withSoldiers(court(), 40000000))).toBe(0);
  });
  it("UC-CORE-024 maxConscript is 1% rounded to the nearest step", () => {
    expect(maxConscript(court())).toBe(300000);
    expect(maxConscript(withSoldiers(withPopulation(court(), 24999), 0))).toBe(0);
  });
  it("UC-CORE-024 conscripting and recruiting share the pool", () => {
    expect(maxRecruit(ok(conscriptSoldiers(court(), 300000)))).toBe(300000);
    const recruited = ok(recruitArtisans(court(), 300000));
    expect(maxConscript(recruited)).toBe(300000);
  });
});

describe("UC-CORE-024 conscriptSoldiers", () => {
  it("UC-CORE-024 conscripting adds soldiers once per 早朝 and dilutes training", () => {
    const before = court();
    expect(canConscript(before)).toBe(true);
    const after = ok(conscriptSoldiers(before, 10000));
    expect(after.army.soldiers).toBe(30000);
    expect(after.army.training).toBe(33);
    expect(after.army.conscriptedTurn).toBe(0);
    expect(after.actionPoint).toBe(before.actionPoint);
    expect(after.rngState).toBe(before.rngState);
    expect(canConscript(after)).toBe(false);
    const again = conscriptSoldiers(after, 10000);
    expect(again).toEqual({ ok: false, reason: "already-used", state: after });
  });
  it("UC-CORE-024 conscripting with no soldiers sets training to 0", () => {
    const state = withSoldiers(court(), 0, 80);
    expect(ok(conscriptSoldiers(state, 10000)).army.training).toBe(0);
  });
  it("UC-CORE-024 conscript rejections in order", () => {
    const map = { ...court(), location: "map" as const };
    const dead = { ...court(), dead: true };
    for (const s of [map, dead]) {
      const out = conscriptSoldiers(s, 10000);
      expect(out).toMatchObject({ ok: false, reason: "not-in-court" });
      expect(out.state).toBe(s);
    }
    const c = court();
    for (const n of [0, 5000, 15000, maxConscript(c) + BALANCE.army.step]) {
      const out = conscriptSoldiers(c, n);
      expect(out).toMatchObject({ ok: false, reason: "invalid-count" });
      expect(out.state).toBe(c);
    }
    const empty = withPopulation(court(), 24999);
    const emptyOut = conscriptSoldiers(withSoldiers(empty, 0), 10000);
    expect(emptyOut).toMatchObject({ ok: false, reason: "invalid-count" });
    const used = ok(conscriptSoldiers(c, 10000));
    const usedOut = conscriptSoldiers(used, 5);
    expect(usedOut).toMatchObject({ ok: false, reason: "already-used" });
    expect(usedOut.state).toBe(used);
  });
});

describe("UC-CORE-024 releaseSoldiers", () => {
  it("UC-CORE-024 releasing is free, repeatable and keeps training", () => {
    const start = court();
    const once = ok(releaseSoldiers(start, 10000));
    const twice = ok(releaseSoldiers(once, 10000));
    expect(twice.army.soldiers).toBe(0);
    expect(twice.army.training).toBe(50);
    expect(twice.nation.treasury).toBe(start.nation.treasury);
  });
  it("UC-CORE-024 release rejections", () => {
    const c = court();
    for (const n of [30000, 0, 5000]) {
      const out = releaseSoldiers(c, n);
      expect(out).toMatchObject({ ok: false, reason: "invalid-count" });
      expect(out.state).toBe(c);
    }
    const map = { ...c, location: "map" as const };
    expect(releaseSoldiers(map, 10000)).toMatchObject({ ok: false, reason: "not-in-court" });
    expect(releaseSoldiers({ ...c, dead: true }, 10000)).toMatchObject({ ok: false, reason: "not-in-court" });
  });
});
