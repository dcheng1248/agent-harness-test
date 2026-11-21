import { describe, expect, it } from "vitest";
import {
  PLAYER_OWNER,
  appointOfficial,
  formLegion,
  isIdleOfficial,
  createInitialState,
  enterPalace,
  listPosts,
  returnToMap,
} from "../index";
import type { AppointRejection, GameState, RegionData } from "../index";
import { TEST_NAMES } from "../testNames";
import { BALANCE, nextRandom } from "../index";
import { drawOfficial } from "./officials";

const start = { morale: 50, population: 100000, prosperity: 50 };
const REGIONS: RegionData[] = [
  { id: "a", owner: PLAYER_OWNER, cell: { x: 0, y: 0 }, start },
  { id: "b", owner: "foreign", cell: { x: 1, y: 0 }, start },
  { id: "c", owner: PLAYER_OWNER, cell: { x: 2, y: 0 }, start },
];
const court = enterPalace(createInitialState(3, "承平", REGIONS, TEST_NAMES), "xuanzheng");

describe("officials", () => {
  it("UC-CORE-004 posts: 中樞, then 六部 尚書/侍郎, then each owned region's 知州/總兵", () => {
    expect(listPosts(court).map((p) => p.id)).toEqual([
      "chancellor", "grand-general", "grand-tutor",
      "personnel-minister", "personnel-vice-minister", "revenue-minister", "revenue-vice-minister",
      "rites-minister", "rites-vice-minister", "war-minister", "war-vice-minister",
      "justice-minister", "justice-vice-minister", "works-minister", "works-vice-minister",
      "a-governor", "a-commander", "c-governor", "c-commander",
    ]);
    expect(listPosts(court)[15]).toEqual({ id: "a-governor", group: "region", region: "a", office: "governor" });
    expect(listPosts(court)[4]).toEqual({ id: "personnel-vice-minister", group: "ministry", department: "personnel", rank: "vice-minister" });
  });

  it("UC-CORE-004 appointing an idle official replaces the holder, who becomes idle", () => {
    const idle = court.officials.find((o) => o.post === null)!;
    const holder = court.officials.find((o) => o.post === "chancellor")!;
    const out = appointOfficial(court, "chancellor", idle.id);
    if (!out.ok) throw new Error(out.reason);
    const by = (id: string) => out.state.officials.find((o) => o.id === id)!;
    expect([by(idle.id).post, by(holder.id).post]).toEqual(["chancellor", null]);
    expect(out.state.officials.filter((o) => o.post === "chancellor")).toHaveLength(1);
    expect(out.state.officials).toHaveLength(court.officials.length);
    expect([out.state.actionPoint, out.state.rngState, out.state.location]).toEqual([court.actionPoint, court.rngState, "xuanzheng"]);
    const again = appointOfficial(out.state, "a-governor", holder.id); // many appointments per 早朝
    expect(again.ok).toBe(true);
  });

  it("UC-CORE-004 rejections leave the state unchanged", () => {
    const idle = court.officials.find((o) => o.post === null)!.id;
    const held = court.officials.find((o) => o.post === "grand-tutor")!.id;
    const cases: [GameState, string, string, AppointRejection][] = [
      [returnToMap(court), "chancellor", idle, "not-in-court"],
      [{ ...court, dead: true }, "chancellor", idle, "not-in-court"],
      [court, "b-governor", idle, "region-not-owned"],
      [court, "nope", idle, "unknown-post"],
      [court, "zz-governor", idle, "unknown-post"],
      [court, "chancellor", "official-999", "unknown-official"],
      [court, "chancellor", held, "not-idle"],
      [court, "grand-tutor", held, "not-idle"],
    ];
    for (const [s, post, official, reason] of cases)
      expect(appointOfficial(s, post, official)).toEqual({ ok: false, reason, state: s });
  });
});

describe("drawOfficial table", () => {
  const whereFirst = (pred: (v: number) => boolean) => {
    for (let r = 0; ; r += 1) if (pred(nextRandom(r).value)) return r;
  };
  it("UC-CORE-018 drawOfficial uses the given ordinary table unless the outlier roll hits", () => {
    const miss = whereFirst((v) => v >= BALANCE.officials.outlierChance);
    const { official } = drawOfficial(miss, "x", TEST_NAMES, new Set(), BALANCE.exam.ordinary);
    for (const [stat, v] of Object.entries(official.stats)) {
      const range = BALANCE.exam.ordinary[stat as keyof typeof BALANCE.exam.ordinary];
      expect(v).toBeGreaterThanOrEqual(range.min);
      expect(v).toBeLessThanOrEqual(range.max);
    }
    const hit = whereFirst((v) => v < BALANCE.officials.outlierChance);
    expect(drawOfficial(hit, "x", TEST_NAMES, new Set(), BALANCE.exam.ordinary)).toEqual(
      drawOfficial(hit, "x", TEST_NAMES, new Set()),
    );
  });
});

describe("UC-CORE-004 賦閑", () => {
  it("UC-CORE-004 a 將軍 is not 賦閑", () => {
    const regions: RegionData[] = [
      { id: "cap", owner: PLAYER_OWNER, capital: true, cell: { x: 0, y: 0 }, start },
      { id: "n", owner: PLAYER_OWNER, cell: { x: 1, y: 0 }, start },
    ];
    const state = enterPalace(createInitialState(3, "承平", regions, TEST_NAMES), "xuanzheng");
    const idle = state.officials.find((o) => o.post === null)!;
    expect(isIdleOfficial(state, idle.id)).toBe(true);
    const out = formLegion(state, regions, idle.id, 10000, "征西");
    if (!out.ok) throw new Error(out.reason);
    expect(isIdleOfficial(out.state, idle.id)).toBe(false);
    expect(isIdleOfficial(out.state, "official-999")).toBe(false);
    const appoint = appointOfficial(out.state, "personnel-minister", idle.id);
    expect(appoint.ok).toBe(false);
    if (!appoint.ok) expect(appoint.reason).toBe("not-idle");
  });
});
