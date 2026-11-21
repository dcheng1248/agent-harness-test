import {
  acceptCandidate,
  appointOfficial,
  assignArtisans,
  BALANCE,
  canHoldExam,
  canHoldSacrifice,
  canLevy,
  holdSacrifice,
  levy,
  setTaxLevel,
  type TaxLevelId,
  canRecruit,
  idleArtisans,
  maxRecruit,
  recruitArtisans,
  releaseArtisans,
  type BuildingData,
  canRecommend,
  confirmExam,
  holdExam,
  COURT_PALACE_ID,
  createInitialState,
  declineCandidate,
  DEPARTMENT_IDS,
  drawEraNameSuggestions,
  enterPalace,
  getHalfSeason,
  isMorningCourt,
  isValidEraName,
  listPosts,
  type NotableData,
  OFFICIAL_STAT_IDS,
  recommend,
  returnToMap,
  takeAction,
  type ActionId,
  type Candidate,
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
      completed: string[];
    }
  | { screen: 'atlas'; state: GameState }
  | { screen: 'recommend'; state: GameState }
  | { screen: 'appoint'; state: GameState; post?: PostId; sort?: OfficialStatId }
  | { screen: 'exam'; state: GameState; picks: number[]; sort?: OfficialStatId }
  | { screen: 'recruit'; state: GameState; count: number }
  | { screen: 'release'; state: GameState; count: number }
  | { screen: 'build'; state: GameState }
  | { screen: 'taxes'; state: GameState }
  | { screen: 'levy'; state: GameState; gained?: number }
  | { screen: 'budget'; state: GameState }
  | { screen: 'sacrifice'; state: GameState }
  | { screen: 'ending'; state: GameState };

/** The palace that offers the 輿圖. */
export const ATLAS_PALACE: PalaceId = 'chongwen';

/** The palace that holds court: 內閣 and the six 部. */
export const COURT_PALACE: PalaceId = COURT_PALACE_ID;

