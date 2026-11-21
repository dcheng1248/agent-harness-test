import { describe, expect, it } from 'vitest';
import { gameText } from '@emperor/content';
import {
  createInitialState,
  nextRandom,
  drawEraNameSuggestions,
  enterPalace,
  takeAction,
  type DepartmentId,
  type GameState,
  type OfficialStatId,
  BALANCE,
  canRecruit,
  maxConscript,
  idleArtisans,
  maxRecruit,
  canHoldExam,
  getReignYear,
  levyAmount,
  canLevy,
  drillTurnsLeft,
} from '@emperor/core';
import {
  acceptRecommendation,
  appoint,
  backToCourt,
  cancelPost,
  chooseCourtOption,
  chooseEraName,
  closeAtlas,
  changeAssignment,
  confirmExamPicks,
  confirmRecruit,
  confirmConscript,
  confirmDischarge,
  confirmDrill,
  confirmLevy,
  confirmSacrifice,
  setTax,
  confirmRelease,
  examCandidates,
  maxCount,
  stepCount,
  sortExam,
  toggleExamPick,
  continueToMap,
  declineRecommendation,
  goToMap,
  goToPalace,
  idleOfficials,
  openAtlas,
  selectAtlasRegion,
  performAction,
  restart,
  selectPost,
  sortIdle,
  startGame,
  toggleDepartment,
  type Screen,
} from './screen';

const era = startGame(42, gameText.eraNamePool);

const regions = gameText.regions;
const names = gameText.officialNames;
const notables = gameText.notables;

function newState(): GameState {
  return createInitialState(42, '承平', regions, names, gameText.buildings);
}

function play(state: GameState): Screen {
  return { screen: 'play', state };
}

function inChongwen(state: GameState = newState()): Screen {
  return goToPalace(play(state), 'chongwen');
}

describe('start game', () => {
  it('UC-WEB-002 startGame opens the 年號 screen with seeded suggestions', () => {
    expect(startGame(42, gameText.eraNamePool)).toEqual({
      screen: 'era',
      seed: 42,
      suggestions: drawEraNameSuggestions(42, gameText.eraNamePool),
      draft: '',
      error: false,
    });
  });
});

describe('年號', () => {
  it('UC-WEB-003 a valid 年號 starts the game', () => {
    expect(chooseEraName(era, ' 承平 ', regions, names, gameText.buildings)).toEqual({
      screen: 'play',
      state: newState(),
    });
  });

  it('UC-WEB-003 an invalid 年號 shows the error and keeps the typed text', () => {
    for (const input of ['承', 'abc', '<b>']) {
      expect(chooseEraName(era, input, regions, names, gameText.buildings)).toEqual({ ...era, error: true, draft: input });
    }
  });

  it('UC-WEB-003 chooseEraName on another screen is unchanged', () => {
    const title: Screen = { screen: 'title' };
    expect(chooseEraName(title, '承平', regions, names, gameText.buildings)).toBe(title);
  });
});

function fourthAction(): Screen {
  let screen: Screen = play(newState());
  for (let i = 0; i < 3; i += 1) {
    screen = continueToMap(performAction(goToPalace(screen, 'yangxin'), 'rest'));
  }
  return performAction(goToPalace(screen, 'yangxin'), 'rest');
}

describe('palace loop', () => {
  it('UC-WEB-004 entering a palace and going back keep the action point', () => {
    const start = play(newState());
    const inside = goToPalace(start, 'chongwen');
    expect(inside).toEqual(play(enterPalace(newState(), 'chongwen')));
    expect(goToMap(inside)).toEqual(start);
  });

  it('UC-WEB-004 an action shows its result', () => {
    const before = newState();
    const outcome = takeAction(enterPalace(before, 'chongwen'), 'study');
    if (!outcome.ok) throw new Error('rejected');
    const result = performAction(inChongwen(), 'study');
    expect(result).toEqual({
      screen: 'result',
      state: outcome.state,
      actionId: 'study',
      changes: outcome.changes,
    });
    expect(continueToMap(result)).toEqual(play(outcome.state));
    expect(outcome.state.location).toBe('map');
  });

  it('UC-WEB-004 the 4th action shows the turn summary', () => {
    let screen: Screen = play(newState());
    for (let i = 0; i < 3; i += 1) {
      screen = continueToMap(performAction(goToPalace(screen, 'yangxin'), 'rest'));
      expect(screen.screen).toBe('play');
    }
    const last = goToPalace(screen, 'yangxin');
    if (last.screen !== 'play') throw new Error('unexpected');
    const outcome = takeAction(last.state, 'rest');
    if (!outcome.ok || !outcome.turnEnd) throw new Error('expected turn end');
    const summary = performAction(last, 'rest');
    expect(summary).toEqual({
      screen: 'summary',
      state: outcome.state,
      actionId: 'rest',
      changes: outcome.changes,
      endedHalfSeason: 'spring-early',
      totals: outcome.turnEnd.totals,
      economy: outcome.turnEnd.economy,
      completed: [],
      training: null,
    });
    expect(outcome.state.turn).toBe(1);
    expect(continueToMap(summary)).toEqual(play(outcome.state));
  });

  it('UC-WEB-004 the summary screen carries the economy report', () => {
    const summary = fourthAction();
    if (summary.screen !== 'summary') throw new Error('expected summary');
    expect(summary.economy.upkeep).toBe(120000);
  });

  it('UC-WEB-004 a rejected action leaves the screen unchanged', () => {
    const onMap = play(newState());
    expect(performAction(onMap, 'study')).toBe(onMap);
    const inside = inChongwen();
    expect(performAction(inside, 'rest')).toBe(inside);
  });

  it('UC-WEB-004 transitions on the wrong screen kind are unchanged', () => {
    const title: Screen = { screen: 'title' };
    expect(goToPalace(title, 'chongwen')).toBe(title);
    expect(goToMap(title)).toBe(title);
    expect(performAction(title, 'study')).toBe(title);
    expect(continueToMap(title)).toBe(title);
    expect(goToPalace(inChongwen(), 'yuhuayuan')).toEqual(inChongwen());
  });
});

