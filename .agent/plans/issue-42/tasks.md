# 工部: 工匠 and 營建工程 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn on 工部 in 早朝: recruit and release 工匠 (paid from 國庫 each half-season) and assign them to a content-defined list of national buildings that complete once enough 工匠·半季 have gone in.

**Architecture:** `core` gains `GameState.works` (total 工匠, last 徵召 turn, one `BuildingState` per building copied from `BuildingData` at game start), the rules `recruitArtisans`, `releaseArtisans` and `assignArtisans`, 工匠 wages inside `settleEconomy`, and building progress at turn end (`TurnEnd.completed`). `content` adds the building list (`src/buildings.ts`), new court option text and UI text, and `formatWages` / `formatArtisans`. `web` adds the `recruit`, `release` and `build` screens, enables 工部's options, and shows wages and completions in the summary.

**Tech Stack:** TypeScript, Vitest, Vite. Run tests with `npx vitest run packages/<module>` from the repo root; type-check with `npm run typecheck`.

**Spec:** Issue #42; `packages/core/USE_CASES.md` UC-CORE-019, UC-CORE-020, UC-CORE-015, UC-CORE-012; `packages/content/USE_CASES.md` UC-CONTENT-004 and Formatting; `packages/web/USE_CASES.md` UC-WEB-011, 012, 013, 007, 004, 003; `packages/core/ARCHITECTURE.md` (State, Building data, Interface); `packages/content/ARCHITECTURE.md` (Buildings); `packages/web/ARCHITECTURE.md` (Screen state); `GLOSSARY.md` (工匠, 工匠·半季, 營建).

## Global Constraints
- Player-facing text is Traditional Chinese and lives in `content`.
- `core` has no DOM and draws no random numbers in any 工部 rule. Every rule is a pure function returning a new state, and a rejection returns the same state object.
- Test names or comments carry the UC ID they cover.
- When done, mark UC-CORE-019, UC-CORE-020, UC-CONTENT-004, UC-WEB-011, UC-WEB-012 and UC-WEB-013 `implemented`.
- No existing game may be named anywhere.
- `npm run verify` must pass at the end.

## Review Focus
1. **Raising one building must not overdraw idle 工匠.** `assignArtisans` checks `count − current ≤ idle`, not `count ≤ idle`; lowering is always allowed. Test both with two buildings sharing the pool (Task 1).
2. **Rounding of the 徵召 maximum.** 30,500,000 free → 310,000; 30,499,999 → 300,000; 4,999 free → 0, so 徵召 is off. Use integer-safe `Math.round(free * pct / (100 * step)) * step` (Task 1).
3. **Completion frees 工匠 the same turn.** A building that completes has `assigned` 0 afterwards, so those 工匠 are idle at the next 早朝, but they are still paid that half-season, since wages come first (Task 1 turn test).
4. **Picker input from the DOM.** `stepCount` past either end, `changeAssignment` on a completed or unknown building, or a non-±1 direction leave the screen unchanged (Task 3).
5. **Wages push 國庫 negative.** The bankruptcy 民心 loss must apply when wages alone make 國庫 negative (Task 1 economy test).

---

### Task 1: core — 工匠, buildings, wages and progress

Read first: `docs/architecture.md`, `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md` (UC-CORE-003, 012, 015, 019, 020).

**Files:**
- Create: `packages/core/src/model/works.ts`, `packages/core/src/rules/works.ts`, `packages/core/src/rules/works.test.ts`
- Modify: `packages/core/src/model/balance.ts`, `packages/core/src/model/state.ts`, `packages/core/src/model/state.test.ts`, `packages/core/src/model/court.ts`, `packages/core/src/model/court.test.ts`, `packages/core/src/rules/economy.ts`, `packages/core/src/rules/economy.test.ts`, `packages/core/src/rules/turn.ts`, `packages/core/src/rules/turn.test.ts`, `packages/core/src/testNames.ts`, `packages/core/src/index.ts`, `packages/core/USE_CASES.md` (status only)

