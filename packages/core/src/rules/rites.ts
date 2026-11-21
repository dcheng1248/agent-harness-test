import { BALANCE } from "../model/balance";
import { getReignYear } from "../model/calendar";
import type { GameState } from "../model/state";
import { isMorningCourt } from "./turn";

export type RitesRejection = "not-in-court" | "already-held";
export type RitesOutcome =
  | { ok: false; reason: RitesRejection; state: GameState }
  | { ok: true; state: GameState };

/** True when 祭祀 was held in the current reign year. */
export function sacrificedThisYear(
  state: Pick<GameState, "turn" | "rites">,
): boolean {
  const held = state.rites.sacrificeTurn;
  return (
    held !== null &&
    getReignYear({ turn: held, actionPoint: 0 }) ===
      getReignYear({ turn: state.turn, actionPoint: 0 })
  );
}

export function canHoldSacrifice(state: GameState): boolean {
  return isMorningCourt(state) && !sacrificedThisYear(state);
}

/** 祭祀: costs 國庫 and is recorded; 午 is spent when leaving 早朝. */
export function holdSacrifice(state: GameState): RitesOutcome {
  if (!isMorningCourt(state))
    return { ok: false, reason: "not-in-court", state };
  if (sacrificedThisYear(state))
    return { ok: false, reason: "already-held", state };
  return {
    ok: true,
    state: {
      ...state,
      nation: {
        ...state.nation,
        treasury: state.nation.treasury - BALANCE.rites.sacrificeCost,
      },
      rites: { sacrificeTurn: state.turn },
    },
  };
}