describe('輿圖', () => {
  function afterOneAction(): Screen {
    return continueToMap(performAction(inChongwen(), 'study'));
  }

  it('UC-WEB-006 opening 輿圖 from 崇文館 uses no action point and closing returns to 崇文館', () => {
    const screen = goToPalace(afterOneAction(), 'chongwen');
    if (screen.screen !== 'play') throw new Error('unexpected');
    expect(screen.state.actionPoint).toBe(1);
    expect(screen.state.location).toBe('chongwen');
    const atlas = openAtlas(screen);
    expect(atlas).toEqual({ screen: 'atlas', state: screen.state });
    if (atlas.screen !== 'atlas') throw new Error('unexpected');
    expect(atlas.state).toBe(screen.state);
    const closed = closeAtlas(atlas);
    expect(closed).toEqual(screen);
    if (closed.screen !== 'play') throw new Error('unexpected');
    expect(closed.state).toBe(screen.state);
  });

  it('UC-WEB-006 輿圖 cannot be opened from the map, another palace, a result, a summary or the title', () => {
    const screens: Screen[] = [
      afterOneAction(),
      goToPalace(afterOneAction(), 'yuhuayuan'),
      goToPalace(afterOneAction(), 'yanwu'),
      goToPalace(afterOneAction(), 'yangxin'),
      performAction(inChongwen(), 'study'),
      fourthAction(),
      { screen: 'title' },
    ];
    for (const x of screens) expect(openAtlas(x)).toBe(x);
  });

  it('UC-WEB-006 selectAtlasRegion selects, switches and clears a region, keeping the state', () => {
    const atlas = openAtlas(goToPalace(afterOneAction(), 'chongwen'));
    if (atlas.screen !== 'atlas') throw new Error('unexpected');
    const { state } = atlas;
    const a = selectAtlasRegion(atlas, 'shangjing');
    expect(a).toEqual({ screen: 'atlas', state, region: 'shangjing' });
    if (a.screen !== 'atlas') throw new Error('unexpected');
    expect(a.state).toBe(state);
    const b = selectAtlasRegion(a, 'guanzhong');
    expect(b).toEqual({ screen: 'atlas', state, region: 'guanzhong' });
    const c = selectAtlasRegion(b, null);
    expect(c).toEqual({ screen: 'atlas', state });
    expect('region' in c).toBe(false);
    expect(selectAtlasRegion(a, 'nope')).toBe(a);
    const title: Screen = { screen: 'title' };
    expect(selectAtlasRegion(title, 'shangjing')).toBe(title);
  });

  it('UC-WEB-006 closing 輿圖 drops the selected region', () => {
    const play = goToPalace(afterOneAction(), 'chongwen');
    const selected = selectAtlasRegion(openAtlas(play), 'shangjing');
    expect(closeAtlas(selected)).toEqual(play);
    expect('region' in openAtlas(closeAtlas(selected))).toBe(false);
  });

  it('UC-WEB-006 closeAtlas on another screen is unchanged', () => {
    const title: Screen = { screen: 'title' };
    expect(closeAtlas(title)).toBe(title);
  });
});

describe('ending', () => {
  it('UC-WEB-005 death goes to the ending', () => {
    const state = { ...newState(), stats: { ...newState().stats, health: 1 } };
    const result = performAction(inChongwen(state), 'study');
    expect(result.screen).toBe('ending');
    if (result.screen === 'ending') expect(result.state.dead).toBe(true);
  });

  it('UC-WEB-005 death from aging on the 4th action goes to the ending, not the summary', () => {
    const base = newState();
    // age 46 at turn 240: aging costs 2; study costs about 1, so 健康 3 survives the action only
    const aged: GameState = {
      ...base,
      turn: 8 * 30,
      actionPoint: 3,
      stats: { ...base.stats, health: 3 },
    };
    const outcome = takeAction(enterPalace(aged, 'chongwen'), 'study');
    expect(outcome.ok && outcome.turnEnd !== null && outcome.state.dead).toBe(true);
    const result = performAction(inChongwen(aged), 'study');
    expect(result.screen).toBe('ending');
    if (result.screen === 'ending') expect(result.state.dead).toBe(true);
  });

  it('UC-WEB-005 restart returns to the title screen', () => {
    expect(restart()).toEqual({ screen: 'title' });
  });
});

function inCourt(): Screen {
  return goToPalace(play(newState()), 'xuanzheng');
}

