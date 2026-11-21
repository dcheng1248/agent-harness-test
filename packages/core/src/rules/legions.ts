import { BALANCE } from "../model/balance";
import type { Army, Legion } from "../model/army";
import type { RegionData } from "../model/region";
import { PLAYER_OWNER } from "../model/region";
import type { GameState } from "../model/state";
import { drawEraNameSuggestions, isValidEraName } from "./eraName";
import { isIdleOfficial } from "./officials";
import { capitalRegion, regionNeighbours } from "./regions";
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
  return state.army.legions.reduce((sum, legion) => sum + legion.soldiers, 0);
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
  const free = pool.filter((n) => !state.army.legions.some((legion) => legion.name === n));
  return drawEraNameSuggestions((state.rngState + state.army.legionsFormed) >>> 0, free, count);
}

/** The 軍團 standing in a region (not returning to the capital). */
export function stationedLegion(state: Pick<GameState, "army">, regionId: string): Legion | undefined {
  return state.army.legions.find((legion) => legion.route === null && legion.region === regionId);
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
  if (state.army.legions.some((legion) => legion.name === name)) return reject("name-taken", state);
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

const owns = (state: GameState, regionId: string) =>
  state.regions.some((r) => r.id === regionId && r.owner === PLAYER_OWNER);

/** The army with one 軍團 replaced by itself patched. */
function updateLegion(army: Army, legionId: string, patch: Partial<Legion>): Army {
  return { ...army, legions: army.legions.map((x) => (x.id === legionId ? { ...x, ...patch } : x)) };
}

/** The 軍團 with this id, if any. */
export function findLegion(state: Pick<GameState, "army">, legionId: string): Legion | undefined {
  return state.army.legions.find((x) => x.id === legionId);
}

export function legionMoves(state: GameState, regions: readonly RegionData[], legionId: string): string[] {
  const legion = findLegion(state, legionId);
  if (!legion || legion.route !== null || legion.movedTurn === state.turn) return [];
  return regionNeighbours(regions, legion.region).filter((id) => owns(state, id) && !stationedLegion(state, id));
}

export function moveLegion(
  state: GameState,
  regions: readonly RegionData[],
  legionId: string,
  regionId: string,
): LegionOutcome {
  if (!isMorningCourt(state)) return reject("not-in-court", state);
  const legion = findLegion(state, legionId);
  if (!legion) return reject("unknown-legion", state);
  if (legion.route !== null) return reject("returning", state);
  if (legion.movedTurn === state.turn) return reject("already-moved", state);
  if (!regionNeighbours(regions, legion.region).includes(regionId)) return reject("not-neighbour", state);
  if (!owns(state, regionId)) return reject("not-owned", state);
  if (stationedLegion(state, regionId)) return reject("occupied", state);
  return {
    ok: true,
    state: { ...state, army: updateLegion(state.army, legionId, { region: regionId, movedTurn: state.turn }) },
  };
}

export function recallRoute(state: GameState, regions: readonly RegionData[], legionId: string): string[] | null {
  const legion = findLegion(state, legionId);
  const capital = capitalRegion(regions);
  if (!legion || capital === null) return null;
  const from = new Map<string, string | null>([[legion.region, null]]);
  const queue = [legion.region];
  for (let i = 0; i < queue.length; i += 1) {
    const here = queue[i]!;
    if (here === capital) break;
    for (const next of regionNeighbours(regions, here)) {
      if (from.has(next) || !owns(state, next)) continue;
      from.set(next, here);
      queue.push(next);
    }
  }
  if (!from.has(capital)) return null;
  const path: string[] = [];
  for (let at: string | null | undefined = capital; at !== null && at !== undefined && at !== legion.region; at = from.get(at))
    path.unshift(at);
  return path;
}

export function canRecall(state: GameState, regions: readonly RegionData[], legionId: string): boolean {
  const legion = findLegion(state, legionId);
  return isMorningCourt(state) && legion !== undefined && legion.route === null && recallRoute(state, regions, legionId) !== null;
}

/** Merges a 軍團 back into the pool and removes it. */
function disbandLegion(army: Army, legionId: string): Army {
  const legion = findLegion({ army }, legionId);
  if (!legion) return army;
  const total = army.soldiers + legion.soldiers;
  return {
    ...army,
    soldiers: total,
    training: Math.floor((army.training * army.soldiers + legion.training * legion.soldiers) / total),
    legions: army.legions.filter((x) => x.id !== legionId),
  };
}

export function recallLegion(state: GameState, regions: readonly RegionData[], legionId: string): LegionOutcome {
  if (!isMorningCourt(state)) return reject("not-in-court", state);
  const legion = findLegion(state, legionId);
  if (!legion) return reject("unknown-legion", state);
  if (legion.route !== null) return reject("returning", state);
  const route = recallRoute(state, regions, legionId);
  if (route === null) return reject("no-route", state);
  if (route.length === 0) return { ok: true, state: { ...state, army: disbandLegion(state.army, legionId) } };
  return {
    ok: true,
    state: { ...state, army: updateLegion(state.army, legionId, { route }) },
  };
}

/** Moves every returning 軍團 one region along its route; those arriving disband. */
export function marchLegions(army: Army): Army {
  let next = army;
  for (const legion of army.legions) {
    if (legion.route === null) continue;
    const [region, ...rest] = legion.route;
    if (region === undefined) continue;
    if (rest.length === 0) {
      next = disbandLegion(updateLegion(next, legion.id, { region }), legion.id);
    } else {
      next = updateLegion(next, legion.id, { region, route: rest });
    }
  }
  return next;
}
