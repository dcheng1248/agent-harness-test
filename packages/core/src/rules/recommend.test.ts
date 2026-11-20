import { describe, expect, it } from "vitest";
import {
  acceptCandidate,
  canRecommend,
  createInitialState,
  declineCandidate,
  enterPalace,
  nextRandom,
  recommend,
  returnToMap,
} from "../index";
import type { Candidate, GameState, NotableData } from "../index";
import { TEST_NAMES, TEST_NOTABLES } from "../testNames";
import { drawOfficial } from "./officials";

const byId = (id: string): NotableData => {
  const found = TEST_NOTABLES.find((n) => n.id === id);
  if (!found) throw new Error(`missing test notable ${id}`);
  return found;
};
const civil = byId("civil");
const military = byId("military");
const both = byId("both");
const locked = byId("locked");
const STATS = { health: 50, learning: 50, arts: 50, resolve: 50 };

function court(over: Partial<GameState> = {}): GameState {
  return { ...enterPalace(createInitialState(1, "承平", [], TEST_NAMES), "xuanzheng"), ...over };
}

function rngWhere(pred: (v: number) => boolean): number {
  for (let r = 0; ; r += 1) if (pred(nextRandom(r).value)) return r;
}

function rngWhere2(pred1: (v: number) => boolean, pred2: (v: number) => boolean): number {
  for (let r = 0; ; r += 1) {
    const first = nextRandom(r);
    if (pred1(first.value) && pred2(nextRandom(first.rngState).value)) return r;
  }
}

const hit = (v: number) => v < 0.03;
const cand = (): Candidate => ({ name: "某某", stats: civil.stats, notable: null });

describe("UC-CORE-017 canRecommend", () => {
  it("UC-CORE-017 is true in a fresh 早朝", () => {
    expect(canRecommend(court())).toBe(true);
  });
  it("UC-CORE-017 is false on the map and when dead", () => {
    const state = court();
    expect(canRecommend(returnToMap(state))).toBe(false);
    expect(canRecommend({ ...state, dead: true })).toBe(false);
  });
  it("UC-CORE-017 is false after recommend this turn, true again next turn", () => {
    const state = court();
    const out = recommend(state, TEST_NOTABLES, TEST_NAMES);
    expect(canRecommend(out.state)).toBe(false);
    expect(canRecommend({ ...out.state, turn: state.turn + 1 })).toBe(true);
  });
});

describe("UC-CORE-017 rejections", () => {
  it("UC-CORE-017 recommend on the map is not-in-court", () => {
    const state = returnToMap(court());
    const out = recommend(state, TEST_NOTABLES, TEST_NAMES);
    expect(out).toEqual({ ok: false, reason: "not-in-court", state });
  });
  it("UC-CORE-017 recommend twice is already-used and returns the same state", () => {
    const first = recommend(court(), TEST_NOTABLES, TEST_NAMES);
    if (!first.ok) throw new Error("expected ok");
    const second = recommend(first.state, TEST_NOTABLES, TEST_NAMES);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("already-used");
    expect(second.state).toBe(first.state);
  });
  it("UC-CORE-017 accept and decline without a candidate are no-candidate", () => {
    const state = court();
    for (const fn of [acceptCandidate, declineCandidate]) {
      const out = fn(state);
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.reason).toBe("no-candidate");
    }
  });
  it("UC-CORE-017 accept and decline on the map are not-in-court", () => {
    const state = returnToMap(court());
    for (const fn of [acceptCandidate, declineCandidate]) {
      const out = fn(state);
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.reason).toBe("not-in-court");
    }
  });
  it("UC-CORE-017 a candidate from an earlier turn is no-candidate", () => {
    const base = court();
    const state = { ...base, recommendation: { turn: base.turn - 1, candidate: cand() } };
    for (const fn of [acceptCandidate, declineCandidate]) {
      const out = fn(state);
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.reason).toBe("no-candidate");
    }
  });
});