describe('宣政殿', () => {
  it('UC-WEB-007 toggling departments in 宣政殿 opens, switches and closes without changing the state', () => {
    const court = inCourt();
    if (court.screen !== 'play') throw new Error('unexpected');
    const ap = court.state.actionPoint;
    const opened = toggleDepartment(court, 'personnel');
    if (opened.screen !== 'play') throw new Error('unexpected');
    expect(opened.department).toBe('personnel');
    expect(opened.state).toBe(court.state);
    const switched = toggleDepartment(opened, 'war');
    if (switched.screen !== 'play') throw new Error('unexpected');
    expect(switched.department).toBe('war');
    expect(switched.state).toBe(court.state);
    const closed = toggleDepartment(switched, 'war');
    if (closed.screen !== 'play') throw new Error('unexpected');
    expect(closed.screen).toBe('play');
    expect(closed.department).toBeUndefined();
    expect(closed.state).toBe(court.state);
    for (const s of [opened, switched, closed]) expect(s.state.actionPoint).toBe(ap);
  });

  it('UC-WEB-007 退 closes the list, moves the clock to 午, and 宣政殿 cannot be re-entered', () => {
    const back = goToMap(toggleDepartment(inCourt(), 'personnel'));
    if (back.screen !== 'play') throw new Error('unexpected');
    expect([back.state.location, back.state.actionPoint, back.department]).toEqual(['map', 1, undefined]);
    const again = goToPalace(back, 'xuanzheng');
    if (again.screen !== 'play') throw new Error('unexpected');
    expect(again.state).toBe(back.state);
  });

  it('UC-WEB-007 toggleDepartment elsewhere or with an unknown ID is unchanged', () => {
    const screens: Screen[] = [play(newState()), inChongwen(), { screen: 'title' }];
    for (const x of screens) expect(toggleDepartment(x, 'personnel')).toBe(x);
    const court = inCourt();
    expect(toggleDepartment(court, 'nope' as DepartmentId)).toBe(court);
  });
});

describe('官員任命', () => {
  type Appoint = Extract<Screen, { screen: 'appoint' }>;
  function appointScreen(): Appoint {
    const s = chooseCourtOption(toggleDepartment(inCourt(), 'personnel'), 'appoint-officials', notables, names);
    if (s.screen !== 'appoint') throw new Error('unexpected');
    return s;
  }

  it('UC-WEB-007 only 官員任命 opens, only during 早朝', () => {
    const court = toggleDepartment(inCourt(), 'personnel');
    if (court.screen !== 'play') throw new Error('unexpected');
    const opened = chooseCourtOption(court, 'appoint-officials', notables, names);
    expect(opened).toEqual({ screen: 'appoint', state: court.state });
    if (opened.screen !== 'appoint') throw new Error('unexpected');
    expect(opened.state).toBe(court.state);
    const onMap = play(newState());
    expect(chooseCourtOption(onMap, 'appoint-officials', notables, names)).toBe(onMap);
  });

  it('UC-WEB-008 selecting a post, sorting and appointing', () => {
    const s = appointScreen();
    const selected = selectPost(s, 'chancellor');
    if (selected.screen !== 'appoint') throw new Error('unexpected');
    expect(selected.post).toBe('chancellor');
    expect(selectPost(s, 'nope')).toBe(s);
    expect(selectPost(s, 'zz-governor')).toBe(s);
    const sorted = sortIdle(s, 'loyalty');
    if (sorted.screen !== 'appoint') throw new Error('unexpected');
    expect(sorted.sort).toBe('loyalty');
    expect(sortIdle(s, 'health' as OfficialStatId)).toBe(s);
    const idleId = s.state.officials.find((o) => o.post === null)!.id;
    expect(appoint(s, idleId)).toBe(s);
    const ready: Appoint = { ...s, post: 'chancellor', sort: 'loyalty' };
    const done = appoint(ready, idleId);
    if (done.screen !== 'appoint') throw new Error('unexpected');
    expect(done.post).toBeUndefined();
    expect(done.sort).toBe('loyalty');
    expect(done.state.officials.find((o) => o.id === idleId)!.post).toBe('chancellor');
    expect(done.state.actionPoint).toBe(0);
    const heldId = s.state.officials.find((o) => o.post === 'grand-tutor')!.id;
    expect(appoint(ready, heldId)).toBe(ready);
  });

  it('UC-WEB-008 selecting keeps the sort', () => {
    const s = sortIdle(appointScreen(), 'military');
    const selected = selectPost(s, 'chancellor');
    if (selected.screen !== 'appoint') throw new Error('unexpected');
    expect([selected.post, selected.sort]).toEqual(['chancellor', 'military']);
  });

  it('UC-WEB-008 back to posts and back to 宣政殿', () => {
    const s = appointScreen();
    const cancelled = cancelPost({ ...s, post: 'chancellor' });
    if (cancelled.screen !== 'appoint') throw new Error('unexpected');
    expect(cancelled.post).toBeUndefined();
    const court = backToCourt(s);
    expect(court).toEqual({ screen: 'play', state: s.state, department: 'personnel' });
    const map = goToMap(court);
    if (map.screen !== 'play') throw new Error('unexpected');
    expect(map.state.actionPoint).toBe(1);
    const onPlay = play(newState());
    expect(cancelPost(onPlay)).toBe(onPlay);
    expect(backToCourt(onPlay)).toBe(onPlay);
    expect(selectPost(onPlay, 'chancellor')).toBe(onPlay);
    expect(sortIdle(onPlay, 'loyalty')).toBe(onPlay);
    expect(appoint(onPlay, 'official-1')).toBe(onPlay);
  });

  it('UC-WEB-008 idleOfficials order', () => {
    const { state } = appointScreen();
    const idle = state.officials.filter((o) => o.post === null);
    expect(idleOfficials(state)).toEqual(idle);
    const sorted = idleOfficials(state, 'administration');
    expect(sorted).toHaveLength(idle.length);
    for (let i = 1; i < sorted.length; i += 1) {
      const a = sorted[i - 1]!;
      const b = sorted[i]!;
      expect(a.stats.administration).toBeGreaterThanOrEqual(b.stats.administration);
      if (a.stats.administration === b.stats.administration) {
        expect(state.officials.indexOf(a)).toBeLessThan(state.officials.indexOf(b));
      }
    }
  });
});

