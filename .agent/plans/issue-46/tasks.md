# 戶部: 調整賦稅, 額外徵稅 and 收支表 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 戶部's three placeholder options with 調整賦稅, 額外徵稅 and 收支表, all working, with a national tax level stored in `GameState`.

**Architecture:** `core` gains `GameState.revenue` (`taxLevel`, `leviedTurn`), a `TAX_LEVEL_IDS` registry, level data in `BALANCE.tax`, and rules in `src/rules/revenue.ts`; `settleEconomy` takes the level. `content` adds tax level names, two court option names and the screen text. `web` adds three screens (`taxes`, `levy`, `budget`) and a slider handled through `input`/`change` events.

**Tech Stack:** TypeScript, Vitest, Vite, npm workspaces.

**Spec:** Issue #46, `packages/core/USE_CASES.md` (UC-CORE-015, UC-CORE-021, UC-CORE-022), `packages/content/USE_CASES.md` (Text rules), `packages/web/USE_CASES.md` (UC-WEB-004, UC-WEB-007, UC-WEB-014, UC-WEB-015, UC-WEB-016), and the `ARCHITECTURE.md` of each module.

## Global Constraints

- Player-facing text is Traditional Chinese and lives only in `content`.
- `core` has no DOM and draws no random numbers in these rules.
- Exact values live only in code (`BALANCE`), never in docs.
- None of the new actions uses an action point; the header keeps showing 朝.
- Officials have no effect on tax.
- `take-census` and `relieve-disaster` are removed everywhere (registry, text, tests).
- Every `implemented` use case must be named in a test name or comment. Flip UC-CORE-021, UC-CORE-022, UC-WEB-014, UC-WEB-015 and UC-WEB-016 to `implemented` in the task that tests them.
- Run `npm run verify` before calling the work complete.

## Review Focus

1. **民心 at the bound at collection**: a region at 民心 100 on 極輕 stays 100, and at 0 on 極重 stays 0. Test in Task 1 (`clamps 民心 at collection`).
2. **平 keeps today's income exactly**: `regionTax(stats)` and `regionTax(stats, 'normal')` equal the old formula, and settling at 平 changes no 民心. Test in Task 1.
3. **Levy at the same 早朝 twice, or after leaving and re-entering in the same half-season**: second call rejected `'already-used'`; next half-season's 早朝 allows it. Tests in Task 1 and Task 3.
4. **Levy with no player regions**: amount 0, still succeeds and stamps the turn. Test in Task 1.
5. **Slider preview leaves state alone**: `renderTaxPreview` for a level other than the current one does not change `state.revenue.taxLevel`, and the header 國庫 stays the same after `setTax`. Test in Task 3.

---

### Task 1: core — tax level, levy and registry changes

Read first: `docs/architecture.md`, `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md`.

**Files:**
- Create: `packages/core/src/model/revenue.ts`
- Create: `packages/core/src/rules/revenue.ts`
- Create: `packages/core/src/rules/revenue.test.ts`
- Modify: `packages/core/src/model/court.ts`, `packages/core/src/model/court.test.ts`
- Modify: `packages/core/src/model/balance.ts`
- Modify: `packages/core/src/model/state.ts`, `packages/core/src/model/state.test.ts`
- Modify: `packages/core/src/rules/economy.ts`, `packages/core/src/rules/economy.test.ts`
- Modify: `packages/core/src/rules/turn.ts`, `packages/core/src/rules/turn.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/USE_CASES.md` (statuses only)

