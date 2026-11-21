# 兵部 Soldiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a national soldier pool with training, 徵召士兵, 解甲歸田, 操練軍隊, soldier wages and the matching screens and turn-summary lines.

**Architecture:** `core` gets `GameState.army` (`src/model/army.ts`) and the rules in `src/rules/army.ts`. The turn loop passes soldiers to `settleEconomy` and adds drill training after building progress. `content` adds text and two format functions. `web` adds three screens (`conscript`, `discharge`, `drill`) built like the 工部 screens, and two turn-summary changes.

**Tech Stack:** TypeScript, Vitest, Vite, npm workspaces.

**Spec:** issue #61, `packages/core/USE_CASES.md` (UC-CORE-014, 015, 019, 024, 025), `packages/web/USE_CASES.md` (UC-WEB-004, 007, 018, 019, 020), `packages/content/USE_CASES.md` ("Formatting"), `packages/core/ARCHITECTURE.md`, `packages/web/ARCHITECTURE.md`, `GLOSSARY.md`.

## Global Constraints
- Player-facing text is Traditional Chinese and lives in `content`. Exact numbers live in `BALANCE.army` only.
- `core` has no DOM and draws no random numbers in any army rule.
- A use case marked `implemented` must be named in a test name or comment. Flip UC-CORE-024, UC-CORE-025, UC-WEB-018, UC-WEB-019 and UC-WEB-020 from `planned` to `implemented` in the task that tests them.
- Never name an existing game anywhere.
- Between tasks, `vitest` for the touched packages must pass. `npm run typecheck` may fail only in `web` until Task 4 finishes, because `web` test fixtures build `EconomyReport` and `TurnEnd` literals. Task 6 runs the full `npm run verify`.

## Review Focus
1. Conscripting with 0 soldiers: training becomes 0, not `NaN`. Tested in Task 1.
2. Drill timing: a drill started in turn t gives exactly 8 gains, at the ends of turns t…t+7. `drillTurnsLeft` is 8 during turn t and 0 from turn t+8, and the 9th turn end gives `training: null`. Tested in Task 2.
3. The cap: at 99, a gain gives 100 and reports 1. At 100, the report is 0, not `null`. Tested in Task 2.
4. Dying of age while a drill runs: training is unchanged and `TurnEnd.training` is `null`. Tested in Task 2.
5. Shared free population: conscripting lowers `maxRecruit`, and recruiting 工匠 lowers `maxConscript`. Free population never goes below 0. Tested in Task 1.

---

### Task 1: core — army state, 徵召士兵, 解甲歸田, wages

Read first: `docs/architecture.md`, `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md` (UC-CORE-015, 019, 024), `packages/content/ARCHITECTURE.md` (for the one-line content commit).

**Files:**
- Create: `packages/core/src/model/army.ts`, `packages/core/src/rules/army.ts`, `packages/core/src/rules/army.test.ts`
- Modify: `packages/core/src/model/balance.ts`, `packages/core/src/model/state.ts`, `packages/core/src/model/court.ts`, `packages/core/src/model/court.test.ts`, `packages/core/src/rules/works.ts`, `packages/core/src/rules/works.test.ts`, `packages/core/src/rules/economy.ts`, `packages/core/src/rules/economy.test.ts`, `packages/core/src/rules/turn.ts`, `packages/core/src/rules/turn.test.ts`, `packages/core/src/index.ts`, `packages/core/USE_CASES.md`
- Modify (separate content commit): `packages/content/src/index.ts` (adds `'release-soldiers': { name: '解甲歸田' }` to `gameText.courtOptions`, placed after `conscript-soldiers`), so `content`'s `Record<CourtOptionId, …>` still type-checks.

