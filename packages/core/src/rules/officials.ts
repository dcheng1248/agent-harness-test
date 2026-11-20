import { BALANCE } from "../model/balance";
import { listPosts, REGION_OFFICES } from "../model/officials";
import type { NamePool, Official, PostId } from "../model/officials";
import { PLAYER_OWNER } from "../model/region";
import type { GameState } from "../model/state";
import { OFFICIAL_STAT_IDS } from "../model/stats";
import type { OfficialStatValues } from "../model/stats";
import { nextRandom } from "../rng";
import { isMorningCourt } from "./turn";
import { randomInt } from "./random";

export type AppointRejection =
  "not-in-court" | "region-not-owned" | "unknown-post" | "unknown-official" | "not-idle";
export type AppointOutcome =
  | { ok: false; reason: AppointRejection; state: GameState }
  | { ok: true; state: GameState };

/**
 * Draws one ordinary official (post `null`) from the random stream: outlier roll,
 * then one draw per stat, then name draws until the name is neither taken nor reserved.
 */
export function drawOfficial(
  rngState: number,
  id: string,
  names: NamePool,
  taken: ReadonlySet<string>,
): { official: Official; rngState: number } {
  const roll = nextRandom(rngState);
  let rng = roll.rngState;
  const table =
    roll.value < BALANCE.officials.outlierChance
      ? BALANCE.officials.outlier
      : BALANCE.officials.ordinary;
  const stats = {} as OfficialStatValues;
  for (const stat of OFFICIAL_STAT_IDS) {
    const draw = randomInt(rng, table[stat].min, table[stat].max);
    stats[stat] = draw.value;
    rng = draw.rngState;
  }
  for (let tries = 0; tries < BALANCE.officials.maxNameDraws; tries += 1) {
    const surname = randomInt(rng, 0, names.surnames.length - 1);
    const given = randomInt(surname.rngState, 0, names.givenNames.length - 1);
    rng = given.rngState;
    const name = `${names.surnames[surname.value]}${names.givenNames[given.value]}`;
    if (!taken.has(name) && !names.reserved.includes(name))
      return { official: { id, name, stats, post: null, notable: null }, rngState: rng };
  }
  throw new Error("official name pool exhausted");
}

/** Puts a 賦閑 official into a post during 早朝; the previous holder becomes 賦閑. */
export function appointOfficial(
  state: GameState,
  postId: PostId,
  officialId: string,
): AppointOutcome {
  if (!isMorningCourt(state)) return { ok: false, reason: "not-in-court", state };
  const foreignOffice = state.regions.some(
    (region) =>
      region.owner !== PLAYER_OWNER &&
      REGION_OFFICES.some((office) => postId === `${region.id}-${office}`),
  );
  if (foreignOffice) return { ok: false, reason: "region-not-owned", state };
  if (!listPosts(state).some((p) => p.id === postId))
    return { ok: false, reason: "unknown-post", state };
  const official = state.officials.find((o) => o.id === officialId);
  if (!official) return { ok: false, reason: "unknown-official", state };
  if (official.post !== null) return { ok: false, reason: "not-idle", state };
  return {
    ok: true,
    state: {
      ...state,
      officials: state.officials.map((o) =>
        o.id === officialId
          ? { ...o, post: postId }
          : o.post === postId
            ? { ...o, post: null }
            : o,
      ),
    },
  };
}
