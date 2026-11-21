# 軍團: 組建軍團 and 調兵遣將 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the player form 軍團 from the national soldier pool and move or recall them on the world grid map, with double wages for 軍團 soldiers.

**Architecture:** `core` adds `Legion` and `army.legions` / `army.legionsFormed` to `GameState`, an optional `capital` to `RegionData`, and the rules in a new `src/rules/legions.ts`. They take the region data as an argument, like `regionNeighbours`. A returning 軍團 stores its route, so the turn-end march needs no content. `content` adds the name pool, text and two format changes. `web` pulls the 輿圖 grid into a shared `renderWorldMap` and adds the `legion` (組建軍團) and `deploy` (調兵遣將) screens.

**Tech Stack:** TypeScript, Vitest, Vite, npm workspaces.

**Spec:** issue #65, `packages/core/USE_CASES.md` (UC-CORE-004, 012, 014, 015, 019, 024, 025, 026, 027), `packages/content/USE_CASES.md` ("Text rules", "Formatting"), `packages/web/USE_CASES.md` (UC-WEB-004, 006, 007, 008, 021, 022), `packages/core/ARCHITECTURE.md`, `packages/content/ARCHITECTURE.md`, `packages/web/ARCHITECTURE.md`, `docs/architecture.md`, `GLOSSARY.md`.

## Global Constraints
- Player-facing text is Traditional Chinese and lives in `content`. Exact numbers live in `BALANCE.army` only.
- `core` has no DOM. No 軍團 rule advances `rngState`. `drawLegionNameSuggestions` uses its own derived stream.
- A use case marked `implemented` must be named in a test name or comment. Flip UC-CORE-026, UC-CORE-027, UC-WEB-021 and UC-WEB-022 from `planned` to `implemented` in the task that tests them.
- Never name an existing game anywhere.
- Between tasks, `vitest` for the touched packages must pass. `npm run typecheck` may fail only in `web` until Task 4, because `web` test fixtures build `EconomyReport` literals. Task 7 runs the full `npm run verify`.
- New BALANCE values: `BALANCE.army.legionMaxSoldiers = 100000`, `BALANCE.army.legionWageMultiplier = 2`. `SCHEMA_VERSION = 11`.

## Review Focus
1. **Stationed vs returning:** a returning 軍團 never blocks a move, the capital check in `formLegion`, or `recallRoute`. A returning 軍團 that reaches 關中 disbands even when a stationed one is there. Tested in Task 2.
2. **Free population:** forming a 軍團 must not change `freePopulation`, `maxConscript` or `maxRecruit`, because its soldiers still count. Tested in Task 1.
3. **Disband merge:** with an empty pool, the merged training equals the 軍團's (no `NaN`). With a pool, it is the rounded-down weighted average. Tested in Task 2.
4. **The 將軍:** they must disappear from 官員任命's idle list and from the 組建軍團 list, `appointOfficial` must reject them, and they must reappear after disband. Tested in Tasks 1, 2 and 4.
5. **Typed name:** the name typed on 組建軍團 must survive clicking a 將軍 or the picker (redraws), and an error must keep the typed text. Tested in Task 5.

---

### Task 1: core — 軍團 state, capital, 賦閑, 組建軍團 and wages

Read first: `docs/architecture.md`, `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md` (UC-CORE-004, 014, 015, 019, 024, 026), `packages/content/ARCHITECTURE.md` (for the content commit).

**Files:**
- Create: `packages/core/src/rules/legions.ts`, `packages/core/src/rules/legions.test.ts`
- Modify: `packages/core/src/model/army.ts`, `packages/core/src/model/balance.ts`, `packages/core/src/model/state.ts`, `packages/core/src/model/region.ts`, `packages/core/src/model/court.ts`, `packages/core/src/model/court.test.ts`, `packages/core/src/rules/regions.ts`, `packages/core/src/rules/regions.test.ts`, `packages/core/src/rules/officials.ts`, `packages/core/src/rules/officials.test.ts`, `packages/core/src/rules/works.ts`, `packages/core/src/rules/army.test.ts`, `packages/core/src/rules/economy.ts`, `packages/core/src/rules/economy.test.ts`, `packages/core/src/rules/turn.ts`, `packages/core/src/rules/turn.test.ts`, `packages/core/src/index.ts`, `packages/core/USE_CASES.md`
- Modify (separate content commit): `packages/content/src/index.ts`. Add `'form-legion': { name: '組建軍團' }, 'deploy-legions': { name: '調兵遣將' }` to `gameText.courtOptions` after `drill-troops`, so `Record<CourtOptionId, …>` still type-checks.