**Interfaces:**
- Produces:
  - `interface Army { soldiers: number; training: number; conscriptedTurn: number | null; drillStartTurn: number | null }` in `src/model/army.ts`.
  - `BALANCE.army = { startingSoldiers: 20000, startingTraining: 50, maxTraining: 100, step: 10000, conscriptPercent: 1, wagePerSoldier: 0.5, drillCost: 100000, drillTurns: 8, drillGain: 2 }`.
  - `GameState.army`. `createInitialState` sets `{ soldiers: 20000, training: 50, conscriptedTurn: null, drillStartTurn: null }`. `SCHEMA_VERSION = 10`.
  - `COURT_OPTION_IDS` gets `'release-soldiers'` right after `'conscript-soldiers'`. `DEPARTMENTS.war.options = ['conscript-soldiers', 'release-soldiers', 'drill-troops']`.
  - `type ArmyRejection = 'not-in-court' | 'already-used' | 'invalid-count' | 'already-drilling'`, `type ArmyOutcome = { ok: false; reason: ArmyRejection; state: GameState } | { ok: true; state: GameState }`.
  - `maxConscript(state): number`, `canConscript(state): boolean`, `conscriptSoldiers(state, count): ArmyOutcome`, `releaseSoldiers(state, count): ArmyOutcome` in `src/rules/army.ts`.
  - `EconomyReport.soldierWages: number`. `settleEconomy(nation, regions, nextHalfSeason, artisans = 0, taxLevel = 'normal', soldiers = 0)`.
  - All of the above exported from `src/index.ts` (`Army`, `ArmyRejection`, `ArmyOutcome` as types).

- [ ] **Step 1: Write the failing tests** in `src/rules/army.test.ts`, using a `court()` helper like `works.test.ts` (same `REGIONS`: player 人口 20,000,000 + 10,500,000, plus one foreign region):
  - `UC-CORE-024 a new game has the starting army`: `createInitialState(...).army` equals `{ soldiers: 20000, training: 50, conscriptedTurn: null, drillStartTurn: null }`, and `schemaVersion` is 10.
  - `UC-CORE-024 free population subtracts soldiers and 工匠`: `freePopulation(court())` is 30,480,000. With `army.soldiers` 500,000 it is 29,980,000. With soldiers 40,000,000 it is 0.
  - `UC-CORE-024 maxConscript is 1% rounded to the nearest step`: `maxConscript(court())` is 300,000 (304,800 rounds down). With player 人口 cut so free population is 4,999, it is 0.
  - `UC-CORE-024 conscripting and recruiting share the pool`: after `conscriptSoldiers(court(), 300000)`, `maxRecruit` is 300,000 (free 30,180,000 → 301,800). After `recruitArtisans(court(), 300000)`, `maxConscript` is 300,000.
  - `UC-CORE-024 conscripting adds soldiers once per 早朝 and dilutes training`: `conscriptSoldiers(court(), 10000)` gives soldiers 30,000, training 33 (floor 50×20000/30000), `conscriptedTurn` 0, actionPoint unchanged, `rngState` unchanged. A second call gives `already-used`. `canConscript` is true before and false after.
  - `UC-CORE-024 conscripting with no soldiers sets training to 0`: with soldiers 0 and training 80, conscripting 10,000 gives training 0.
  - `UC-CORE-024 conscript rejections in order`: on the map gives `not-in-court`; dead gives `not-in-court`; 0, 5000, 15000 and `maxConscript + step` give `invalid-count`; with `maxConscript` 0 a step gives `invalid-count`; already used and an invalid count together give `already-used`. Every rejection returns the same state object.
  - `UC-CORE-024 releasing is free, repeatable and keeps training`: releasing 10,000 twice from 20,000 gives soldiers 0, training still 50, 國庫 unchanged. Releasing 30,000 from 20,000 gives `invalid-count`, and so do 0 and 5000. On the map it gives `not-in-court`.
  - In `economy.test.ts`: `UC-CORE-024 soldiers are paid with upkeep` — `settleEconomy({ treasury: 1000000 }, [A], 'summer-early', 0, 'normal', 20000)` reports `soldierWages` 10,000 and `wages` 0, and the treasury is 1,000,000 − 120,000 − 10,000. With 1 soldier, `soldierWages` is 0 (rounded down). Without the argument, `soldierWages` is 0. `UC-CORE-024 unpaid soldier wages trigger bankruptcy`: with a treasury of 125,000 and 20,000 soldiers, every player region loses `BALANCE.bankruptcyMoraleLoss` 民心.
- [ ] **Step 2: Run** `npx vitest run packages/core`. Expected: FAIL (missing exports).
- [ ] **Step 3: Implement.**
  - `freePopulation` in `rules/works.ts` subtracts `state.works.artisans + state.army.soldiers`, never below 0.
  - `maxConscript` uses the same rounding as `maxRecruit`, with `BALANCE.army.step` and `conscriptPercent`.
  - The count check matches works' `isStepCount` but uses `BALANCE.army.step`.
  - Dilution: `Math.floor(training * soldiers / (soldiers + count))`. With `soldiers === 0` this is 0.
  - `settleEconomy` subtracts `Math.floor(soldiers * BALANCE.army.wagePerSoldier)` along with upkeep and 工匠 wages, before the bankruptcy check.
  - `takeAction` passes `state.army.soldiers` as the 6th argument. The death-of-age `economy` literal gets `soldierWages: 0`.