**Interfaces — Produces (exported from `@emperor/core`):**
- `model/works.ts`: `BuildingData { id: string; required: number }`, `BuildingState { id: string; required: number; progress: number; assigned: number }`, `Works { artisans: number; recruitedTurn: number | null; buildings: BuildingState[] }`, `BuildingStatus = 'not-started' | 'in-progress' | 'completed'`, `buildingStatus(b: BuildingState): BuildingStatus`, `halfSeasonsToFinish(b: BuildingState): number | null`, and (not exported from index) `advanceBuildings(buildings: readonly BuildingState[]): { buildings: BuildingState[]; completed: string[] }`.
- `BALANCE.works = { step: 10000, recruitPercent: 1, wagePerArtisan: 0.5 }`.
- `GameState.works: Works` (after `exam`), `SCHEMA_VERSION = 7`.
- `createInitialState(seed, eraName, regions, names, buildings: readonly BuildingData[] = [])`.
- `rules/works.ts`: `freePopulation`, `maxRecruit`, `idleArtisans`, `canRecruit` (all `(state: GameState) => number | boolean`), `recruitArtisans(state, count)`, `releaseArtisans(state, count)`, `assignArtisans(state, buildingId, count)`, all returning `WorksOutcome`; types `WorksRejection`, `WorksOutcome` (shapes in `packages/core/ARCHITECTURE.md`).
- `settleEconomy(nation, regions, nextHalfSeason, artisans = 0)`; `EconomyReport.wages: number`; `TurnEnd.completed: string[]`.
- `COURT_OPTION_IDS` gains `'recruit-artisans'`, `'release-artisans'` (inserted before `'build'`); `DEPARTMENTS.works.options = ['recruit-artisans', 'release-artisans', 'build', 'forge-weapons']`.

- [ ] **Step 1: Model, balance, registry.** Add `model/works.ts` types and `BALANCE.works`. Add `works` to `GameState`, bump `SCHEMA_VERSION` to 7, and in `createInitialState` set `works: { artisans: 0, recruitedTurn: null, buildings: buildings.map(b => ({ id: b.id, required: b.required, progress: 0, assigned: 0 })) }`. It draws no random numbers, so `rngState` is unchanged. Add `TEST_BUILDINGS: readonly BuildingData[] = [{ id: 'small', required: 30000 }, { id: 'large', required: 100000 }]` to `testNames.ts`. Update the registry and `court.test.ts` to the new 工部 order.

