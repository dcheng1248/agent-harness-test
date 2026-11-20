import { describe, expect, it } from "vitest";
import {
  PLAYER_OWNER,
  appointOfficial,
  createInitialState,
  enterPalace,
  listPosts,
  returnToMap,
} from "../index";
import type { AppointRejection, GameState, RegionData } from "../index";
import { TEST_NAMES } from "../testNames";

const start = { morale: 50, population: 100000, prosperity: 50 };
const REGIONS: RegionData[] = [
  { id: "a", owner: PLAYER_OWNER, adjacent: ["b"], start },
  { id: "b", owner: "foreign", adjacent: ["a", "c"], start },
  { id: "c", owner: PLAYER_OWNER, adjacent: ["b"], start },
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
