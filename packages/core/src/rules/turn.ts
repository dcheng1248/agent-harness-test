import { BALANCE } from "../model/balance";
import type { StatChange } from "../model/balance";
import { HALF_SEASONS, getActionPointId, getAge } from "../model/calendar";
import { CATALOG, PALACE_IDS } from "../model/catalog";
import type { ActionId, Catalog, PalaceId } from "../model/catalog";
import type { GameState } from "../model/state";
import { EMPEROR_STAT_IDS, STAT_REGISTRY } from "../model/stats";
import type { StatId, StatValues } from "../model/stats";
import { settleEconomy } from "./economy";
import type { EconomyReport } from "./economy";
import { randomInt } from "./random";

export type ActionRejection =
  "dead" | "not-in-palace" | "not-offered" | "not-allowed-now";
export interface TurnEnd {
  aging: number;
  totals: StatChange[];
  economy: EconomyReport;
}
export type ActionOutcome =
  | { ok: false; reason: ActionRejection; state: GameState }
  | {
      ok: true;
      state: GameState;
      changes: StatChange[];
      turnEnd: TurnEnd | null;
    };

export function enterPalace(
  state: GameState,
  palaceId: PalaceId,
  _catalog: Catalog = CATALOG,
): GameState {
  if (state.dead || state.location !== "map" || !PALACE_IDS.includes(palaceId))
    return state;
  return { ...state, location: palaceId };
}

export function returnToMap(state: GameState): GameState {
  if (state.dead) return state;
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
      economy: { taxIncome: 0, upkeep: 0, regionChanges: [] },
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
    HALF_SEASONS[(state.turn + 1) % BALANCE.turnsPerYear],
  );
  const turnEnd: TurnEnd = { aging, totals, economy: settled.report };
  const zero = { health: 0, learning: 0, arts: 0, resolve: 0 };
  return {
    ok: true,
    state: {
      ...used,
      stats: agedStats,
      nation: settled.nation,
      regions: settled.regions,
      turn: state.turn + 1,
      actionPoint: 0,
      turnDeltas: zero,
    },
    changes,
    turnEnd,
  };
}