- [ ] **Step 4: Update the existing tests the new pool and wages change:**
  - `works.test.ts`: free population becomes 30,480,000 / 29,980,000, and `maxRecruit(court())` becomes 300,000. Update the test names to say "minus 工匠 and soldiers".
  - `turn.test.ts`: treasury after the first turn becomes 370,000. Expected `economy` literals get `soldierWages: 10000`, or `0` on death of age. `UC-CORE-020` wage tests still check `wages`.
  - `court.test.ts`: war options become `["conscript-soldiers", "release-soldiers", "drill-troops"]`.
- [ ] **Step 5: Run** `npx vitest run packages/core packages/content`. Expected: PASS. Then run `npx tsc --noEmit -p packages/core` (or the repo typecheck, ignoring `web` errors). Expected: no `core` or `content` errors.
- [ ] **Step 6: Mark UC-CORE-024 `implemented`** in `packages/core/USE_CASES.md`.
- [ ] **Step 7: Commit** core: `feat(core): soldier pool, 徵召士兵, 解甲歸田 and soldier wages`. Commit content separately: `feat(content): 解甲歸田 court option name`.

### Task 2: core — 操練軍隊 and turn-end training

Read first: `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md` (UC-CORE-012, 025).

**Files:**
- Modify: `packages/core/src/rules/army.ts`, `packages/core/src/rules/army.test.ts`, `packages/core/src/rules/turn.ts`, `packages/core/src/rules/turn.test.ts`, `packages/core/src/index.ts`, `packages/core/USE_CASES.md`

**Interfaces:**
- Consumes: `Army`, `ArmyOutcome`, `BALANCE.army` from Task 1.
- Produces: `drillTurnsLeft(state: Pick<GameState, 'turn' | 'army'>): number`, `canDrill(state): boolean`, `startDrill(state): ArmyOutcome`, `TurnEnd.training: number | null`, all exported.

- [ ] **Step 1: Write the failing tests** in `army.test.ts`:
  - `UC-CORE-025 starting a drill pays once and stamps the turn`: `startDrill(court())` lowers the treasury by 100,000, sets `drillStartTurn` to 0, leaves actionPoint, location and `rngState` unchanged. `drillTurnsLeft` is 8. `canDrill` is false. A second call gives `already-drilling`, with the state unchanged.
  - `UC-CORE-025 a drill can start with no money and no soldiers`: with treasury 0 and soldiers 0, the treasury becomes −100,000.
  - `UC-CORE-025 drill rejections`: on the map or dead gives `not-in-court`, which takes precedence over `already-drilling`.
  - `UC-CORE-025 drillTurnsLeft`: it is 0 with `drillStartTurn` null. With `drillStartTurn` 3, it is 8 at turn 3, 1 at turn 10 and 0 at turn 11. At turn 11 `canDrill` is true in court.
  - In `turn.test.ts`, using a helper that plays a whole turn (four actions, as existing tests do):
  - `UC-CORE-025 training rises by 2 at each of 8 turn ends`: start a drill at turn 0, then play 9 turns. Training goes 52, 54, …, 66, then stays 66. `turnEnd.training` is 2 for the first 8 turns and `null` on the 9th.
  - `UC-CORE-025 training is capped`: with training 99, the first turn end gives 100 and `training` 1. The next gives 100 and `training` 0.
  - `UC-CORE-025 no drill reports null`: a plain turn end has `training: null` and leaves training unchanged.
  - `UC-CORE-025 dying of age during a drill changes nothing`: set the age and 健康 so aging kills the emperor (as the existing death-of-age test does) with a drill running. Training is unchanged and `turnEnd.training` is `null`.
  - `UC-CORE-025 conscripting during a drill dilutes at once`: with a drill running at training 60 and 20,000 soldiers, conscripting 10,000 gives 40, and the next turn end gives 42.
- [ ] **Step 2: Run** `npx vitest run packages/core`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `drillTurnsLeft = drillStartTurn === null ? 0 : Math.max(0, drillStartTurn + BALANCE.army.drillTurns - turn)`.
  - In `takeAction`'s survive path, after `advanceBuildings`, if `drillTurnsLeft(state) > 0`: set `next = Math.min(maxTraining, training + drillGain)` and `training` (in `TurnEnd`) = `next - training`. Otherwise `training` is `null` and the army is unchanged. Put the new `army` into the returned state.
  - The death-of-age `TurnEnd` gets `training: null`.
  - Update any existing `TurnEnd` literal in `turn.test.ts` with `training: null`.