**Interfaces:**
- Produces:
  - `src/model/army.ts`: `interface Legion { id: string; name: string; general: string; soldiers: number; training: number; region: string; movedTurn: number | null; route: string[] | null }`. `Army` gains `legions: Legion[]; legionsFormed: number`.
  - `createInitialState` sets `legions: []`, `legionsFormed: 0`. `SCHEMA_VERSION = 11`.
  - `BALANCE.army` gains `legionMaxSoldiers: 100000, legionWageMultiplier: 2`.
  - `RegionData` gains `capital?: boolean`. `capitalRegion(regions: readonly RegionData[]): string | null` in `src/rules/regions.ts` returns the first region with `capital === true`.
  - `COURT_OPTION_IDS` gets `'form-legion', 'deploy-legions'` right after `'drill-troops'`. `DEPARTMENTS.war.options = ['conscript-soldiers', 'release-soldiers', 'drill-troops', 'form-legion', 'deploy-legions']`.
  - `isIdleOfficial(state: Pick<GameState, 'officials' | 'army'>, officialId: string): boolean` in `src/rules/officials.ts`. `appointOfficial` returns `'not-idle'` when `!isIdleOfficial`.
  - In `src/rules/legions.ts`:
    - `type LegionRejection = 'not-in-court' | 'no-capital' | 'capital-occupied' | 'unknown-official' | 'not-idle' | 'invalid-count' | 'invalid-name' | 'name-taken' | 'unknown-legion' | 'returning' | 'already-moved' | 'not-neighbour' | 'not-owned' | 'occupied' | 'no-route'`
    - `type LegionOutcome = { ok: false; reason: LegionRejection; state: GameState } | { ok: true; state: GameState }`
    - `legionSoldiers(state: Pick<GameState, 'army'>): number`
    - `maxLegionSoldiers(state): number` = `Math.min(state.army.soldiers, BALANCE.army.legionMaxSoldiers)`
    - `isValidLegionName(name): boolean`, the same test as `isValidEraName` (reuse it)
    - `drawLegionNameSuggestions(state, pool, count = 3): string[]` = `drawEraNameSuggestions((state.rngState + state.army.legionsFormed) >>> 0, pool.filter(n => no legion has name n), count)`
    - `stationedLegion(state, regionId): Legion | undefined` (`route === null && region === regionId`)
    - `canFormLegion(state, regions): boolean`
    - `formLegion(state, regions, generalId, count, name): LegionOutcome`
  - `freePopulation` subtracts `legionSoldiers(state)` too.
  - `EconomyReport.legionWages: number`. `settleEconomy(..., soldiers = 0, legionSoldiers = 0)`: `legionWages = Math.floor(legionSoldiers * BALANCE.army.wagePerSoldier * BALANCE.army.legionWageMultiplier)`, taken off 國庫 with the other wages, before bankruptcy. `takeAction` passes `legionSoldiers(state)` as the 7th argument. The death-of-age economy literal gets `legionWages: 0`.
  - Export all of the above from `src/index.ts` (`Legion`, `LegionRejection` and `LegionOutcome` as types).

- [ ] **Step 1: Write the failing tests** in `src/rules/legions.test.ts`. Use a `court()` helper like `army.test.ts`, with this region fixture (`TEST_NAMES`, `TEST_BUILDINGS` from `../testNames`). Player 人口 is large so pool limits never bind:
  ```ts
  const R = (id: string, x: number, y: number, owner = "player", capital = false) =>
    ({ id, owner, capital, cell: { x, y }, start: { morale: 60, population: 10000000, prosperity: 60 } });
  const REGIONS = [R("cap", 0, 0, "player", true), R("a", 1, 0), R("b", 2, 0), R("c", 0, 1), R("g", 1, 1), R("d", 2, 1), R("f", 3, 0, "foreign"), R("island", 0, 3)];
  ```
  Let `idle(state)` be the first official with `post === null`. Tests:
  - `UC-CORE-014 capitalRegion finds the flagged region`: it gives `"cap"`, and `null` for `REGIONS.slice(1)`. (Put this one in `regions.test.ts`.)
  - `UC-CORE-026 a new game has no 軍團`: `army.legions` is `[]`, `legionsFormed` is 0, `schemaVersion` is 11. Update the existing `UC-CORE-024 a new game has the starting army` expectation in `army.test.ts` to include `legions: [], legionsFormed: 0`.
  - `UC-CORE-026 forming takes soldiers from the pool into a 軍團 in the capital`: `formLegion(court(), REGIONS, idle.id, 10000, "征西")` gives pool soldiers 10,000, pool training 50, `legionsFormed` 1, and `legions` equal to `[{ id: "legion-1", name: "征西", general: idle.id, soldiers: 10000, training: 50, region: "cap", movedTurn: null, route: null }]`. `actionPoint` and `rngState` are unchanged.
  - `UC-CORE-026 the 軍團 keeps the training it was formed with`: form with pool training 50, then `conscriptSoldiers` 10,000 (pool training drops) and `startDrill`. The 軍團's training is still 50 and its soldiers still 10,000.
  - `UC-CORE-026 maxLegionSoldiers is the pool capped per 軍團`: 20,000 for a new game. With the pool at 500,000 it is 100,000. With the pool at 0 it is 0.
  - `UC-CORE-026 forming leaves free population unchanged`: `freePopulation`, `maxConscript` and `maxRecruit` are equal before and after forming 10,000. With a 軍團 of 30,000 added directly to `army.legions` and the pool unchanged, `freePopulation` drops by 30,000.
  - `UC-CORE-026 rejections in order`. Each returns the same state object:
    - on the map → `not-in-court`;
    - `REGIONS.slice(1)` → `no-capital`;
    - after one forming, a second at once → `capital-occupied`, even with a bad name;
    - with only a returning 軍團 in `cap` (set `route: ["cap"]` directly) → forming succeeds;
    - `"official-999"` → `unknown-official`;
    - an official with a post → `not-idle`;
    - the 將軍 of an existing 軍團 (moved out of `cap` directly) → `not-idle`;
    - counts 0, 5,000, 30,000 (more than the pool) → `invalid-count`;
    - with the pool at 500,000, 110,000 → `invalid-count`;
    - `"征"`, `"征西軍"`, `"ab"`, `" 征西"` → `invalid-name`;
    - a name an existing 軍團 has (that 軍團 moved out of `cap` directly) → `name-taken`.
  - `UC-CORE-026 canFormLegion`: true in a new court. False on the map, without a capital, with a stationed 軍團 in `cap`, with the pool at 0, and with every official given a post.
  - `UC-CORE-026 legion IDs are never reused`: form 征西, move it out of `cap` directly, remove it from `legions` directly, form again. The ID is `legion-2`.
  - `UC-CORE-026 name suggestions skip names in use and keep rngState`: with pool `["甲乙", "丙丁", "戊己", "庚辛"]`, the result has 3 distinct entries of the pool. Calling twice on the same state gives the same result, and `rngState` is unchanged. With a 軍團 named 甲乙 in the state, 甲乙 is never returned. With 2 free names it returns both.
  - `UC-CORE-004 a 將軍 is not 賦閑`: `isIdleOfficial` is true for `idle.id` before forming, false after, and false for `"official-999"`. `appointOfficial(state, "personnel-minister", idle.id)` after forming gives `not-idle`. (Put this one in `officials.test.ts`, with a two-region fixture that has a capital.)
  - In `economy.test.ts`, `UC-CORE-026 軍團 soldiers cost double`: `settleEconomy({ treasury: 1000000 }, [A], "summer-early", 0, "normal", 10000, 10000)` reports `soldierWages` 5,000 and `legionWages` 10,000, and the treasury is 1,000,000 − 120,000 − 15,000. Without the 7th argument, `legionWages` is 0.
  - In `turn.test.ts`, `UC-CORE-026 the turn loop pays 軍團 wages`: form a 軍團 of 10,000 in the first 早朝, then end the half-season. `turnEnd.economy` has `soldierWages` 5,000 and `legionWages` 10,000.