- [ ] **Step 2: Failing tests.**
  - `state.test.ts` (`UC-CORE-020`): `schemaVersion` is 7; with `TEST_BUILDINGS`, `works` equals `{ artisans: 0, recruitedTurn: null, buildings: [{id:'small',required:30000,progress:0,assigned:0}, {id:'large',…}] }`; without the argument `buildings` is `[]`; `rngState` matches the call without buildings.
  - `works.test.ts` (names start `UC-CORE-019` or `UC-CORE-020`). Use a `court(over)` helper like `recommend.test.ts`, building from `createInitialState(1, '承平', REGIONS, TEST_NAMES, TEST_BUILDINGS)` with `REGIONS` two player regions of 人口 20,000,000 and 10,500,000 plus one foreign region of 9,000,000.
    - `freePopulation` = 30,500,000; with `artisans: 500,000` it is 30,000,000; it is 0, not negative, when 工匠 exceed 人口.
    - `maxRecruit`: 30,500,000 free → 310,000; free 30,499,999 → 300,000; free 4,999 → 0 (regions set by hand).
    - `canRecruit`: true in court; false on the map, when dead, after a 徵召 this turn, and when `maxRecruit` is 0; true again at `turn + 1`.
    - `recruitArtisans(s, 310000)` → `artisans` 310,000, `recruitedTurn` = `turn`, `rngState` unchanged. Rejections, each `toBe` the same state: map → `not-in-court`; second call → `already-used`; counts 0, 5,000, 15,000, 320,000, −10,000, `NaN` → `invalid-count`.
    - `releaseArtisans`: with 100,000 工匠 of which 30,000 assigned, releasing 70,000 is ok (artisans 30,000, `small` still 30,000 assigned); 80,000 and 0 and 5,000 → `invalid-count`; map → `not-in-court`; two releases in one 早朝 both succeed.
    - `assignArtisans`: with 100,000 工匠, `small` → 30,000 then `large` → 70,000 is ok and `idleArtisans` is 0; then `large` → 80,000 is `not-enough-idle`; `large` → 50,000 is ok (idle 20,000); `small` → 0 keeps progress. Rejections in order: map → `not-in-court`; `'nope'` → `unknown-building`; completed building → `completed`; −10,000, 5,000, 1.5 → `invalid-count`.
    - `buildingStatus`: progress 0/assigned 0 → `not-started`; progress 0/assigned 10,000 → `in-progress`; progress 10,000/assigned 0 → `in-progress`; progress = required → `completed`. `halfSeasonsToFinish`: required 100,000, progress 30,000, assigned 20,000 → 4; assigned 0 → `null`; completed → `null`.
    - `advanceBuildings`: progress grows by `assigned`, capped at `required`; a building reaching `required` gets `assigned` 0 and its ID in `completed`, in list order; inputs are not mutated.
  - `economy.test.ts` (`UC-CORE-015`): `settleEconomy(nation, regions, 'summer-early', 100000).report.wages` is 50,000 and treasury drops by `BALANCE.upkeep + 50000`; with no 4th argument `wages` is 0; with 國庫 at `BALANCE.upkeep` and 10,000 工匠 (wages 5,000), every player region loses `BALANCE.bankruptcyMoraleLoss` 民心; `artisans` 1 gives wages 0 (rounded down). Update existing `toEqual` checks on `report` to include `wages: 0`.
  - `turn.test.ts` (`UC-CORE-020`): from court with 100,000 工匠 and `small` assigned 30,000, `large` 20,000, finish the turn (return to map, three actions). `turnEnd.completed` is `['small']`; `small` progress 30,000, assigned 0; `large` progress 20,000, assigned 20,000; `turnEnd.economy.wages` is 50,000. Dying of age gives `completed: []`, `wages: 0`, and building progress unchanged.

- [ ] **Step 3: Implement.**
  - `model/works.ts`: the types plus `buildingStatus`, `halfSeasonsToFinish` (`Math.ceil((required − progress) / assigned)`), `advanceBuildings`.
  - `rules/works.ts`: `idleArtisans` = `artisans − Σ assigned`. `isStepCount(n, min, max)` = integer multiple of `BALANCE.works.step`, `min ≤ n ≤ max`. Recruit checks `not-in-court`, `already-used`, `invalid-count` (`isStepCount(count, step, maxRecruit)`). Release checks `not-in-court`, `invalid-count` (`step..idle`). Assign checks in the order in UC-CORE-020; `count` must be a step multiple ≥ 0, and `count − assigned ≤ idle`.
  - `economy.ts`: `wages = Math.floor(artisans * BALANCE.works.wagePerArtisan)`, subtracted with upkeep before population and taxes; add to the report.
  - `turn.ts`: pass `state.works.artisans` to `settleEconomy`, then run `advanceBuildings(state.works.buildings)`; put its buildings in `works` and its `completed` in `TurnEnd`. The death-by-age branch reports `{ taxIncome: 0, upkeep: 0, wages: 0, regionChanges: [] }` and `completed: []`.
  - Export everything listed above from `index.ts` (except `advanceBuildings`).

- [ ] **Step 4: Run** `npx vitest run packages/core` and `npm run typecheck` (the web and content packages may fail to type-check until Tasks 2–3; core must pass). Set UC-CORE-019 and UC-CORE-020 to `implemented`.

- [ ] **Step 5: Commit** `feat(core): 工匠, 營建 progress and wages`.

---

### Task 2: content — building list, court option and UI text, formatters

Read first: `packages/content/ARCHITECTURE.md`, `packages/content/USE_CASES.md` (UC-CONTENT-004, Formatting), `packages/web/USE_CASES.md` (UC-WEB-004, 007, 011, 012, 013).

**Files:**
- Create: `packages/content/src/buildings.ts`, `packages/content/src/buildings.test.ts`
- Modify: `packages/content/src/schema.ts`, `packages/content/src/index.ts`, `packages/content/src/index.test.ts`, `packages/content/src/format.ts`, `packages/content/src/format.test.ts`, `packages/content/USE_CASES.md` (status only)