/** The court options that open a screen; every other option is not yet open. */
export const OPEN_COURT_OPTIONS: readonly CourtOptionId[] = [
  'recommend-officials',
  'appoint-officials',
  'hold-exams',
  'recruit-artisans',
  'release-artisans',
  'build',
  'adjust-taxes',
  'extra-levy',
  'budget-sheet',
  'hold-sacrifice',
];

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
  buildings: readonly BuildingData[],
): Screen {
  if (screen.screen !== 'era') return screen;
  const name = input.trim();
  if (!isValidEraName(name)) return { ...screen, draft: input, error: true };
  return { screen: 'play', state: createInitialState(screen.seed, name, regions, names, buildings) };
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

export function chooseCourtOption(
  screen: Screen,
  optionId: CourtOptionId,
  notables: readonly NotableData[],
  names: NamePool,
): Screen {
  if (screen.screen !== 'play' || !isMorningCourt(screen.state)) return screen;
  if (!OPEN_COURT_OPTIONS.includes(optionId)) return screen;
  if (optionId === 'recommend-officials') {
    if (!canRecommend(screen.state)) return screen;
    const outcome = recommend(screen.state, notables, names);
    return outcome.ok ? { screen: 'recommend', state: outcome.state } : screen;
  }
  if (optionId === 'hold-exams') {
    if (!canHoldExam(screen.state)) return screen;
    const outcome = holdExam(screen.state, notables, names);
    return outcome.ok ? { screen: 'exam', state: outcome.state, picks: [] } : screen;
  }
  if (optionId === 'recruit-artisans') {
    return canRecruit(screen.state) ? { screen: 'recruit', state: screen.state, count: BALANCE.works.step } : screen;
  }
  if (optionId === 'release-artisans') {
    return idleArtisans(screen.state) > 0 ? { screen: 'release', state: screen.state, count: BALANCE.works.step } : screen;
  }
  if (optionId === 'adjust-taxes') return { screen: 'taxes', state: screen.state };
  if (optionId === 'budget-sheet') return { screen: 'budget', state: screen.state };
  if (optionId === 'extra-levy') return canLevy(screen.state) ? { screen: 'levy', state: screen.state } : screen;
  if (optionId === 'hold-sacrifice') {
    return canHoldSacrifice(screen.state) ? { screen: 'sacrifice', state: screen.state } : screen;
  }
  if (optionId === 'build') return { screen: 'build', state: screen.state };
  return { screen: 'appoint', state: screen.state };
}

/** The largest count the picker of a `recruit` or `release` screen allows. */
function countLimit(screen: Extract<Screen, { screen: 'recruit' | 'release' }>): number {
  return screen.screen === 'recruit' ? maxRecruit(screen.state) : idleArtisans(screen.state);
}

export function stepCount(screen: Screen, direction: 1 | -1): Screen {
  if (screen.screen !== 'recruit' && screen.screen !== 'release') return screen;
  if (direction !== 1 && direction !== -1) return screen;
  const count = screen.count + direction * BALANCE.works.step;
  if (count < BALANCE.works.step || count > countLimit(screen)) return screen;
  return { ...screen, count };
}

export function maxCount(screen: Screen): Screen {
  if (screen.screen !== 'recruit' && screen.screen !== 'release') return screen;
  return { ...screen, count: countLimit(screen) };
}

function confirmWorks(screen: Screen, kind: 'recruit' | 'release'): Screen {
  if (screen.screen !== kind) return screen;
  const rule = kind === 'recruit' ? recruitArtisans : releaseArtisans;
  const outcome = rule(screen.state, screen.count);
  if (!outcome.ok) return screen;
  return { screen: 'play', state: outcome.state, department: 'works' };
}

export function confirmRecruit(screen: Screen): Screen {
  return confirmWorks(screen, 'recruit');
}

export function confirmRelease(screen: Screen): Screen {
  return confirmWorks(screen, 'release');
}

export function changeAssignment(screen: Screen, buildingId: string, direction: 1 | -1): Screen {
  if (screen.screen !== 'build') return screen;
  if (direction !== 1 && direction !== -1) return screen;
  const building = screen.state.works.buildings.find((b) => b.id === buildingId);
  if (!building) return screen;
  const outcome = assignArtisans(screen.state, buildingId, building.assigned + direction * BALANCE.works.step);
  return outcome.ok ? { screen: 'build', state: outcome.state } : screen;
}

function decide(screen: Screen, rule: typeof acceptCandidate): Screen {
  if (screen.screen !== 'recommend') return screen;
  const outcome = rule(screen.state);
  if (!outcome.ok) return screen;
  return { screen: 'play', state: outcome.state, department: 'personnel' };
}

export function acceptRecommendation(screen: Screen): Screen {
  return decide(screen, acceptCandidate);
}

export function declineRecommendation(screen: Screen): Screen {
  return decide(screen, declineCandidate);
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

export function setTax(screen: Screen, level: TaxLevelId): Screen {
  if (screen.screen !== 'taxes') return screen;
  const outcome = setTaxLevel(screen.state, level);
  return outcome.ok ? { screen: 'taxes', state: outcome.state } : screen;
}

export function confirmLevy(screen: Screen): Screen {
  if (screen.screen !== 'levy' || screen.gained !== undefined) return screen;
  const outcome = levy(screen.state);
  return outcome.ok ? { screen: 'levy', state: outcome.state, gained: outcome.amount } : screen;
}

export function confirmSacrifice(screen: Screen): Screen {
  if (screen.screen !== 'sacrifice') return screen;
  const outcome = holdSacrifice(screen.state);
  return outcome.ok ? { screen: 'play', state: outcome.state, department: 'rites' } : screen;
}

export function backToCourt(screen: Screen): Screen {
  if (screen.screen === 'sacrifice') return { screen: 'play', state: screen.state, department: 'rites' };
  if (screen.screen === 'taxes' || screen.screen === 'levy' || screen.screen === 'budget') {
    return { screen: 'play', state: screen.state, department: 'revenue' };
  }
  if (screen.screen === 'recruit' || screen.screen === 'release' || screen.screen === 'build') {
    return { screen: 'play', state: screen.state, department: 'works' };
  }
  if (screen.screen !== 'appoint' && screen.screen !== 'recommend' && screen.screen !== 'exam') return screen;
  return { screen: 'play', state: screen.state, department: 'personnel' };
}

/** The candidates of this half-season's exam with their positions, in list order or sorted by `sort`, highest first. */
export function examCandidates(state: GameState, sort?: OfficialStatId): { index: number; candidate: Candidate }[] {
  const exam = state.exam;
  if (exam === null || exam.turn !== state.turn || exam.candidates === null) return [];
  const all = exam.candidates.map((candidate, index) => ({ index, candidate }));
  if (sort === undefined) return all;
  return all.sort((a, b) => b.candidate.stats[sort] - a.candidate.stats[sort] || a.index - b.index);
}

export function toggleExamPick(screen: Screen, index: number): Screen {
  if (screen.screen !== 'exam') return screen;
  const count = screen.state.exam?.candidates?.length ?? 0;
  if (!Number.isInteger(index) || index < 0 || index >= count) return screen;
  const picks = screen.picks.includes(index)
    ? screen.picks.filter((p) => p !== index)
    : [...screen.picks, index].sort((a, b) => a - b);
  return { ...screen, picks };
}

export function sortExam(screen: Screen, stat: OfficialStatId): Screen {
  if (screen.screen !== 'exam' || !OFFICIAL_STAT_IDS.includes(stat)) return screen;
  return { ...screen, sort: stat };
}

export function confirmExamPicks(screen: Screen): Screen {
  if (screen.screen !== 'exam') return screen;
  const outcome = confirmExam(screen.state, screen.picks);
  if (!outcome.ok) return screen;
  return { screen: 'play', state: outcome.state, department: 'personnel' };
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
      completed: turnEnd.completed,
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