- [ ] **Step 4: Run** `npx vitest run packages/core`. Expected: PASS.
- [ ] **Step 5: Mark UC-CORE-025 `implemented`.**
- [ ] **Step 6: Commit** `feat(core): 操練軍隊 drill and turn-end training`.

### Task 3: content — text and format functions

Read first: `packages/content/ARCHITECTURE.md`, `packages/content/USE_CASES.md` ("Formatting").

**Files:**
- Modify: `packages/content/src/schema.ts`, `packages/content/src/index.ts`, `packages/content/src/format.ts`, `packages/content/src/format.test.ts`

**Interfaces:**
- Produces new `UiText` keys and values:
  - `conscriptHeading: '徵召士兵'`, `dischargeHeading: '解甲歸田'`, `drillHeading: '操練軍隊'`
  - `soldierTotalLabel: '士兵總數'`, `trainingLabel: '訓練'`, `soldierWagesLabel: '兵餉'`
  - `conscriptHint: '新兵未經操練，徵召將拉低全軍訓練。'`, `confirmConscript: '徵召'`
  - `dischargeAll: '全部遣返'`, `confirmDischarge: '遣返'`, `noSoldiers: '無兵可遣'`
  - `drillHintPrefix: '操練為期一年，須一次預付國庫 '`, `drillHintSuffix: '，期間每半季訓練漸增。'`
  - `confirmDrill: '開始操練'`, `drillingPrefix: '操練中，尚餘'`, `drillingSuffix: '半季'`
- `formatWages(artisanWages: number, soldierWages: number): string`, and `formatTrainingChange(amount: number): string`, both exported from `src/index.ts`.

- [ ] **Step 1: Write the failing tests** in `format.test.ts` (replacing the old `formatWages` case):
  - `formatWages(50000, 0)` → `'工匠工錢 −50,000 兩'`
  - `formatWages(0, 10000)` → `'兵餉 −10,000 兩'`
  - `formatWages(50000, 10000)` → `'工匠工錢 −50,000 兩，兵餉 −10,000 兩'`
  - `formatWages(0, 0)` → `''`
  - `formatTrainingChange(2)` → `'訓練 +2'`, `formatTrainingChange(0)` → `'訓練 +0'`, `formatTrainingChange(-3)` → `'訓練 −3'`