**Interfaces — Produces:**
- `schema.ts`: `BuildingCategory = 'palace' | 'ritual' | 'education' | 'garden' | 'water' | 'defense' | 'transport'`; `BuildingEntry extends BuildingData { name: string; description: string; category: BuildingCategory }`; `GameText.buildings: readonly BuildingEntry[]` (after `notables`). Export both types from `index.ts`.
- `gameText.courtOptions`: `'recruit-artisans': 徵召工匠`, `'release-artisans': 遣散工匠`, `build: 營建工程` (was 建造).
- `formatWages(wages: number): string` → `${wagesLabel} −${formatTaels(wages)}`, e.g. `formatWages(50000)` = `工匠工錢 −50,000 兩`.
- `formatArtisans(n: number): string` → `${formatAmount(n)} ${personUnit}`, e.g. `310,000 人`.
- `formatEconomy` does not change.
- New `UiText` keys (after `noExamCandidates`), exact values:

| Key | Value | Key | Value |
|---|---|---|---|
| `recruitHeading` | 徵召工匠 | `releaseHeading` | 遣散工匠 |
| `buildHeading` | 營建工程 | `artisanTotalLabel` | 工匠總數 |
| `idleArtisansLabel` | 閒置工匠 | `freePopulationLabel` | 可徵人口 |
| `recruitMaxLabel` | 此次至多 | `personUnit` | 人 |
| `countLabel` | 人數 | `countDown` | － |
| `countUp` | ＋ | `countDownLabel` | 減少 |
| `countUpLabel` | 增加 | `recruitMax` | 最多 |
| `releaseAll` | 全部閒置 | `confirmRecruit` | 徵召 |
| `confirmRelease` | 遣散 | `recruitUsed` | 本次已徵召 |
| `noRecruits` | 無可徵之民 | `noIdleArtisans` | 無閒置工匠 |
| `buildingColumn` | 工程 | `requiredColumn` | 所需工匠·半季 |
| `statusColumn` | 狀態 | `assignedColumn` | 工匠 |
| `statusNotStarted` | 未動工 | `statusInProgress` | 營建中 |
| `statusCompleted` | 已落成 | `pausedMark` | 停工 |
| `etaPrefix` | 約 | `etaSuffix` | 半季 |
| `wagesLabel` | 工匠工錢 | `completedLabel` | 落成 |

- `src/buildings.ts`, `export const buildings: readonly BuildingEntry[]`, one entry per line, in this order (ID, name, category, required, description):

