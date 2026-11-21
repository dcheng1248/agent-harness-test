import { describe, expect, it } from "vitest";
import {
  conscriptSoldiers,
  createInitialState,
  drawLegionNameSuggestions,
  enterPalace,
  formLegion,
  freePopulation,
  maxConscript,
  maxLegionSoldiers,
  maxRecruit,
  returnToMap,
  startDrill,
  canFormLegion,
} from "../index";
import type { GameState, Legion, RegionData } from "../index";
import { TEST_BUILDINGS, TEST_NAMES } from "../testNames";

const R = (id: string, x: number, y: number, owner = "player", capital = false): RegionData => ({
  id,
  owner,
  capital,
  cell: { x, y },
  start: { morale: 60, population: 10000000, prosperity: 60 },
});
const REGIONS = [
  R("cap", 0, 0, "player", true),
  R("a", 1, 0),
  R("b", 2, 0),
  R("c", 0, 1),
  R("g", 1, 1),
  R("d", 2, 1),
  R("f", 3, 0, "foreign"),
  R("island", 0, 3),
];

function court(regions: readonly RegionData[] = REGIONS): GameState {
  return enterPalace(createInitialState(1, "承平", regions, TEST_NAMES, TEST_BUILDINGS), "xuanzheng");
}
const idle = (s: GameState) => s.officials.find((o) => o.post === null)!;
function ok(o: { ok: boolean; state: GameState }): GameState {
  if (!o.ok) throw new Error("rejected");
  return o.state;
}
function form(s: GameState, count = 10000, name = "征西", general = idle(s).id): GameState {
  return ok(formLegion(s, REGIONS, general, count, name));
}
function legion(over: Partial<Legion>): Legion {
  return { id: "legion-9", name: "平北", general: "x", soldiers: 10000, training: 50, region: "a", movedTurn: null, route: null, ...over };
}
function moveOut(s: GameState): GameState {
  return { ...s, army: { ...s.army, legions: s.army.legions.map((l) => ({ ...l, region: "a" })) } };
}

