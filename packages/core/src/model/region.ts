import type { RegionStatValues } from "./stats";

export const PLAYER_OWNER = "player";

export interface RegionData {
  id: string;
  owner: string;
  adjacent: readonly string[];
  start: RegionStatValues;
}

export interface RegionState {
  id: string;
  owner: string;
  stats: RegionStatValues;
}