| id | name | category | required | description |
|---|---|---|---|---|
| `daming-palace` | 大明宮 | palace | 1000000 | 龍首原上的宏偉宮城，含元殿居高臨下，為天子聽政之所。 |
| `weiyang-palace` | 未央宮 | palace | 900000 | 規模宏大的宮殿群，殿閣台榭環列，象徵國祚綿長。 |
| `tiantan` | 天壇 | ritual | 400000 | 冬至祭天之所，圜丘三層，祈年殿以藍瓦覆頂。 |
| `ditan` | 地壇 | ritual | 200000 | 夏至祭地之所，方澤壇與天壇南北相對。 |
| `ritan` | 日壇 | ritual | 120000 | 春分朝日之所，壇面以紅色琉璃鋪砌。 |
| `yuetan` | 月壇 | ritual | 120000 | 秋分夕月之所，壇面以白石鋪砌。 |
| `sheji-altar` | 社稷壇 | ritual | 150000 | 祭祀土神與穀神，壇上以五色土象徵天下疆域。 |
| `xiannong-altar` | 先農壇 | ritual | 150000 | 祭祀先農之所，天子於此親耕籍田，以勸農桑。 |
| `taimiao` | 太廟 | ritual | 300000 | 奉祀列祖列宗的宗廟，四時大祭皆於此舉行。 |
| `guozijian` | 國子監 | education | 250000 | 天下最高學府，太學生於此研習經史。 |
| `confucius-temple` | 孔廟 | education | 200000 | 京師祭孔之所，與國子監左廟右學相依。 |
| `gongyuan` | 貢院 | education | 200000 | 會試考場，號舍成排，天下舉子於此應試。 |
| `hanlin-academy` | 翰林院 | education | 150000 | 文學侍從之臣所居，起草詔書、修撰國史。 |
| `wenyuan-pavilion` | 文淵閣 | education | 150000 | 皇家藏書樓，典藏天下圖書典籍。 |
| `observatory` | 觀星臺 | education | 100000 | 觀測日月星辰、測定節氣曆法的高臺。 |
| `yuanmingyuan` | 圓明園 | garden | 1200000 | 規模浩大的皇家園林，集天下名園勝景於一處。 |
| `yiheyuan` | 頤和園 | garden | 800000 | 依山傍湖的皇家園林，長廊與湖光相映。 |
| `summer-resort` | 避暑山莊 | garden | 900000 | 塞上離宮，天子夏日避暑、會見藩部之所。 |
| `xiyuan` | 西苑 | garden | 400000 | 宮城西側的皇家苑囿，太液池水波相連。 |
| `grand-canal` | 大運河 | water | 1800000 | 貫通南北的漕運水道，連接諸大水系，輸糧入京。 |
| `tonghui-canal` | 通惠河 | water | 300000 | 自京城引水接通運河的漕渠，使糧船直抵京師。 |
| `great-wall` | 長城 | defense | 2000000 | 綿延萬里的北疆屏障，烽燧相望，以禦塞外。 |
| `capital-walls` | 京師城垣 | defense | 800000 | 環繞京城的高大城牆與城門，固守天子腳下。 |
| `zhidao` | 直道 | transport | 700000 | 自京畿直通北疆的軍用大道，塹山堙谷，千里相通。 |
| `chidao` | 馳道 | transport | 1000000 | 以京師為中心通達四方的天子大道，路旁植樹為界。 |

- [ ] **Step 1: Failing tests.**
  - `buildings.test.ts` (`UC-CONTENT-004`): 25 entries; IDs and names unique; every name is Han characters only; every description is non-empty and contains no line break; every category is one of the seven; every `required` is a positive multiple of `BALANCE.works.step`; `great-wall` requires 2,000,000; at least one building requires ≤ 310,000 (one 徵召 can finish it in a half-season); no ID equals a region ID; `gameText.buildings` is `buildings`.
  - `index.test.ts`: `UC-WEB-007` the 工部 option names are 徵召工匠, 遣散工匠, 營建工程, 打造兵器 in `DEPARTMENTS.works` order; `UC-WEB-011` / `UC-WEB-013` `uiText` matches the key table (`toMatchObject`).
  - `format.test.ts` (`UC-WEB-004`): `formatWages(50000)` = `工匠工錢 −50,000 兩`; `formatArtisans(310000)` = `310,000 人`. Existing `formatEconomy` tests pass with `wages` added to their report literals, and its output ignores `wages`.
- [ ] **Step 2: Implement** the schema types, `buildings.ts`, text, and the two formatters.
- [ ] **Step 3: Run** `npx vitest run packages/content`. Expected: PASS. Set UC-CONTENT-004 to `implemented`.
- [ ] **Step 4: Commit** `feat(content): national buildings and 工部 text`.

---

### Task 3: web — 工部 screens, court options and summary

Read first: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md` (UC-WEB-003, 004, 007, 011, 012, 013).

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/screen.test.ts`, `packages/web/src/render.ts`, `packages/web/src/render.test.ts`, `packages/web/src/main.ts`, `packages/web/src/style.css`, `packages/web/screenshots.json`, `packages/web/USE_CASES.md` (status only)

**Interfaces:**
- Consumes: Task 1 exports; Task 2 `UiText` keys, `gameText.buildings`, `formatWages`, `formatArtisans`.
- Produces (`screen.ts`):
  - `Screen` members `{ screen: 'recruit'; state; count: number }`, `{ screen: 'release'; state; count: number }`, `{ screen: 'build'; state }`; `summary` gains `completed: string[]`.
  - `chooseEraName(screen, input, regions, names, buildings: readonly BuildingData[])` (required; `main.ts` passes `gameText.buildings`).
  - `OPEN_COURT_OPTIONS` adds `'recruit-artisans'`, `'release-artisans'`, `'build'`.
  - `stepCount(screen: Screen, direction: 1 | -1): Screen`, `maxCount(screen: Screen): Screen`, `confirmRecruit(screen: Screen): Screen`, `confirmRelease(screen: Screen): Screen`, `changeAssignment(screen: Screen, buildingId: string, direction: 1 | -1): Screen`.
  - `backToCourt` returns `recruit`/`release`/`build` to `play` with `department: 'works'` (others keep `'personnel'`).
