import {
  appointOfficial,
  COURT_PALACE_ID,
  createInitialState,
  DEPARTMENT_IDS,
  drawEraNameSuggestions,
  enterPalace,
  getHalfSeason,
  isMorningCourt,
  isValidEraName,
  listPosts,
  OFFICIAL_STAT_IDS,
  returnToMap,
  takeAction,
  type ActionId,
  type CourtOptionId,
  type DepartmentId,
  type EconomyReport,
  type GameState,
  type HalfSeasonId,
  type NamePool,
  type Official,
  type OfficialStatId,
  type PalaceId,
  type PostId,
  type RegionData,
  type StatChange,
} from '@emperor/core';

export type Screen =
  | { screen: 'title' }
  | { screen: 'era'; seed: number; suggestions: string[]; draft: string; error: boolean }
  | { screen: 'play'; state: GameState; department?: DepartmentId }
  | { screen: 'result'; state: GameState; actionId: ActionId; changes: StatChange[] }
  | {
      screen: 'summary';
      state: GameState;
      actionId: ActionId;
      changes: StatChange[];
      endedHalfSeason: HalfSeasonId;
      totals: StatChange[];
      economy: EconomyReport;
    }
  | { screen: 'atlas'; state: GameState }
  | { screen: 'appoint'; state: GameState; post?: PostId; sort?: OfficialStatId }
  | { screen: 'ending'; state: GameState };

/** The palace that offers the 輿圖. */
export const ATLAS_PALACE: PalaceId = 'chongwen';

/** The palace that holds court: 內閣 and the six 部. */
export const COURT_PALACE: PalaceId = COURT_PALACE_ID;

/** The court options that open a screen; every other option is not yet open. */
export const OPEN_COURT_OPTIONS: readonly CourtOptionId[] = ['appoint-officials'];

export function startGame(seed: number, pool: readonly string[]): Screen {
  return {
    screen: 'era',
    seed,
    suggestions: drawEraNameSuggestions(seed, pool),
    draft: '',
    error: false,
  };
}

export function chooseEraName(
  screen: Screen,
  input: string,
  regions: readonly RegionData[],
  names: NamePool,
): Screen {
  if (screen.screen !== 'era') return screen;
  const name = input.trim();
  if (!isValidEraName(name)) return { ...screen, draft: input, error: true };
  return { screen: 'play', state: createInitialState(screen.seed, name, regions, names) };
}

export function goToPalace(screen: Screen, palaceId: PalaceId): Screen {
  if (screen.screen !== 'play') return screen;
  return { screen: 'play', state: enterPalace(screen.state, palaceId) };
}

export function goToMap(screen: Screen): Screen {
  if (screen.screen !== 'play') return screen;
  return { screen: 'play', state: returnToMap(screen.state) };
}

export function toggleDepartment(screen: Screen, departmentId: DepartmentId): Screen {
  if (screen.screen !== 'play' || screen.state.location !== COURT_PALACE) return screen;
  if (!(DEPARTMENT_IDS as readonly string[]).includes(departmentId)) return screen;
  const { state } = screen;
  if (screen.department === departmentId) return { screen: 'play', state };
  return { screen: 'play', state, department: departmentId };
}

export function chooseCourtOption(screen: Screen, optionId: CourtOptionId): Screen {
  if (screen.screen !== 'play' || !isMorningCourt(screen.state)) return screen;
  if (!OPEN_COURT_OPTIONS.includes(optionId)) return screen;
  return { screen: 'appoint', state: screen.state };
}

export function selectPost(screen: Screen, postId: PostId): Screen {
  if (screen.screen !== 'appoint') return screen;
  if (!listPosts(screen.state).some((p) => p.id === postId)) return screen;
  return { ...screen, post: postId };
}

export function sortIdle(screen: Screen, stat: OfficialStatId): Screen {
  if (screen.screen !== 'appoint' || !OFFICIAL_STAT_IDS.includes(stat)) return screen;
  return { ...screen, sort: stat };
}

export function appoint(screen: Screen, officialId: string): Screen {
  if (screen.screen !== 'appoint' || screen.post === undefined) return screen;
  const outcome = appointOfficial(screen.state, screen.post, officialId);
  if (!outcome.ok) return screen;
  const { sort } = screen;
  return sort === undefined
    ? { screen: 'appoint', state: outcome.state }
    : { screen: 'appoint', state: outcome.state, sort };
}

export function cancelPost(screen: Screen): Screen {
  if (screen.screen !== 'appoint') return screen;
  const { post: _post, ...rest } = screen;
  return rest;
}

export function backToCourt(screen: Screen): Screen {
  if (screen.screen !== 'appoint') return screen;
  return { screen: 'play', state: screen.state, department: 'personnel' };
}

/** The 賦閑 officials, in `officials` order or sorted by `sort`, highest first. */
export function idleOfficials(state: GameState, sort?: OfficialStatId): Official[] {
  const idle = state.officials.filter((o) => o.post === null);
  if (sort === undefined) return idle;
  return idle.sort((a, b) => b.stats[sort] - a.stats[sort]);
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
      economy: turnEnd.economy,
    };
  }
  return { screen: 'result', state, actionId, changes };
}

export function openAtlas(screen: Screen): Screen {
  if (screen.screen !== 'play' || screen.state.location !== ATLAS_PALACE) return screen;
  return { screen: 'atlas', state: screen.state };
}

export function closeAtlas(screen: Screen): Screen {
  if (screen.screen !== 'atlas') return screen;
  return { screen: 'play', state: screen.state };
}

export function continueToMap(screen: Screen): Screen {
  if (screen.screen !== 'result' && screen.screen !== 'summary') return screen;
  return { screen: 'play', state: screen.state };
}

export function restart(): Screen {
  return { screen: 'title' };
}