describe('舉薦人選', () => {
  type Recommend = Extract<Screen, { screen: 'recommend' }>;
  const personnel = (): Screen => toggleDepartment(inCourt(), 'personnel');
  function recommendScreen(): Recommend {
    const s = chooseCourtOption(personnel(), 'recommend-officials', notables, names);
    if (s.screen !== 'recommend') throw new Error('unexpected');
    return s;
  }

  it('UC-WEB-009 opening 舉薦人選 draws a candidate for this half-season', () => {
    const s = recommendScreen();
    expect(s.state.recommendation?.turn).toBe(s.state.turn);
    expect(s.state.recommendation?.candidate).not.toBeNull();
    expect(s.state.actionPoint).toBe(0);
  });

  it('UC-WEB-009 accepting hires a 賦閑 official and returns to 吏部', () => {
    const s = recommendScreen();
    const before = s.state.officials.length;
    const done = acceptRecommendation(s);
    if (done.screen !== 'play') throw new Error('unexpected');
    expect(done.department).toBe('personnel');
    expect(done.state.location).toBe('xuanzheng');
    expect(done.state.officials).toHaveLength(before + 1);
    expect(done.state.officials.at(-1)!.post).toBeNull();
  });

  it('UC-WEB-009 declining keeps the officials and a second 舉薦 is refused', () => {
    const s = recommendScreen();
    const done = declineRecommendation(s);
    if (done.screen !== 'play') throw new Error('unexpected');
    expect(done.department).toBe('personnel');
    expect(done.state.officials).toHaveLength(s.state.officials.length);
    const again = toggleDepartment(done, 'personnel');
    const reopened = chooseCourtOption(done, 'recommend-officials', notables, names);
    expect(reopened).toBe(done);
    expect(again.screen).toBe('play');
  });

  it('UC-WEB-009 accept and decline do nothing outside the 舉薦 screen', () => {
    const onPlay = play(newState());
    expect(acceptRecommendation(onPlay)).toBe(onPlay);
    expect(declineRecommendation(onPlay)).toBe(onPlay);
  });

  it('UC-WEB-009 a decision with no candidate leaves the screen unchanged', () => {
    const s = recommendScreen();
    const empty: Recommend = { ...s, state: { ...s.state, recommendation: { turn: s.state.turn, candidate: null } } };
    expect(acceptRecommendation(empty)).toBe(empty);
    expect(declineRecommendation(empty)).toBe(empty);
  });

  it('UC-WEB-009 backToCourt returns from 舉薦人選 to 吏部', () => {
    const s = recommendScreen();
    expect(backToCourt(s)).toEqual({ screen: 'play', state: s.state, department: 'personnel' });
  });
});

/** Half-seasons before the last 舉薦 of recommend-notable: false skips 舉薦, true uses and declines it. */
const NOTABLE_PATH: boolean[] = [false, true, true, true, true, true, true];

describe('screenshot scenarios', () => {
  function harnessSeed(): number {
    let s = 0x2545f491;
    const bytes: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const r = nextRandom(s);
      s = r.rngState;
      bytes.push(Math.floor(r.value * 256));
    }
    return (bytes[0]! | (bytes[1]! << 8) | (bytes[2]! << 16) | (bytes[3]! << 24)) >>> 0;
  }
  function toCourt(): Screen {
    let s = startGame(harnessSeed(), gameText.eraNamePool);
    if (s.screen !== 'era') throw new Error('unexpected');
    s = chooseEraName(s, s.suggestions[0]!, regions, names, gameText.buildings);
    return toggleDepartment(goToPalace(s, 'xuanzheng'), 'personnel');
  }
  const open = (s: Screen): Screen => chooseCourtOption(s, 'recommend-officials', notables, names);
  function candidateOf(s: Screen) {
    if (s.screen !== 'recommend') throw new Error('unexpected');
    return s.state.recommendation!.candidate!;
  }
  /** Leaves 宣政殿 and rests through the three actions of the half-season. */
  function restHalfSeason(s: Screen): Screen {
    let cur = goToMap(s);
    for (let i = 0; i < 3; i += 1) {
      cur = continueToMap(performAction(goToPalace(cur, 'yangxin'), 'rest'));
    }
    return cur;
  }

  it('UC-WEB-009 the screenshot scenarios reach an ordinary candidate and a 名臣 with the harness seed', () => {
    expect(candidateOf(open(toCourt())).notable).toBeNull();
    let s: Screen = toCourt();
    for (const use of NOTABLE_PATH) {
      if (use) s = declineRecommendation(open(s));
      s = restHalfSeason(s);
      s = toggleDepartment(goToPalace(s, 'xuanzheng'), 'personnel');
    }
    expect(candidateOf(open(s)).notable).not.toBeNull();
  });
});

