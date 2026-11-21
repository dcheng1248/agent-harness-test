import { describe, expect, it } from "vitest";
import {
  BALANCE,
  canHoldSacrifice,
  createInitialState,
  enterPalace,
  holdSacrifice,
  returnToMap,
  sacrificedThisYear,
  takeAction,
} from "../index";
import type { GameState } from "../index";
import { TEST_BUILDINGS, TEST_NAMES } from "../testNames";

const REGIONS = [
  { id: "a", owner: "player", cell: { x: 0, y: 0 }, start: { morale: 60, population: 20000000, prosperity: 60 } },
  { id: "b", owner: "player", cell: { x: 1, y: 0 }, start: { morale: 60, population: 10500000, prosperity: 60 } },
  { id: "c", owner: "foreign", cell: { x: 2, y: 0 }, start: { morale: 60, population: 9000000, prosperity: 60 } },
];

function base(): GameState {
  return createInitialState(1, "承平", REGIONS, TEST_NAMES, TEST_BUILDINGS);
}
function court(over: Partial<GameState> = {}): GameState {
  return { ...enterPalace(base(), "xuanzheng"), ...over };
}
function ok<T extends { ok: boolean; state: GameState }>(o: T): GameState {
  if (!o.ok) throw new Error("rejected");
  return o.state;
}
const morales = (s: GameState) => s.regions.map((r) => r.stats.morale);

describe("holdSacrifice", () => {
  it("UC-CORE-023 holdSacrifice costs 國庫 and records the turn", () => {
    const start = court();
    const end = ok(holdSacrifice(start));
    expect(end.nation.treasury).toBe(start.nation.treasury - BALANCE.rites.sacrificeCost);
    expect(end.rites.sacrificeTurn).toBe(0);
    expect(end.stats).toEqual(start.stats);
    expect(end.regions).toEqual(start.regions);
    expect(end.officials).toEqual(start.officials);
    expect(end.rngState).toBe(start.rngState);
    expect(end.actionPoint).toBe(0);
    expect(end.location).toBe("xuanzheng");
  });

  it("UC-CORE-023 may push 國庫 below 0", () => {
    const end = ok(holdSacrifice(court({ nation: { treasury: 10000 } })));
    expect(end.nation.treasury).toBe(10000 - BALANCE.rites.sacrificeCost);
  });

  it("UC-CORE-023 once per reign year", () => {
    const first = ok(holdSacrifice(court()));
    expect(canHoldSacrifice(first)).toBe(false);
    const again = holdSacrifice(first);
    expect(again).toEqual({ ok: false, reason: "already-held", state: first });
    expect(again.state).toBe(first);
    const cases: [number, number, boolean][] = [
      [0, 7, false],
      [7, 8, true],
      [8, 15, false],
      [3, 7, false],
      [3, 11, true],
      [3, 16, true],
    ];
    for (const [s, t, can] of cases) {
      const state = court({ turn: t, rites: { sacrificeTurn: s } });
      expect(canHoldSacrifice(state)).toBe(can);
      expect(sacrificedThisYear(state)).toBe(!can);
    }
    expect(sacrificedThisYear(court({ turn: 5, rites: { sacrificeTurn: null } }))).toBe(false);
  });

  it("UC-CORE-023 rejections", () => {
    const map = base();
    expect(holdSacrifice(map)).toMatchObject({ ok: false, reason: "not-in-court" });
    const dead = court({ dead: true });
    expect(holdSacrifice(dead)).toMatchObject({ ok: false, reason: "not-in-court" });
    const heldOut = { ...map, rites: { sacrificeTurn: 0 } };
    expect(holdSacrifice(heldOut)).toMatchObject({ ok: false, reason: "not-in-court" });
    for (const s of [map, dead, heldOut]) expect(canHoldSacrifice(s)).toBe(false);
  });

  it("UC-CORE-023 bankruptcy applies as usual", () => {
    const run = (hold: boolean, treasury: number): GameState => {
      let s = court({ nation: { treasury } });
      if (hold) s = ok(holdSacrifice(s));
      s = returnToMap(s);
      for (let i = 0; i < 4 && s.turn === 0; i += 1) {
        s = ok(takeAction(enterPalace(s, "yangxin"), "rest"));
      }
      return s;
    };
    const held = run(true, 10000);
    const plain = run(false, 10000 + 1_000_000);
    expect(held.turn).toBe(1);
    expect(plain.turn).toBe(1);
    held.regions.forEach((r, i) => {
      if (r.owner !== "player") return;
      expect(r.stats.morale).toBeLessThanOrEqual((plain.regions[i]?.stats.morale ?? 0) - BALANCE.bankruptcyMoraleLoss);
    });
    expect(morales(held).length).toBe(3);
  });
});