- [ ] **Step 2: Run** `npx vitest run packages/core`. Expected: FAIL (missing exports).
- [ ] **Step 3: Implement** the interfaces above. `formLegion` runs the checks in the order listed in UC-CORE-026. The count check is the army `isStepCount(count, step, maxLegionSoldiers(state))`. Name uniqueness covers every legion, stationed or returning. The capital check uses `stationedLegion(state, capital)`. `canFormLegion` = `isMorningCourt` && capital exists && no stationed legion there && `state.army.soldiers >= BALANCE.army.step` && some official `isIdleOfficial`.
- [ ] **Step 4: Update the existing tests** these changes break: the `court.test.ts` war options, every `EconomyReport` literal in `turn.test.ts` (add `legionWages: 0`), and the `army.test.ts` starting-army literal.
- [ ] **Step 5: Run** `npx vitest run packages/core packages/content`. Expected: PASS. Run `npm run typecheck`. Expected: errors only in `web`.
- [ ] **Step 6: Commit.** Core: `feat(core): 軍團 state, 組建軍團, capital and 軍團 wages`. Content, separately: `feat(content): 組建軍團 and 調兵遣將 court option names`.

### Task 2: core — moving, 招回 and the turn-end march

Read first: `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md` (UC-CORE-012, 025, 027).

**Files:**
- Modify: `packages/core/src/rules/legions.ts`, `packages/core/src/rules/legions.test.ts`, `packages/core/src/rules/turn.ts`, `packages/core/src/rules/turn.test.ts`, `packages/core/src/index.ts`, `packages/core/USE_CASES.md`

**Interfaces:**
- Consumes: Task 1's `Legion`, `LegionOutcome`, `capitalRegion`, `stationedLegion`, `regionNeighbours`.
- Produces (exported from `src/index.ts`):
  - `legionMoves(state, regions, legionId): string[]`
  - `moveLegion(state, regions, legionId, regionId): LegionOutcome`
  - `recallRoute(state, regions, legionId): string[] | null`
  - `canRecall(state, regions, legionId): boolean`
  - `recallLegion(state, regions, legionId): LegionOutcome`
  - Internal (not exported): `disbandLegion(army: Army, legionId: string): Army` and `marchLegions(army: Army): Army`, used by `recallLegion` and `takeAction`.