**Interfaces:**
- Produces (exported from `@emperor/core`):
  - `TAX_LEVEL_IDS = ['very-light', 'light', 'normal', 'heavy', 'very-heavy'] as const`, `type TaxLevelId`, `interface Revenue { taxLevel: TaxLevelId; leviedTurn: number | null }` (in `src/model/revenue.ts`, which imports nothing from `balance.ts`).
  - `GameState.revenue: Revenue`; `SCHEMA_VERSION` = 8.
  - `COURT_OPTION_IDS` without `take-census` and `relieve-disaster`, with `'extra-levy'` and `'budget-sheet'` right after `'adjust-taxes'`. `DEPARTMENTS.revenue.options` = `['adjust-taxes', 'extra-levy', 'budget-sheet']`.
  - `regionTax(stats: RegionStatValues, level: TaxLevelId = 'normal'): number`
  - `settleEconomy(nation, regions, nextHalfSeason, artisans = 0, taxLevel: TaxLevelId = 'normal')`
  - `expectedTax(state: GameState, level: TaxLevelId = state.revenue.taxLevel): { region: string; tax: number }[]`
  - `nextCollection(state: Pick<GameState, 'turn'>): HalfSeasonId`
  - `setTaxLevel(state: GameState, level: TaxLevelId): RevenueOutcome`
  - `levyAmount(state: GameState): number`, `canLevy(state: GameState): boolean`, `levy(state: GameState): RevenueOutcome`
  - `type RevenueRejection = 'not-in-court' | 'unknown-level' | 'already-used'`; `type RevenueOutcome = { ok: false; reason: RevenueRejection; state: GameState } | { ok: true; state: GameState; amount: number }`

**Values (in `BALANCE.tax`, typed `Record<TaxLevelId, { multiplier: number; morale: number }>` for `levels`):**

| Level | multiplier | morale |
|---|---|---|
| very-light | 0.5 | +2 |
| light | 0.75 | +1 |
| normal | 1 | 0 |
| heavy | 1.25 | −1 |
| very-heavy | 1.5 | −2 |

`levyFraction: 0.5`, `levyMoraleLoss: 10`. Keep `halfYearDivisor` and `collectOn` as they are.

- [ ] **Step 1: Update the registry test.** In `court.test.ts`, expect `DEPARTMENTS.revenue.options` to equal `["adjust-taxes", "extra-levy", "budget-sheet"]`, and add `expect(COURT_OPTION_IDS).not.toContain("take-census")` and the same for `"relieve-disaster"`.

- [ ] **Step 2: Write failing tests in `state.test.ts`.** `UC-CORE-021 a new game starts at 平 with no levy`: `expect(state.revenue).toEqual({ taxLevel: "normal", leviedTurn: null })`, `expect(state.schemaVersion).toBe(8)`, and the `rngState` equals that of the same call before (no draws: compare with a state built with and without buildings, as the UC-CORE-020 test does).

- [ ] **Step 3: Write failing tests in `economy.test.ts`** (region `A`: 民心 60, 人口 5,000,000, 富庶 60, so `regionTax(A.stats)` = 90,000):
  - `UC-CORE-021 regionTax scales by the level`: for `very-light`, `light`, `normal`, `heavy`, `very-heavy` gives 45000, 67500, 90000, 112500, 135000; `regionTax(A.stats)` equals `regionTax(A.stats, "normal")`.
  - `UC-CORE-021 collection uses the level and moves 民心 after the tax`: `settleEconomy({ treasury: 1000000 }, [A], "autumn-early", 0, "heavy")` gives `report.taxIncome` 112500 and the region's 民心 59; with `"very-light"` gives 45000 and 民心 62; with `"normal"` 民心 stays 60 and `regionChanges` is `[]`.
  - `UC-CORE-021 no 民心 change outside collections`: `"summer-early"` with `"very-heavy"` leaves 民心 at 60.
  - `UC-CORE-021 clamps 民心 at collection`: 民心 100 on `very-light` stays 100; 民心 1 on `very-heavy` goes to 0.
  - `UC-CORE-021 foreign regions are untouched`: a foreign region keeps its 民心 on `very-heavy`.
  - `UC-CORE-021 bankruptcy follows the level change`: 國庫 0, upkeep pushes it negative, `"autumn-early"`, `very-light`, a region too poor to cover upkeep (人口 1000): 民心 60 → 62 → 59.

