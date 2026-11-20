import { describe, expect, it } from 'vitest';
import { gameText } from '@emperor/content';
import {
  createInitialState,
  drawEraNameSuggestions,
  enterPalace,
  takeAction,
  type GameState,
} from '@emperor/core';
import {
  chooseEraName,
  continueToMap,
  goToMap,
  goToPalace,
  performAction,
  restart,
  startGame,
  type Screen,
} from './screen';

const era = startGame(42, gameText.eraNamePool);

function play(state: GameState): Screen {
  return { screen: 'play', state };
}

function inChongwen(state: GameState = createInitialState(42, '承平')): Screen {
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
    expect(chooseEraName(era, ' 承平 ')).toEqual({
      screen: 'play',
      state: createInitialState(42, '承平'),
    });
  });

  it('UC-WEB-003 an invalid 年號 shows the error and keeps the typed text', () => {
    for (const input of ['承', 'abc', '<b>']) {
      expect(chooseEraName(era, input)).toEqual({ ...era, error: true, draft: input });
    }
  });

  it('UC-WEB-003 chooseEraName on another screen is unchanged', () => {
    const title: Screen = { screen: 'title' };
    expect(chooseEraName(title, '承平')).toBe(title);
  });
});

describe('palace loop', () => {
  it('UC-WEB-004 entering a palace and going back keep the action point', () => {
    const start = play(createInitialState(42, '承平'));
    const inside = goToPalace(start, 'chongwen');
    expect(inside).toEqual(play(enterPalace(createInitialState(42, '承平'), 'chongwen')));
    expect(goToMap(inside)).toEqual(start);
  });

  it('UC-WEB-004 an action shows its result', () => {
    const before = createInitialState(42, '承平');
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
    let screen: Screen = play(createInitialState(42, '承平'));
    for (let i = 0; i < 3; i += 1) {
      screen = continueToMap(performAction(goToPalace(screen, 'qingong'), 'rest'));
      expect(screen.screen).toBe('play');
    }
    const last = goToPalace(screen, 'qingong');
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
    });
    expect(outcome.state.turn).toBe(1);
    expect(continueToMap(summary)).toEqual(play(outcome.state));
  });

  it('UC-WEB-004 a rejected action leaves the screen unchanged', () => {
    const onMap = play(createInitialState(42, '承平'));
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
    expect(goToPalace(inChongwen(), 'hanmo')).toEqual(inChongwen());
  });
});

describe('ending', () => {
  it('UC-WEB-005 death goes to the ending', () => {
    const state = { ...createInitialState(42, '承平'), stats: { ...createInitialState(42, '承平').stats, health: 1 } };
    const result = performAction(inChongwen(state), 'study');
    expect(result.screen).toBe('ending');
    if (result.screen === 'ending') expect(result.state.dead).toBe(true);
  });

  it('UC-WEB-005 death from aging on the 4th action goes to the ending, not the summary', () => {
    const base = createInitialState(42, '承平');
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