- [ ] **Step 1: Write the failing tests** in `legions.test.ts`, with Task 1's fixture. `place(state, legion)` pushes a `Legion` literal into `army.legions` (and bumps `legionsFormed`):
  - `UC-CORE-027 legionMoves lists free player neighbours`:
    - a stationed 軍團 in `cap` gives `["a", "c"]`;
    - in `b` it gives `["a", "d"]` (`f` is foreign);
    - with a stationed 軍團 in `a`, `cap` gives `["c"]`;
    - with only a returning 軍團 in `a`, `cap` gives `["a", "c"]`;
    - a returning 軍團 gives `[]`, and so does one with `movedTurn === state.turn`, and so does `"legion-999"`.
  - `UC-CORE-027 moving once per half-season`: `moveLegion(court, REGIONS, id, "a")` sets `region` "a" and `movedTurn` = turn. 國庫, `actionPoint` and `rngState` are unchanged. A second move gives `already-moved`. With `movedTurn` set to an earlier turn, the move succeeds.
  - `UC-CORE-027 move rejections in order`. Each returns the same state:
    - on the map → `not-in-court`;
    - `"legion-999"` → `unknown-legion`;
    - returning → `returning`;
    - already moved and not a neighbour → `already-moved`;
    - `cap` to `b` → `not-neighbour`;
    - `b` to `f` → `not-owned`;
    - into `a` with a stationed 軍團 there → `occupied`;
    - into `a` with only a returning 軍團 there → succeeds.
  - `UC-CORE-027 recallRoute is the shortest player path with a fixed tie-break`:
    - from `d`, `["b", "a", "cap"]`;
    - from `g`, `["a", "cap"]` (a before c in data order);
    - from `cap`, `[]`;
    - from `island`, `null`;
    - with `REGIONS.slice(1)` (no capital), `null`;
    - `"legion-999"`, `null`;
    - a stationed 軍團 in `a` does not change the route from `g`.
  - `UC-CORE-027 招回 outside the capital starts the march`: recalling from `d` sets `route` `["b", "a", "cap"]` and keeps `region` "d". Then `moveLegion` gives `returning`, `recallLegion` again gives `returning`, and `canRecall` is false. Recalling after a move this half-season is allowed.
  - `UC-CORE-027 招回 in the capital disbands at once`: pool 10,000 at training 60 plus a 軍團 of 10,000 at 50 in `cap` gives pool 20,000, training 55, no 軍團, and the 將軍 `isIdleOfficial` again. With pool 0 at training 80, the result is training 50.
  - `UC-CORE-027 招回 rejections`: on the map → `not-in-court`; `"legion-999"` → `unknown-legion`; returning → `returning`; from `island` → `no-route` (and `canRecall` false).
  - `UC-CORE-027 rounding of the merge`: pool 20,000 at 51 plus a 軍團 of 10,000 at 50 gives 50.
  - In `turn.test.ts`, using the same fixture (add it there or import from a shared helper), `UC-CORE-027 returning 軍團 march one region per half-season and disband in the capital`. Place a 軍團 in `d` (10,000 at 40) with the pool at 10,000 at 50, recall it, then end the half-season with `act`:
    - after 1 turn end: `region` "b", `route` `["a", "cap"]`;
    - after 2: "a";
    - after 3: no 軍團, pool 20,000 at training 45.
    - The economy of turn ends 1 to 3 still reports `legionWages` 10,000.
  - `UC-CORE-027 arriving 軍團 disband even when the capital is held`: with a stationed 軍團 in `cap` and a returning one at `a` with route `["cap"]`, one turn end leaves only the stationed one.
  - `UC-CORE-027 the march follows drill training`: with a drill running (pool training 50 → 52) and a returning 軍團 of equal size at 40 arriving, the pool ends at 46.
  - `UC-CORE-027 nothing marches when the emperor dies of age`: use the existing death-of-age setup with a returning 軍團. Its `region` and `route` are unchanged.
- [ ] **Step 2: Run** `npx vitest run packages/core`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `recallRoute`: breadth-first search from the 軍團's region over `regionNeighbours(regions, id)`, keeping only regions whose `state.regions` owner is `PLAYER_OWNER`, and visiting neighbours in returned order. Stop at the capital and rebuild the path without the start.
  - `disbandLegion`: merges as UC-CORE-027 says, with `Math.floor`, and removes the legion.
  - `marchLegions`: in `legions` order, for each legion with a non-null route, move `region` to `route[0]` and set `route` to the rest. If the new region is the last entry (the route is now empty), disband it.
  - `takeAction` (survival branch only) applies `marchLegions` to the army after setting the drilled training: `army: marchLegions({ ...state.army, training: trained })`.
- [ ] **Step 4: Run** `npx vitest run packages/core`. Expected: PASS.
- [ ] **Step 5: Mark UC-CORE-026 and UC-CORE-027 `implemented`** in `packages/core/USE_CASES.md`.
- [ ] **Step 6: Commit** `feat(core): move, 招回 and march 軍團`.

### Task 3: content — 軍團 name pool, text and format functions

Read first: `packages/content/ARCHITECTURE.md`, `packages/content/USE_CASES.md` ("Text rules", "Formatting").

**Files:**
- Modify: `packages/content/src/schema.ts`, `packages/content/src/index.ts`, `packages/content/src/format.ts`, `packages/content/src/format.test.ts`, `packages/content/src/index.test.ts`