- [ ] **Step 2: Run** `npx vitest run packages/content`. Expected: FAIL.
- [ ] **Step 3: Implement.** Join the parts with `，`, the separator `formatEconomy` uses. `formatTrainingChange` uses `formatAmount(Math.abs(n))` with `+` for n ≥ 0 and `−` otherwise. Add the `UiText` keys to `schema.ts` and the values to `uiText`.
- [ ] **Step 4: Run** `npx vitest run packages/content`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): 兵部 text, 兵餉 and training format`.

### Task 4: web — 兵部 options, 徵召士兵 and 解甲歸田 screens

Read first: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md` (UC-WEB-004, 007, 011, 012, 018, 019).

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/screen.test.ts`, `packages/web/src/render.ts`, `packages/web/src/render.test.ts`, `packages/web/src/main.ts`, `packages/web/USE_CASES.md`

**Interfaces:**
- Consumes: `maxConscript`, `canConscript`, `conscriptSoldiers`, `releaseSoldiers`, `BALANCE.army.step` (Task 1). Text keys (Task 3).
- Produces:
  - `Screen` adds `{ screen: 'conscript'; state; count: number }` and `{ screen: 'discharge'; state; count: number }`.
  - `OPEN_COURT_OPTIONS` adds `'conscript-soldiers'` and `'release-soldiers'`.
  - `chooseCourtOption` opens `conscript` when `canConscript` is true, and `discharge` when `army.soldiers > 0`, each with `count: BALANCE.army.step`.
  - `stepCount` and `maxCount` accept `conscript` (limit `maxConscript`) and `discharge` (limit `army.soldiers`), stepping by `BALANCE.army.step`.
  - `confirmConscript(screen)` and `confirmDischarge(screen)` return `play` in 宣政殿 with `department: 'war'`.
  - `backToCourt` returns from `conscript`, `discharge` (and `drill`, used in Task 5) to `department: 'war'`.
  - `renderConscriptScreen` and `renderDischargeScreen`. `renderPicker` takes the step as a parameter.

- [ ] **Step 1: Write the failing tests.**
  - `screen.test.ts`:
    - `UC-WEB-018 opens 徵召士兵 at one step and confirms back to 兵部`: count 10,000. `stepCount(+1)` gives 20,000. `maxCount` gives `maxConscript`. Confirming gives `play` with `department: 'war'` and `army.soldiers` 30,000. Opening again is unchanged, because `canConscript` is now false. Back from `conscript` gives `department: 'war'` with the same state object.
    - `UC-WEB-019 解甲歸田`: opens at 10,000. `maxCount` gives 20,000. Confirming at 20,000 gives soldiers 0. `chooseCourtOption('release-soldiers')` is then unchanged.
    - `stepCount` past either end is unchanged.
  - `render.test.ts`:
    - `UC-WEB-007 兵部 lists 徵召士兵, 解甲歸田 and 操練軍隊 enabled`, in that order. After conscripting, `#court-option-conscript-soldiers` is disabled with tag `uiText.recruitUsed`. With `maxConscript` 0 the tag is `uiText.noRecruits`. With 0 soldiers, `#court-option-release-soldiers` is disabled with tag `uiText.noSoldiers`.
    - `UC-WEB-018 徵召士兵 screen`: `main#conscript-screen` holds `#soldier-total` (`formatArtisans(20000)`), `#free-population` (`formatArtisans(freePopulation)`), `#conscript-max-line` (`formatArtisans(maxConscript)`), `#conscript-hint` (`uiText.conscriptHint`), `#count-picker`, `#confirm-conscript` and `#back-to-court`. `#count-down` is disabled at one step, and `#count-up` is disabled at the max.
    - `UC-WEB-019 解甲歸田 screen`: `main#discharge-screen` holds `#soldier-total`, a picker whose `#count-max` text is `uiText.dischargeAll`, `#confirm-discharge` and `#back-to-court`.
- [ ] **Step 2: Run** `npx vitest run packages/web`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The court-option tags follow the existing `recruit-artisans` and `release-artisans` branches in `renderCourtView`.
  - Headings come from `conscriptHeading` and `dischargeHeading`. The max label is `recruitMaxLabel`, the free-population label is `freePopulationLabel`, the `conscript` max button is `recruitMax`, and the back button is `backToCourt`.
  - `main.ts`: `#confirm-conscript` → `confirmConscript`, `#confirm-discharge` → `confirmDischarge`. `#count-*` already route to `stepCount` and `maxCount`.
  - Add `renderScreen` cases.
- [ ] **Step 4: Update the existing web fixtures** for the new `core` shape: `EconomyReport` literals get `soldierWages`. Expected values that depended on free population (`recruit` tests use `maxRecruit(...)` and stay correct) are checked.
- [ ] **Step 5: Run** `npx vitest run packages/web` and `npm run typecheck`. Expected: PASS, except `summary` `training` errors, which Task 5 fixes. If none appear, it is fully clean.
- [ ] **Step 6: Mark UC-WEB-018 and UC-WEB-019 `implemented`.**
- [ ] **Step 7: Commit** `feat(web): 兵部 徵召士兵 and 解甲歸田 screens`.

### Task 5: web — 操練軍隊 screen, turn summary and screenshots

Read first: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md` (UC-WEB-004, 020).

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/screen.test.ts`, `packages/web/src/render.ts`, `packages/web/src/render.test.ts`, `packages/web/src/main.ts`, `packages/web/screenshots.json`, `packages/web/USE_CASES.md`

**Interfaces:**
- Consumes: `drillTurnsLeft`, `canDrill`, `startDrill`, `TurnEnd.training`, `BALANCE.army.drillCost` (Task 2). `formatWages(a, s)`, `formatTrainingChange`, `formatChineseNumber`, `formatTaels` (Task 3).
- Produces:
  - `Screen` adds `{ screen: 'drill'; state }`, and `summary` adds `training: number | null`. `OPEN_COURT_OPTIONS` adds `'drill-troops'`, which always opens `drill` during 早朝.
  - `confirmDrill(screen)` returns `{ screen: 'drill', state: outcome.state }` on success, or the screen unchanged otherwise.
  - `renderDrillScreen`.