- Element IDs: `#recruit-screen`, `#release-screen`, `#build-screen` (mains); `#artisan-total`, `#artisan-idle`, `#free-population`, `#recruit-max-line`; picker `#count-down`, `#count-value`, `#count-up`, `#count-max` (labelled 最多 on recruit, 全部閒置 on release); `#confirm-recruit`, `#confirm-release`, `#back-to-court`; `#building-list` (table), rows `<tr data-building-row="${id}" data-status="${status}">`, buttons `#assign-down-${id}` / `#assign-up-${id}` with `data-assign="${id}"` and `data-direction="-1" | "1"`; summary `#summary-wages`, `#summary-completed`.

- [ ] **Step 1: Failing screen tests** (`screen.test.ts`). Update existing `chooseEraName` calls to pass `gameText.buildings` (or a test list).
  - `UC-WEB-003` the started state has one `works.buildings` entry per building passed.
  - `UC-WEB-007` `chooseCourtOption` in 宣政殿: `recruit-artisans` → `{ screen: 'recruit', count: 10000 }` when `canRecruit`, same screen once used; `release-artisans` → `{ screen: 'release', count: 10000 }` only with idle 工匠; `build` → `{ screen: 'build' }`.
  - `UC-WEB-011` `stepCount` +1 from 10,000 → 20,000; −1 at 10,000 and +1 at `maxRecruit` return the same screen; `maxCount` sets `maxRecruit`; `confirmRecruit` → `play` with `department: 'works'`, 工匠 increased and `canRecruit` false; `backToCourt` → `play`, `department: 'works'`, state unchanged. Calls on other screens return the same screen.
  - `UC-WEB-012` limits are 10,000..idle; `maxCount` sets idle; `confirmRelease` lowers 工匠 and returns to `play` with `works` open.
  - `UC-WEB-013` `changeAssignment(s, id, 1)` raises by 10,000 and stays on `build`; with no idle 工匠, or `-1` at 0, or an unknown or completed building, or direction `2`, it returns the same screen.
  - `UC-WEB-004` `performAction` ending a turn in which a building completes gives `summary.completed` with its ID.
  - `UC-WEB-013 the summary screenshot path completes 觀星臺`: from `chooseEraName(..., gameText.buildings)`, 宣政殿 → 工部 → 徵召工匠 → `maxCount` → `confirmRecruit` → 營建工程 → `changeAssignment(…, 'observatory', 1)` × 10 → `backToCourt` → `goToMap` → three rests in 養心殿 (continuing after the first two). The last is a `summary` with `completed` `['observatory']` and `economy.wages` 155,000.
- [ ] **Step 2: Implement `screen.ts`.** Limits: recruit `maxRecruit(state)`, release `idleArtisans(state)`. `changeAssignment` calls `assignArtisans(state, id, assigned + direction * BALANCE.works.step)`.
- [ ] **Step 3: Failing render tests** (`render.test.ts`):
  - `UC-WEB-007` with 工部 open: four options in order; 徵召工匠, 營建工程 enabled; 遣散工匠 disabled with tag 無閒置工匠 at game start; after a 徵召, 徵召工匠 disabled with tag 本次已徵召 and 遣散工匠 enabled; with `maxRecruit` 0 (regions with tiny 人口), tag 無可徵之民; 打造兵器 tagged 尚未開放.
  - `UC-WEB-011` the header bar precedes `<main id="recruit-screen">`; `#artisan-total`, `#free-population` and `#recruit-max-line` show `formatArtisans` values; `#count-value` shows `10,000 人`; `#count-down` is disabled at one step, `#count-up` disabled at the maximum; `#count-max` reads 最多.
  - `UC-WEB-012` `#release-screen` shows total and idle; `#count-max` reads 全部閒置.
  - `UC-WEB-013` `#build-screen` has 25 rows in list order with name, description and `formatAmount(required)`; a not-started row reads 未動工 with `#assign-down-…` disabled; an in-progress row (progress 30,000 of 100,000, 20,000 assigned) reads 營建中, `30,000 / 100,000` and 約4半季; a paused row (progress > 0, 0 assigned) shows 停工; a completed row reads 已落成 and has no assign buttons; with no idle 工匠 every `#assign-up-…` is disabled.
  - `UC-WEB-004` summary: `#summary-wages` with `formatWages` appears after `#summary-treasury` only when `wages > 0`; `#summary-completed` reads `落成：觀星臺` (names joined by 、, in building order) only when `completed` is non-empty. Update existing summary fixtures with `wages: 0` and `completed: []`.
