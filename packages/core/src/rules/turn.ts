import { BALANCE } from "../model/balance";
import type { StatChange } from "../model/balance";
import { ACTION_POINTS, HALF_SEASONS, getActionPointId, getAge, type HalfSeasonId } from "../model/calendar";
import { CATALOG, COURT_ACTION_POINT, COURT_PALACE_ID, PALACE_IDS } from "../model/catalog";
import type { ActionId, Catalog, PalaceId } from "../model/catalog";
import type { GameState } from "../model/state";
import { EMPEROR_STAT_IDS, STAT_REGISTRY } from "../model/stats";
import type { StatId, StatValues } from "../model/stats";
import { legionSoldiers, marchLegions } from "./legions";
import { settleEconomy } from "./economy";
import type { EconomyReport } from "./economy";
import { advanceBuildings } from "../model/works";
import { randomInt } from "./random";
import { drillTurnsLeft } from "./army";

export type ActionRejection =
  "dead" | "not-in-palace" | "not-offered" | "not-allowed-now";
export interface TurnEnd {
  aging: number;
  totals: StatChange[];
  economy: EconomyReport;
  completed: string[];
  /** Training gained from a running drill; null when none is running. */
  training: number | null;
}
export type ActionOutcome =
  | { ok: false; reason: ActionRejection; state: GameState }
  | {
      ok: true;
      state: GameState;
      changes: StatChange[];
      turnEnd: TurnEnd | null;
    };

/** Alive, on the map, a known palace, and open now (宣政殿 only at 朝). */
export function canEnterPalace(state: GameState, palaceId: PalaceId): boolean {
  if (state.dead || state.location !== "map" || !PALACE_IDS.includes(palaceId))
    return false;
  return palaceId !== COURT_PALACE_ID || getActionPointId(state) === COURT_ACTION_POINT;
}

/** 早朝: alive and in 宣政殿. */
export function isMorningCourt(state: GameState): boolean {
  return !state.dead && state.location === COURT_PALACE_ID;
}

export function enterPalace(
  state: GameState,
  palaceId: PalaceId,
  _catalog: Catalog = CATALOG,
): GameState {
  if (!canEnterPalace(state, palaceId)) return state;
  return { ...state, location: palaceId };
}

/**
 * Leaving 宣政殿 spends 朝 and puts the clock on the next action point (午),
 * or on 夕 when 祭祀 was held during this 早朝.
 */
export function returnToMap(state: GameState): GameState {
  if (state.dead) return state;
  if (state.location === COURT_PALACE_ID)
    return {
      ...state,
      location: "map",
      actionPoint: ACTION_POINTS.indexOf(COURT_ACTION_POINT) +
        (state.rites.sacrificeTurn === state.turn ? 2 : 1),
    };
  return { ...state, location: "map" };
}

function clamp(stat: StatId, value: number): number {
  const def = STAT_REGISTRY.find((s) => s.id === stat);
  return Math.min(def?.max ?? value, Math.max(def?.min ?? value, value));
}

function agingLoss(state: GameState): number {
  const { startAge, baseLoss, yearsPerStep } = BALANCE.aging;
  const age = getAge(state);
  return age >= startAge
    ? baseLoss + Math.floor((age - startAge) / yearsPerStep)
    : 0;
}

function nonZeroChanges(values: StatValues): StatChange[] {
  return EMPEROR_STAT_IDS.filter((id) => values[id] !== 0).map((id) => ({
    stat: id,
    amount: values[id],
  }));
}

export function takeAction(
  state: GameState,
  actionId: ActionId,
  catalog: Catalog = CATALOG,
): ActionOutcome {
  if (state.dead) return { ok: false, reason: "dead", state };
  if (state.location === "map")
    return { ok: false, reason: "not-in-palace", state };
  if (!catalog.palaces[state.location].actions.includes(actionId)) {
    return { ok: false, reason: "not-offered", state };
  }
  if (!catalog.actions[actionId].allowedIn.includes(getActionPointId(state))) {
    return { ok: false, reason: "not-allowed-now", state };
  }

  const draw = randomInt(
    state.rngState,
    -BALANCE.actionVariance,
    BALANCE.actionVariance,
  );
  const stats = { ...state.stats };
  const turnDeltas = { ...state.turnDeltas };
  const changes: StatChange[] = [];
  BALANCE.actions[actionId].forEach((effect, i) => {
    const wanted = effect.amount + (i === 0 ? draw.value : 0);
    const next = clamp(effect.stat, stats[effect.stat] + wanted);
    const applied = next - stats[effect.stat];
    stats[effect.stat] = next;
    if (applied !== 0) {
      changes.push({ stat: effect.stat, amount: applied });
      turnDeltas[effect.stat] += applied;
    }
  });

  const used: GameState = {
    ...state,
    rngState: draw.rngState,
    stats,
    turnDeltas,
    location: "map",
    actionPoint: state.actionPoint + 1,
  };

  if (stats.health <= 0) {
    return {
      ok: true,
      state: { ...used, actionPoint: state.actionPoint, dead: true },
      changes,
      turnEnd: null,
    };
  }
  if (used.actionPoint < BALANCE.actionPointsPerTurn) {
    return { ok: true, state: used, changes, turnEnd: null };
  }

  const aging = agingLoss(state);
  const agedStats = { ...stats, health: clamp("health", stats.health - aging) };
  const totalsRaw = {
    ...turnDeltas,
    health: turnDeltas.health + (agedStats.health - stats.health),
  };
  const totals = nonZeroChanges(totalsRaw);
  if (agedStats.health <= 0) {
    const turnEnd: TurnEnd = {
      aging,
      totals,
      economy: { taxIncome: 0, upkeep: 0, wages: 0, soldierWages: 0, legionWages: 0, regionChanges: [] },
      completed: [],
      training: null,
    };
    return {
      ok: true,
      state: {
        ...used,
        stats: agedStats,
        actionPoint: state.actionPoint,
        dead: true,
      },
      changes,
      turnEnd,
    };
  }
  const settled = settleEconomy(
    state.nation,
    state.regions,
    HALF_SEASONS[(state.turn + 1) % BALANCE.turnsPerYear] as HalfSeasonId,
    state.works.artisans,
    state.revenue.taxLevel,
    state.army.soldiers,
    legionSoldiers(state),
  );
  const advanced = advanceBuildings(state.works.buildings);
  const drilling = drillTurnsLeft(state) > 0;
  const trained = drilling
    ? Math.min(BALANCE.army.maxTraining, state.army.training + BALANCE.army.drillGain)
    : state.army.training;
  const turnEnd: TurnEnd = {
    aging,
    totals,
    economy: settled.report,
    completed: advanced.completed,
    training: drilling ? trained - state.army.training : null,
  };
  const zero = { health: 0, learning: 0, arts: 0, resolve: 0 };
  return {
    ok: true,
    state: {
      ...used,
      stats: agedStats,
      nation: settled.nation,
      regions: settled.regions,
      works: { ...state.works, buildings: advanced.buildings },
      army: marchLegions({ ...state.army, training: trained }),
      turn: state.turn + 1,
      actionPoint: 0,
      turnDeltas: zero,
    },
    changes,
    turnEnd,
  };
}