**Interfaces:**
- Produces:
  - `gameText.legionNamePool: readonly string[]` = `['征西', '平南', '鎮北', '定遠', '揚威', '安東', '靖海', '破虜', '驍騎', '虎賁', '龍驤', '鷹揚', '振武', '威遠', '寧朔', '討逆', '伏波', '橫海', '飛騎', '神武']`. Type it in `GameText` in `schema.ts`.
  - `formatWages(artisanWages: number, soldierWages: number, legionWages = 0): string`. The third part is `${uiText.legionWagesLabel} −${formatTaels(legionWages)}`, only when > 0.
  - `formatLegionName(name: string): string` = `name + uiText.legionSuffix`.
  - New `UiText` keys and values:

    | key | value |
    |---|---|
    | legionWagesLabel | 軍團兵餉 |
    | legionSuffix | 軍 |
    | legionHeading | 組建軍團 |
    | legionMaxLabel | 此軍至多 |
    | generalHeading | 將軍 |
    | chooseGeneral | 任為將軍 |
    | legionSizeHeading | 兵員 |
    | legionNameHeading | 軍名 |
    | legionNameInputLabel | 自擬軍名（兩字） |
    | legionNameError | 軍名須為兩個漢字。 |
    | legionNameTaken | 已有同名軍團。 |
    | confirmLegion | 組建 |
    | capitalOccupied | 京師已有軍團駐紮 |
    | noIdleGeneral | 無賦閑官員 |
    | deployHeading | 調兵遣將 |
    | deployMapLabel | 軍團輿圖 |
    | deployHint | 點選軍團以下令。 |
    | noLegions | 尚無軍團。 |
    | generalLabel | 將軍 |
    | legionSoldiersLabel | 兵員 |
    | legionRegionLabel | 所在 |
    | legionStatusLabel | 狀態 |
    | stationedStatus | 駐紮 |
    | returningPrefix | 回師中，尚需 |
    | returningSuffix | 半季抵京 |
    | returningTag | 回師 |
    | moveHint | 點選標示之地域以移駐。 |
    | moveButton | 移駐 |
    | movedThisTurn | 本半季已調動。 |
    | noMoves | 鄰近無可移駐之地。 |
    | recallButton | 招回 |
    | noRoute | 無路可返 |
    | recallDisbandHint | 軍團已在京師，招回即就地解散。 |
    | closeLegionPanel | 關閉 |

- [ ] **Step 1: Write the failing tests.**
  - `format.test.ts`: `formatWages(0, 5000, 10000)` is `兵餉 −5,000兩，軍團兵餉 −10,000兩`. Match the existing joiner and tael unit exactly, and copy the shape of the existing two-part test. `formatWages(155000, 0)` is unchanged from today. `formatLegionName('征西')` is `征西軍`.
  - `index.test.ts`: every `legionNamePool` entry passes `isValidLegionName`, entries are unique, and there are at least 10. `gameText.courtOptions['form-legion'].name` is 組建軍團.
- [ ] **Step 2: Run** `npx vitest run packages/content`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces above.
- [ ] **Step 4: Run** `npx vitest run packages/content`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): 軍團 names, text and wages format`.

### Task 4: web — shared world map, 輿圖 markers, wages line, 兵部 options and idle list

Read first: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md` (UC-WEB-004, 006, 007, 008), `packages/core/USE_CASES.md` (UC-CORE-026).

**Files:**
- Create: `packages/web/src/worldMap.ts`, `packages/web/src/worldMap.test.ts`
- Modify: `packages/web/src/render.ts`, `packages/web/src/render.test.ts`, `packages/web/src/screen.ts`, `packages/web/src/screen.test.ts`, `packages/web/src/main.ts`, `packages/web/src/style.css`, `packages/web/screenshots.json`

**Interfaces:**
- Consumes: core `isIdleOfficial`, `canFormLegion`, `capitalRegion`, `stationedLegion`, `BALANCE`, and content `formatLegionName`, `formatWages` and the new `UiText` keys.
- Produces:
  - `renderWorldMap(state: GameState, text: UiText, game: GameText, mode: { kind: 'atlas'; region?: string } | { kind: 'deploy'; legion?: string; moves: readonly string[] }): string` in `src/worldMap.ts`. It returns the map container plus the legend `<section id="map-legend">`. It moves the existing atlas grid code here unchanged, with these additions:
    - Atlas mode: the container is `<div id="atlas-map" …>` and cells are the existing region buttons. Each cell gets `<span class="legion-marker[ returning]" data-legion="<id>">` per 軍團 there, in `army.legions` order, holding `formatLegionName(name)` and, for a returning one, `<span class="legion-tag">回師</span>`.
    - Deploy mode: the container is `<div id="deploy-map" role="group" aria-label="軍團輿圖">`. Region cells are `<div class="map-cell[ is-destination]" data-cell="<regionId>">` with the name and the capital mark. Markers are `<button type="button" class="legion-marker[ returning][ selected]" data-legion="<id>" aria-pressed="…">`. A cell in `moves` gets class `is-destination` and `<button type="button" class="move-here" data-move-to="<regionId>">移駐</button>`.
  - `renderAtlasScreen` calls `renderWorldMap(..., { kind: 'atlas', region })`. Its markup is otherwise unchanged.
  - Turn summary: the wages line shows when `wages + soldierWages + legionWages > 0`, as `formatWages(wages, soldierWages, legionWages)`.
  - 兵部's options in `renderCourtView`: `form-legion` is enabled when `canFormLegion(state, game.regions)`. Otherwise it is disabled with a tag. The tag is `capitalOccupied` when the capital has a stationed 軍團, else `noSoldiers` when `state.army.soldiers < BALANCE.army.step`, else `noIdleGeneral`. `deploy-legions` is always enabled. Add both IDs to `OPEN_COURT_OPTIONS`.
  - `idleOfficials(state, sort)` in `screen.ts` filters with `isIdleOfficial(state, o.id)`.