describe('開科取士', () => {
  type Exam = Extract<Screen, { screen: 'exam' }>;
  const personnel = (): Screen => toggleDepartment(inCourt(), 'personnel');
  function examScreen(): Exam {
    const s = chooseCourtOption(personnel(), 'hold-exams', notables, names);
    if (s.screen !== 'exam') throw new Error('unexpected');
    return s;
  }

  it('UC-WEB-010 hold-exams opens the exam screen with the drawn candidates', () => {
    const s = examScreen();
    expect(s.picks).toEqual([]);
    expect(s.state.exam?.candidates).toHaveLength(BALANCE.exam.candidates);
  });

  it('UC-WEB-007 hold-exams does nothing at turn 8 or once held this year', () => {
    const late = personnel();
    if (late.screen !== 'play') throw new Error('unexpected');
    const t8: Screen = { ...late, state: { ...late.state, turn: 8 } };
    expect(chooseCourtOption(t8, 'hold-exams', notables, names)).toBe(t8);
    const done = confirmExamPicks(examScreen());
    expect(chooseCourtOption(done, 'hold-exams', notables, names)).toBe(done);
  });

  it('UC-WEB-010 toggleExamPick adds in ascending order and removes on a second toggle', () => {
    let s: Screen = examScreen();
    s = toggleExamPick(s, 3);
    s = toggleExamPick(s, 1);
    expect((s as Exam).picks).toEqual([1, 3]);
    s = toggleExamPick(s, 3);
    expect((s as Exam).picks).toEqual([1]);
  });

  it('UC-WEB-010 toggleExamPick ignores bad input and other screens', () => {
    const s = examScreen();
    for (const bad of [NaN, -1, 30, 1.5]) expect(toggleExamPick(s, bad)).toBe(s);
    expect(toggleExamPick(inCourt(), 0)).toEqual(inCourt());
    const other = inCourt();
    expect(toggleExamPick(other, 0)).toBe(other);
  });

  it('UC-WEB-010 sortExam keeps picks and ignores unknown stats and other screens', () => {
    const s = toggleExamPick(examScreen(), 2);
    const sorted = sortExam(s, 'military') as Exam;
    expect(sorted.sort).toBe('military');
    expect(sorted.picks).toEqual([2]);
    expect(sortExam(s, 'bogus' as OfficialStatId)).toBe(s);
    const other = inCourt();
    expect(sortExam(other, 'military')).toBe(other);
  });

  it('UC-WEB-010 examCandidates orders by stat descending with ties by index', () => {
    const { state } = examScreen();
    const all = state.exam!.candidates!;
    expect(examCandidates(state).map((c) => c.index)).toEqual(all.map((_, i) => i));
    const sorted = examCandidates(state, 'military');
    expect(sorted).toHaveLength(all.length);
    for (let i = 1; i < sorted.length; i += 1) {
      const a = sorted[i - 1]!;
      const b = sorted[i]!;
      expect(a.candidate.stats.military).toBeGreaterThanOrEqual(b.candidate.stats.military);
      if (a.candidate.stats.military === b.candidate.stats.military) expect(a.index).toBeLessThan(b.index);
    }
    expect(examCandidates(newState())).toEqual([]);
  });

  it('UC-WEB-010 confirmExamPicks hires the picks and returns to 吏部', () => {
    const s = toggleExamPick(toggleExamPick(examScreen(), 0), 2) as Exam;
    const done = confirmExamPicks(s);
    expect(done.screen).toBe('play');
    if (done.screen !== 'play') throw new Error('unexpected');
    expect(done.department).toBe('personnel');
    expect(done.state.officials).toHaveLength(s.state.officials.length + 2);
    expect(canHoldExam(done.state)).toBe(false);
  });

  it('UC-WEB-010 confirming with no picks hires nobody; core rejection keeps the screen', () => {
    const s = examScreen();
    const done = confirmExamPicks(s);
    expect(done.screen).toBe('play');
    if (done.screen !== 'play') throw new Error('unexpected');
    expect(done.state.officials).toHaveLength(s.state.officials.length);
    const empty: Exam = { ...s, state: { ...s.state, exam: null } };
    expect(confirmExamPicks(empty)).toBe(empty);
    const other = inCourt();
    expect(confirmExamPicks(other)).toBe(other);
  });

  it('UC-WEB-010 backToCourt from exam returns to 宣政殿 吏部', () => {
    const s = examScreen();
    const back = backToCourt(s);
    expect(back).toEqual({ screen: 'play', state: s.state, department: 'personnel' });
  });

  it('UC-WEB-010 the non-exam-year screenshot path reaches 二年', () => {
    const regionsAll = gameText.regions;
    let s = chooseEraName(startGame(42, gameText.eraNamePool), '承平', regionsAll, names, gameText.buildings);
    for (let i = 0; i < 32; i += 1) {
      s = continueToMap(performAction(goToPalace(s, 'yangxin'), 'rest'));
    }
    s = toggleDepartment(goToPalace(s, 'xuanzheng'), 'personnel');
    if (s.screen !== 'play') throw new Error('unexpected');
    expect(getReignYear(s.state)).toBe(2);
    expect(canHoldExam(s.state)).toBe(false);
  });
});

