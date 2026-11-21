import { describe, expect, it } from "vitest";
import {
  CATALOG,
  PALACE_IDS,
  canEnterPalace,
  createInitialState,
  enterPalace,
  getAge,
  getHalfSeason,
  getReignYear,
  holdSacrifice,
  isMorningCourt,
  regionTax,
  returnToMap,
  takeAction,
} from "../index";
import type { ActionId, Catalog, GameState, PalaceId } from "../index";
import { TEST_BUILDINGS, TEST_NAMES } from "../testNames";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(1, "承平", [], TEST_NAMES), ...overrides };
}

const baseStats = { health: 50, learning: 30, arts: 30, resolve: 30 };

function act(state: GameState, palace: PalaceId, action: ActionId) {
  const outcome = takeAction(enterPalace(state, palace), action);
  if (!outcome.ok) throw new Error(`rejected: ${outcome.reason}`);
  return outcome;
}

describe("palaces", () => {
  it("UC-CORE-012 palaces in map order; 崇文館 offers study then arts; 御花園 offers nothing", () => {
    expect(PALACE_IDS).toEqual(["chongwen", "yuhuayuan", "yanwu", "yangxin", "xuanzheng"]);
    expect(CATALOG.palaces.xuanzheng.actions).toEqual([]);
    expect(CATALOG.palaces.chongwen.actions).toEqual(["study", "arts"]);
    expect(CATALOG.palaces.yuhuayuan.actions).toEqual([]);
    expect(CATALOG.palaces.yangxin.actions).toEqual(["rest"]);
    const inGarden = enterPalace(makeState(), "yuhuayuan");
    expect(inGarden.location).toBe("yuhuayuan");
    expect(inGarden.actionPoint).toBe(0);
    expect(returnToMap(inGarden).location).toBe("map");
  });
});

describe("宣政殿", () => {
  it("UC-CORE-003 宣政殿 opens only at 朝; leaving moves the clock to 午", () => {
    const dawn = makeState();
    expect(canEnterPalace(dawn, "xuanzheng")).toBe(true);
    const inside = enterPalace(dawn, "xuanzheng");
    expect([inside.location, inside.actionPoint, isMorningCourt(inside)]).toEqual(["xuanzheng", 0, true]);
    expect(takeAction(inside, "study")).toMatchObject({ ok: false, reason: "not-offered" });
    const out = returnToMap(inside);
    expect([out.location, out.actionPoint, out.turn, out.rngState]).toEqual(["map", 1, 0, dawn.rngState]);
    expect(isMorningCourt(out)).toBe(false);
    expect(enterPalace(out, "xuanzheng")).toBe(out); // no second 早朝 this half-season
    for (const actionPoint of [1, 2, 3]) {
      const s = makeState({ actionPoint });
      expect(canEnterPalace(s, "xuanzheng")).toBe(false);
      expect(enterPalace(s, "xuanzheng")).toBe(s);
    }
  });
  it("UC-CORE-003 UC-CORE-023 leaving after 祭祀 moves the clock to 夕", () => {
    const held = holdSacrifice(enterPalace(makeState(), "xuanzheng"));
    if (!held.ok) throw new Error("rejected");
    const out = returnToMap(held.state);
    expect([out.location, out.actionPoint, out.turn]).toEqual(["map", 2, 0]);
    expect(canEnterPalace(out, "xuanzheng")).toBe(false);
    const next = act(out, "chongwen", "study");
    expect(next.state.actionPoint).toBe(3);
    expect(next.turnEnd).toBeNull();
  });
  it("UC-CORE-003 a 祭祀 earlier this year does not spend 午", () => {
    const s = makeState({ turn: 2, rites: { sacrificeTurn: 0 } });
    const out = returnToMap(enterPalace(s, "xuanzheng"));
    expect(out.actionPoint).toBe(1);
  });
  it("UC-CORE-012 other palaces open at every action point; canEnterPalace refuses when dead, off the map or unknown", () => {
    for (const actionPoint of [0, 1, 2, 3])
      for (const p of ["chongwen", "yuhuayuan", "yanwu", "yangxin"] as const)
        expect(canEnterPalace(makeState({ actionPoint }), p)).toBe(true);
    expect(canEnterPalace(makeState({ dead: true }), "chongwen")).toBe(false);
    expect(canEnterPalace(makeState({ location: "chongwen" }), "yanwu")).toBe(false);
    expect(canEnterPalace(makeState(), "nope" as PalaceId)).toBe(false);
    expect(isMorningCourt(makeState({ dead: true, location: "xuanzheng" }))).toBe(false);
  });
});