- [ ] **Step 1: Write the failing tests.**
  - `worldMap.test.ts`, `UC-WEB-006`: with a state holding a stationed 軍團 in 關中 and a returning one in 中原 (real `gameText`), atlas mode renders a `span.legion-marker` with `征西軍` inside the 關中 button, and one with class `returning` and 回師 inside 中原. No `button[data-legion]` exists. The existing atlas render tests still pass unchanged.
  - `worldMap.test.ts`, `UC-WEB-022`: deploy mode with `moves: ['zhongyuan', 'bashu']` and `legion: 'legion-1'` renders `#deploy-map`, `button[data-legion="legion-1"][aria-pressed="true"]`, `[data-move-to="zhongyuan"]` and `[data-move-to="bashu"]`, and no `button[data-region]`.
  - `render.test.ts`, `UC-WEB-004`: a summary with `legionWages: 10000` and the others 0 shows `#summary-wages` with 軍團兵餉. Add `legionWages: 0` to every existing `EconomyReport` literal.
  - `render.test.ts`, `UC-WEB-007`: 兵部 lists five options in order. In a new game `form-legion` is enabled. After `formLegion`, it is disabled with 京師已有軍團駐紮. With the pool at 0 it shows 無兵可遣. With every official holding a post it shows 無賦閑官員. `deploy-legions` is enabled in each case.
  - `screen.test.ts`, `UC-WEB-008`: after `formLegion`, `idleOfficials(state)` leaves out the 將軍.
- [ ] **Step 2: Run** `npx vitest run packages/web`. Expected: FAIL.
- [ ] **Step 3: Implement.** Styles in `style.css`:
  - `.legion-marker`: a small pill under the region name with a dark translucent background and gold text, readable on every nation colour.
  - `.legion-marker.returning`: dashed border and dimmed.
  - `.legion-marker.selected`: gold outline.
  - `.map-cell.is-destination`: an inner gold glow.
  - `.move-here`: a small button inside the cell.
  - `#deploy-map` uses the same grid rules as `#atlas-map` (share the selector).
- [ ] **Step 4: Update `screenshots.json`.** Change `palace-xuanzheng-war`'s description to `宣政殿畫面：展開兵部，徵召士兵、解甲歸田、操練軍隊、組建軍團與調兵遣將`.
- [ ] **Step 5: Run** `npx vitest run packages/web` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(web): shared world map with 軍團 markers, 軍團 wages and 兵部 options`.

### Task 5: web — 組建軍團 screen

Read first: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md` (UC-WEB-007, 018, 021), `packages/core/USE_CASES.md` (UC-CORE-026).

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/screen.test.ts`, `packages/web/src/render.ts`, `packages/web/src/render.test.ts`, `packages/web/src/main.ts`, `packages/web/src/style.css`, `packages/web/screenshots.json`, `packages/web/USE_CASES.md`

**Interfaces:**
- Consumes: core `canFormLegion`, `formLegion`, `maxLegionSoldiers`, `drawLegionNameSuggestions`, `isIdleOfficial`, `RegionData`, and content `formatLegionName` and the `UiText` keys from Task 3.
- Produces:
  - `Screen` variant `{ screen: 'legion'; state: GameState; general?: string; count: number; suggestions: string[]; draft: string; error?: 'invalid-name' | 'name-taken' }`.
  - `chooseCourtOption(screen, optionId, notables, names, regions: readonly RegionData[] = [], legionNames: readonly string[] = [])`. For `'form-legion'`, when `canFormLegion(state, regions)`, it returns `{ screen: 'legion', state, count: BALANCE.army.step, suggestions: drawLegionNameSuggestions(state, legionNames), draft: '' }`. Otherwise the screen is unchanged.
  - `chooseGeneral(screen, officialId): Screen`, `pickLegionName(screen, name): Screen`, `typeLegionName(screen, text): Screen`, `confirmLegion(screen, regions): Screen`.
  - `CountScreen` includes `'legion'`: step `BALANCE.army.step`, limit `maxLegionSoldiers(state)`.
  - `backToCourt` returns from `legion` to `play` in 宣政殿 with `department: 'war'`.
  - `renderLegionScreen(screen, text, game)`, wired into `renderScreen`.
  - Element IDs:
    - `main#legion-screen`;
    - `#legion-pool` (士兵總數：…), `#legion-training` (訓練：…), `#legion-max-line` (此軍至多：…);
    - `table#legion-generals` with one row per idle official (name and four stats, like 官員任命). The row's button is `#legion-general-<i>` (position in the list) with `data-general="<officialId>"` and text 任為將軍. The chosen row has class `is-chosen` and the button `aria-pressed="true"`;
    - the shared picker (`#count-picker`, `#count-down`, `#count-up`, `#count-max` labelled `recruitMax`);
    - suggestion buttons `#legion-suggestion-<i>` with `data-legion-name="<name>"` showing `formatLegionName`;
    - `<label for="legion-name-input">` plus `<input id="legion-name-input" maxlength="4" value="<escaped draft>">` with `<span>軍</span>` after it;
    - `#legion-error` with `role="alert"` showing `legionNameError` or `legionNameTaken`;
    - `#confirm-legion` (disabled without `general`);
    - `#back-to-court`.
  - `main.ts` wiring:
    - pass `gameText.regions, gameText.legionNamePool` to `chooseCourtOption`;
    - click `[data-general]` → `chooseGeneral`;
    - click `[data-legion-name]` → `pickLegionName`;
    - click `#confirm-legion` → `confirmLegion(current, gameText.regions)`;
    - `input` event on `#legion-name-input` → `current = typeLegionName(current, value)` with no redraw;
    - Enter in `#legion-name-input` → confirm and redraw;
    - after a redraw that leaves the screen on `legion` with an error, focus `#legion-name-input`, the way the era screen does.