describe('工部', () => {
  const step = BALANCE.works.step;
  const buildings = gameText.buildings;
  const court = (): Screen => toggleDepartment(goToPalace(play(newState()), 'xuanzheng'), 'works');
  const recruitScreen = (): Extract<Screen, { screen: 'recruit' }> => {
    const s = chooseCourtOption(court(), 'recruit-artisans', notables, names);
    if (s.screen !== 'recruit') throw new Error('expected recruit');
    return s;
  };
  const withArtisans = (): Screen => confirmRecruit(maxCount(recruitScreen()));
  const buildScreen = (): Extract<Screen, { screen: 'build' }> => {
    if (withArtisans().screen !== 'play') throw new Error('unexpected');
    const s = chooseCourtOption(withArtisans(), 'build', notables, names);
    if (s.screen !== 'build') throw new Error('expected build');
    return s;
  };
  const releaseScreen = (): Extract<Screen, { screen: 'release' }> => {
    const s = chooseCourtOption(withArtisans(), 'release-artisans', notables, names);
    if (s.screen !== 'release') throw new Error('expected release');
    return s;
  };

  it('UC-WEB-003 the started state has one building per building passed', () => {
    let s = startGame(42, gameText.eraNamePool);
    s = chooseEraName(s, '承平', regions, names, buildings);
    if (s.screen !== 'play') throw new Error('unexpected');
    expect(s.state.works.buildings.map((b) => b.id)).toEqual(buildings.map((b) => b.id));
    const few = chooseEraName(startGame(42, gameText.eraNamePool), '承平', regions, names, buildings.slice(0, 2));
    if (few.screen !== 'play') throw new Error('unexpected');
    expect(few.state.works.buildings).toHaveLength(2);
  });

  it('UC-WEB-007 recruit, release and build options open their screens', () => {
    const c = court();
    const s = chooseCourtOption(c, 'recruit-artisans', notables, names);
    expect(s).toMatchObject({ screen: 'recruit', count: step });
    if (c.screen !== 'play' || s.screen !== 'recruit') throw new Error('unexpected');
    expect(s.state).toBe(c.state);
    expect(chooseCourtOption(court(), 'build', notables, names)).toMatchObject({ screen: 'build' });
    expect(withArtisans()).toMatchObject({ screen: 'play', department: 'works' });
    expect(chooseCourtOption(withArtisans(), 'release-artisans', notables, names)).toMatchObject({
      screen: 'release',
      count: step,
    });
  });

  it('UC-WEB-007 recruit is refused once used and release without idle 工匠', () => {
    const c = court();
    expect(chooseCourtOption(c, 'release-artisans', notables, names)).toBe(c);
    const used = withArtisans();
    expect(chooseCourtOption(used, 'recruit-artisans', notables, names)).toBe(used);
  });

  it('UC-WEB-011 stepCount moves one step and stops at both ends', () => {
    const s = recruitScreen();
    expect(stepCount(s, 1)).toMatchObject({ screen: 'recruit', count: 2 * step });
    expect(stepCount(s, -1)).toBe(s);
    const top = maxCount(s);
    expect(top).toMatchObject({ screen: 'recruit', count: maxRecruit(s.state) });
    expect(stepCount(top, 1)).toBe(top);
  });

  it('UC-WEB-011 confirmRecruit recruits and returns to 工部', () => {
    const s = stepCount(recruitScreen(), 1);
    const done = confirmRecruit(s);
    if (done.screen !== 'play' || s.screen !== 'recruit') throw new Error('unexpected');
    expect(done.department).toBe('works');
    expect(done.state.works.artisans).toBe(2 * step);
    expect(canRecruit(done.state)).toBe(false);
  });

  it('UC-WEB-011 backToCourt from recruit, release and build opens 工部 unchanged', () => {
    for (const s of [recruitScreen(), releaseScreen(), buildScreen()]) {
      expect(backToCourt(s)).toEqual({ screen: 'play', state: s.state, department: 'works' });
    }
  });

  it('UC-WEB-011 count transitions on other screens are unchanged', () => {
    const c = court();
    expect(stepCount(c, 1)).toBe(c);
    expect(maxCount(c)).toBe(c);
    expect(confirmRecruit(c)).toBe(c);
    expect(confirmRelease(c)).toBe(c);
    expect(changeAssignment(c, 'observatory', 1)).toBe(c);
    const r = recruitScreen();
    expect(confirmRelease(r)).toBe(r);
  });

  it('UC-WEB-012 the release picker runs from one step to the idle 工匠', () => {
    const s = releaseScreen();
    const idle = idleArtisans(s.state);
    expect(stepCount(s, -1)).toBe(s);
    expect(maxCount(s)).toMatchObject({ count: idle });
    expect(stepCount(maxCount(s), 1)).toEqual(maxCount(s));
    expect(stepCount(s, 1)).toMatchObject({ count: 2 * step });
  });

  it('UC-WEB-012 confirmRelease lowers 工匠 and returns to 工部', () => {
    const s = releaseScreen();
    const done = confirmRelease(s);
    if (done.screen !== 'play') throw new Error('unexpected');
    expect(done.department).toBe('works');
    expect(done.state.works.artisans).toBe(s.state.works.artisans - step);
    const all = confirmRelease(maxCount(s));
    if (all.screen !== 'play') throw new Error('unexpected');
    expect(all.state.works.artisans).toBe(0);
  });

  it('UC-WEB-013 changeAssignment moves one step and stays on build', () => {
    const s = buildScreen();
    const up = changeAssignment(s, 'observatory', 1);
    if (up.screen !== 'build') throw new Error('unexpected');
    expect(up.state.works.buildings.find((b) => b.id === 'observatory')!.assigned).toBe(step);
    const down = changeAssignment(up, 'observatory', -1);
    if (down.screen !== 'build') throw new Error('unexpected');
    expect(down.state.works.buildings.find((b) => b.id === 'observatory')!.assigned).toBe(0);
  });

  it('UC-WEB-013 changeAssignment refuses what core refuses', () => {
    const s = buildScreen();
    expect(changeAssignment(s, 'observatory', -1)).toBe(s);
    expect(changeAssignment(s, 'no-such-building', 1)).toBe(s);
    expect(changeAssignment(s, 'observatory', 2 as 1)).toBe(s);
    const done: Screen = {
      ...s,
      state: {
        ...s.state,
        works: {
          ...s.state.works,
          buildings: s.state.works.buildings.map((b) => (b.id === 'observatory' ? { ...b, progress: b.required } : b)),
        },
      },
    };
    expect(changeAssignment(done, 'observatory', 1)).toBe(done);
    const idle: Screen = { screen: 'build', state: { ...s.state, works: { ...s.state.works, artisans: 0 } } };
    expect(changeAssignment(idle, 'observatory', 1)).toBe(idle);
  });

  it('UC-WEB-004 a turn that completes a building lists it in the summary', () => {
    const s = buildScreen();
    const nearly: Screen = {
      ...s,
      state: {
        ...s.state,
        works: {
          ...s.state.works,
          buildings: s.state.works.buildings.map((b) =>
            b.id === 'observatory' ? { ...b, progress: b.required - step, assigned: step } : b,
          ),
        },
      },
    };
    let t: Screen = goToMap(backToCourt(nearly));
    for (let i = 0; i < 2; i += 1) t = continueToMap(performAction(goToPalace(t, 'yangxin'), 'rest'));
    const summary = performAction(goToPalace(t, 'yangxin'), 'rest');
    if (summary.screen !== 'summary') throw new Error('expected summary');
    expect(summary.completed).toEqual(['observatory']);
  });

  it('UC-WEB-013 the summary screenshot path completes 觀星臺', () => {
    let s = startGame(harnessSeedOf(), gameText.eraNamePool);
    s = chooseEraName(s, (s as Extract<Screen, { screen: 'era' }>).suggestions[0]!, regions, names, buildings);
    s = toggleDepartment(goToPalace(s, 'xuanzheng'), 'works');
    s = confirmRecruit(maxCount(chooseCourtOption(s, 'recruit-artisans', notables, names)));
    s = chooseCourtOption(s, 'build', notables, names);
    for (let i = 0; i < 10; i += 1) s = changeAssignment(s, 'observatory', 1);
    s = goToMap(backToCourt(s));
    for (let i = 0; i < 2; i += 1) s = continueToMap(performAction(goToPalace(s, 'yangxin'), 'rest'));
    const last = performAction(goToPalace(s, 'yangxin'), 'rest');
    if (last.screen !== 'summary') throw new Error('expected summary');
    expect(last.completed).toEqual(['observatory']);
    expect(last.economy.wages).toBe(150000);
  });
});

