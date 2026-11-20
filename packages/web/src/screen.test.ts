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
} from '@emperor/core';
import {
  acceptRecommendation,
  appoint,
  backToCourt,
  cancelPost,
  chooseCourtOption,
  chooseEraName,
  closeAtlas,
  continueToMap,
  declineRecommendation,
  goToMap,
  goToPalace,
  idleOfficials,
  openAtlas,
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
  return createInitialState(42, '承平', regions, names);
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
    expect(chooseEraName(era, ' 承平 ', regions, names)).toEqual({
      screen: 'play',
      state: newState(),
    });
  });

  it('UC-WEB-003 an invalid 年號 shows the error and keeps the typed text', () => {
    for (const input of ['承', 'abc', '<b>']) {
      expect(chooseEraName(era, input, regions, names)).toEqual({ ...era, error: true, draft: input });
    }
  });

  it('UC-WEB-003 chooseEraName on another screen is unchanged', () => {
    const title: Screen = { screen: 'title' };
    expect(chooseEraName(title, '承平', regions, names)).toBe(title);
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
    s = chooseEraName(s, s.suggestions[0]!, regions, names);
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