describe("UC-CORE-017 drawing", () => {
  it("UC-CORE-017 chance grows with 學識 and 魄力", () => {
    const rngState = rngWhere((v) => v >= 0.03 && v < 0.08);
    const high = recommend(
      court({ rngState, stats: { ...STATS, learning: 100, resolve: 100 } }),
      TEST_NOTABLES,
      TEST_NAMES,
    );
    const low = recommend(
      court({ rngState, stats: { ...STATS, learning: 0, resolve: 0 } }),
      TEST_NOTABLES,
      TEST_NAMES,
    );
    if (!high.ok || !low.ok) throw new Error("expected ok");
    expect(high.candidate.notable).not.toBeNull();
    expect(low.candidate.notable).toBeNull();
  });

  it("UC-CORE-017 the pick is weighted by 學識 for 文 and 魄力 for 武", () => {
    const stats = { ...STATS, learning: 30, resolve: 90 };
    const pick = (rngState: number) => {
      const out = recommend(court({ rngState, stats }), [civil, military], TEST_NAMES);
      if (!out.ok) throw new Error("expected ok");
      return out.candidate.notable;
    };
    expect(pick(rngWhere2(hit, (v) => v < 30 / 120 - 0.01))).toBe("civil");
    expect(pick(rngWhere2(hit, (v) => v > 30 / 120 + 0.01))).toBe("military");
  });

  it("UC-CORE-017 an eligible 名臣 with weight 0 gives an ordinary candidate", () => {
    const rngState = rngWhere(hit);
    const zero = { ...military, gate: { stat: "learning" as const, min: 0 } };
    const out = recommend(
      court({ rngState, stats: { ...STATS, learning: 50, resolve: 0 } }),
      [zero],
      TEST_NAMES,
    );
    if (!out.ok) throw new Error("expected ok");
    expect(out.candidate.notable).toBeNull();
  });

  it("UC-CORE-017 no eligible 名臣 gives an ordinary candidate", () => {
    const rngState = rngWhere(hit);
    const out = recommend(
      court({ rngState, stats: { ...STATS, learning: 0, resolve: 0 } }),
      [civil, locked],
      TEST_NAMES,
    );
    if (!out.ok) throw new Error("expected ok");
    expect(out.candidate.notable).toBeNull();
  });

  it("UC-CORE-017 a 名臣 already at court is not eligible", () => {
    const base = court();
    const officials = base.officials.map((o, i) => (i === 0 ? { ...o, notable: "civil" } : o));
    const out = recommend(
      { ...base, officials, rngState: rngWhere(hit), stats: STATS },
      [civil],
      TEST_NAMES,
    );
    if (!out.ok) throw new Error("expected ok");
    expect(out.candidate.notable).toBeNull();
  });

  it("UC-CORE-017 a 名臣 whose gate is unmet is never drawn", () => {
    for (let n = 0; n < 200; n += 1) {
      const out = recommend(court({ rngState: rngWhereNth(n), stats: STATS }), [locked, both], TEST_NAMES);
      if (!out.ok) throw new Error("expected ok");
      expect(out.candidate.notable).toBe("both");
    }
  });

  it("UC-CORE-017 an ordinary candidate is drawn as at the start, with a free name", () => {
    const base = court();
    const rngState = rngWhere((v) => v >= 0.08);
    const out = recommend({ ...base, rngState, stats: STATS }, TEST_NOTABLES, TEST_NAMES);
    if (!out.ok) throw new Error("expected ok");
    const taken = new Set(base.officials.map((o) => o.name));
    const expected = drawOfficial(nextRandom(rngState).rngState, "", TEST_NAMES, taken);
    expect(out.candidate).toEqual({
      name: expected.official.name,
      stats: expected.official.stats,
      notable: null,
    });
    expect(taken.has(out.candidate.name)).toBe(false);
    expect(out.state.rngState).toBe(expected.rngState);
    expect(out.state.recommendation).toEqual({ turn: base.turn, candidate: out.candidate });
  });

  it("UC-CORE-017 a drawn 名臣 carries its fixed name and stats", () => {
    const out = recommend(
      court({ rngState: rngWhere(hit), stats: { ...STATS, learning: 100, resolve: 0 } }),
      [civil],
      TEST_NAMES,
    );
    if (!out.ok) throw new Error("expected ok");
    expect(out.candidate).toEqual({ name: "文臣", stats: civil.stats, notable: "civil" });
  });
});

function rngWhereNth(n: number): number {
  let seen = 0;
  for (let r = 0; ; r += 1)
    if (hit(nextRandom(r).value)) {
      if (seen === n) return r;
      seen += 1;
    }
}

describe("UC-CORE-017 deciding", () => {
  const drawn = (over: Partial<GameState> = {}) => {
    const out = recommend(court(over), TEST_NOTABLES, TEST_NAMES);
    if (!out.ok) throw new Error("expected ok");
    return out;
  };

  it("UC-CORE-017 accept appends an idle official with the next ID", () => {
    const { state, candidate } = drawn();
    const out = acceptCandidate(state);
    if (!out.ok) throw new Error("expected ok");
    const numbers = state.officials.map((o) => Number(o.id.replace("official-", "")));
    const added = out.state.officials[out.state.officials.length - 1];
    expect(out.state.officials).toHaveLength(state.officials.length + 1);
    expect(added).toEqual({
      id: `official-${Math.max(...numbers) + 1}`,
      name: candidate.name,
      stats: candidate.stats,
      post: null,
      notable: candidate.notable,
    });
    expect(out.state.recommendation).toEqual({ turn: state.turn, candidate: null });
    expect(out.state.rngState).toBe(state.rngState);
    expect(canRecommend(out.state)).toBe(false);
  });

  it("UC-CORE-017 decline keeps officials and the random stream", () => {
    const { state } = drawn();
    const out = declineCandidate(state);
    if (!out.ok) throw new Error("expected ok");
    expect(out.state.officials).toBe(state.officials);
    expect(out.state.recommendation).toEqual({ turn: state.turn, candidate: null });
    expect(out.state.rngState).toBe(state.rngState);
  });

  it("UC-CORE-017 a declined 名臣 can be drawn again, an accepted one cannot", () => {
    const stats = { ...STATS, learning: 100, resolve: 0 };
    const rngState = rngWhere(hit);
    const first = recommend(court({ rngState, stats }), [civil], TEST_NAMES);
    if (!first.ok) throw new Error("expected ok");
    expect(first.candidate.notable).toBe("civil");
    const next = (s: GameState) => ({ ...s, turn: s.turn + 1, rngState, stats });

    const declined = declineCandidate(first.state);
    const accepted = acceptCandidate(first.state);
    if (!declined.ok || !accepted.ok) throw new Error("expected ok");
    const again = recommend(next(declined.state), [civil], TEST_NAMES);
    const never = recommend(next(accepted.state), [civil], TEST_NAMES);
    if (!again.ok || !never.ok) throw new Error("expected ok");
    expect(again.candidate.notable).toBe("civil");
    expect(never.candidate.notable).toBeNull();
  });
});
