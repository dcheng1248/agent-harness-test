import { BALANCE } from "../model/balance";
import { PLAYER_OWNER } from "../model/region";
import type { GameState } from "../model/state";
import { buildingStatus } from "../model/works";
import { isMorningCourt } from "./turn";

export type WorksRejection =
  | "not-in-court"
  | "already-used"
  | "invalid-count"
  | "unknown-building"
  | "completed"
  | "not-enough-idle";
export type WorksOutcome =
  | { ok: false; reason: WorksRejection; state: GameState }
  | { ok: true; state: GameState };

const { step, recruitPercent } = BALANCE.works;

function isStepCount(n: number, min: number, max: number): boolean {
  return Number.isInteger(n) && n % step === 0 && n >= min && n <= max;
}

export function freePopulation(state: GameState): number {
  const population = state.regions
    .filter((r) => r.owner === PLAYER_OWNER)
    .reduce((sum, r) => sum + r.stats.population, 0);
  return Math.max(0, population - state.works.artisans - state.army.soldiers);
}

export function maxRecruit(state: GameState): number {
  return Math.floor((freePopulation(state) * recruitPercent) / 100 / step + 0.5) * step;
}

export function idleArtisans(state: GameState): number {
  return state.works.artisans - state.works.buildings.reduce((sum, b) => sum + b.assigned, 0);
}

export function canRecruit(state: GameState): boolean {
  return isMorningCourt(state) && state.works.recruitedTurn !== state.turn && maxRecruit(state) > 0;
}

const reject = (reason: WorksRejection, state: GameState): WorksOutcome => ({ ok: false, reason, state });

export function recruitArtisans(state: GameState, count: number): WorksOutcome {
  if (!isMorningCourt(state)) return reject("not-in-court", state);
  if (state.works.recruitedTurn === state.turn) return reject("already-used", state);
  if (!isStepCount(count, step, maxRecruit(state))) return reject("invalid-count", state);
  return {
    ok: true,
    state: { ...state, works: { ...state.works, artisans: state.works.artisans + count, recruitedTurn: state.turn } },
  };
}

export function releaseArtisans(state: GameState, count: number): WorksOutcome {
  if (!isMorningCourt(state)) return reject("not-in-court", state);
  if (!isStepCount(count, step, idleArtisans(state))) return reject("invalid-count", state);
  return { ok: true, state: { ...state, works: { ...state.works, artisans: state.works.artisans - count } } };
}

export function assignArtisans(state: GameState, buildingId: string, count: number): WorksOutcome {
  if (!isMorningCourt(state)) return reject("not-in-court", state);
  const building = state.works.buildings.find((b) => b.id === buildingId);
  if (!building) return reject("unknown-building", state);
  if (buildingStatus(building) === "completed") return reject("completed", state);
  if (!isStepCount(count, 0, Infinity)) return reject("invalid-count", state);
  if (count - building.assigned > idleArtisans(state)) return reject("not-enough-idle", state);
  return {
    ok: true,
    state: {
      ...state,
      works: {
        ...state.works,
        buildings: state.works.buildings.map((b) => (b.id === buildingId ? { ...b, assigned: count } : b)),
      },
    },
  };
}