- [ ] **Step 4: Implement `render.ts`.** `renderRecruitScreen`, `renderReleaseScreen` (sharing one picker helper), `renderBuildScreen`; wire into `renderScreen`. Court view tags per UC-WEB-007. Building names come from `game.buildings` by ID (fall back to the ID).
- [ ] **Step 5: `main.ts`.** Pass `gameText.buildings` to `chooseEraName` (both calls). Handlers before `[data-action]`: `#count-down` / `#count-up` → `stepCount(current, ∓1)`, `#count-max` → `maxCount`, `#confirm-recruit`, `#confirm-release`, `[data-assign]` → `changeAssignment(current, dataset.assign, Number(dataset.direction) as 1 | -1)`.
- [ ] **Step 6: `style.css`.** Add the three mains to the shared screen rule used by `#appoint-screen, #recommend-screen, #exam-screen`. `#building-list` styled like `#idle-list`, description in a smaller muted line under the name, assign buttons and picker buttons at least 32px square. `#confirm-recruit`, `#confirm-release` look like `#accept-candidate`.
- [ ] **Step 7: `screenshots.json`.** Common prefix P = `#start`, `#era-suggestion-0`, `#palace-xuanzheng`, `#department-works`.
  - Change `palace-xuanzheng-works` description to `宣政殿畫面：展開工部，徵召工匠、遣散工匠、營建工程與打造兵器（尚未開放）`.
  - `recruit-artisans` (`徵召工匠：可徵人口、此次至多與人數選擇`): P, `#court-option-recruit-artisans`, waitFor `#recruit-screen`.
  - `release-artisans` (`遣散工匠：工匠總數、閒置工匠與人數選擇`): P, `#court-option-recruit-artisans`, `#count-max`, `#confirm-recruit`, `#court-option-release-artisans`, waitFor `#release-screen`.
  - `build-in-progress` (`營建工程：工程名錄，天壇營建中`): P, `#court-option-recruit-artisans`, `#count-max`, `#confirm-recruit`, `#court-option-build`, `#assign-up-tiantan` × 3, waitFor `#building-list [data-building-row="tiantan"][data-status="in-progress"]`.
  - `turn-summary-works` (`半季總結：工匠工錢與觀星臺落成`): P, `#court-option-recruit-artisans`, `#count-max`, `#confirm-recruit`, `#court-option-build`, `#assign-up-observatory` × 10, `#back-to-court`, `#leave-court`, then `#palace-yangxin`, `#action-rest`, `#continue`, `#palace-yangxin`, `#action-rest`, `#continue`, `#palace-yangxin`, `#action-rest`, waitFor `#summary-completed`.
- [ ] **Step 8: Run** `npx vitest run packages/web` and `npm run typecheck`. Expected: all pass. Set UC-WEB-011, 012, 013 to `implemented`.
- [ ] **Step 9: Commit** `feat(web): 工部 screens for 工匠 and 營建工程`.

---

### Task 4: Whole-repo verification

- [ ] **Step 1:** Run `npm run verify`. Expected: typecheck, tests, build and `check:ids` all pass.
- [ ] **Step 2:** Confirm that every use case marked `implemented` by this plan is referenced by a test name. Fix anything that fails and commit it to the module it belongs to.
