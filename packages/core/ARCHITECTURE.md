# core

Owns game state and rules. It has no DOM dependency and takes randomness only from `nextRandom`. Every rule is a pure function from a `GameState` to a new `GameState`. A `GameState` is plain, serializable data (numbers, strings, booleans, plain objects, arrays), so a later slice can save it as JSON.

Behaviour is described in `USE_CASES.md`, as the `UC-CORE-*` use cases.

## State
```mermaid
classDiagram
  class GameState {
    number schemaVersion
    number seed
    number rngState
    string eraName
    number turn
    number actionPoint
    Location location
    StatValues stats
    StatValues turnDeltas
    NationStatValues nation
    RegionState[] regions
    Official[] officials
    boolean dead
  }
  class Official {
    string id
    string name
    OfficialStatValues stats
    PostId or null post
  }
  class NamePool {
    string[] surnames
    string[] givenNames
    string[] reserved
  }
  class RegionState {
    string id
    string owner
    RegionStatValues stats
  }
  class RegionData {
    string id
    string owner
    string[] adjacent
    RegionStatValues start
  }
  GameState "1" *-- "many" RegionState
  RegionData ..> RegionState : createInitialState copies
  GameState "1" *-- "many" Official
  NamePool ..> Official : createInitialState draws names
```

`StatValues` is `Record<EmperorStatId, number>`, `NationStatValues` is `Record<NationStatId, number>`, `RegionStatValues` is `Record<RegionStatId, number>`, and `OfficialStatValues` is `Record<OfficialStatId, number>`. `PostId` is a string (see "Posts"). `Location` is `'map' | PalaceId`.

- `schemaVersion` goes up whenever the shape of `GameState` changes. There are no saves yet, so nothing migrates.
- `turn` counts half-seasons since ascension. `0` is 元年 春上.
- `actionPoint` is an index into `ACTION_POINTS`.
- `location` is `'map'` or a `PalaceId`.
- `stats` holds every stat owned by the emperor.
- `turnDeltas` adds up the applied emperor stat changes of the current turn. It resets when the turn ends.
- `nation` holds every stat owned by the nation.
- `regions` holds one entry per region, in the order of the region data passed to `createInitialState`. The player's regions have owner `PLAYER_OWNER`. Any other owner is a foreign power. Adjacency is static data and is not stored in the state.
- `officials` holds every official, in the order they were generated. IDs are unique and never reused. `post` is the `PostId` the official holds, or `null` for 賦閑. At most one official holds each post. Who holds a post is found by searching `officials`; it is not stored twice.
- `dead` is set when the emperor dies. A dead state accepts no action.

Derived values are never stored:
- age = `BALANCE.ascensionAge + floor(turn / BALANCE.turnsPerYear)`
- reign year = `floor(turn / BALANCE.turnsPerYear) + 1` (元年 is 1)
- half-season = `HALF_SEASONS[turn % BALANCE.turnsPerYear]`

## Region data
`core` does not hold the region list. `content` does, and passes it to `createInitialState` through this interface:

```ts
const PLAYER_OWNER = 'player';
interface RegionData {
  id: string;
  owner: string;
  adjacent: readonly string[];
  start: RegionStatValues;
}
interface RegionState { id: string; owner: string; stats: RegionStatValues }
```

`createInitialState` copies each entry's `id`, `owner` and `start` into a `RegionState`, keeping the order. Adding a region means adding one data entry; no `core` code changes.

## Name pool
`core` does not hold names. `content` passes a `NamePool` to `createInitialState`:

```ts
interface NamePool {
  surnames: readonly string[];
  givenNames: readonly string[];
  reserved: readonly string[]; // full names never generated, such as 名臣
}
```

The name-drawing helper in `src/rules/officials.ts` takes the pool and the names already taken, so later rules that add officials reuse it. Reserving a name means adding it to `reserved`; no `core` code changes.

## Posts
Posts are derived, not stored: `listPosts(state)` builds them from the post registries and the player's regions. A `PostId` is one of:
- a `CentralPostId`, such as `chancellor`;
- `<MinistryDepartmentId>-<MinistryRankId>`, such as `personnel-minister`;
- `<region id>-<RegionOfficeId>`, such as `guanzhong-governor`.