function harnessSeedOf(): number {
  let s = 0x2545f491;
  const bytes: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const r = nextRandom(s);
    s = r.rngState;
    bytes.push(Math.floor(r.value * 256));
  }
  return (bytes[0]! | (bytes[1]! << 8) | (bytes[2]! << 16) | (bytes[3]! << 24)) >>> 0;
}

describe('戶部 screens', () => {
  const court = enterPalace(newState(), 'xuanzheng');
  const play: Screen = { screen: 'play', state: court, department: 'revenue' };
  const open = (id: 'adjust-taxes' | 'extra-levy' | 'budget-sheet'): Screen =>
    chooseCourtOption(play, id, notables, names);

  it('UC-WEB-007 戶部 options open their screens', () => {
    expect(open('adjust-taxes')).toEqual({ screen: 'taxes', state: court });
    expect(open('budget-sheet')).toEqual({ screen: 'budget', state: court });
    expect(open('extra-levy')).toEqual({ screen: 'levy', state: court });
    const used: Screen = { screen: 'play', state: { ...court, revenue: { ...court.revenue, leviedTurn: court.turn } } };
    expect(chooseCourtOption(used, 'extra-levy', notables, names)).toBe(used);
  });

  it('UC-WEB-014 setTax saves the level and stays', () => {
    const taxes = open('adjust-taxes');
    for (const level of ['heavy', 'light'] as const) {
      const next = setTax(taxes, level);
      if (next.screen !== 'taxes') throw new Error('expected taxes');
      expect(next.state.revenue.taxLevel).toBe(level);
      expect(next.state.nation.treasury).toBe(court.nation.treasury);
    }
    const budget = open('budget-sheet');
    expect(setTax(budget, 'heavy')).toBe(budget);
    expect(setTax(taxes, 'bogus' as never)).toBe(taxes);
  });

  it('UC-WEB-015 confirmLevy levies once and records the amount', () => {
    const levy = open('extra-levy');
    const done = confirmLevy(levy);
    if (done.screen !== 'levy') throw new Error('expected levy');
    expect(done.gained).toBe(levyAmount(court));
    expect(done.state.nation.treasury).toBe(court.nation.treasury + levyAmount(court));
    expect(confirmLevy(done)).toBe(done);
    const taxes = open('adjust-taxes');
    expect(confirmLevy(taxes)).toBe(taxes);
  });

  it('UC-WEB-014 UC-WEB-015 UC-WEB-016 backToCourt opens 戶部', () => {
    for (const id of ['adjust-taxes', 'extra-levy', 'budget-sheet'] as const) {
      expect(backToCourt(open(id))).toEqual({ screen: 'play', state: court, department: 'revenue' });
    }
    const done = confirmLevy(open('extra-levy'));
    const back = backToCourt(done);
    if (back.screen !== 'play') throw new Error('expected play');
    expect(canLevy(back.state)).toBe(false);
  });
});

describe('祭祀 screens', () => {
  const court = enterPalace(newState(), 'xuanzheng');
  const courtScreen: Screen = { screen: 'play', state: court, department: 'rites' };
  const sacrificeScreen: Screen = { screen: 'sacrifice', state: court };

  it('UC-WEB-007 祭祀 opens its screen once per reign year', () => {
    expect(chooseCourtOption(courtScreen, 'hold-sacrifice', notables, names)).toEqual(sacrificeScreen);
    const used: Screen = { screen: 'play', state: { ...court, rites: { sacrificeTurn: court.turn } }, department: 'rites' };
    expect(chooseCourtOption(used, 'hold-sacrifice', notables, names)).toBe(used);
    expect(chooseCourtOption(courtScreen, 'conduct-diplomacy', notables, names)).toBe(courtScreen);
  });

  it('UC-WEB-017 confirmSacrifice holds it and returns to 禮部', () => {
    const done = confirmSacrifice(sacrificeScreen);
    if (done.screen !== 'play') throw new Error('expected play');
    expect(done.department).toBe('rites');
    expect(done.state.location).toBe('xuanzheng');
    expect(done.state.actionPoint).toBe(0);
    expect(done.state.nation.treasury).toBe(court.nation.treasury - BALANCE.rites.sacrificeCost);
    const levy: Screen = { screen: 'levy', state: court };
    expect(confirmSacrifice(levy)).toBe(levy);
    expect(confirmSacrifice(courtScreen)).toBe(courtScreen);
  });

  it('UC-WEB-017 返回 does not hold it', () => {
    const back = backToCourt(sacrificeScreen);
    expect(back).toEqual(courtScreen);
    if (back.screen !== 'play') throw new Error('expected play');
    expect(back.state).toBe(court);
  });

  it('UC-WEB-007 leaving after 祭祀 lands on 夕', () => {
    const left = goToMap(confirmSacrifice(sacrificeScreen));
    if (left.screen !== 'play') throw new Error('expected play');
    expect(left.state.location).toBe('map');
    expect(left.state.actionPoint).toBe(2);
  });

  it('UC-WEB-007 after 祭祀 the other 禮部 and 戶部 options still work', () => {
    const done = confirmSacrifice(sacrificeScreen);
    expect(chooseCourtOption(done, 'adjust-taxes', notables, names).screen).toBe('taxes');
    expect(chooseCourtOption(done, 'hold-sacrifice', notables, names)).toBe(done);
  });
});

