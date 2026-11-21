import { BALANCE } from "../model/balance";
import type { Legion } from "../model/army";
import type { RegionData } from "../model/region";
import type { GameState } from "../model/state";
import { drawEraNameSuggestions, isValidEraName } from "./eraName";
import { isIdleOfficial } from "./officials";
import { capitalRegion } from "./regions";
import { isMorningCourt } from "./turn";

export type LegionRejection =
  | "not-in-court"
  | "no-capital"
  | "capital-occupied"
  | "unknown-official"
  | "not-idle"
  | "invalid-count"
  | "invalid-name"
  | "name-taken"
  | "unknown-legion"
  | "returning"
  | "already-moved"
  | "not-neighbour"
  | "not-owned"
  | "occupied"
  | "no-route";
export type LegionOutcome =
  | { ok: false; reason: LegionRejection; state: GameState }
  | { ok: true; state: GameState };

const { step, legionMaxSoldiers } = BALANCE.army;

export function legionSoldiers(state: Pick<GameState, "army">): number {
  return state.army.legions.reduce((sum, l) => sum + l.soldiers, 0);
}

export function maxLegionSoldiers(state: Pick<GameState, "army">): number {
  return Math.min(state.army.soldiers, legionMaxSoldiers);
}

export const isValidLegionName = isValidEraName;

export function drawLegionNameSuggestions(
  state: Pick<GameState, "rngState" | "army">,
  pool: readonly string[],
  count = 3,
): string[] {
  const free = pool.filter((n) => !state.army.legions.some((l) => l.name === n));
  return drawEraNameSuggestions((state.rngState + state.army.legionsFormed) >>> 0, free, count);
}

/** The 軍團 standing in a region (not returning to the capital). */
export function stationedLegion(state: Pick<GameState, "army">, regionId: string): Legion | undefined {
  return state.army.legions.find((l) => l.route === null && l.region === regionId);
}

export function canFormLegion(state: GameState, regions: readonly RegionData[]): boolean {
  const capital = capitalRegion(regions);
  return (
    isMorningCourt(state) &&
    capital !== null &&
    stationedLegion(state, capital) === undefined &&
    state.army.soldiers >= step &&
    state.officials.some((o) => isIdleOfficial(state, o.id))
  );
}

const reject = (reason: LegionRejection, state: GameState): LegionOutcome => ({ ok: false, reason, state });

export function formLegion(
  state: GameState,
  regions: readonly RegionData[],
  generalId: string,
  count: number,
  name: string,
): LegionOutcome {
  if (!isMorningCourt(state)) return reject("not-in-court", state);
  const capital = capitalRegion(regions);
  if (capital === null) return reject("no-capital", state);
  if (stationedLegion(state, capital)) return reject("capital-occupied", state);
  if (!state.officials.some((o) => o.id === generalId)) return reject("unknown-official", state);
  if (!isIdleOfficial(state, generalId)) return reject("not-idle", state);
  const max = maxLegionSoldiers(state);
  if (!(Number.isInteger(count) && count % step === 0 && count >= step && count <= max))
    return reject("invalid-count", state);
  if (!isValidLegionName(name)) return reject("invalid-name", state);
  if (state.army.legions.some((l) => l.name === name)) return reject("name-taken", state);
  const formed = state.army.legionsFormed + 1;
  const legion: Legion = {
    id: `legion-${formed}`,
    name,
    general: generalId,
    soldiers: count,
    training: state.army.training,
    region: capital,
    movedTurn: null,
    route: null,
  };
  return {
    ok: true,
    state: {
      ...state,
      army: {
        ...state.army,
        soldiers: state.army.soldiers - count,
        legions: [...state.army.legions, legion],
        legionsFormed: formed,
      },
    },
  };
}
