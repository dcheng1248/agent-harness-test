export const SCHEMA_VERSION = 1;

export interface GameState {
  schemaVersion: number;
  seed: number;
  rngState: number;
}

export function createInitialState(seed: number): GameState {
  return { schemaVersion: SCHEMA_VERSION, seed, rngState: seed >>> 0 };
}
