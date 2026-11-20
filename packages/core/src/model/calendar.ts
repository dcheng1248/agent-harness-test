import { BALANCE } from './balance';
import type { GameState } from './state';

export const HALF_SEASONS = [
  'spring-early',
  'spring-late',
  'summer-early',
  'summer-late',
  'autumn-early',
  'autumn-late',
  'winter-early',
  'winter-late',
] as const;
export type HalfSeasonId = (typeof HALF_SEASONS)[number];

export const ACTION_POINTS = ['dawn', 'noon', 'dusk', 'night'] as const;
export type ActionPointId = (typeof ACTION_POINTS)[number];

type CalendarState = Pick<GameState, 'turn' | 'actionPoint'>;

export function getAge(state: CalendarState): number {
  return BALANCE.ascensionAge + Math.floor(state.turn / BALANCE.turnsPerYear);
}

export function getReignYear(state: CalendarState): number {
  return Math.floor(state.turn / BALANCE.turnsPerYear) + 1;
}

export function getHalfSeason(state: CalendarState): HalfSeasonId {
  return HALF_SEASONS[state.turn % BALANCE.turnsPerYear] as HalfSeasonId;
}

export function getActionPointId(state: CalendarState): ActionPointId {
  return ACTION_POINTS[state.actionPoint] as ActionPointId;
}