- [ ] **Step 1: Write the failing tests.**
  - `screen.test.ts`:
    - `UC-WEB-020 操練軍隊 opens, confirms in place and refuses a second drill`: open, then `confirmDrill`. The result is `drill` with the treasury 100,000 lower and `drillTurnsLeft` 8. `confirmDrill` again returns the same screen object. Back gives `play` with `department: 'war'`. Reopening while drilling works.
    - `UC-WEB-004 the summary copies TurnEnd.training`: after a drill, playing to the turn end gives a summary with `training: 2`. A plain turn gives `training: null`.
  - `render.test.ts`:
    - `UC-WEB-020 idle drill screen`: `main#drill-screen` holds `#soldier-total`, `#soldier-training` containing `uiText.trainingLabel` and `50`, and `#drill-hint` equal to `drillHintPrefix + formatTaels(100000) + drillHintSuffix`. `#confirm-drill` is enabled, and there is a `#back-to-court`.
    - `UC-WEB-020 running drill screen`: there is no `#drill-hint`. `#drill-remaining` is `'操練中，尚餘八半季'` (`drillingPrefix + formatChineseNumber(8) + drillingSuffix`), and `#confirm-drill` has `disabled`.
    - `UC-WEB-004 the wages line shows 工匠 wages and 兵餉`: with `{ wages: 155000, soldierWages: 10000 }`, `#summary-wages` is `formatWages(155000, 10000)`. With both 0 there is no `#summary-wages`.
    - `UC-WEB-004 the training line shows only while drilling`: with `training: 2`, `#summary-training` is `'訓練 +2'` and comes after `#summary-wages` and before `#summary-completed` and `#summary-regions`. With `0` it shows `'訓練 +0'`. With `null` it is absent.
- [ ] **Step 2: Run** `npx vitest run packages/web`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The wages line shows when `wages + soldierWages > 0`.
  - `performAction` copies `turnEnd.training`.
  - `main.ts`: `#confirm-drill` → `confirmDrill`.
  - Every `summary` literal in the web tests gets `training: null`.
  - No new CSS is needed beyond reusing the existing screen styles. If the disabled confirm button is not visibly dimmed, add a rule to `src/style.css` matching the existing disabled-button style.
- [ ] **Step 4: Update `packages/web/screenshots.json`.** Each new scenario starts `#start` → `#era-suggestion-0` → `#palace-xuanzheng` → `#department-war`:
  - `palace-xuanzheng-war` "宣政殿畫面：展開兵部，徵召士兵、解甲歸田與操練軍隊": waitFor `#court-options`
  - `conscript-soldiers` "徵召士兵：士兵總數、可徵人口、此次至多、訓練稀釋提示與人數選擇": click `#court-option-conscript-soldiers`, waitFor `#conscript-screen`
  - `release-soldiers` "解甲歸田：士兵總數與人數選擇": click `#court-option-release-soldiers`, waitFor `#discharge-screen`
  - `drill-troops` "操練軍隊：士兵總數、訓練、耗費與為期一年之提示": click `#court-option-drill-troops`, waitFor `#drill-screen`
  - `drill-troops-running` "操練軍隊進行中：尚餘八半季，按鈕停用，國庫已扣": as above, then click `#confirm-drill`, waitFor `#confirm-drill[disabled]`
  - `turn-summary-army` "半季總結：兵餉列於工錢行，訓練 +2": click `#court-option-drill-troops`, `#confirm-drill`, `#back-to-court`, `#leave-court`, then `#palace-yangxin`, `#action-rest`, `#continue` twice, then `#palace-yangxin`, `#action-rest`, waitFor `#summary-training`
  - Change the `turn-summary-works` description to "半季總結：工匠工錢與兵餉、觀星臺落成".
- [ ] **Step 5: Mark UC-WEB-020 `implemented`.**
- [ ] **Step 6: Run** `npx vitest run packages/web` and `npm run typecheck`. Expected: PASS, with no type errors anywhere.
- [ ] **Step 7: Commit** `feat(web): 操練軍隊 screen, 兵餉 and training in the turn summary`.

### Task 6: whole repo — verify

- [ ] **Step 1: Run** `npm run verify`. Expected: typecheck, tests, build and `check:ids` all pass.
- [ ] **Step 2:** Check that `packages/core/USE_CASES.md` lists UC-CORE-024 and 025 as `implemented`, that `packages/web/USE_CASES.md` lists UC-WEB-018, 019 and 020 as `implemented`, and that each is named in a test.
- [ ] **Step 3:** If verify needed fixes, commit them per module (`fix(<module>): …`).