describe("UC-CORE-026 組建軍團", () => {
  it("UC-CORE-026 a new game has no 軍團", () => {
    const s = createInitialState(1, "承平", REGIONS, TEST_NAMES, TEST_BUILDINGS);
    expect(s.army.legions).toEqual([]);
    expect(s.army.legionsFormed).toBe(0);
    expect(s.schemaVersion).toBe(11);
  });
  it("UC-CORE-026 forming takes soldiers from the pool into a 軍團 in the capital", () => {
    const before = court();
    const g = idle(before);
    const after = form(before, 10000, "征西", g.id);
    expect(after.army.soldiers).toBe(10000);
    expect(after.army.training).toBe(50);
    expect(after.army.legionsFormed).toBe(1);
    expect(after.army.legions).toEqual([
      { id: "legion-1", name: "征西", general: g.id, soldiers: 10000, training: 50, region: "cap", movedTurn: null, route: null },
    ]);
    expect(after.actionPoint).toBe(before.actionPoint);
    expect(after.rngState).toBe(before.rngState);
  });
  it("UC-CORE-026 the 軍團 keeps the training it was formed with", () => {
    let s = form(court());
    s = ok(conscriptSoldiers(s, 10000));
    expect(s.army.training).toBeLessThan(50);
    s = ok(startDrill(s));
    expect(s.army.legions[0]?.training).toBe(50);
    expect(s.army.legions[0]?.soldiers).toBe(10000);
  });
  it("UC-CORE-026 maxLegionSoldiers is the pool capped per 軍團", () => {
    const s = court();
    expect(maxLegionSoldiers(s)).toBe(20000);
    expect(maxLegionSoldiers({ ...s, army: { ...s.army, soldiers: 500000 } })).toBe(100000);
    expect(maxLegionSoldiers({ ...s, army: { ...s.army, soldiers: 0 } })).toBe(0);
  });
  it("UC-CORE-026 forming leaves free population unchanged", () => {
    const before = court();
    const after = form(before);
    expect(freePopulation(after)).toBe(freePopulation(before));
    expect(maxConscript(after)).toBe(maxConscript(before));
    expect(maxRecruit(after)).toBe(maxRecruit(before));
    const extra = { ...before, army: { ...before.army, legions: [legion({})].map((l) => ({ ...l, soldiers: 30000 })) } };
    expect(freePopulation(extra)).toBe(freePopulation(before) - 30000);
  });
  it("UC-CORE-026 rejections in order", () => {
    const s = court();
    const g = idle(s).id;
    const rej = (st: GameState, regions: readonly RegionData[], gen: string, n: number, name: string) => {
      const o = formLegion(st, regions, gen, n, name);
      expect(o.ok).toBe(false);
      expect(o.state).toBe(st);
      return o.ok ? null : o.reason;
    };
    const onMap = returnToMap(s);
    expect(rej(onMap, REGIONS, g, 10000, "征西")).toBe("not-in-court");
    expect(rej(s, REGIONS.slice(1), g, 10000, "征西")).toBe("no-capital");
    const formed = form(s);
    expect(rej(formed, REGIONS, idle(formed).id, 10000, "bad")).toBe("capital-occupied");
    const returning = { ...formed, army: { ...formed.army, legions: formed.army.legions.map((l) => ({ ...l, route: ["cap"] })) } };
    const other = returning.officials.find((o) => o.post === null && o.id !== formed.army.legions[0]!.general)!;
    ok(formLegion(returning, REGIONS, other.id, 10000, "平北"));
    expect(rej(s, REGIONS, "official-999", 10000, "征西")).toBe("unknown-official");
    const posted = s.officials.find((o) => o.post !== null)!;
    expect(rej(s, REGIONS, posted.id, 10000, "征西")).toBe("not-idle");
    const away = moveOut(formed);
    expect(rej(away, REGIONS, formed.army.legions[0]!.general, 10000, "平北")).toBe("not-idle");
    for (const n of [0, 5000, 30000]) expect(rej(s, REGIONS, g, n, "征西")).toBe("invalid-count");
    const big = { ...s, army: { ...s.army, soldiers: 500000 } };
    expect(rej(big, REGIONS, g, 110000, "征西")).toBe("invalid-count");
    for (const name of ["征", "征西軍", "ab", " 征西"]) expect(rej(s, REGIONS, g, 10000, name)).toBe("invalid-name");
    expect(rej(away, REGIONS, away.officials.find((o) => o.post === null && o.id !== away.army.legions[0]!.general)!.id, 10000, "征西")).toBe("name-taken");
  });
  it("UC-CORE-026 canFormLegion", () => {
    const s = court();
    expect(canFormLegion(s, REGIONS)).toBe(true);
    expect(canFormLegion(returnToMap(s), REGIONS)).toBe(false);
    expect(canFormLegion(s, REGIONS.slice(1))).toBe(false);
    expect(canFormLegion(form(s), REGIONS)).toBe(false);
    expect(canFormLegion({ ...s, army: { ...s.army, soldiers: 0 } }, REGIONS)).toBe(false);
    const posted = { ...s, officials: s.officials.map((o) => (o.post === null ? { ...o, post: "chancellor" } : o)) };
    expect(canFormLegion(posted, REGIONS)).toBe(false);
  });
  it("UC-CORE-026 legion IDs are never reused", () => {
    let s = moveOut(form(court()));
    s = { ...s, army: { ...s.army, legions: [] } };
    s = form(s, 10000, "平北");
    expect(s.army.legions[0]?.id).toBe("legion-2");
  });
  it("UC-CORE-026 name suggestions skip names in use and keep rngState", () => {
    const s = court();
    const pool = ["甲乙", "丙丁", "戊己", "庚辛"];
    const a = drawLegionNameSuggestions(s, pool);
    expect(new Set(a).size).toBe(3);
    for (const n of a) expect(pool).toContain(n);
    expect(drawLegionNameSuggestions(s, pool)).toEqual(a);
    expect(s.rngState).toBe(court().rngState);
    const used = { ...s, army: { ...s.army, legions: [legion({ name: "甲乙" })] } };
    for (let i = 0; i < 20; i += 1) {
      const t = { ...used, rngState: (used.rngState + i) >>> 0 };
      expect(drawLegionNameSuggestions(t, pool)).not.toContain("甲乙");
    }
    expect([...drawLegionNameSuggestions(used, ["甲乙", "丙丁", "戊己"])].sort()).toEqual(["丙丁", "戊己"]);
  });
});
