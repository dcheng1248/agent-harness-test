import {
  createInitialState,
  drawEraNameSuggestions,
  enterPalace,
  getHalfSeason,
  isValidEraName,
  returnToMap,
  takeAction,
  type ActionId,
  type GameState,
  type HalfSeasonId,
  type PalaceId,
  type StatChange,
} from '@emperor/core';

export type Screen =
  | { screen: 'title' }
  | { screen: 'era'; seed: number; suggestions: string[]; draft: string; error: boolean }
  | { screen: 'play'; state: GameState }
  | { screen: 'result'; state: GameState; actionId: ActionId; changes: StatChange[] }
  | {
      screen: 'summary';
      state: GameState;
      actionId: ActionId;
      changes: StatChange[];
      endedHalfSeason: HalfSeasonId;
      totals: StatChange[];
    }
  | { screen: 'ending'; state: GameState };

export function startGame(seed: number, pool: readonly string[]): Screen {
  return {
    screen: 'era',
    seed,
    suggestions: drawEraNameSuggestions(seed, pool),
    draft: '',
    error: false,
  };
}

export function chooseEraName(screen: Screen, input: string): Screen {
  if (screen.screen !== 'era') return screen;
  const name = input.trim();
  if (!isValidEraName(name)) return { ...screen, draft: input, error: true };
  return { screen: 'play', state: createInitialState(screen.seed, name) };
}

export function goToPalace(screen: Screen, palaceId: PalaceId): Screen {
  if (screen.screen !== 'play') return screen;
  return { screen: 'play', state: enterPalace(screen.state, palaceId) };
}

export function goToMap(screen: Screen): Screen {
  if (screen.screen !== 'play') return screen;
  return { screen: 'play', state: returnToMap(screen.state) };
}

export function performAction(screen: Screen, actionId: ActionId): Screen {
  if (screen.screen !== 'play') return screen;
  const outcome = takeAction(screen.state, actionId);
  if (!outcome.ok) return screen;
  const { state, changes, turnEnd } = outcome;
  if (state.dead) return { screen: 'ending', state };
  if (turnEnd) {
    return {
      screen: 'summary',
      state,
      actionId,
      changes,
      endedHalfSeason: getHalfSeason(screen.state),
      totals: turnEnd.totals,
    };
  }
  return { screen: 'result', state, actionId, changes };
}

export function continueToMap(screen: Screen): Screen {
  if (screen.screen !== 'result' && screen.screen !== 'summary') return screen;
  return { screen: 'play', state: screen.state };
}

export function restart(): Screen {
  return { screen: 'title' };
}
