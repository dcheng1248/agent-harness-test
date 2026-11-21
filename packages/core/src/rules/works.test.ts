import { describe, expect, it } from "vitest";
import {
  assignArtisans,
  buildingStatus,
  canRecruit,
  createInitialState,
  enterPalace,
  freePopulation,
  halfSeasonsToFinish,
  idleArtisans,
  maxRecruit,
  recruitArtisans,
  releaseArtisans,
} from "../index";
import type { GameState, RegionState, WorksOutcome } from "../index";
import type { BuildingState } from "../model/works";
import { advanceBuildings } from "../model/works";
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
function withArtisans(state: GameState, artisans: number, assigned: Record<string, number> = {}): GameState {
  return {
    ...state,
    works: {
      ...state.works,
      artisans,
      buildings: state.works.buildings.map((b) => ({ ...b, assigned: assigned[b.id] ?? 0 })),
    },
  };
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

describe("UC-CORE-019 freePopulation and maxRecruit", () => {
  it("UC-CORE-019 free population is player 人口 minus 工匠, never negative", () => {
    expect(freePopulation(court())).toBe(30500000);
    expect(freePopulation(withArtisans(court(), 500000))).toBe(30000000);
    expect(freePopulation(withArtisans(court(), 40000000))).toBe(0);
  });
  it("UC-CORE-019 maxRecruit is 1% rounded to the nearest step, halves up", () => {
    expect(maxRecruit(court())).toBe(310000);
    expect(maxRecruit(withPopulation(court(), 30499999))).toBe(300000);
    expect(maxRecruit(withPopulation(court(), 4999))).toBe(0);
  });
});

describe("UC-CORE-019 canRecruit", () => {
  it("UC-CORE-019 is true in court", () => {
    expect(canRecruit(court())).toBe(true);
  });
  it("UC-CORE-019 is false on the map, when dead, after use, or with nothing to recruit", () => {
    expect(canRecruit({ ...court(), location: "map" })).toBe(false);
    expect(canRecruit(court({ dead: true }))).toBe(false);
    const used = ok(recruitArtisans(court(), 10000));
    expect(canRecruit(used)).toBe(false);
    expect(canRecruit(withPopulation(court(), 4999))).toBe(false);
  });
  it("UC-CORE-019 is true again the next turn", () => {
    const used = ok(recruitArtisans(court(), 10000));
    expect(canRecruit({ ...used, turn: used.turn + 1 })).toBe(true);
  });
});

describe("UC-CORE-019 recruitArtisans", () => {
  it("UC-CORE-019 adds 工匠, stamps the turn and keeps the rng", () => {
    const s = court();
    const next = ok(recruitArtisans(s, 310000));
    expect(next.works.artisans).toBe(310000);
    expect(next.works.recruitedTurn).toBe(s.turn);
    expect(next.rngState).toBe(s.rngState);
  });
  it("UC-CORE-019 rejects on the map", () => {
    const s = { ...court(), location: "map" as const };
    const out = recruitArtisans(s, 10000);
    expect(out).toEqual({ ok: false, reason: "not-in-court", state: s });
    expect(out.state).toBe(s);
  });
  it("UC-CORE-019 rejects a second use", () => {
    const used = ok(recruitArtisans(court(), 10000));
    const out = recruitArtisans(used, 10000);
    expect(out.ok === false && out.reason).toBe("already-used");
    expect(out.state).toBe(used);
  });
  it("UC-CORE-019 rejects invalid counts", () => {
    const s = court();
    for (const count of [0, 5000, 15000, 320000, -10000, NaN]) {
      const out = recruitArtisans(s, count);
      expect(out.ok === false && out.reason).toBe("invalid-count");
      expect(out.state).toBe(s);
    }
  });
});

describe("UC-CORE-019 releaseArtisans", () => {
  const base = () => withArtisans(court(), 100000, { small: 30000 });
  it("UC-CORE-019 releases idle 工匠 only", () => {
    const next = ok(releaseArtisans(base(), 70000));
    expect(next.works.artisans).toBe(30000);
    expect(next.works.buildings[0]?.assigned).toBe(30000);
  });
  it("UC-CORE-019 rejects invalid counts", () => {
    const s = base();
    for (const count of [80000, 0, 5000]) {
      const out = releaseArtisans(s, count);
      expect(out.ok === false && out.reason).toBe("invalid-count");
      expect(out.state).toBe(s);
    }
  });
  it("UC-CORE-019 rejects on the map", () => {
    const out = releaseArtisans({ ...base(), location: "map" }, 10000);
    expect(out.ok === false && out.reason).toBe("not-in-court");
  });
  it("UC-CORE-019 can be used twice in one 早朝", () => {
    const next = ok(releaseArtisans(ok(releaseArtisans(base(), 10000)), 10000));
    expect(next.works.artisans).toBe(80000);
  });
});

describe("UC-CORE-020 assignArtisans", () => {
  const base = () => withArtisans(court(), 100000);
  it("UC-CORE-020 assigns idle 工匠 to buildings and re-assigns", () => {
    let s = ok(assignArtisans(base(), "small", 30000));
    s = ok(assignArtisans(s, "large", 70000));
    expect(idleArtisans(s)).toBe(0);
    const over = assignArtisans(s, "large", 80000);
    expect(over.ok === false && over.reason).toBe("not-enough-idle");
    expect(over.state).toBe(s);
    s = ok(assignArtisans(s, "large", 50000));
    expect(idleArtisans(s)).toBe(20000);
  });
  it("UC-CORE-020 assigning 0 keeps progress", () => {
    const s = base();
    const progressed: GameState = {
      ...s,
      works: { ...s.works, buildings: s.works.buildings.map((b) => ({ ...b, progress: 10000, assigned: 10000 })) },
    };
    const next = ok(assignArtisans(progressed, "small", 0));
    expect(next.works.buildings[0]).toMatchObject({ progress: 10000, assigned: 0 });
  });
  it("UC-CORE-020 rejects in order", () => {
    const s = base();
    const reason = (o: WorksOutcome) => (o.ok ? "ok" : o.reason);
    expect(reason(assignArtisans({ ...s, location: "map" }, "nope", -1))).toBe("not-in-court");
    expect(reason(assignArtisans(s, "nope", 10000))).toBe("unknown-building");
    const done: GameState = {
      ...s,
      works: { ...s.works, buildings: s.works.buildings.map((b) => ({ ...b, progress: b.required })) },
    };
    expect(reason(assignArtisans(done, "small", -1))).toBe("completed");
    for (const count of [-10000, 5000, 1.5]) expect(reason(assignArtisans(s, "small", count))).toBe("invalid-count");
  });
});

describe("UC-CORE-020 buildingStatus and halfSeasonsToFinish", () => {
  const b = (progress: number, assigned: number, required = 100000): BuildingState => ({
    id: "x",
    required,
    progress,
    assigned,
  });
  it("UC-CORE-020 status", () => {
    expect(buildingStatus(b(0, 0))).toBe("not-started");
    expect(buildingStatus(b(0, 10000))).toBe("in-progress");
    expect(buildingStatus(b(10000, 0))).toBe("in-progress");
    expect(buildingStatus(b(100000, 0))).toBe("completed");
  });
  it("UC-CORE-020 half-seasons to finish", () => {
    expect(halfSeasonsToFinish(b(30000, 20000))).toBe(4);
    expect(halfSeasonsToFinish(b(30000, 0))).toBeNull();
    expect(halfSeasonsToFinish(b(100000, 0))).toBeNull();
  });
});

describe("UC-CORE-020 advanceBuildings", () => {
  it("UC-CORE-020 adds assignment, caps at required and reports completions in order", () => {
    const input: BuildingState[] = [
      { id: "a", required: 30000, progress: 20000, assigned: 20000 },
      { id: "b", required: 100000, progress: 0, assigned: 10000 },
      { id: "c", required: 20000, progress: 10000, assigned: 10000 },
    ];
    const copy = JSON.parse(JSON.stringify(input));
    const out = advanceBuildings(input);
    expect(out.completed).toEqual(["a", "c"]);
    expect(out.buildings).toEqual([
      { id: "a", required: 30000, progress: 30000, assigned: 0 },
      { id: "b", required: 100000, progress: 10000, assigned: 10000 },
      { id: "c", required: 20000, progress: 20000, assigned: 0 },
    ]);
    expect(input).toEqual(copy);
  });
});