describe("moving", () => {
  it("UC-CORE-012 moving between the map and palaces uses no action point", () => {
    const start = makeState();
    const inPalace = enterPalace(start, "chongwen");
    expect(inPalace.location).toBe("chongwen");
    expect(inPalace.actionPoint).toBe(0);
    expect(inPalace.rngState).toBe(start.rngState);
    const back = returnToMap(inPalace);
    expect(back).toEqual(start);
    expect(enterPalace(inPalace, "yuhuayuan")).toBe(inPalace);
    const dead = makeState({ dead: true });
    expect(enterPalace(dead, "yuhuayuan")).toBe(dead);
    const deadIn = makeState({ dead: true, location: "yuhuayuan" });
    expect(returnToMap(deadIn)).toBe(deadIn);
  });
});

describe("takeAction", () => {
  it("UC-CORE-012 rejects actions on the map, not offered, not allowed now, or when dead", () => {
    const onMap = makeState();
    expect(takeAction(onMap, "study")).toEqual({
      ok: false,
      reason: "not-in-palace",
      state: onMap,
    });

    const notOffered = enterPalace(makeState(), "yuhuayuan");
    expect(takeAction(notOffered, "study")).toEqual({
      ok: false,
      reason: "not-offered",
      state: notOffered,
    });

    const inChongwen = enterPalace(makeState(), "chongwen");
    const catalog: Catalog = {
      ...CATALOG,
      actions: { ...CATALOG.actions, study: { allowedIn: ["night"] } },
    };
    expect(takeAction(inChongwen, "study", catalog)).toEqual({
      ok: false,
      reason: "not-allowed-now",
      state: inChongwen,
    });

    const dead = makeState({ dead: true, location: "chongwen" });
    expect(takeAction(dead, "study")).toEqual({
      ok: false,
      reason: "dead",
      state: dead,
    });
  });

  it("UC-CORE-012 an action applies its effect with variance, returns to the map and uses the action point", () => {
    const start = makeState({ stats: baseStats });
    const outcome = act(start, "chongwen", "study");
    const learning = outcome.changes.find((c) => c.stat === "learning");
    expect(learning?.amount).toBeGreaterThanOrEqual(2);
    expect(learning?.amount).toBeLessThanOrEqual(4);
    expect(outcome.changes.find((c) => c.stat === "health")?.amount).toBe(-1);
    expect(outcome.state.location).toBe("map");
    expect(outcome.state.actionPoint).toBe(1);
    expect(outcome.state.turnDeltas.learning).toBe(learning?.amount);
    expect(outcome.state.turnDeltas.health).toBe(-1);
    expect(outcome.state.stats.learning).toBe(30 + (learning?.amount ?? 0));
    expect(outcome.turnEnd).toBeNull();
  });

  it("UC-CORE-012 the same state and action give the same result", () => {
    const state = enterPalace(makeState({ stats: baseStats }), "chongwen");
    expect(takeAction(state, "study")).toEqual(takeAction(state, "study"));
  });

  it("UC-CORE-012 stats are clamped and the applied change is reported", () => {
    const high = act(
      makeState({ stats: { ...baseStats, learning: 99 } }),
      "chongwen",
      "study",
    );
    expect(high.state.stats.learning).toBe(100);
    expect(high.changes.find((c) => c.stat === "learning")?.amount).toBe(1);

    const full = act(
      makeState({ stats: { ...baseStats, health: 100 } }),
      "yangxin",
      "rest",
    );
    expect(full.state.stats.health).toBe(100);
    expect(full.changes.find((c) => c.stat === "health")).toBeUndefined();
  });

  it("UC-CORE-012 the 4th action ends the turn", () => {
    let state = makeState({ stats: baseStats });
    const summed = { health: 0, learning: 0, arts: 0, resolve: 0 };
    let last = act(state, "chongwen", "study");
    for (let i = 0; i < 4; i += 1) {
      last = act(state, "chongwen", "study");
      for (const c of last.changes)
        summed[c.stat as keyof typeof summed] += c.amount;
      state = last.state;
    }
    expect(state.turn).toBe(1);
    expect(state.actionPoint).toBe(0);
    expect(getHalfSeason(state)).toBe("spring-late");
    expect(state.turnDeltas).toEqual({
      health: 0,
      learning: 0,
      arts: 0,
      resolve: 0,
    });
    expect(last.turnEnd?.aging).toBe(0);
    const expected = (["health", "learning", "arts", "resolve"] as const)
      .filter((s) => summed[s] !== 0)
      .map((s) => ({ stat: s, amount: summed[s] }));
    expect(last.turnEnd?.totals).toEqual(expected);
  });

  it("UC-CORE-012 8 turns move the year and age forward", () => {
    let state = makeState({ stats: baseStats });
    for (let i = 0; i < 32; i += 1) state = act(state, "yangxin", "rest").state;
    expect(state.turn).toBe(8);
    expect(getReignYear(state)).toBe(2);
    expect(getAge(state)).toBe(17);
    expect(getHalfSeason(state)).toBe("spring-early");
  });
});

