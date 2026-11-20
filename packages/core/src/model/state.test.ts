import { describe, expect, it } from 'vitest';
import {
  STAT_IDS,
  STAT_REGISTRY,
  createInitialState,
  getActionPointId,
  getAge,
  getHalfSeason,
  getReignYear,
} from '../index';

describe('initial state', () => {
  it('UC-CORE-001 same seed gives the same starting state', () => {
    expect(createInitialState(7, '承平')).toEqual(createInitialState(7, '承平'));
  });

  it('UC-CORE-001 starting stats add up to the budget and stay within bounds', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const { stats } = createInitialState(seed, '承平');
      expect(STAT_IDS.reduce((sum, id) => sum + stats[id], 0)).toBe(150);
      for (const id of STAT_IDS) {
        expect(stats[id]).toBeGreaterThanOrEqual(15);
        expect(stats[id]).toBeLessThanOrEqual(70);
      }
    }
  });

  it('UC-CORE-001 starting stats force tradeoffs across seeds', () => {
    let found = false;
    for (let seed = 0; seed < 500; seed += 1) {
      const values = STAT_IDS.map((id) => createInitialState(seed, '承平').stats[id]);
      if (Math.max(...values) >= 50 && Math.min(...values) <= 25) found = true;
    }
    expect(found).toBe(true);
  });

  it('UC-CORE-001 initial state starts at 元年春上, 朝, age 16, on the map', () => {
    const state = createInitialState(7, '承平');
    expect(state).toMatchObject({
      schemaVersion: 2,
      seed: 7,
      eraName: '承平',
      turn: 0,
      actionPoint: 0,
      location: 'map',
      dead: false,
      turnDeltas: { health: 0, learning: 0, arts: 0, resolve: 0 },
    });
    expect([getAge(state), getReignYear(state), getHalfSeason(state), getActionPointId(state)]).toEqual([
      16,
      1,
      'spring-early',
      'dawn',
    ]);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('derives calendar values from the turn', () => {
    const state = { ...createInitialState(7, '承平'), turn: 17, actionPoint: 2 };
    expect([getAge(state), getReignYear(state), getHalfSeason(state), getActionPointId(state)]).toEqual([
      18,
      3,
      'spring-late',
      'dusk',
    ]);
  });

  it('every stat in the registry is 0 to 100 and owned by the emperor', () => {
    expect(STAT_REGISTRY.map((s) => s.id)).toEqual([...STAT_IDS]);
    for (const stat of STAT_REGISTRY) {
      expect([stat.min, stat.max, stat.owner]).toEqual([0, 100, 'emperor']);
    }
  });
});
