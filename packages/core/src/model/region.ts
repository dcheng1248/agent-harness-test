import type { RegionStatValues } from "./stats";

export const PLAYER_OWNER = "player";

export interface GridCell {
  x: number;
  y: number;
}

export interface RegionData {
  id: string;
  owner: string;
  cell: GridCell;
  start: RegionStatValues;
}

export interface RegionState {
  id: string;
  owner: string;
  stats: RegionStatValues;
}