describe("aging and death", () => {
  it("UC-CORE-013 no aging before 40", () => {
    const out = act(
      makeState({ stats: baseStats, turn: 191, actionPoint: 3 }),
      "yangxin",
      "rest",
    );
    expect(out.turnEnd?.aging).toBe(0);
  });

  it("UC-CORE-013 aging starts at 40 and grows with age", () => {
    const at40 = act(
      makeState({ stats: baseStats, turn: 192, actionPoint: 3 }),
      "chongwen",
      "arts",
    );
    expect(at40.turnEnd?.aging).toBe(1);
    expect(at40.turnEnd?.totals).toEqual([
      { stat: "health", amount: -1 },
      { stat: "arts", amount: expect.any(Number) },
    ]);
    expect(at40.state.stats.health).toBe(49);
    const at45 = act(
      makeState({ stats: baseStats, turn: 232, actionPoint: 3 }),
      "chongwen",
      "arts",
    );
    expect(at45.turnEnd?.aging).toBe(2);
  });

  it("UC-CORE-013 death when 健康 reaches 0 after an action", () => {
    const out = act(
      makeState({ stats: { ...baseStats, health: 1 } }),
      "chongwen",
      "study",
    );
    expect(out.state.stats.health).toBe(0);
    expect(out.state.dead).toBe(true);
    expect(out.turnEnd).toBeNull();
    expect(out.state.turn).toBe(0);
    expect(out.state.actionPoint).toBe(0);
    const later = takeAction(enterPalace(out.state, "chongwen"), "arts");
    expect(later.ok).toBe(false);
    if (!later.ok) expect(later.reason).toBe("dead");
  });

  it("UC-CORE-013 death from aging at the end of a turn", () => {
    const out = act(
      makeState({
        stats: { ...baseStats, health: 1 },
        turn: 192,
        actionPoint: 3,
      }),
      "chongwen",
      "arts",
    );
    expect(out.state.dead).toBe(true);
    expect(out.turnEnd?.aging).toBe(1);
    expect(out.state.turn).toBe(192);
  });
});

describe("economy at turn end", () => {
  const FIXTURE = [
    {
      id: "a",
      owner: "player",
      cell: { x: 0, y: 0 },
      start: { morale: 60, population: 5000000, prosperity: 60 },
    },
  ];

  it("UC-CORE-015 the 4th action settles the economy into the next half-season", () => {
    let state = createInitialState(1, "承平", FIXTURE, TEST_NAMES);
    let last = act(state, "yangxin", "rest");
    state = last.state;
    for (let i = 0; i < 3; i += 1) {
      last = act(state, "yangxin", "rest");
      state = last.state;
    }
    expect(last.turnEnd?.economy.upkeep).toBe(120000);
    expect(last.turnEnd?.economy.taxIncome).toBe(0);
    expect(last.turnEnd?.economy.soldierWages).toBe(10000);
    expect(state.nation.treasury).toBe(370000);
  });

  it("UC-CORE-015 the summary of 夏下 reports the 秋上 tax", () => {
    let state = createInitialState(1, "承平", FIXTURE, TEST_NAMES);
    let last = act(state, "yangxin", "rest");
    state = last.state;
    for (let i = 1; i < 16; i += 1) {
      last = act(state, "yangxin", "rest");
      state = last.state;
    }
    expect(getHalfSeason(state)).toBe("autumn-early");
    expect(last.turnEnd?.economy.taxIncome).toBeGreaterThan(0);
  });

  it("UC-CORE-013 dying of age skips the economy", () => {
    const state = makeState({
      ...createInitialState(1, "承平", FIXTURE, TEST_NAMES),
      stats: { ...baseStats, health: 1 },
      turn: 399,
      actionPoint: 3,
    });
    const out = act(state, "yanwu", "riding");
    expect(out.state.dead).toBe(true);
    expect(out.turnEnd?.economy).toEqual({
      taxIncome: 0,
      upkeep: 0,
      wages: 0,
      soldierWages: 0,
      regionChanges: [],
    });
    expect(out.turnEnd?.completed).toEqual([]);
    expect(out.state.nation).toEqual(state.nation);
    expect(out.state.regions).toEqual(state.regions);
  });
});

