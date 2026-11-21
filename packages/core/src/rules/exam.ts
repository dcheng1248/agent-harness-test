import { BALANCE } from "../model/balance";
import { getReignYear } from "../model/calendar";
import type { Candidate, NotableData } from "../model/notables";
import type { NamePool } from "../model/officials";
import type { GameState } from "../model/state";
import { drawCandidate, nextOfficialId } from "./recommend";
import { isMorningCourt } from "./turn";

export type HoldExamRejection = "not-in-court" | "not-exam-year" | "already-held";
export type ConfirmExamRejection = "not-in-court" | "no-candidates" | "unknown-candidate";
export type HoldExamOutcome =
  | { ok: false; reason: HoldExamRejection; state: GameState }
  | { ok: true; state: GameState; candidates: Candidate[] };
export type ConfirmExamOutcome =
  | { ok: false; reason: ConfirmExamRejection; state: GameState }
  | { ok: true; state: GameState };

/** Whether the reign year is the first of a cycle of `BALANCE.exam.intervalYears` years. */
export function isExamYear(state: Pick<GameState, "turn">): boolean {
  return (getReignYear({ turn: state.turn, actionPoint: 0 }) - 1) % BALANCE.exam.intervalYears === 0;
}

/** The first exam year after the current reign year. */
export function nextExamYear(state: Pick<GameState, "turn">): number {
  const year = getReignYear({ turn: state.turn, actionPoint: 0 });
  const { intervalYears } = BALANCE.exam;
  return 1 + (Math.floor((year - 1) / intervalYears) + 1) * intervalYears;
}

function heldThisYear(state: GameState): boolean {
  return (
    state.exam !== null &&
    getReignYear({ turn: state.exam.turn, actionPoint: 0 }) ===
      getReignYear({ turn: state.turn, actionPoint: 0 })
  );
}

/** Whether 開科取士 is open: in 早朝, in an exam year, and not yet held this reign year. */
export function canHoldExam(state: GameState): boolean {
  return isMorningCourt(state) && isExamYear(state) && !heldThisYear(state);
}

/** Draws this exam's candidates from the random stream and stores them. */
export function holdExam(
  state: GameState,
  notables: readonly NotableData[],
  names: NamePool,
): HoldExamOutcome {
  if (!isMorningCourt(state)) return { ok: false, reason: "not-in-court", state };
  if (!isExamYear(state)) return { ok: false, reason: "not-exam-year", state };
  if (heldThisYear(state)) return { ok: false, reason: "already-held", state };

  let rng = state.rngState;
  const candidates: Candidate[] = [];
  const exclude = new Set<string>();
  const taken = new Set(state.officials.map((o) => o.name));
  for (let i = 0; i < BALANCE.exam.candidates; i += 1) {
    const draw = drawCandidate(state, rng, notables, names, {
      types: ["civil", "both"],
      exclude,
      taken,
      table: BALANCE.exam.ordinary,
    });
    rng = draw.rngState;
    candidates.push(draw.candidate);
    taken.add(draw.candidate.name);
    if (draw.candidate.notable !== null) exclude.add(draw.candidate.notable);
  }
  return {
    ok: true,
    candidates,
    state: { ...state, rngState: rng, exam: { turn: state.turn, candidates } },
  };
}

/** Hires the candidates at the given positions as 賦閑 officials; the rest are discarded. */
export function confirmExam(state: GameState, picks: readonly number[]): ConfirmExamOutcome {
  if (!isMorningCourt(state)) return { ok: false, reason: "not-in-court", state };
  const exam = state.exam;
  if (exam === null || exam.turn !== state.turn || exam.candidates === null)
    return { ok: false, reason: "no-candidates", state };
  const candidates = exam.candidates;
  if (!picks.every((p) => Number.isInteger(p) && p >= 0 && p < candidates.length))
    return { ok: false, reason: "unknown-candidate", state };
  const chosen = [...new Set(picks)].sort((a, b) => a - b);
  const newId = nextOfficialId(state.officials);
  return {
    ok: true,
    state: {
      ...state,
      officials: [
        ...state.officials,
        ...chosen.map((pick, i) => {
          const c = candidates[pick] as Candidate;
          return { id: newId(i + 1), name: c.name, stats: c.stats, post: null, notable: c.notable };
        }),
      ],
      exam: { turn: exam.turn, candidates: null },
    },
  };
}
