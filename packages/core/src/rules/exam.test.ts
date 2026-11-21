import { describe, expect, it } from "vitest";
import {
  BALANCE,
  canHoldExam,
  confirmExam,
  createInitialState,
  enterPalace,
  holdExam,
  isExamYear,
  nextExamYear,
  nextRandom,
  returnToMap,
} from "../index";
import type { Candidate, GameState, NotableData } from "../index";
import { TEST_NAMES, TEST_NOTABLES } from "../testNames";
import { drawOfficial } from "./officials";

const civil = TEST_NOTABLES.find((n) => n.id === "civil") as NotableData;
const BRIGHT = { health: 50, learning: 100, arts: 50, resolve: 100 };

function court(over: Partial<GameState> = {}): GameState {
  return { ...enterPalace(createInitialState(1, "承平", [], TEST_NAMES), "xuanzheng"), ...over };
}
const atTurn = (t: number) => court({ turn: t });

function held(state: GameState, notables: readonly NotableData[] = [], names = TEST_NAMES) {
  const out = holdExam(state, notables, names);
  if (!out.ok) throw new Error(`rejected: ${out.reason}`);
  return out;
}

describe("UC-CORE-018 exam years", () => {
  it("UC-CORE-018 isExamYear is true for the first year of each cycle", () => {
    for (const t of [0, 7, 24, 48]) expect(isExamYear({ turn: t })).toBe(true);
    for (const t of [8, 16, 47]) expect(isExamYear({ turn: t })).toBe(false);
  });
  it("UC-CORE-018 nextExamYear is the first exam year after the current one", () => {
    expect(nextExamYear({ turn: 0 })).toBe(4);
    expect(nextExamYear({ turn: 8 })).toBe(4);
    expect(nextExamYear({ turn: 23 })).toBe(4);
    expect(nextExamYear({ turn: 24 })).toBe(7);
  });
});

describe("UC-CORE-018 canHoldExam", () => {
  it("UC-CORE-018 is true in court in an exam year, false otherwise", () => {
    expect(canHoldExam(atTurn(0))).toBe(true);
    expect(canHoldExam(atTurn(24))).toBe(true);
    expect(canHoldExam(atTurn(8))).toBe(false);
    expect(canHoldExam(returnToMap(atTurn(0)))).toBe(false);
    expect(canHoldExam({ ...atTurn(0), dead: true })).toBe(false);
  });
  it("UC-CORE-018 is false for the rest of the reign year after holding, true in the next exam year", () => {
    const h = held(atTurn(0)).state;
    expect(canHoldExam(h)).toBe(false);
    expect(canHoldExam({ ...h, turn: 4 })).toBe(false);
    expect(canHoldExam({ ...h, turn: 24 })).toBe(true);
  });
});

describe("UC-CORE-018 holdExam rejections", () => {
  it("UC-CORE-018 rejects off court, off year and repeats, leaving the state untouched", () => {
    const map = returnToMap(atTurn(0));
    expect(holdExam(map, [], TEST_NAMES)).toEqual({ ok: false, reason: "not-in-court", state: map });
    const off = atTurn(8);
    const o = holdExam(off, [], TEST_NAMES);
    expect(o.ok).toBe(false);
    expect(o.state).toBe(off);
    if (!o.ok) expect(o.reason).toBe("not-exam-year");
    const h = held(atTurn(0)).state;
    for (const s of [h, { ...h, turn: 7 }]) {
      const r = holdExam(s, [], TEST_NAMES);
      expect(r.ok).toBe(false);
      expect(r.state).toBe(s);
      if (!r.ok) expect(r.reason).toBe("already-held");
    }
  });
});

