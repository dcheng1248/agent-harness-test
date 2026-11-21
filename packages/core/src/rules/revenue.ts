import { BALANCE } from "../model/balance";
import { HALF_SEASONS } from "../model/calendar";
import type { HalfSeasonId } from "../model/calendar";
import { PLAYER_OWNER } from "../model/region";
import { TAX_LEVEL_IDS } from "../model/revenue";
import type { TaxLevelId } from "../model/revenue";
import type { GameState } from "../model/state";
import { regionTax } from "./economy";
import { isMorningCourt } from "./turn";

export type RevenueRejection = "not-in-court" | "unknown-level" | "already-used";
export type RevenueOutcome =
  | { ok: false; reason: RevenueRejection; state: GameState }
  | { ok: true; state: GameState; amount: number };

const reject = (reason: RevenueRejection, state: GameState): RevenueOutcome => ({ ok: false, reason, state });

export function expectedTax(
  state: GameState,
  level: TaxLevelId = state.revenue.taxLevel,
): { region: string; tax: number }[] {
  return state.regions
    .filter((r) => r.owner === PLAYER_OWNER)
    .map((r) => ({ region: r.id, tax: regionTax(r.stats, level) }));
}

export function nextCollection(state: Pick<GameState, "turn">): HalfSeasonId {
  const n = BALANCE.turnsPerYear;
  for (let k = 1; k <= n; k += 1) {
    const id = HALF_SEASONS[(state.turn + k) % n] as HalfSeasonId;
    if (BALANCE.tax.collectOn.includes(id)) return id;
  }
  throw new Error("no collection half-season");
}

export function setTaxLevel(state: GameState, level: TaxLevelId): RevenueOutcome {
  if (!isMorningCourt(state)) return reject("not-in-court", state);
  if (!TAX_LEVEL_IDS.includes(level)) return reject("unknown-level", state);
  return { ok: true, state: { ...state, revenue: { ...state.revenue, taxLevel: level } }, amount: 0 };
}

export function levyAmount(state: GameState): number {
  return expectedTax(state).reduce((sum, e) => sum + Math.floor(e.tax * BALANCE.tax.levyFraction), 0);
}

export function canLevy(state: GameState): boolean {
  return isMorningCourt(state) && state.revenue.leviedTurn !== state.turn;
}

export function levy(state: GameState): RevenueOutcome {
  if (!isMorningCourt(state)) return reject("not-in-court", state);
  if (state.revenue.leviedTurn === state.turn) return reject("already-used", state);
  const amount = levyAmount(state);
  return {
    ok: true,
    amount,
    state: {
      ...state,
      nation: { ...state.nation, treasury: state.nation.treasury + amount },
      regions: state.regions.map((r) =>
        r.owner === PLAYER_OWNER
          ? { ...r, stats: { ...r.stats, morale: Math.max(0, r.stats.morale - BALANCE.tax.levyMoraleLoss) } }
          : r,
      ),
      revenue: { ...state.revenue, leviedTurn: state.turn },
    },
  };
}
