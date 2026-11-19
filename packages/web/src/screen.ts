import { createInitialState, type GameState } from '@emperor/core';

export type Screen = { screen: 'title' } | { screen: 'game'; state: GameState };

export function startGame(seed: number): Screen {
  return { screen: 'game', state: createInitialState(seed) };
}