- [ ] **Step 4: Write failing tests in `revenue.test.ts`.** Reuse the `REGIONS` and `court()` pattern from `works.test.ts`: player `a` (民心 60, 人口 20,000,000, 富庶 60 → tax 360,000), player `b` (人口 10,500,000 → 189,000), foreign `c`.
  - `UC-CORE-021 setTaxLevel sets the level during 早朝, repeatably`: set `heavy` then `light`; final `revenue.taxLevel` is `light`, `amount` 0, `actionPoint` and `rngState` unchanged.
  - `UC-CORE-021 setTaxLevel rejections in order`: on the map → `'not-in-court'`; dead → `'not-in-court'`; `"bogus" as TaxLevelId` in court → `'unknown-level'`; each returns the same state object.
  - `UC-CORE-021 expectedTax lists player regions at a level`: `expectedTax(court())` = `[{ region: "a", tax: 360000 }, { region: "b", tax: 189000 }]`; `expectedTax(court(), "heavy")` = 450000 and 236250; after `setTaxLevel(..., "light")`, `expectedTax(state)` uses `light` (270000, 141750).
  - `UC-CORE-021 nextCollection`: for `turn` 0 (春上) → `"autumn-early"`; turn 3 (夏下) → `"autumn-early"`; turn 4 (秋上) → `"spring-early"`; turn 7 (冬下) → `"spring-early"`.
  - `UC-CORE-022 levyAmount is half a collection at the current level`: 274500 at 平 (180000 + 94500); 411750 at `very-heavy` (270000 + 141750).
  - `UC-CORE-022 levy adds to 國庫, cuts 民心 and stamps the turn`: after `levy(court())`, `nation.treasury` = start + 274500, `amount` 274500, `a` and `b` 民心 50, `c` 民心 60, `revenue.leviedTurn` = 0, `actionPoint` and `rngState` unchanged, `taxLevel` unchanged.
  - `UC-CORE-022 levy stops 民心 at 0`: a region at 民心 4 ends at 0.
  - `UC-CORE-022 once per 早朝`: second `levy` → `'already-used'`, `canLevy` false; leaving with `returnToMap` and the next half-season's court (`{ ...state, turn: 1, actionPoint: 0 }` then `enterPalace`) → `canLevy` true and `levy` ok.
  - `UC-CORE-022 rejections in order`: on the map → `'not-in-court'`; dead → `'not-in-court'`; used → `'already-used'`.
  - `UC-CORE-022 with no player regions the levy is 0 but allowed`: all regions foreign → `levyAmount` 0, `levy` ok with `amount` 0 and `leviedTurn` stamped.

- [ ] **Step 5: Write a failing test in `turn.test.ts`.** `UC-CORE-021 the turn loop collects at the current level`: from a state at turn 3 (夏下) with `revenue.taxLevel` `"heavy"`, take the four actions of the turn; `turnEnd.economy.taxIncome` equals the sum of `regionTax(stats, "heavy")` over player regions, and each player region's 民心 dropped by 1 (unless at 0).

- [ ] **Step 6: Run** `npm test -w packages/core` — Expected: the new tests FAIL (missing exports / `revenue` undefined).

- [ ] **Step 7: Implement.**
  - `src/model/revenue.ts`: `TAX_LEVEL_IDS`, `TaxLevelId`, `Revenue`.
  - `balance.ts`: add `levels`, `levyFraction`, `levyMoraleLoss` to `tax`.
  - `court.ts`: the registry change above.
  - `state.ts`: `revenue` field after `works`, `{ taxLevel: "normal", leviedTurn: null }` in `createInitialState`, `SCHEMA_VERSION = 8`.
  - `economy.ts`: `regionTax` computes `Math.floor(pop * prosperity * morale * multiplier / halfYearDivisor)`. In `settleEconomy`, at a collection, sum the taxes first, then add the level's `morale` to each player region's 民心, clamped to the `morale` bounds in `STAT_REGISTRY`; bankruptcy stays after.
  - `turn.ts`: pass `state.revenue.taxLevel` to `settleEconomy`.
  - `src/rules/revenue.ts`: the functions in Interfaces. Use `isMorningCourt` from `turn.ts`, the `reject` helper pattern of `works.ts`, and `HALF_SEASONS`/`BALANCE.turnsPerYear` for `nextCollection` (loop k = 1…turnsPerYear for the first `HALF_SEASONS[(turn + k) % turnsPerYear]` in `collectOn`). `setTaxLevel` checks membership with `TAX_LEVEL_IDS.includes`.
  - `index.ts`: export everything in Interfaces.

- [ ] **Step 8: Run** `npm test -w packages/core` — Expected: PASS. Set UC-CORE-021 and UC-CORE-022 to `implemented` in `packages/core/USE_CASES.md`.

- [ ] **Step 9: Commit**
```bash
git add packages/core
git commit -m "feat(core): tax level, extra levy and 戶部 court options"
```

### Task 2: content — 戶部 text

