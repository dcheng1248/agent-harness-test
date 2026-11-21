import { describe, expect, it } from "vitest";
import {
  BALANCE,
  EMPEROR_STAT_IDS,
  OFFICIAL_STAT_IDS,
  PLAYER_OWNER,
  STAT_IDS,
  STAT_REGISTRY,
  createInitialState,
  getActionPointId,
  getAge,
  getHalfSeason,
  getReignYear,
  listPosts,
} from "../index";
import type { RegionData } from "../index";
import { TEST_NAMES } from "../testNames";

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
    expect(createInitialState(7, "承平", FIXTURE, TEST_NAMES)).toEqual(
      createInitialState(7, "承平", FIXTURE, TEST_NAMES),
    );
  });

  it("UC-CORE-001 starting stats add up to the budget and stay within bounds", () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const { stats } = createInitialState(seed, "承平", FIXTURE, TEST_NAMES);
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
        (id) => createInitialState(seed, "承平", FIXTURE, TEST_NAMES).stats[id],
      );
      if (Math.max(...values) >= 50 && Math.min(...values) <= 25) found = true;
    }
    expect(found).toBe(true);
  });

  it("UC-CORE-001 initial state starts at 元年春上, 朝, age 16, on the map", () => {
    const state = createInitialState(7, "承平", FIXTURE, TEST_NAMES);
    expect(state).toMatchObject({
      schemaVersion: 6,
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
      ...createInitialState(7, "承平", FIXTURE, TEST_NAMES),
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
    const state = createInitialState(7, "承平", FIXTURE, TEST_NAMES);
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
    expect(state.schemaVersion).toBe(6);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("UC-CORE-014 changing the region data afterwards does not change the state", () => {
    const data: RegionData[] = [
      { ...FIXTURE[0]!, start: { ...FIXTURE[0]!.start } },
    ];
    const state = createInitialState(7, "承平", data, TEST_NAMES);
    data[0]!.start.morale = 1;
    expect(state.regions[0]?.stats.morale).toBe(60);
  });

  it("UC-CORE-014 region data does not change the emperor stats", () => {
    const a = createInitialState(7, "承平", [], TEST_NAMES);
    const b = createInitialState(7, "承平", FIXTURE, TEST_NAMES);
    expect(b.stats).toEqual(a.stats);
  });

  it("UC-CORE-004 a new game fills every post and adds the idle officials", () => {
    const s = createInitialState(7, "承平", FIXTURE, TEST_NAMES);
    const posts = listPosts(s);
    expect(posts).toHaveLength(17);
    expect(s.officials).toHaveLength(47);
    expect(s.officials.map((o) => o.id)).toEqual(Array.from({ length: 47 }, (_, i) => `official-${i + 1}`));
    expect(s.officials.slice(0, 17).map((o) => o.post)).toEqual(posts.map((p) => p.id));
    expect(s.officials.slice(17).every((o) => o.post === null)).toBe(true);
    expect(new Set(s.officials.map((o) => o.name)).size).toBe(47);
    for (const o of s.officials) expect(TEST_NAMES.surnames.some((x) => o.name.startsWith(x) && TEST_NAMES.givenNames.includes(o.name.slice(x.length)))).toBe(true);
    expect(s.officials.every((o) => o.notable === null)).toBe(true);
    expect(s.recommendation).toBeNull();
    expect(s.exam).toBeNull(); // UC-CORE-018
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it("UC-CORE-004 official stats stay in the outlier bounds, and outliers occur", () => {
    let outside = false;
    for (let seed = 0; seed < 40; seed += 1)
      for (const o of createInitialState(seed, "承平", FIXTURE, TEST_NAMES).officials)
        for (const id of OFFICIAL_STAT_IDS) {
          const { min, max } = BALANCE.officials.outlier[id];
          expect(o.stats[id]).toBeGreaterThanOrEqual(min);
          expect(o.stats[id]).toBeLessThanOrEqual(max);
          const ord = BALANCE.officials.ordinary[id];
          if (o.stats[id] < ord.min || o.stats[id] > ord.max) outside = true;
        }
    expect(outside).toBe(true);
  });

  it("UC-CORE-004 reserved names are never generated; a pool too small throws", () => {
    const reserved = TEST_NAMES.surnames.slice(0, 4).flatMap((s) => TEST_NAMES.givenNames.map((g) => s + g)); // 40 names
    for (let seed = 0; seed < 20; seed += 1) {
      const names = createInitialState(seed, "承平", FIXTURE, { ...TEST_NAMES, reserved }).officials.map((o) => o.name);
      expect(names.some((n) => reserved.includes(n))).toBe(false);
    }
    const tiny = { surnames: TEST_NAMES.surnames.slice(0, 5), givenNames: TEST_NAMES.givenNames.slice(0, 5), reserved: [] };
    expect(() => createInitialState(7, "承平", FIXTURE, tiny)).toThrow();
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
      "administration",
      "military",
      "ambition",
      "loyalty",
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
    for (const id of ["administration", "military", "ambition", "loyalty"]) {
      expect([by(id)?.min, by(id)?.max, by(id)?.owner]).toEqual([0, 100, "official"]);
    }
  });
});
