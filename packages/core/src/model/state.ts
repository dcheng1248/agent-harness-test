import { nextRandom } from "../rng";
import { drawOfficial } from "../rules/officials";
import { BALANCE } from "./balance";
import type { PalaceId } from "./catalog";
import { listPosts } from "./officials";
import type { NamePool, Official } from "./officials";
import type { Recommendation } from "./notables";
import { EMPEROR_STAT_IDS } from "./stats";
import type { NationStatValues, StatValues } from "./stats";
import type { RegionData, RegionState } from "./region";

export const SCHEMA_VERSION = 5;

export type Location = "map" | PalaceId;

export interface GameState {
  schemaVersion: number;
  seed: number;
  rngState: number;
  eraName: string;
  turn: number;
  actionPoint: number;
  location: Location;
  stats: StatValues;
  turnDeltas: StatValues;
  nation: NationStatValues;
  regions: RegionState[];
  officials: Official[];
  recommendation: Recommendation | null;
  dead: boolean;
}

function zeroStats(): StatValues {
  return { health: 0, learning: 0, arts: 0, resolve: 0 };
}

export function createInitialState(
  seed: number,
  eraName: string,
  regions: readonly RegionData[],
  names: NamePool,
): GameState {
  const { budget, min, max } = BALANCE.startingStats;
  let rngState = seed >>> 0;
  const weights = EMPEROR_STAT_IDS.map(() => {
    const draw = nextRandom(rngState);
    rngState = draw.rngState;
    return draw.value;
  });
  const total = weights.reduce((sum, w) => sum + w, 0);
  const normalized = total > 0 ? weights : weights.map(() => 1);
  const normalizedTotal = total > 0 ? total : normalized.length;

  const extra = budget - min * EMPEROR_STAT_IDS.length;
  const stats = zeroStats();
  let remaining = extra;
  EMPEROR_STAT_IDS.forEach((id, i) => {
    const share = Math.min(
      Math.floor((extra * (normalized[i] ?? 0)) / normalizedTotal),
      max - min,
    );
    stats[id] = min + share;
    remaining -= share;
  });
  while (remaining > 0) {
    for (const id of EMPEROR_STAT_IDS) {
      if (remaining > 0 && stats[id] < max) {
        stats[id] += 1;
        remaining -= 1;
      }
    }
  }

  const regionStates: RegionState[] = regions.map((r) => ({
    id: r.id,
    owner: r.owner,
    stats: { ...r.start },
  }));

  const officials: Official[] = [];
  const taken = new Set<string>();
  const addOfficial = (post: string | null) => {
    const draw = drawOfficial(rngState, `official-${officials.length + 1}`, names, taken);
    rngState = draw.rngState;
    taken.add(draw.official.name);
    officials.push({ ...draw.official, post });
  };
  for (const post of listPosts({ regions: regionStates })) addOfficial(post.id);
  for (let i = 0; i < BALANCE.officials.startingIdle; i += 1) addOfficial(null);

  return {
    schemaVersion: SCHEMA_VERSION,
    seed,
    rngState,
    eraName,
    turn: 0,
    actionPoint: 0,
    location: "map",
    stats,
    turnDeltas: zeroStats(),
    nation: { treasury: BALANCE.startingTreasury },
    regions: regionStates,
    officials,
    recommendation: null,
    dead: false,
  };
}