- [ ] **Step 1: Write the failing tests** (`UC-WEB-021` in each name).
  - `screen.test.ts`:
    - `chooseCourtOption(court, 'form-legion', notables, names, gameText.regions, gameText.legionNamePool)` opens `legion` with `count` 10,000, 3 suggestions from the pool, `draft` '' and no general;
    - with a stationed 軍團 in 關中 it returns the screen unchanged.
    - `chooseGeneral` sets `general` for an idle official, and ignores an official with a post and an unknown ID.
    - `stepCount` and `maxCount` stop at `maxLegionSoldiers` (20,000 in a new game).
    - `pickLegionName` sets `draft` to a suggestion and clears `error`, and ignores a name not in `suggestions`.
    - `typeLegionName` sets `draft` and keeps the rest.
    - `confirmLegion` without a general returns the same screen.
    - With a general and draft `' 征西 '`, `confirmLegion` returns `play` in 宣政殿 with `department: 'war'`, and the state has 軍團 征西 of 10,000.
    - With draft `'征'` it returns `legion` with `error: 'invalid-name'` and the draft kept. With a name already used (form one, move it out of 關中 in the state directly, open again) it gives `error: 'name-taken'`.
    - `backToCourt` from `legion` gives 兵部 open.
  - `render.test.ts`:
    - the screen shows `#legion-pool`, `#legion-training` and `#legion-max-line`, and one `[data-general]` per idle official;
    - three `[data-legion-name]` buttons ending in 軍;
    - `#confirm-legion[disabled]` before a general is chosen, enabled after;
    - the chosen row is marked;
    - a draft of `<b>` is escaped in the input's `value`;
    - `#legion-error` shows the right message per `error`.
- [ ] **Step 2: Run** `npx vitest run packages/web`. Expected: FAIL.
- [ ] **Step 3: Implement.** Lay out and style the screen like the 兵部 screens, reusing the appoint table styles for `#legion-generals` and the era screen's styles for the suggestions and input.
- [ ] **Step 4: Add screenshot scenarios** to `screenshots.json`. Every one starts with `click #start`, `click #era-suggestion-0`, `click #palace-xuanzheng`, `click #department-war`:
  - `form-legion` (組建軍團：全國兵員、訓練、此軍至多、賦閑官員、人數選擇、建議軍名與自擬軍名): `click #court-option-form-legion`, `waitFor #legion-screen`.
  - `form-legion-ready` (組建軍團：已選將軍、已填建議軍名，可組建): `click #court-option-form-legion`, `click #legion-general-0`, `click #legion-suggestion-0`, `waitFor #confirm-legion:not([disabled])`.
  - `form-legion-error` (組建軍團：軍名錯誤提示): `click #court-option-form-legion`, `click #legion-general-0`, `click #confirm-legion`, `waitFor #legion-error`.
  - `palace-xuanzheng-war-capital-occupied` (宣政殿兵部：京師已有軍團駐紮，組建軍團停用): `click #court-option-form-legion`, `click #legion-general-0`, `click #legion-suggestion-0`, `click #confirm-legion`, `waitFor #court-option-form-legion[disabled]`.
- [ ] **Step 5: Run** `npx vitest run packages/web` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Mark UC-WEB-021 `implemented`.**
- [ ] **Step 7: Commit** `feat(web): 組建軍團 screen`.

### Task 6: web — 調兵遣將 screen

Read first: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md` (UC-WEB-006, 022), `packages/core/USE_CASES.md` (UC-CORE-027).

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/screen.test.ts`, `packages/web/src/render.ts`, `packages/web/src/render.test.ts`, `packages/web/src/main.ts`, `packages/web/src/style.css`, `packages/web/screenshots.json`, `packages/web/USE_CASES.md`