Read first: `packages/content/ARCHITECTURE.md`, `packages/content/USE_CASES.md`.

**Files:**
- Modify: `packages/content/src/schema.ts` (`UiText` keys, `GameText.taxLevels`)
- Modify: `packages/content/src/index.ts`
- Modify: `packages/content/src/index.test.ts`

**Interfaces:**
- Consumes: `TAX_LEVEL_IDS`, `TaxLevelId`, the new `CourtOptionId` set from Task 1.
- Produces: `gameText.taxLevels: Record<TaxLevelId, { name: string }>`; `gameText.courtOptions['extra-levy' | 'budget-sheet']`; these `uiText` keys (exact text):

| Key | Text |
|---|---|
| `taxHeading` | 調整賦稅 |
| `taxHint` | 稅賦輕重，關乎各地民心。 |
| `taxSliderLabel` | 稅率 |
| `taxLevelLabel` | 稅率 |
| `expectedTaxLabel` | 下次預計稅入 |
| `levyHeading` | 額外徵稅 |
| `levyHintPrefix` | 此次加徵可得 |
| `levyHintSuffix` | ，然將大幅減低民心。 |
| `confirmLevy` | 徵收 |
| `levyBack` | 返回 |
| `levyResultLabel` | 加徵所得 |
| `levyUsed` | 已徵 |
| `budgetHeading` | 收支表 |
| `currentTaxLabel` | 現行稅率 |
| `expectedTaxColumn` | 下次預計稅入 |
| `totalRow` | 合計 |
| `halfYearUpkeepLabel` | 半年宮廷用度 |
| `nextCollectionLabel` | 下次收稅 |

Tax level names: `very-light` 極輕, `light` 輕, `normal` 平, `heavy` 重, `very-heavy` 極重. Court option names: `extra-levy` 額外徵稅, `budget-sheet` 收支表 (`adjust-taxes` stays 調整賦稅).

- [ ] **Step 1: Update tests in `index.test.ts`.** In the `courtOptions` `toEqual`, drop `take-census` and `relieve-disaster` and add `'extra-levy': { name: '額外徵稅' }, 'budget-sheet': { name: '收支表' }`. Add `UC-WEB-014 UC-WEB-015 UC-WEB-016 戶部 text`: `DEPARTMENTS.revenue.options` names are `['調整賦稅', '額外徵稅', '收支表']`; `TAX_LEVEL_IDS.map((id) => gameText.taxLevels[id].name)` is `['極輕', '輕', '平', '重', '極重']`; `Object.keys(gameText.taxLevels)` equals `[...TAX_LEVEL_IDS]`; `uiText.levyUsed` is `'已徵'` and `uiText.confirmLevy` is `'徵收'`.
- [ ] **Step 2: Run** `npm test -w packages/content` — Expected: FAIL (type errors / missing keys).
- [ ] **Step 3: Implement** the schema keys and text from the tables.
- [ ] **Step 4: Run** `npm test -w packages/content` — Expected: PASS.
- [ ] **Step 5: Commit**
```bash
git add packages/content
git commit -m "feat(content): 戶部 text and tax level names"
```

### Task 3: web — 調整賦稅, 額外徵稅 and 收支表 screens

Read first: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md`.

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/screen.test.ts`
- Modify: `packages/web/src/render.ts`, `packages/web/src/render.test.ts`
- Modify: `packages/web/src/main.ts`
- Modify: `packages/web/src/style.css`
- Modify: `packages/web/screenshots.json`
- Modify: `packages/web/USE_CASES.md` (statuses only)

**Interfaces:**
- Consumes: Task 1's `canLevy`, `levy`, `levyAmount`, `setTaxLevel`, `expectedTax`, `nextCollection`, `TAX_LEVEL_IDS`, `TaxLevelId`, `BALANCE.upkeep`, `BALANCE.turnsPerYear`; Task 2's text keys.
- Produces:
  - `Screen` gains `{ screen: 'taxes'; state }`, `{ screen: 'levy'; state; gained?: number }`, `{ screen: 'budget'; state }`.
  - `OPEN_COURT_OPTIONS` gains `'adjust-taxes'`, `'extra-levy'`, `'budget-sheet'`.
  - `setTax(screen: Screen, level: TaxLevelId): Screen`, `confirmLevy(screen: Screen): Screen` in `screen.ts`; `backToCourt` returns `taxes`, `levy`, `budget` to `{ screen: 'play', state, department: 'revenue' }`.
  - `renderTaxPreview(state: GameState, level: TaxLevelId, text: UiText, game: GameText): { level: string; expected: string }` in `render.ts`: `level` = `` `${text.taxLevelLabel}：${game.taxLevels[level].name}` ``, `expected` = `` `${text.expectedTaxLabel}：${formatTaels(sum of expectedTax(state, level))}` ``.
  - `renderTaxScreen`, `renderLevyScreen`, `renderBudgetScreen`, wired into `renderScreen`.

