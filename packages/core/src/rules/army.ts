import { BALANCE } from "../model/balance";
import type { GameState } from "../model/state";
import { isMorningCourt } from "./turn";
import { freePopulation } from "./works";

export type ArmyRejection = "not-in-court" | "already-used" | "invalid-count" | "already-drilling";
export type ArmyOutcome =
  | { ok: false; reason: ArmyRejection; state: GameState }
  | { ok: true; state: GameState };

const { step, conscriptPercent } = BALANCE.army;

function isStepCount(n: number, min: number, max: number): boolean {
  return Number.isInteger(n) && n % step === 0 && n >= min && n <= max;
}

export function maxConscript(state: GameState): number {
  return Math.floor((freePopulation(state) * conscriptPercent) / 100 / step + 0.5) * step;
}

export function canConscript(state: GameState): boolean {
  return isMorningCourt(state) && state.army.conscriptedTurn !== state.turn && maxConscript(state) > 0;
}

const reject = (reason: ArmyRejection, state: GameState): ArmyOutcome => ({ ok: false, reason, state });

export function conscriptSoldiers(state: GameState, count: number): ArmyOutcome {
  if (!isMorningCourt(state)) return reject("not-in-court", state);
  if (state.army.conscriptedTurn === state.turn) return reject("already-used", state);
  if (!isStepCount(count, step, maxConscript(state))) return reject("invalid-count", state);
  const { soldiers, training } = state.army;
  return {
    ok: true,
    state: {
      ...state,
      army: {
        ...state.army,
        soldiers: soldiers + count,
        training: Math.floor((training * soldiers) / (soldiers + count)),
        conscriptedTurn: state.turn,
      },
    },
  };
}

export function releaseSoldiers(state: GameState, count: number): ArmyOutcome {
  if (!isMorningCourt(state)) return reject("not-in-court", state);
  if (!isStepCount(count, step, state.army.soldiers)) return reject("invalid-count", state);
  return { ok: true, state: { ...state, army: { ...state.army, soldiers: state.army.soldiers - count } } };
}
