import { describe, expect, it } from "vitest";
import {
  EMPEROR_STAT_IDS,
  PLAYER_OWNER,
  STAT_IDS,
  STAT_REGISTRY,
  createInitialState,
  getActionPointId,
  getAge,
  getHalfSeason,
  getReignYear,
} from "../index";
import type { RegionData } from "../index";

const FIXTURE: RegionData[] = [
  {
    id: "a",
    owner: PLAYER_OWNER,
    adjacent: ["b"],
    start: { morale: 60, population: 1000000, prosperity: 50 },
  },
  {
    id: "b",
    owner: "foreign",
    adjacent: ["a"],
    start: { morale: 40, population: 500000, prosperity: 30 },
  },
];

describe("initial state", () => {
  it("UC-CORE-001 same seed gives the same starting state", () => {
    expect(createInitialState(7, "承平", FIXTURE)).toEqual(
      createInitialState(7, "承平", FIXTURE),
    );
  });

  it("UC-CORE-001 starting stats add up to the budget and stay within bounds", () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const { stats } = createInitialState(seed, "承平", FIXTURE);
      expect(EMPEROR_STAT_IDS.reduce((sum, id) => sum + stats[id], 0)).toBe(
        150,
      );
      for (const id of EMPEROR_STAT_IDS) {
        expect(stats[id]).toBeGreaterThanOrEqual(15);
        expect(stats[id]).toBeLessThanOrEqual(70);
      }
    }
  });

  it("UC-CORE-001 starting stats force tradeoffs across seeds", () => {
    let found = false;
    for (let seed = 0; seed < 500; seed += 1) {
      const values = EMPEROR_STAT_IDS.map(
        (id) => createInitialState(seed, "承平", FIXTURE).stats[id],
      );
      if (Math.max(...values) >= 50 && Math.min(...values) <= 25) found = true;
    }
    expect(found).toBe(true);
  });

  it("UC-CORE-001 initial state starts at 元年春上, 朝, age 16, on the map", () => {
    const state = createInitialState(7, "承平", FIXTURE);
    expect(state).toMatchObject({
      schemaVersion: 3,
      seed: 7,
      eraName: "承平",
      turn: 0,
      actionPoint: 0,
      location: "map",
      dead: false,
      turnDeltas: { health: 0, learning: 0, arts: 0, resolve: 0 },
    });
    expect([
      getAge(state),
      getReignYear(state),
      getHalfSeason(state),
      getActionPointId(state),
    ]).toEqual([16, 1, "spring-early", "dawn"]);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("derives calendar values from the turn", () => {
    const state = {
      ...createInitialState(7, "承平", FIXTURE),
      turn: 17,
      actionPoint: 2,
    };
    expect([
      getAge(state),
      getReignYear(state),
      getHalfSeason(state),
      getActionPointId(state),
    ]).toEqual([18, 3, "spring-late", "dusk"]);
  });

  it("UC-CORE-014 copies region data into the state in order, keeping owners", () => {
    const state = createInitialState(7, "承平", FIXTURE);
    expect(state.regions).toEqual([
      {
        id: "a",
        owner: "player",
        stats: { morale: 60, population: 1000000, prosperity: 50 },
      },
      {
        id: "b",
        owner: "foreign",
        stats: { morale: 40, population: 500000, prosperity: 30 },
      },
    ]);
    expect(state.nation).toEqual({ treasury: 500000 });
    expect(state.schemaVersion).toBe(3);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("UC-CORE-014 changing the region data afterwards does not change the state", () => {
    const data: RegionData[] = [
      { ...FIXTURE[0]!, start: { ...FIXTURE[0]!.start } },
    ];
    const state = createInitialState(7, "承平", data);
    data[0]!.start.morale = 1;
    expect(state.regions[0]?.stats.morale).toBe(60);
  });

  it("UC-CORE-014 region data does not change the emperor stats or rngState", () => {
    const a = createInitialState(7, "承平", []);
    const b = createInitialState(7, "承平", FIXTURE);
    expect([b.stats, b.rngState]).toEqual([a.stats, a.rngState]);
  });

  it("UC-CORE-014 the stat registry lists emperor, nation and region stats with their bounds", () => {
    expect(STAT_REGISTRY.map((s) => s.id)).toEqual([...STAT_IDS]);
    expect([...STAT_IDS]).toEqual([
      "health",
      "learning",
      "arts",
      "resolve",
      "treasury",
      "morale",
      "population",
      "prosperity",
    ]);
    const by = (id: string) => STAT_REGISTRY.find((s) => s.id === id);
    for (const id of ["health", "learning", "arts", "resolve"]) {
      expect([by(id)?.min, by(id)?.max, by(id)?.owner]).toEqual([
        0,
        100,
        "emperor",
      ]);
    }
    expect([
      by("treasury")?.min,
      by("treasury")?.max,
      by("treasury")?.owner,
    ]).toEqual([-Infinity, Infinity, "nation"]);
    expect([by("morale")?.min, by("morale")?.max, by("morale")?.owner]).toEqual(
      [0, 100, "region"],
    );
    expect([
      by("prosperity")?.min,
      by("prosperity")?.max,
      by("prosperity")?.owner,
    ]).toEqual([0, 100, "region"]);
    expect([
      by("population")?.min,
      by("population")?.max,
      by("population")?.owner,
    ]).toEqual([0, Infinity, "region"]);
  });
});