describe('兵部', () => {
  const army = BALANCE.army.step;
  const war = (): Screen => toggleDepartment(goToPalace(play(newState()), 'xuanzheng'), 'war');
  const conscriptScreen = (): Extract<Screen, { screen: 'conscript' }> => {
    const s = chooseCourtOption(war(), 'conscript-soldiers', notables, names);
    if (s.screen !== 'conscript') throw new Error('expected conscript');
    return s;
  };
  const dischargeScreen = (): Extract<Screen, { screen: 'discharge' }> => {
    const s = chooseCourtOption(war(), 'release-soldiers', notables, names);
    if (s.screen !== 'discharge') throw new Error('expected discharge');
    return s;
  };

  it('UC-WEB-018 opens 徵召士兵 at one step and confirms back to 兵部', () => {
    const s = conscriptScreen();
    expect(s.count).toBe(army);
    expect(stepCount(s, 1)).toMatchObject({ screen: 'conscript', count: 2 * army });
    expect(maxCount(s)).toMatchObject({ count: maxConscript(s.state) });
    const done = confirmConscript(s);
    if (done.screen !== 'play') throw new Error('unexpected');
    expect(done.department).toBe('war');
    expect(done.state.army.soldiers).toBe(30000);
    expect(chooseCourtOption(done, 'conscript-soldiers', notables, names)).toBe(done);
    expect(backToCourt(s)).toEqual({ screen: 'play', state: s.state, department: 'war' });
    expect(backToCourt(s)).toMatchObject({ state: s.state });
  });

  it('UC-WEB-019 解甲歸田 opens at one step and releases all soldiers', () => {
    const s = dischargeScreen();
    expect(s.count).toBe(army);
    expect(maxCount(s)).toMatchObject({ count: 20000 });
    const done = confirmDischarge(maxCount(s));
    if (done.screen !== 'play') throw new Error('unexpected');
    expect(done.department).toBe('war');
    expect(done.state.army.soldiers).toBe(0);
    expect(chooseCourtOption(done, 'release-soldiers', notables, names)).toBe(done);
    expect(backToCourt(s)).toEqual({ screen: 'play', state: s.state, department: 'war' });
  });

  it('UC-WEB-018 stepCount past either end is unchanged, and other screens ignore the confirms', () => {
    const c = conscriptScreen();
    expect(stepCount(c, -1)).toBe(c);
    const top = maxCount(c);
    expect(stepCount(top, 1)).toBe(top);
    const d = dischargeScreen();
    expect(stepCount(d, -1)).toBe(d);
    const dTop = maxCount(d);
    expect(stepCount(dTop, 1)).toBe(dTop);
    const w = war();
    expect(confirmConscript(w)).toBe(w);
    expect(confirmDischarge(w)).toBe(w);
    expect(confirmDischarge(c)).toBe(c);
  });

  const drillScreen = (): Extract<Screen, { screen: 'drill' }> => {
    const s = chooseCourtOption(war(), 'drill-troops', notables, names);
    if (s.screen !== 'drill') throw new Error('expected drill');
    return s;
  };

  it('UC-WEB-020 操練軍隊 opens, confirms in place and refuses a second drill', () => {
    const s = drillScreen();
    const before = s.state.nation.treasury;
    const done = confirmDrill(s);
    if (done.screen !== 'drill') throw new Error('expected drill');
    expect(done.state.nation.treasury).toBe(before - BALANCE.army.drillCost);
    expect(drillTurnsLeft(done.state)).toBe(8);
    expect(confirmDrill(done)).toBe(done);
    expect(backToCourt(done)).toEqual({ screen: 'play', state: done.state, department: 'war' });
    expect(chooseCourtOption(backToCourt(done), 'drill-troops', notables, names)).toMatchObject({ screen: 'drill' });
    const w = war();
    expect(confirmDrill(w)).toBe(w);
  });

  it('UC-WEB-004 the summary copies TurnEnd.training', () => {
    const turnEnd = (start: Screen): Extract<Screen, { screen: 'summary' }> => {
      let t: Screen = goToMap(backToCourt(start));
      for (let i = 0; i < 2; i += 1) t = continueToMap(performAction(goToPalace(t, 'yangxin'), 'rest'));
      const last = performAction(goToPalace(t, 'yangxin'), 'rest');
      if (last.screen !== 'summary') throw new Error('expected summary');
      return last;
    };
    expect(turnEnd(confirmDrill(drillScreen())).training).toBe(2);
    expect(turnEnd(war()).training).toBeNull();
  });
});