**Interfaces:**
- Consumes: `renderWorldMap` (Task 4), core `legionMoves`, `moveLegion`, `recallLegion`, `canRecall`, `recallRoute`, `capitalRegion`.
- Produces:
  - `Screen` variant `{ screen: 'deploy'; state: GameState; legion?: string }`. `chooseCourtOption` for `'deploy-legions'` returns `{ screen: 'deploy', state }`.
  - `selectLegion(screen, legionId: string | null): Screen`, `moveSelectedLegion(screen, regions, regionId): Screen`, `recallSelectedLegion(screen, regions): Screen`. `backToCourt` returns from `deploy` with 兵部 open.
  - `renderDeployScreen(screen, text, game)`: the header, `<main id="deploy-screen"><h2>調兵遣將</h2>`, then `renderWorldMap(state, text, game, { kind: 'deploy', legion, moves: legion ? legionMoves(state, game.regions, legion) : [] })`. Then:
    - no 軍團 at all: `<p id="deploy-empty">`;
    - 軍團 but none selected: `<p id="deploy-hint">`;
    - one selected: `<section id="legion-panel">` with:
      - `#legion-panel-name` (`formatLegionName`), `#legion-general` (official's name), `#legion-soldiers` (`formatArtisans`), `#legion-training`, `#legion-region` (region name), and `#legion-status` (駐紮, or 回師中，尚需<Chinese numeral of route.length>半季抵京);
      - for a stationed 軍團: `#move-hint` when `legionMoves` is not empty; else `#legion-moved` when `movedTurn === state.turn`; else `#legion-no-moves`. Then `#recall-hint` when its region is the capital, and `<button id="recall-legion">招回</button>`, disabled with `<span class="court-option-tag">無路可返</span>` when `!canRecall`;
      - `#close-legion-panel`.
    - Finally `#back-to-court`.
  - `main.ts` wiring. Place these before the generic handlers:
    - `#deploy-map [data-legion]` → `selectLegion(current, id)`;
    - `[data-move-to]` → `moveSelectedLegion(current, gameText.regions, id)`;
    - `#recall-legion` → `recallSelectedLegion(current, gameText.regions)`;
    - `#close-legion-panel` → `selectLegion(current, null)`.
- [ ] **Step 1: Write the failing tests** (`UC-WEB-022` in each name). Use a state with 征西 formed in 關中.
  - `screen.test.ts`:
    - `selectLegion` selects `legion-1`, ignores `legion-9`, and clears on `null`;
    - `moveSelectedLegion(…, 'zhongyuan')` moves it and keeps the selection;
    - moving again or to `hebei` returns the screen unchanged;
    - `recallSelectedLegion` in 中原 makes it returning with route `['guanzhong']` and keeps the selection;
    - `recallSelectedLegion` in 關中 removes it and clears the selection;
    - without a selection both return the screen unchanged;
    - `backToCourt` gives 兵部 open.
  - `render.test.ts`:
    - empty → `#deploy-empty`;
    - with a 軍團 and no selection → `#deploy-hint`;
    - selected in 關中 → panel with 將軍 name, `10,000`, training 50, 關中 and 駐紮, plus `#move-hint`, `#recall-hint`, `[data-move-to="zhongyuan"]` and `[data-move-to="bashu"]`;
    - after moving → `#legion-moved` and no `[data-move-to]`;
    - after 招回 in 中原 → a `.legion-marker.returning` marker, `#legion-status` containing 回師中，尚需一半季抵京, and no `#recall-legion`;
    - a 軍團 placed in 嶺南 with its only player neighbour cut off (set 荊楚's owner to a foreign ID in the state directly) → `#recall-legion[disabled]` with 無路可返.
- [ ] **Step 2: Run** `npx vitest run packages/web`. Expected: FAIL.
- [ ] **Step 3: Implement.** Style `#legion-panel` like `#region-panel`.
- [ ] **Step 4: Add screenshot scenarios.** `FORM` stands for `click #start`, `click #era-suggestion-0`, `click #palace-xuanzheng`, `click #department-war`, `click #court-option-form-legion`, `click #legion-general-0`, `click #legion-suggestion-0`, `click #confirm-legion`.
  - `deploy-legions-empty` (調兵遣將：尚無軍團): the four opening clicks, then `click #court-option-deploy-legions`, `waitFor #deploy-empty`.
  - `deploy-legions` (調兵遣將：選取京師軍團，顯示將軍、兵員、訓練，中原與巴蜀可移駐，京師招回即解散): FORM, `click #court-option-deploy-legions`, `click [data-legion="legion-1"]`, `waitFor #legion-panel`.
  - `deploy-legions-moved` (調兵遣將：軍團移駐中原，本半季已調動): as above, then `click [data-move-to="zhongyuan"]`, `waitFor #legion-moved`.
  - `deploy-legions-returning` (調兵遣將：招回後回師中，尚需一半季): as above, then `click #recall-legion`, `waitFor .legion-marker.returning`.
  - `atlas-legions` (輿圖：京師標示軍團): FORM, `click #leave-court`, `click #palace-chongwen`, `click #open-atlas`, `waitFor #atlas-map .legion-marker`.
  - `turn-summary-legion-wages` (半季總結：工錢行列兵餉與軍團兵餉): FORM, `click #leave-court`, then the same three `#palace-yangxin` / `#action-rest` / `#continue` rounds as `turn-summary-army` (the last without `#continue`), `waitFor #summary-wages`.
- [ ] **Step 5: Run** `npx vitest run packages/web` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Mark UC-WEB-022 `implemented`.**
- [ ] **Step 7: Commit** `feat(web): 調兵遣將 screen and 軍團 screenshots`.

### Task 7: whole repo — verify

- [ ] **Step 1:** Run `npm run verify`. Expected: PASS (types, lint, tests, use-case references, build).
- [ ] **Step 2:** Check that every `implemented` use case touched here (UC-CORE-004, 012, 014, 015, 019, 024, 025, 026, 027 and UC-WEB-004, 006, 007, 008, 021, 022) is named in a test, and that no doc repeats a value from `BALANCE`.
- [ ] **Step 3:** Check that `screenshots.json` is valid JSON and every new scenario's selectors exist in the render code.
- [ ] **Step 4:** Fix anything found, then commit per module touched (`fix(<module>): …`).