Region IDs must not equal a `MinistryDepartmentId` or a `CentralPostId`, so the three forms never collide.

```ts
type PostId = string;
type PostInfo =
  | { id: PostId; group: 'central'; office: CentralPostId }
  | { id: PostId; group: 'ministry'; department: MinistryDepartmentId; rank: MinistryRankId }
  | { id: PostId; group: 'region'; region: string; office: RegionOfficeId };
interface Official { id: string; name: string; stats: OfficialStatValues; post: PostId | null }
```

## Registries
Registries are data. Adding a stat, palace, action, department or court option means adding an entry to its registry and its text in `content`. `content` keys its text by these IDs.

| Registry | Holds |
|---|---|
| `STAT_REGISTRY` | Every stat, with its owner (emperor, nation, region or official) and its bounds. `EMPEROR_STAT_IDS`, `NATION_STAT_IDS`, `REGION_STAT_IDS` and `OFFICIAL_STAT_IDS` list each owner's stats, and `STAT_IDS` lists all of them. |
| `HALF_SEASONS` | The half-seasons of a year, in order |
| `ACTION_POINTS` | The action points of a turn, in order |
| `CATALOG.palaces` | Each palace and the actions it offers |
| `CATALOG.actions` | Each action and the action points it is allowed in |
| `DEPARTMENTS` | Each court department (`DEPARTMENT_IDS`) and the court options it lists (`COURT_OPTION_IDS`), in `src/model/court.ts`. |
| `COURT_PALACE_ID`, `COURT_ACTION_POINT` | The palace that holds 早朝, and the only action point it is open in, in `src/model/catalog.ts` |
| `CENTRAL_POST_IDS`, `MINISTRY_DEPARTMENT_IDS`, `MINISTRY_RANKS`, `REGION_OFFICES` | The post registries, in `src/model/officials.ts`. `MINISTRY_DEPARTMENT_IDS` is the six 部 of `DEPARTMENT_IDS`, without 內閣. |

Registry order is the display order. Infinite bounds are never stored in a `GameState`.

## Balance
Every tunable number lives in `BALANCE` in `src/model/balance.ts`. Docs refer to its keys, never to its values.

## Interface
```ts
type ActionRejection = 'dead' | 'not-in-palace' | 'not-offered' | 'not-allowed-now';
type AppointRejection = 'not-in-court' | 'region-not-owned' | 'unknown-post' | 'unknown-official' | 'not-idle';
type AppointOutcome =
  | { ok: false; reason: AppointRejection; state: GameState }
  | { ok: true; state: GameState };
interface StatChange { stat: StatId; amount: number }
interface RegionChange { region: string; changes: StatChange[] }
interface EconomyReport { taxIncome: number; upkeep: number; regionChanges: RegionChange[] }
interface TurnEnd { aging: number; totals: StatChange[]; economy: EconomyReport }
type ActionOutcome =
  | { ok: false; reason: ActionRejection; state: GameState }
  | { ok: true; state: GameState; changes: StatChange[]; turnEnd: TurnEnd | null };

function createInitialState(seed: number, eraName: string, regions: readonly RegionData[], names: NamePool): GameState;
function canEnterPalace(state: GameState, palaceId: PalaceId): boolean;
function isMorningCourt(state: GameState): boolean;
function listPosts(state: GameState): PostInfo[];
function appointOfficial(state: GameState, postId: PostId, officialId: string): AppointOutcome;
function regionTax(stats: RegionStatValues): number;
function settleEconomy(
  nation: NationStatValues,
  regions: readonly RegionState[],
  nextHalfSeason: HalfSeasonId,
): { nation: NationStatValues; regions: RegionState[]; report: EconomyReport };
```

`turnEnd` is set when the action ended the turn, including when the emperor then dies of age. It is `null` when the emperor dies from the action itself. `aging` is the 健康 lost to age, as a positive number. `totals` holds emperor stats only.

`economy.taxIncome` and `economy.upkeep` are positive numbers of taels (`taxIncome` is 0 outside collections). `regionChanges` lists, in region order, each region with a non-zero applied change, and its changes in registry order. When the emperor dies of age, `economy` is `{ taxIncome: 0, upkeep: 0, regionChanges: [] }`.