describe("UC-CORE-018 holdExam candidates", () => {
  it("UC-CORE-018 draws the configured number of unique, unreserved, unused names and stores them", () => {
    const names = { ...TEST_NAMES, reserved: ["甲春", "乙夏"] };
    for (let seed = 0; seed < 20; seed += 1) {
      const state = court({ rngState: seed });
      const out = held(state, [], names);
      expect(out.candidates).toHaveLength(BALANCE.exam.candidates);
      expect(out.state.exam).toEqual({ turn: 0, candidates: out.candidates });
      const taken = new Set(state.officials.map((o) => o.name));
      const cn = out.candidates.map((c) => c.name);
      expect(new Set(cn).size).toBe(cn.length);
      for (const n of cn) {
        expect(taken.has(n)).toBe(false);
        expect(names.reserved).not.toContain(n);
      }
    }
  });
  it("UC-CORE-018 the first slot burns the chance roll, then draws from the exam table", () => {
    const state = court({ rngState: 5 });
    const names = new Set(state.officials.map((o) => o.name));
    const first = held(state, []).candidates[0] as Candidate;
    const expected = drawOfficial(nextRandom(5).rngState, "", TEST_NAMES, names, BALANCE.exam.ordinary);
    expect(first).toEqual({ name: expected.official.name, stats: expected.official.stats, notable: null });
  });
  it("UC-CORE-018 each ordinary candidate uses the exam table or the outlier table entirely", () => {
    const within = (c: Candidate, t: typeof BALANCE.exam.ordinary) =>
      Object.entries(c.stats).every(([k, v]) => {
        const r = t[k as keyof typeof t];
        return v >= r.min && v <= r.max;
      });
    for (let seed = 0; seed < 10; seed += 1)
      for (const c of held(court({ rngState: seed }), []).candidates)
        expect(within(c, BALANCE.exam.ordinary) || within(c, BALANCE.officials.outlier)).toBe(true);
  });
  it("UC-CORE-018 only 文 and 文武 名臣 appear, unlocked, at most once each, never ones already at court", () => {
    let sawNotable = false;
    for (let seed = 0; seed < 50; seed += 1) {
      const out = held(court({ rngState: seed, stats: BRIGHT }), TEST_NOTABLES);
      const ids = out.candidates.map((c) => c.notable).filter((n) => n !== null);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).not.toContain("military");
      expect(ids).not.toContain("locked");
      if (ids.length > 0) sawNotable = true;
    }
    expect(sawNotable).toBe(true);
    for (let seed = 0; seed < 50; seed += 1) {
      const base = court({ rngState: seed, stats: BRIGHT });
      const at = {
        ...base,
        officials: [{ ...base.officials[0]!, notable: "civil" }, ...base.officials.slice(1)],
      };
      const out = held(at, [civil]);
      expect(out.candidates.some((c) => c.notable === "civil")).toBe(false);
    }
  });
});

describe("UC-CORE-018 confirmExam", () => {
  const base = court({ stats: BRIGHT });
  const h = held(base, TEST_NOTABLES).state;
  const highest = Math.max(...h.officials.map((o) => Number(o.id.replace("official-", ""))));

  it("UC-CORE-018 appends the picked candidates in order, deduped, as 賦閑", () => {
    const out = confirmExam(h, [2, 0, 2]);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const cands = h.exam!.candidates!;
    expect(out.state.officials).toHaveLength(h.officials.length + 2);
    const added = out.state.officials.slice(-2);
    expect(added[0]).toEqual({
      id: `official-${highest + 1}`, name: cands[0]!.name, stats: cands[0]!.stats, post: null, notable: cands[0]!.notable,
    });
    expect(added[1]).toEqual({
      id: `official-${highest + 2}`, name: cands[2]!.name, stats: cands[2]!.stats, post: null, notable: cands[2]!.notable,
    });
    expect(out.state.exam).toEqual({ turn: 0, candidates: null });
    expect(out.state.rngState).toBe(h.rngState);
    expect(canHoldExam(out.state)).toBe(false);
  });
  it("UC-CORE-018 an empty pick list is allowed", () => {
    const out = confirmExam(h, []);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.state.officials).toEqual(h.officials);
    expect(out.state.exam?.candidates).toBeNull();
  });
  it("UC-CORE-018 rejects off court, missing candidates and unknown positions, state untouched", () => {
    const cases: [GameState, number[], string][] = [
      [returnToMap(h), [0], "not-in-court"],
      [{ ...h, exam: null }, [0], "no-candidates"],
      [{ ...h, turn: 1 }, [0], "no-candidates"],
      [{ ...h, exam: { turn: 0, candidates: null } }, [0], "no-candidates"],
      [h, [-1], "unknown-candidate"],
      [h, [BALANCE.exam.candidates], "unknown-candidate"],
      [h, [1.5], "unknown-candidate"],
    ];
    for (const [s, picks, reason] of cases) {
      const out = confirmExam(s, picks);
      expect(out.ok).toBe(false);
      expect(out.state).toBe(s);
      if (!out.ok) expect(out.reason).toBe(reason);
    }
    const done = confirmExam(h, [0]).state;
    expect(confirmExam(done, [0]).ok).toBe(false);
  });
  it("UC-CORE-018 a declined 名臣 can return in a later exam; a confirmed one cannot", () => {
    let seed = -1;
    for (let r = 0; r < 500 && seed < 0; r += 1) {
      const e = held(court({ rngState: r, stats: BRIGHT }), [civil]);
      if (e.candidates.some((c) => c.notable === "civil")) seed = r;
    }
    expect(seed).toBeGreaterThanOrEqual(0);
    const first = held(court({ rngState: seed, stats: BRIGHT }), [civil]);
    const idx = first.candidates.findIndex((c) => c.notable === "civil");
    const declined = confirmExam(first.state, []);
    if (!declined.ok) throw new Error("confirm failed");
    const again = held({ ...declined.state, turn: 24, rngState: seed }, [civil]);
    expect(again.candidates.some((c) => c.notable === "civil")).toBe(true);
    const taken = confirmExam(first.state, [idx]);
    if (!taken.ok) throw new Error("confirm failed");
    for (let r = 0; r < 50; r += 1) {
      const later = held({ ...taken.state, turn: 24, rngState: r }, [civil]);
      expect(later.candidates.some((c) => c.notable === "civil")).toBe(false);
    }
  });
});