**Markup (element IDs):**
- Court: 額外徵稅 disabled with `<span class="court-option-tag">${text.levyUsed}</span>` when `!canLevy`, same pattern as 徵召工匠.
- `taxes`: header bar, `<main id="tax-screen">`, `<h2>` taxHeading, `<p id="tax-hint">`, `<input type="range" id="tax-slider" min="0" max="4" step="1" value="<index of current level>" list="tax-notches" aria-label="${text.taxSliderLabel}">`, `<datalist id="tax-notches">` with five `<option value="i">`, `<div id="tax-level-names">` with the five names as `<span>`s, `<p id="tax-level">` and `<p id="tax-expected">` holding `renderTaxPreview(state, state.revenue.taxLevel, …)`, `<button id="back-to-court">` backToCourt.
- `levy` before levying: header bar, `<main id="levy-screen">`, `<h2>` levyHeading, `<p id="levy-hint">` `${levyHintPrefix}${formatTaels(levyAmount(state))}${levyHintSuffix}`, `<button id="confirm-levy">` confirmLevy, `<button id="back-to-court">` levyBack. After (`gained` set): `<p id="levy-result">` `${levyResultLabel}：${formatTaels(gained)}` and `<button id="back-to-court">` backToCourt; no hint, no `confirm-levy`.
- `budget`: header bar, `<main id="budget-screen">`, `<h2>` budgetHeading, `<p id="budget-treasury">` `${game.statLabels.treasury}：${formatTaels(treasury)}`, `<p id="budget-level">` `${currentTaxLabel}：${level name}`, `<table id="budget-table">` (head: regionColumn, expectedTaxColumn; one `<tr data-region="id">` per `expectedTax` row with the region name from `game.regions` and `formatTaels(tax)`; `<tr id="budget-total">` with totalRow and the sum), `<p id="budget-upkeep">` `${halfYearUpkeepLabel}：${formatTaels(BALANCE.upkeep * BALANCE.turnsPerYear / 2)}`, `<p id="budget-next">` `${nextCollectionLabel}：${game.halfSeasonLabels[nextCollection(state)]}`, `<button id="back-to-court">` backToCourt.

- [ ] **Step 1: Write failing tests in `screen.test.ts`** (court state = `enterPalace(newState(), 'xuanzheng')`):
  - `UC-WEB-007 戶部 options open their screens`: `chooseCourtOption` with `adjust-taxes` → `taxes`, `budget-sheet` → `budget`, `extra-levy` → `levy` with no `gained`; with the levy used (`leviedTurn` = `turn`) `extra-levy` returns the same screen.
  - `UC-WEB-014 setTax saves the level and stays`: `setTax(taxes, 'heavy')` → `taxes` with `state.revenue.taxLevel` `'heavy'` and the same `nation.treasury`; repeat with `'light'`; `setTax` from `budget` or with `'bogus'` returns the same screen.
  - `UC-WEB-015 confirmLevy levies once and records the amount`: `gained` equals `levyAmount(court)`, treasury grows by it; calling `confirmLevy` again returns the same screen; from `taxes` returns the same screen.
  - `UC-WEB-014 UC-WEB-015 UC-WEB-016 backToCourt opens 戶部`: from each of the three → `{ screen: 'play', state, department: 'revenue' }`; after a levy, the state passed back has `canLevy` false.
