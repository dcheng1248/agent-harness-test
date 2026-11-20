# Regions and Treasury Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 home regions (民心, 人口, 富庶) and a 國庫 with half-yearly taxes, per-turn upkeep, a bankruptcy 民心 penalty and yearly population change, shown in the header, a free 輿圖 screen and the turn summary.

**Architecture:** `core` extends the stat registry with nation and region stats, adds `nation` and `regions` to `GameState`, takes region data through a `RegionData` interface, and settles the economy in a pure `settleEconomy` called at the end of each surviving turn. `content` holds the region list (`RegionData` plus name and capital flag), new labels and number format functions. `web` adds an `atlas` screen, the 國庫 header item and the summary lines.

**Tech Stack:** TypeScript, Vite, Vitest, plain CSS.

**Spec:** Issue #18, `docs/architecture.md`, `packages/core/ARCHITECTURE.md`, `packages/content/ARCHITECTURE.md`, `packages/web/ARCHITECTURE.md`. The module docs hold the exact IDs, numbers, texts and element IDs. This plan does not repeat them all.

## Global Constraints
- `core` has no DOM and no `Math.random`. `GameState` holds only plain JSON values (no `Infinity`; the registry's `Infinity` bounds stay in the registry).
- Every tunable number is in `BALANCE` (`packages/core/src/model/balance.ts`); region starting values are in `packages/content/src/regions.ts`. Both match the tables in the module docs.
- `core` never assumes a region belongs to the player: taxes, population and bankruptcy apply only to regions whose `owner` is `PLAYER_OWNER`.
- All player-facing text is Traditional Chinese and comes from `content`. Negative numbers use `−` (U+2212).
- Render functions are pure. Only `main.ts` touches the DOM.
- Test names or comments reference the use case IDs. When a task's tests for an ID pass, change that ID's status to `implemented` in `docs/architecture.md` in the same commit.
- From Task 1 until Task 5, `npm run typecheck` fails in `content` and `web`, because `StatId` grows and `createInitialState` gains a parameter. Run each task's own Vitest files. Task 6 runs `npm run verify`.

## Review Focus
- 國庫 below 0 after upkeep, but tax in the same turn brings it back to 0 or above. Expected: no 民心 penalty, because the check runs after taxes. Tested in Task 2.
- A region at 民心 1 or 0 while 國庫 is negative. Expected: 民心 stops at 0, and a region whose applied change is 0 is left out of `regionChanges`. Tested in Task 2.
- A region with a foreign owner. Expected: it pays no tax and its stats do not change. Tested in Task 2.
- The emperor dies of age at the end of 冬下 or 夏下. Expected: no upkeep, tax or population change, `economy` is empty, and the ending shows. Tested in Task 2.
- Opening 輿圖 from a palace, a result or a summary screen. Expected: nothing happens. A negative 國庫 in the header reads 「國庫 −20,000 兩」. Tested in Tasks 4 and 5.

---

### Task 1: core — stat registry, region data, state and starting values

Read first: `packages/core/ARCHITECTURE.md`, `docs/architecture.md`.

**Files:**
- Create: `packages/core/src/model/region.ts`
- Modify: `packages/core/src/model/stats.ts`, `packages/core/src/model/balance.ts`, `packages/core/src/model/state.ts`, `packages/core/src/index.ts`
- Test: `packages/core/src/model/state.test.ts`, `packages/core/src/index.test.ts`, `packages/core/src/rules/turn.test.ts` (only update `createInitialState` calls to pass a region fixture)
- Modify: `docs/architecture.md` (UC-CORE-014 status)

**Interfaces:**
- Produces (exported from `packages/core/src/index.ts`):
  - `STAT_IDS` (8, in the core doc order), `type StatId`; `EMPEROR_STAT_IDS = ['health','learning','arts','resolve'] as const`, `NATION_STAT_IDS = ['treasury'] as const`, `REGION_STAT_IDS = ['morale','population','prosperity'] as const`, types `EmperorStatId`, `NationStatId`, `RegionStatId`
  - `STAT_REGISTRY: readonly StatDefinition[]` (all 8, bounds and owners from the core doc), `StatDefinition { id: StatId; min: number; max: number; owner: StatOwner }`
  - `type StatValues = Record<EmperorStatId, number>`, `type NationStatValues = Record<NationStatId, number>`, `type RegionStatValues = Record<RegionStatId, number>`
  - `PLAYER_OWNER = 'player'`, `interface RegionData { id: string; owner: string; adjacent: readonly string[]; start: RegionStatValues }`, `interface RegionState { id: string; owner: string; stats: RegionStatValues }` (in `model/region.ts`)
  - `SCHEMA_VERSION = 3`; `GameState` gains `nation: NationStatValues` and `regions: RegionState[]`
  - `createInitialState(seed: number, eraName: string, regions: readonly RegionData[]): GameState`
  - `BALANCE` gains:
    ```ts
    startingTreasury: 500000,
    tax: { halfYearDivisor: 200000, collectOn: ['spring-early', 'autumn-early'] as readonly HalfSeasonId[] },
    upkeep: 120000,
    bankruptcyMoraleLoss: 3,
    population: { growAtOrAbove: 120, shrinkAtOrBelow: 80, ratePercent: 2 },
    ```
- `StatChange.stat` stays `StatId`, now covering all 8. `turn.ts` keeps working on emperor stats: its clamp looks up any `StatId`, and its totals iterate `EMPEROR_STAT_IDS` instead of the whole registry.

- [ ] **Step 1: Write the failing tests**

In `state.test.ts`, with a local fixture of two regions, one owned by `PLAYER_OWNER` and one by `'foreign'`:
```ts
it('UC-CORE-014 copies region data into the state in order, keeping owners', () => {
  const state = createInitialState(7, '承平', FIXTURE);
  expect(state.regions).toEqual([
    { id: 'a', owner: 'player', stats: { morale: 60, population: 1000000, prosperity: 50 } },
    { id: 'b', owner: 'foreign', stats: { morale: 40, population: 500000, prosperity: 30 } },
  ]);
  expect(state.nation).toEqual({ treasury: 500000 });
  expect(state.schemaVersion).toBe(3);
  expect(JSON.parse(JSON.stringify(state))).toEqual(state);
});
it('UC-CORE-014 region data does not change the emperor stats or rngState', () => {
  const a = createInitialState(7, '承平', []);
  const b = createInitialState(7, '承平', FIXTURE);
  expect([b.stats, b.rngState]).toEqual([a.stats, a.rngState]);
});
it('UC-CORE-014 the stat registry lists emperor, nation and region stats with their bounds', () => {
  // ids in order; treasury owner 'nation', min -Infinity, max Infinity;
  // morale/prosperity 0–100 'region'; population min 0, max Infinity, 'region'
});
```
Keep the existing UC-CORE-001 tests, passing `FIXTURE` or `[]`. Mutating the fixture after `createInitialState` must not change the state (copy `start`).

- [ ] **Step 2: Run tests and see them fail**

Run: `npx vitest run packages/core`
Expected: FAIL, `regions` and `nation` are missing.

- [ ] **Step 3: Implement the registry, region types, `BALANCE` additions and `createInitialState`**

`STAT_REGISTRY` is written out per owner rather than mapped from one list. `createInitialState` draws no extra random numbers.

- [ ] **Step 4: Run tests and see them pass**

Run: `npx vitest run packages/core`
Expected: PASS.

- [ ] **Step 5: Mark UC-CORE-014 `implemented`, then commit**

```bash
git add packages/core docs/architecture.md
git commit -m "feat(core): region data, 國庫 and region stats in the game state"
```

### Task 2: core — economy settlement at turn end

Read first: `packages/core/ARCHITECTURE.md`.

**Files:**
- Create: `packages/core/src/rules/economy.ts`, `packages/core/src/rules/economy.test.ts`
- Modify: `packages/core/src/rules/turn.ts`, `packages/core/src/rules/turn.test.ts`, `packages/core/src/index.ts`
- Modify: `docs/architecture.md` (UC-CORE-015, UC-CORE-016 status)

**Interfaces:**
- Consumes: Task 1's types and `BALANCE`.
- Produces (exported from `index.ts`):
  - `interface RegionChange { region: string; changes: StatChange[] }`, `interface EconomyReport { taxIncome: number; upkeep: number; regionChanges: RegionChange[] }`
  - `regionTax(stats: RegionStatValues): number` = `Math.floor(population * prosperity * morale / BALANCE.tax.halfYearDivisor)`
  - `settleEconomy(nation: NationStatValues, regions: readonly RegionState[], nextHalfSeason: HalfSeasonId): { nation: NationStatValues; regions: RegionState[]; report: EconomyReport }`
  - `TurnEnd` gains `economy: EconomyReport`

`settleEconomy` follows the 4 ordered steps in the core doc (upkeep, population on 春上, tax on 春上/秋上 from post-population values, bankruptcy if 國庫 < 0). `regionChanges` compares each region's final stats with its input stats. It does not mutate its inputs.

In `takeAction`, when the turn ends and the emperor survives aging, call `settleEconomy(state.nation, state.regions, HALF_SEASONS[(state.turn + 1) % turnsPerYear])` and store the returned `nation` and `regions` in the new state. When the emperor dies of age, leave `nation` and `regions` unchanged and report `{ taxIncome: 0, upkeep: 0, regionChanges: [] }`.

- [ ] **Step 1: Write the failing tests**

`economy.test.ts`, with regions built inline (player-owned unless noted):
```ts
it('UC-CORE-015 regionTax follows the formula', () => {
  expect(regionTax({ morale: 60, population: 5000000, prosperity: 60 })).toBe(90000);
  expect(regionTax({ morale: 65, population: 4500000, prosperity: 75 })).toBe(109687); // rounded down
});
it('UC-CORE-015 taxes arrive only when entering 春上 and 秋上', () => {
  for (const next of HALF_SEASONS) {
    const { report, nation } = settleEconomy({ treasury: 1000000 }, [A], next);
    const taxed = next === 'spring-early' || next === 'autumn-early';
    expect(report.taxIncome).toBe(taxed ? regionTax(afterPopulation(A, next)) : 0);
    expect(nation.treasury).toBe(1000000 - 120000 + report.taxIncome);
  }
});
it('UC-CORE-015 upkeep is paid every turn, and 國庫 can go below 0', () => {
  const { nation, report } = settleEconomy({ treasury: 50000 }, [A], 'spring-late');
  expect(report.upkeep).toBe(120000);
  expect(nation.treasury).toBe(-70000);
});
it('UC-CORE-015 a negative 國庫 lowers 民心 by 3 in every player region, stopping at 0', () => {
  const { regions, report } = settleEconomy({ treasury: 0 }, [A /* 民心 60 */, LOW /* 民心 1 */, ZERO /* 民心 0 */], 'spring-late');
  expect(regions.map((r) => r.stats.morale)).toEqual([57, 0, 0]);
  expect(report.regionChanges).toEqual([
    { region: 'a', changes: [{ stat: 'morale', amount: -3 }] },
    { region: 'low', changes: [{ stat: 'morale', amount: -1 }] },
  ]);
});
it('UC-CORE-015 no penalty when that turn\'s tax brings 國庫 back to 0 or above', () => { /* treasury 0, rich region, next 'autumn-early' */ });
it('UC-CORE-015 a foreign region pays no tax and does not change', () => { /* owner 'foreign', treasury 0, next 'spring-early' */ });
it('UC-CORE-016 population changes only when entering 春上', () => {
  // HIGH (民心 70, 富庶 60, 人口 1000000) → 1020000 on 'spring-early', unchanged on the 7 others
  // LOWPOP (民心 40, 富庶 40, 人口 1000000) → 980000
  // MID (民心 60, 富庶 50) → unchanged; boundaries 120 grows and 80 shrinks
});
it('UC-CORE-016 tax on 春上 uses the population after growth', () => { ... });
```

`turn.test.ts` additions:
```ts
it('UC-CORE-015 the 4th action settles the economy into the next half-season', () => {
  // from createInitialState(…, FIXTURE): 4 rests; turnEnd.economy.upkeep === 120000, taxIncome === 0,
  // state.nation.treasury === 380000
});
it('UC-CORE-015 the summary of 夏下 reports the 秋上 tax', () => { /* 16 rests: 4th turnEnd.economy.taxIncome > 0 */ });
it('UC-CORE-013 dying of age skips the economy', () => {
  // state at turn 399 (冬下, age 65, aging 6), actionPoint 3, health 1, in 演武場; take 騎射
  // (健康 becomes 2 to 4, then aging takes 6)
  // dead === true, economy equals { taxIncome: 0, upkeep: 0, regionChanges: [] }, nation and regions unchanged
});
```

- [ ] **Step 2: Run tests and see them fail**

Run: `npx vitest run packages/core`
Expected: FAIL, `settleEconomy` does not exist.

- [ ] **Step 3: Implement `regionTax`, `settleEconomy` and the `takeAction` hook**

- [ ] **Step 4: Run tests and see them pass**

Run: `npx vitest run packages/core`
Expected: PASS.

- [ ] **Step 5: Mark UC-CORE-015 and UC-CORE-016 `implemented`, then commit**

```bash
git add packages/core docs/architecture.md
git commit -m "feat(core): taxes, upkeep, bankruptcy and yearly population"
```

### Task 3: content — region list, labels and number formats

Read first: `packages/content/ARCHITECTURE.md`, `packages/core/ARCHITECTURE.md` (Region data section).

**Files:**
- Create: `packages/content/src/regions.ts`, `packages/content/src/regions.test.ts`
- Modify: `packages/content/src/schema.ts`, `packages/content/src/index.ts`, `packages/content/src/format.ts`, `packages/content/src/format.test.ts`, `packages/content/src/index.test.ts`
- Modify: `docs/architecture.md` (UC-CONTENT-001 status)

**Interfaces:**
- Consumes: `RegionData`, `PLAYER_OWNER`, `StatId`, `EconomyReport`, `isValidEraName` from `core`.
- Produces:
  - `interface RegionEntry extends RegionData { name: string; capital: boolean }` in `schema.ts`
  - `GameText.regions: readonly RegionEntry[]`; `gameText.regions` is the list from `regions.ts`, with the 9 entries of the content doc table in that order
  - `UiText` gains `atlasButton`, `atlasHeading`, `regionColumn`, `capitalMark`, `taelUnit`, `taxIncomeLabel`, `upkeepLabel` (texts in the content doc)
  - `statLabels` gains `treasury` 國庫, `morale` 民心, `population` 人口, `prosperity` 富庶
  - `formatAmount(n: number): string`, `formatTaels(n: number): string`, `formatEconomy(report: EconomyReport): string`; `formatChanges` uses `formatAmount`

- [ ] **Step 1: Write the failing tests**

`regions.test.ts`:
```ts
it('UC-CONTENT-001 has the 9 home regions in order, all owned by the player', () => {
  expect(gameText.regions.map((r) => r.name)).toEqual(['關中','河東','河北','中原','山東','江南','荊楚','巴蜀','嶺南']);
  expect(gameText.regions.every((r) => r.owner === PLAYER_OWNER)).toBe(true);
  expect(new Set(gameText.regions.map((r) => r.id)).size).toBe(9);
});
it('UC-CONTENT-001 adjacency is symmetric, known and never self', () => {
  for (const r of gameText.regions) for (const id of r.adjacent) {
    const other = gameText.regions.find((o) => o.id === id);
    expect(other, `${r.id} → ${id}`).toBeDefined();
    expect(other!.adjacent).toContain(r.id);
    expect(id).not.toBe(r.id);
  }
});
it('UC-CONTENT-001 only 關中 is the capital, and starting values are in range', () => {
  // capital ids === ['guanzhong']; morale and prosperity 0–100; population > 0 and whole
});
it('UC-CONTENT-001 the starting regions yield 547437 taels per collection', () => {
  expect(gameText.regions.reduce((sum, r) => sum + regionTax(r.start), 0)).toBe(547437);
});
```

`format.test.ts` additions: `formatAmount` for 0, 999, 1000, 3000000, −20000 (「−20,000」); `formatChanges([{ stat: 'morale', amount: -3 }, { stat: 'population', amount: 60000 }])` gives 「民心 −3，人口 +60,000」; `formatTaels(500000)` 「500,000 兩」 and `formatTaels(-20000)` 「−20,000 兩」; `formatEconomy({ taxIncome: 547437, upkeep: 120000, regionChanges: [] })` 「稅入 +547,437 兩，宮廷用度 −120,000 兩」 and with `taxIncome: 0` 「宮廷用度 −120,000 兩」. Existing `formatChanges` cases keep passing. Extend the `index.test.ts` check that every `StatId` has a label to the 4 new ones.

- [ ] **Step 2: Run tests and see them fail**

Run: `npx vitest run packages/content`
Expected: FAIL.

- [ ] **Step 3: Implement the region list, schema and text additions and format functions**

Write `formatAmount` without `toLocaleString`, so the output does not depend on the runtime locale.

- [ ] **Step 4: Run tests and see them pass**

Run: `npx vitest run packages/content`
Expected: PASS.

- [ ] **Step 5: Mark UC-CONTENT-001 `implemented`, then commit**

```bash
git add packages/content docs/architecture.md
git commit -m "feat(content): 九州 region data, economy labels and number formats"
```

### Task 4: web — screen transitions

Read first: `packages/web/ARCHITECTURE.md`.

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/screen.test.ts`
- Modify: `docs/architecture.md` (UC-WEB-006 stays `planned` until Task 5)

**Interfaces:**
- Consumes: `createInitialState(seed, eraName, regions)`, `RegionData`, `EconomyReport`, `TurnEnd.economy` from `core`.
- Produces:
  - `Screen` gains `{ screen: 'atlas'; state: GameState }`; the `summary` variant gains `economy: EconomyReport`
  - `chooseEraName(screen: Screen, input: string, regions: readonly RegionData[]): Screen`
  - `openAtlas(screen: Screen): Screen`, `closeAtlas(screen: Screen): Screen`

- [ ] **Step 1: Write the failing tests**

```ts
it('UC-WEB-006 opening 輿圖 from the map uses no action point and keeps the state', () => {
  const play = afterOneAction(); // a play screen on the map at actionPoint 1
  const atlas = openAtlas(play);
  expect(atlas).toEqual({ screen: 'atlas', state: play.state });
  expect(closeAtlas(atlas)).toEqual(play);
});
it('UC-WEB-006 輿圖 cannot be opened from a palace, a result or a summary screen', () => { /* each returns the same screen */ });
it('UC-WEB-004 the summary screen carries the economy report', () => {
  // 4 actions from a game started with gameText.regions: summary.economy.upkeep === 120000
});
```
Update existing tests to pass `gameText.regions` (or a fixture) to `chooseEraName`.

- [ ] **Step 2: Run tests and see them fail**

Run: `npx vitest run packages/web/src/screen.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the transitions**

- [ ] **Step 4: Run tests and see them pass**

Run: `npx vitest run packages/web/src/screen.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/screen.ts packages/web/src/screen.test.ts
git commit -m "feat(web): 輿圖 screen state and economy in the summary"
```

### Task 5: web — render, main, style and screenshots

Read first: `packages/web/ARCHITECTURE.md`, `packages/content/ARCHITECTURE.md`.

**Files:**
- Modify: `packages/web/src/render.ts`, `packages/web/src/render.test.ts`, `packages/web/src/main.ts`, `packages/web/src/style.css`, `packages/web/screenshots.json`
- Modify: `docs/architecture.md` (UC-WEB-006 status)

**Interfaces:**
- Consumes: Task 3's `uiText` keys, `gameText.regions`, `formatAmount`, `formatTaels`, `formatEconomy`; Task 4's transitions.
- Produces: `renderAtlasScreen(screen: Of<'atlas'>, text: UiText, game: GameText): string`, wired into `renderScreen`.

- [ ] **Step 1: Write the failing tests**

```ts
it('UC-WEB-004 the header shows only emperor stats and 國庫', () => {
  // #header-stats has 4 data-stat spans; #header-treasury reads 「國庫 500,000 兩」
  // with nation.treasury -20000 it reads 「國庫 −20,000 兩」
});
it('UC-WEB-004 the palace map has the 輿圖 entry', () => { /* #open-atlas with text 輿圖 */ });
it('UC-WEB-004 the summary shows tax, upkeep and region changes', () => {
  // economy { taxIncome: 547437, upkeep: 120000, regionChanges: [{ region: 'guanzhong', changes: [{ stat: 'morale', amount: -3 }] }] }
  // #summary-treasury contains 「稅入 +547,437 兩，宮廷用度 −120,000 兩」
  // li[data-region="guanzhong"] contains 「關中：民心 −3」
  // with regionChanges [] the list has one li with 諸項無變化
});
it('UC-WEB-006 輿圖 lists every region with 民心, 人口 and 富庶', () => {
  // #atlas, heading 輿圖, #atlas-table with 9 tr[data-region]; guanzhong row contains 關中（京師）, 65, 3,000,000, 60
  // #close-atlas reads 返回
});
```

- [ ] **Step 2: Run tests and see them fail**

Run: `npx vitest run packages/web`
Expected: FAIL.

- [ ] **Step 3: Implement render, `main.ts` and style**

In `main.ts`, pass `gameText.regions` to `chooseEraName` (both the suggestion and the typed path), and route `#open-atlas` to `openAtlas` and `#close-atlas` to `closeAtlas`. Style the table to match the existing screens and keep it readable on a narrow screen (allow horizontal scroll).

- [ ] **Step 4: Update `screenshots.json`**

Add two scenarios; keep the existing ones:
- `atlas` 「輿圖畫面」: click `#start`, click `#era-suggestion-0`, click `#open-atlas`, waitFor `#atlas`.
- `turn-summary-tax` 「夏下總結：稅入與宮廷用度」: click `#start`, click `#era-suggestion-0`, then 4 turns of 靜養. Each turn is 3 × (`#palace-qingong`, `#action-rest`, `#continue`) then `#palace-qingong`, `#action-rest`; the first 3 turns end with click `#next-turn`. After the 16th 靜養, waitFor `#summary-treasury`. 靜養 cannot kill, so the count is fixed for any seed.

- [ ] **Step 5: Run tests and the build**

Run: `npx vitest run packages/web && npm run build`
Expected: PASS.

- [ ] **Step 6: Mark UC-WEB-006 `implemented`, then commit**

```bash
git add packages/web docs/architecture.md
git commit -m "feat(web): 國庫 in the header, 輿圖 screen, tax and region lines in the summary"
```

### Task 6: whole repo — verify

- [ ] **Step 1:** Run `npm run verify`. Expected: exit code 0, including `check:ids` (UC-CORE-014 to 016, UC-CONTENT-001 and UC-WEB-006 are `implemented` and referenced by tests).
- [ ] **Step 2:** If anything fails, fix it in the module that owns it and commit there.