describe("works at turn end", () => {
  const FIXTURE = [
    { id: "a", owner: "player", cell: { x: 0, y: 0 }, start: { morale: 60, population: 5000000, prosperity: 60 } },
  ];
  function worked(over: Partial<GameState> = {}): GameState {
    const base = createInitialState(1, "承平", FIXTURE, TEST_NAMES, TEST_BUILDINGS);
    return {
      ...base,
      actionPoint: 3,
      works: {
        artisans: 100000,
        recruitedTurn: null,
        buildings: [
          { id: "small", required: 30000, progress: 0, assigned: 30000 },
          { id: "large", required: 100000, progress: 0, assigned: 20000 },
        ],
      },
      ...over,
    };
  }

  it("UC-CORE-020 progress is added, completions reported and wages paid", () => {
    const out = act(worked(), "yangxin", "rest");
    expect(out.turnEnd?.completed).toEqual(["small"]);
    expect(out.turnEnd?.economy.wages).toBe(50000);
    expect(out.state.works.buildings).toEqual([
      { id: "small", required: 30000, progress: 30000, assigned: 0 },
      { id: "large", required: 100000, progress: 20000, assigned: 20000 },
    ]);
  });

  it("UC-CORE-020 dying of age pays no wages and makes no progress", () => {
    const state = worked({ stats: { ...baseStats, health: 1 }, turn: 399 });
    const out = act(state, "yanwu", "riding");
    expect(out.state.dead).toBe(true);
    expect(out.turnEnd?.completed).toEqual([]);
    expect(out.turnEnd?.economy.wages).toBe(0);
    expect(out.state.works.buildings).toEqual(state.works.buildings);
  });
});

describe("tax level in the turn loop", () => {
  const FIXTURE = [
    { id: "a", owner: "player", cell: { x: 0, y: 0 }, start: { morale: 60, population: 5000000, prosperity: 60 } },
    { id: "f", owner: "foreign", cell: { x: 1, y: 0 }, start: { morale: 60, population: 5000000, prosperity: 60 } },
  ];
  function fourActions(start: GameState) {
    let state = start;
    let last = act(state, "yangxin", "rest");
    state = last.state;
    for (let i = 0; i < 3; i += 1) {
      last = act(state, "yangxin", "rest");
      state = last.state;
    }
    return { last, state };
  }

  it("UC-CORE-021 the turn loop collects at the current level", () => {
    const start = {
      ...createInitialState(1, "承平", FIXTURE, TEST_NAMES),
      turn: 3,
      revenue: { taxLevel: "heavy" as const, leviedTurn: null },
    };
    const { last, state } = fourActions(start);
    expect(last.turnEnd?.economy.taxIncome).toBe(
      start.regions.filter((r) => r.owner === "player").reduce((s, r) => s + regionTax(r.stats, "heavy"), 0),
    );
    expect(state.regions[0]?.stats.morale).toBe(59);
    expect(state.regions[1]?.stats.morale).toBe(60);
  });

  it("UC-CORE-021 the turn loop moves 民心 by the level outside collections", () => {
    const start = {
      ...createInitialState(1, "承平", FIXTURE, TEST_NAMES),
      turn: 1,
      revenue: { taxLevel: "very-light" as const, leviedTurn: null },
    };
    const { last, state } = fourActions(start);
    expect(last.turnEnd?.economy.taxIncome).toBe(0);
    expect(state.regions[0]?.stats.morale).toBe(62);
  });
});
