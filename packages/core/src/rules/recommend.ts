import { BALANCE } from "../model/balance";
import type { Candidate, NotableData, NotableType } from "../model/notables";
import type { NamePool, Official } from "../model/officials";
import type { OfficialStatId } from "../model/stats";
import type { GameState } from "../model/state";
import { nextRandom } from "../rng";
import { drawOfficial } from "./officials";
import { isMorningCourt } from "./turn";

export type RecommendRejection = "not-in-court" | "already-used";
export type CandidateRejection = "not-in-court" | "no-candidate";
export type RecommendOutcome =
  | { ok: false; reason: RecommendRejection; state: GameState }
  | { ok: true; state: GameState; candidate: Candidate };
export type CandidateOutcome =
  | { ok: false; reason: CandidateRejection; state: GameState }
  | { ok: true; state: GameState };

/** Whether 舉薦 is open: it is 早朝 and 舉薦 was not used this half-season. */
export function canRecommend(state: GameState): boolean {
  return isMorningCourt(state) && state.recommendation?.turn !== state.turn;
}

function weight(state: GameState, notable: NotableData): number {
  const { learning, resolve } = state.stats;
  if (notable.type === "civil") return 2 * learning;
  if (notable.type === "military") return 2 * resolve;
  return learning + resolve;
}

export interface DrawCandidateOptions {
  types: readonly NotableType[];
  exclude: ReadonlySet<string>;
  taken: ReadonlySet<string>;
  table: Record<OfficialStatId, { min: number; max: number }>;
}

/**
 * Draws one candidate: the 名臣 chance roll, then (on a hit) a weighted 名臣 pick among
 * the eligible ones, otherwise an ordinary official from `opts.table`.
 */
export function drawCandidate(
  state: GameState,
  rngState: number,
  notables: readonly NotableData[],
  names: NamePool,
  opts: DrawCandidateOptions,
): { candidate: Candidate; rngState: number } {
  const roll = nextRandom(rngState);
  let rng = roll.rngState;
  const { notableBase, notableBonus } = BALANCE.recommendation;
  const chance = notableBase + (notableBonus * (state.stats.learning + state.stats.resolve)) / 200;

  if (roll.value < chance) {
    const held = new Set(state.officials.map((o) => o.notable));
    const eligible = notables.filter(
      (n) =>
        state.stats[n.gate.stat] >= n.gate.min &&
        !held.has(n.id) &&
        opts.types.includes(n.type) &&
        !opts.exclude.has(n.id),
    );
    const total = eligible.reduce((sum, n) => sum + weight(state, n), 0);
    if (total > 0) {
      const pick = nextRandom(rng);
      rng = pick.rngState;
      const target = pick.value * total;
      let running = 0;
      for (const n of eligible) {
        running += weight(state, n);
        if (running > target)
          return {
            candidate: { name: n.name, stats: { ...n.stats }, notable: n.id },
            rngState: rng,
          };
      }
    }
  }
  const draw = drawOfficial(rng, "", names, opts.taken, opts.table);
  return {
    candidate: { name: draw.official.name, stats: draw.official.stats, notable: null },
    rngState: draw.rngState,
  };
}

/** Draws this half-season's candidate from the random stream and stores it. */
export function recommend(
  state: GameState,
  notables: readonly NotableData[],
  names: NamePool,
): RecommendOutcome {
  if (!isMorningCourt(state)) return { ok: false, reason: "not-in-court", state };
  if (!canRecommend(state)) return { ok: false, reason: "already-used", state };

  const { candidate, rngState } = drawCandidate(state, state.rngState, notables, names, {
    types: ["civil", "military", "both"],
    exclude: new Set(),
    taken: new Set(state.officials.map((o) => o.name)),
    table: BALANCE.officials.ordinary,
  });
  return {
    ok: true,
    candidate,
    state: { ...state, rngState, recommendation: { turn: state.turn, candidate } },
  };
}

/** Returns a generator of fresh official IDs: `official-${highest + n}` for n = 1, 2, ... */
export function nextOfficialId(officials: readonly Official[]): (n: number) => string {
  const highest = Math.max(0, ...officials.map((o) => Number(o.id.replace("official-", "")) || 0));
  return (n) => `official-${highest + n}`;
}

function pending(state: GameState): CandidateRejection | Candidate {
  if (!isMorningCourt(state)) return "not-in-court";
  const rec = state.recommendation;
  if (rec === null || rec.turn !== state.turn || rec.candidate === null) return "no-candidate";
  return rec.candidate;
}

/** Hires the candidate as a 賦閑 official. */
export function acceptCandidate(state: GameState): CandidateOutcome {
  const candidate = pending(state);
  if (typeof candidate === "string") return { ok: false, reason: candidate, state };
  const newId = nextOfficialId(state.officials);
  return {
    ok: true,
    state: {
      ...state,
      officials: [
        ...state.officials,
        {
          id: newId(1),
          name: candidate.name,
          stats: candidate.stats,
          post: null,
          notable: candidate.notable,
        },
      ],
      recommendation: { turn: state.turn, candidate: null },
    },
  };
}

/** Discards the candidate. */
export function declineCandidate(state: GameState): CandidateOutcome {
  const candidate = pending(state);
  if (typeof candidate === "string") return { ok: false, reason: candidate, state };
  return { ok: true, state: { ...state, recommendation: { turn: state.turn, candidate: null } } };
}