- [ ] **Step 2: Write failing tests in `render.test.ts`:**
  - `UC-WEB-007 戶部 lists its three options in order, all enabled`: open `revenue`; the three buttons appear in order with no tag. After a levy, `court-option-extra-levy` is `disabled` with the `levyUsed` tag.
  - `UC-WEB-014 tax screen`: contains `id="tax-hint"` with `uiText.taxHint`, a range input with `min="0" max="4" step="1" value="2"`, five level names in order, `id="tax-level"` with 平, `id="tax-expected"` with `formatTaels` of the sum of `expectedTax`; contains no `gameText.statLabels.morale`.
  - `UC-WEB-014 renderTaxPreview`: for `'very-heavy'` gives `稅率：極重` and the very-heavy total; the state's `taxLevel` is still `'normal'` afterwards.
  - `UC-WEB-015 levy screen`: before, hint has `formatTaels(levyAmount(state))` and `levyHintSuffix`, has `confirm-levy` and `back-to-court`, and no `statLabels.morale`; after `confirmLevy`, has `levy-result` with the amount, no `confirm-levy`, no `levy-hint`.
  - `UC-WEB-016 budget sheet`: treasury line, level line with 平, one `data-region` row per player region with its `expectedTax`, the total row, the upkeep line with `formatTaels(BALANCE.upkeep * BALANCE.turnsPerYear / 2)`, and at turn 0 the next-collection line with 秋上.
  - `UC-WEB-004` header-bar test (the loop `for (const html of [result, summary, atlas])` near line 181): add the rendered `taxes`, `levy` and `budget` screens, each starting with `<header id="game-header"`.
- [ ] **Step 3: Run** `npm test -w packages/web` — Expected: FAIL.
- [ ] **Step 4: Implement** `screen.ts` and `render.ts` changes per Interfaces and Markup.
- [ ] **Step 5: Wire `main.ts`.** In the click listener add `#confirm-levy` → `confirmLevy`. Add `root.addEventListener('input', …)`: when the target is `#tax-slider` and `current.screen === 'taxes'`, take `TAX_LEVEL_IDS[Number(value)]`, call `renderTaxPreview` and set the `textContent` of `#tax-level` and `#tax-expected`; do not redraw. Add `root.addEventListener('change', …)`: for `#tax-slider`, `current = setTax(current, level)` then `draw()`.
- [ ] **Step 6: Style** `#tax-slider` full width of the content column, `#tax-level-names` as five evenly spaced labels under the notches (flex, `justify-content: space-between`), and the three screens like the 工部 screens.
- [ ] **Step 7: Add scenarios to `screenshots.json`** (each starts with `click #start`, `click #era-suggestion-0`, `click #palace-xuanzheng`, `click #department-revenue`):
  - `palace-xuanzheng-revenue` — 「宣政殿畫面：展開戶部，調整賦稅、額外徵稅與收支表」 — `waitFor #court-options`.
  - `adjust-taxes` — 「調整賦稅：民心提示、五段稅率滑桿、稅率名稱與下次預計稅入」 — `click #court-option-adjust-taxes`, `waitFor #tax-screen`.
  - `extra-levy` — 「額外徵稅：可得稅銀與民心大減提示、徵收與返回」 — `click #court-option-extra-levy`, `waitFor #levy-screen`.
  - `extra-levy-result` — 「額外徵稅後：所得稅銀與返回宣政殿」 — then `click #confirm-levy`, `waitFor #levy-result`.
  - `revenue-levied` — 「宣政殿戶部：額外徵稅已徵」 — then `click #back-to-court`, `waitFor #court-option-extra-levy[disabled]`.
  - `budget-sheet` — 「收支表：國庫、稅率、各地預計稅入與合計、半年宮廷用度、下次收稅」 — `click #court-option-budget-sheet`, `waitFor #budget-screen`.
- [ ] **Step 8: Run** `npm test -w packages/web` — Expected: PASS. Set UC-WEB-014, UC-WEB-015, UC-WEB-016 to `implemented`.
- [ ] **Step 9: Commit**
```bash
git add packages/web
git commit -m "feat(web): 戶部 screens for 調整賦稅, 額外徵稅 and 收支表"
```

### Task 4: whole repo — verify

- [ ] **Step 1:** `grep -rn "take-census\|relieve-disaster\|戶口普查\|賑濟災民" packages docs GLOSSARY.md` — Expected: no output.
- [ ] **Step 2:** `npm run verify` — Expected: exits 0 (typecheck, tests, build, `check:ids`).
- [ ] **Step 3:** Fix anything it reports in the module that owns it, and commit there.
