# Core Loop Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable loop: choose a 年號, spend 4 action points per half-season on palace actions that change the emperor's stats, age, die, and return to the title screen.

**Architecture:** `core` holds registries (stats, calendar, palaces and actions), one `BALANCE` table, a plain serializable `GameState`, and pure rules (`createInitialState`, `takeAction` and others) that draw randomness only through `nextRandom`. `content` holds all text keyed by `core` IDs, plus pure format functions. `web` holds a `Screen` union with pure transitions in `screen.ts`, pure render functions, and one click listener in `main.ts`.

**Tech Stack:** TypeScript, Vite, Vitest, plain CSS.

**Spec:** Issue #17, `docs/architecture.md`, `packages/core/ARCHITECTURE.md`, `packages/content/ARCHITECTURE.md`, `packages/web/ARCHITECTURE.md`. The module docs hold the exact IDs, numbers, texts and element IDs. This plan does not repeat them.

## Global Constraints
- `core` has no DOM and no `Math.random`. All randomness goes through `nextRandom`. `GameState` holds only plain JSON values.
- Render functions are pure. Only `main.ts` touches the DOM.
- All player-facing text is Traditional Chinese and comes from `content`. Use the minus sign `−` (U+2212) for negative changes.
- Every tunable number is in `BALANCE` (`packages/core/src/model/balance.ts`), with the values in `packages/core/ARCHITECTURE.md`.
- Test names or comments reference the use case IDs. When a task's tests for an ID pass, change that ID's status to `implemented` in `docs/architecture.md`, in the same commit.
- From Task 1 until Task 5, `npm run typecheck` fails in `packages/web`, because `createInitialState` gains a parameter and `UiText` changes. Run each task's own Vitest files to check it. Task 6 runs the full `npm run verify`.

## Review Focus
- Typed 年號 with surrounding spaces, 1 or 3 characters, Latin letters or `<script>`. Expected: spaces are trimmed, anything else shows the error, and the text is shown back HTML-escaped. Tested in Tasks 4 and 5.
- A stat at its bound: a change past 100 or below 0 is clamped, and the shown change is the applied amount. Tested in Task 2.
- Death on the 4th action, and death from aging at the end of a turn. Both go straight to the ending, with no summary screen. Tested in Tasks 2 and 4.
- Clicks after death, a palace that does not offer the action, or entering a palace from inside another one. Expected: the state does not change. Tested in Task 2.
- Reaching the ending screenshot needs an exact click sequence for the fixed screenshot seed. A wrong count fails the capture. Checked in Task 5.

---

### Task 1: core — registries, balance, state, starting stats, 年號

Read first: `packages/core/ARCHITECTURE.md`, `docs/architecture.md`.

**Files:**
- Create: `packages/core/src/model/stats.ts`, `packages/core/src/model/calendar.ts`, `packages/core/src/model/catalog.ts`, `packages/core/src/model/balance.ts`, `packages/core/src/rules/random.ts`, `packages/core/src/rules/eraName.ts`
- Modify: `packages/core/src/model/state.ts`, `packages/core/src/index.ts`, `packages/core/src/index.test.ts`
- Test: `packages/core/src/model/state.test.ts`, `packages/core/src/rules/eraName.test.ts`
- Modify: `docs/architecture.md` (status of UC-CORE-001 and UC-CORE-011)

**Interfaces:**
- Produces (all exported from `packages/core/src/index.ts`):
  - `STAT_IDS = ['health', 'learning', 'arts', 'resolve'] as const`, `type StatId`, `type StatOwner = 'emperor' | 'nation' | 'region'`, `interface StatDefinition { id: StatId; min: number; max: number; owner: StatOwner }`, `STAT_REGISTRY: readonly StatDefinition[]`, `type StatValues = Record<StatId, number>`
  - `HALF_SEASONS` (8 IDs), `type HalfSeasonId`, `ACTION_POINTS = ['dawn', 'noon', 'dusk', 'night'] as const`, `type ActionPointId`
  - `getAge(state): number`, `getReignYear(state): number`, `getHalfSeason(state): HalfSeasonId`, `getActionPointId(state): ActionPointId`
  - `PALACE_IDS`, `type PalaceId`, `ACTION_IDS`, `type ActionId`, `interface Catalog { palaces: Record<PalaceId, { actions: readonly ActionId[] }>; actions: Record<ActionId, { allowedIn: readonly ActionPointId[] }> }`, `CATALOG: Catalog`
  - `BALANCE` (shape below), `interface StatChange { stat: StatId; amount: number }`
  - `type Location = 'map' | PalaceId`, `GameState` (fields in the core doc), `SCHEMA_VERSION = 2`, `createInitialState(seed: number, eraName: string): GameState`
  - `isValidEraName(name: string): boolean`, `drawEraNameSuggestions(seed: number, pool: readonly string[], count?: number): string[]`
- Internal: `randomInt(rngState: number, min: number, max: number): { value: number; rngState: number }` in `rules/random.ts`, inclusive bounds, `min + floor(nextRandom(rngState).value * (max − min + 1))`.

`BALANCE` shape:
```ts
{
  ascensionAge: 16, turnsPerYear: 8, actionPointsPerTurn: 4,
  startingStats: { budget: 150, min: 15, max: 70 },
  actionVariance: 1,
  actions: Record<ActionId, readonly StatChange[]>,  // values in the core doc, first entry is the main effect
  aging: { startAge: 40, baseLoss: 1, yearsPerStep: 5 },
}
```

- [ ] **Step 1: Write the failing tests**

`state.test.ts`:
```ts
it('UC-CORE-001 same seed gives the same starting state', () => {
  expect(createInitialState(7, '承平')).toEqual(createInitialState(7, '承平'));
});
it('UC-CORE-001 starting stats add up to the budget and stay within bounds', () => {
  for (let seed = 0; seed < 500; seed += 1) {
    const { stats } = createInitialState(seed, '承平');
    expect(STAT_IDS.reduce((sum, id) => sum + stats[id], 0)).toBe(150);
    for (const id of STAT_IDS) { expect(stats[id]).toBeGreaterThanOrEqual(15); expect(stats[id]).toBeLessThanOrEqual(70); }
  }
});
it('UC-CORE-001 starting stats force tradeoffs across seeds', () => {
  // some seed has a stat >= 50 and another stat <= 25
});
it('UC-CORE-001 initial state starts at 元年春上, 朝, age 16, on the map', () => {
  const state = createInitialState(7, '承平');
  expect(state).toMatchObject({ schemaVersion: 2, seed: 7, eraName: '承平', turn: 0, actionPoint: 0, location: 'map', dead: false, turnDeltas: { health: 0, learning: 0, arts: 0, resolve: 0 } });
  expect([getAge(state), getReignYear(state), getHalfSeason(state), getActionPointId(state)]).toEqual([16, 1, 'spring-early', 'dawn']);
  expect(JSON.parse(JSON.stringify(state))).toEqual(state);
});
it('every stat in the registry is 0 to 100 and owned by the emperor', ...);
```

`eraName.test.ts`:
```ts
it('UC-CORE-011 accepts exactly 2 Han characters', () => {
  for (const ok of ['承平', '天祿']) expect(isValidEraName(ok)).toBe(true);
  for (const bad of ['', '承', '承平元', 'ab', '承a', ' 承平', '承 ', '12', '<b']) expect(isValidEraName(bad)).toBe(false);
});
it('UC-CORE-011 draws 3 distinct suggestions from the pool, the same for the same seed', () => {
  const pool = ['甲乙', '丙丁', '戊己', '庚辛', '壬癸'];
  const first = drawEraNameSuggestions(9, pool);
  expect(first).toHaveLength(3); expect(new Set(first).size).toBe(3);
  expect(first.every((name) => pool.includes(name))).toBe(true);
  expect(drawEraNameSuggestions(9, pool)).toEqual(first);
});
```

Update the `createInitialState` test in `index.test.ts` to the new signature, or move it into `state.test.ts`.

- [ ] **Step 2: Run tests and see them fail**

Run: `npx vitest run packages/core`
Expected: FAIL, the new exports do not exist.

- [ ] **Step 3: Implement the registries, `BALANCE`, `GameState` and `createInitialState`**

Follow the starting-stats algorithm in the core doc: one `nextRandom` draw per stat in registry order for the weights. If all weights are 0, use equal weights. Store the RNG state after the draws in `rngState`. `drawEraNameSuggestions` uses a partial Fisher–Yates shuffle on a copy of the pool, with its own stream from `(seed ^ 0x9e3779b9) >>> 0`. It returns the whole shuffled pool when the pool is smaller than `count`.

- [ ] **Step 4: Run tests and see them pass**

Run: `npx vitest run packages/core`
Expected: PASS.

- [ ] **Step 5: Mark UC-CORE-001 and UC-CORE-011 `implemented` in `docs/architecture.md`, then commit**

```bash
git add packages/core docs/architecture.md
git commit -m "feat(core): stat, calendar and palace registries, balance table, starting stats and 年號"
```

### Task 2: core — turn loop, aging and death

Read first: `packages/core/ARCHITECTURE.md`.

**Files:**
- Create: `packages/core/src/rules/turn.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/rules/turn.test.ts`
- Modify: `docs/architecture.md` (status of UC-CORE-012 and UC-CORE-013)

**Interfaces:**
- Consumes: Task 1 exports.
- Produces: `enterPalace(state: GameState, palaceId: PalaceId, catalog?: Catalog): GameState`, `returnToMap(state: GameState): GameState`, `takeAction(state: GameState, actionId: ActionId, catalog?: Catalog): ActionOutcome`, and the types `ActionRejection`, `TurnEnd`, `ActionOutcome`, exactly as in the core doc's Interface section.

- [ ] **Step 1: Write the failing tests**

In the test, build states with `{ ...createInitialState(1, '承平'), ...overrides }` and override `stats`, `turn`, `actionPoint` and `location` as needed.

- `UC-CORE-012 moving between the map and palaces uses no action point`: `enterPalace` then `returnToMap` keeps `actionPoint` 0 and `rngState`. `enterPalace` from a palace, or when `dead`, returns the state unchanged.
- `UC-CORE-012 rejects actions on the map, not offered, not allowed now, or when dead`: expect `reason` `'not-in-palace'` (on the map), `'not-offered'` (`arts` in `chongwen`), `'not-allowed-now'` (a catalog copy where `study.allowedIn` is `['night']`, at `actionPoint` 0), `'dead'`. Each returns the input state unchanged.
- `UC-CORE-012 an action applies its effect with variance, returns to the map and uses the action point`: `study` in `chongwen` gives a 學識 change from 2 to 4, a 健康 change of exactly −1, `location` `'map'`, `actionPoint` 1, and `turnDeltas` equal to the changes.
- `UC-CORE-012 the same state and action give the same result`: two `takeAction` calls on the same state are `toEqual`.
- `UC-CORE-012 stats are clamped and the applied change is reported`: 學識 99, `study` gives 學識 100 and a reported change of `+1`. 健康 at 100 with `rest` reports no 健康 change.
- `UC-CORE-012 the 4th action ends the turn`: 4 actions from the start give `turn` 1, `actionPoint` 0, `getHalfSeason` `'spring-late'`, zeroed `turnDeltas`, and a `turnEnd` with `aging` 0 whose `totals` equal the summed changes, in registry order.
- `UC-CORE-012 8 turns move the year and age forward`: 32 `rest` actions in `qingong` give `turn` 8, `getReignYear` 2, `getAge` 17, `getHalfSeason` `'spring-early'`.
- `UC-CORE-013 no aging before 40`: `turn` 191 (age 39), `actionPoint` 3, so `turnEnd.aging` is 0.
- `UC-CORE-013 aging starts at 40 and grows with age`: `turn` 192 (age 40) gives `aging` 1, and `turn` 232 (age 45) gives 2. The aging is included in `totals` under 健康.
- `UC-CORE-013 death when 健康 reaches 0 after an action`: 健康 1, `study` gives 健康 0, `dead` true, `turnEnd` null, `turn` and `actionPoint` unchanged. A later `takeAction` gives `'dead'`.
- `UC-CORE-013 death from aging at the end of a turn`: 健康 1, `turn` 192, `actionPoint` 3, `arts` in `hanmo` gives `dead` true, `turnEnd.aging` 1, and `turn` still 192.

- [ ] **Step 2: Run tests and see them fail**

Run: `npx vitest run packages/core/src/rules/turn.test.ts`
Expected: FAIL, `takeAction` is not defined.

- [ ] **Step 3: Implement `rules/turn.ts`**

Use one `randomInt(rngState, −actionVariance, actionVariance)` draw per accepted action, added to the first effect. Read effects from `BALANCE.actions` and permissions from the catalog argument. Check the order of rejections as listed in the core doc. Aging loss is `baseLoss + floor((age − startAge) / yearsPerStep)` when `age >= startAge`, else 0.

- [ ] **Step 4: Run tests and see them pass**

Run: `npx vitest run packages/core`
Expected: PASS.

- [ ] **Step 5: Mark UC-CORE-012 and UC-CORE-013 `implemented`, then commit**

```bash
git add packages/core docs/architecture.md
git commit -m "feat(core): half-season turn loop with palace actions, aging and death"
```

### Task 3: content — game text, 年號 pool and format functions

Read first: `packages/content/ARCHITECTURE.md`, `packages/core/ARCHITECTURE.md`.

**Files:**
- Modify: `packages/content/package.json` (add `"dependencies": { "@emperor/core": "*" }`, as in `packages/web/package.json`), `package-lock.json` (updated by `npm install`), `packages/content/src/schema.ts`, `packages/content/src/index.ts`, `packages/content/src/index.test.ts`
- Create: `packages/content/src/format.ts`, `packages/content/src/format.test.ts`

This is the first time `content` imports `core`. CLAUDE.md and the root dependency diagram already allow it (`content --> core`), but the manifest has to declare it.

- [ ] **Step 0: Declare the dependency on `core`**

Add `"dependencies": { "@emperor/core": "*" }` to `packages/content/package.json`, then run `npm install` from the repo root to link the workspace and update `package-lock.json`.
Expected: `package-lock.json`'s `"packages/content"` entry lists `@emperor/core` under `dependencies`, and `node_modules/@emperor/core` is still a link to `packages/core`.

**Interfaces:**
- Consumes: `StatId`, `PalaceId`, `ActionId`, `ActionPointId`, `HalfSeasonId`, `StatChange`, `isValidEraName` from `@emperor/core`.
- Produces:
  - `UiText` with the keys in the content doc, without `placeholderHeading` and `placeholderBody`.
  - `interface GameText { statLabels: Record<StatId, string>; actionPointLabels: Record<ActionPointId, string>; halfSeasonLabels: Record<HalfSeasonId, string>; palaces: Record<PalaceId, { name: string; description: string }>; actions: Record<ActionId, { name: string }>; eraNamePool: readonly string[] }`, and `export const gameText: GameText`
  - `formatChineseNumber(n: number): string`, `formatDate(eraName: string, reignYear: number, halfSeason: HalfSeasonId): string`, `formatAge(age: number): string`, `formatChanges(changes: readonly StatChange[]): string`, `formatReign(years: number): string`, `formatLifespan(age: number): string`

Text values are in the content doc. Palace descriptions:
- 崇文館: 藏經史典籍之所，學士在此侍講。
- 翰墨軒: 筆墨丹青、琴韻棋聲，皆可在此修習。
- 演武場: 校場開闊，可馳馬挽弓，砥礪筋骨。
- 寢宮: 天子起居之處，可閉目調息，養護龍體。

`eraNamePool`: 承平, 景和, 永綏, 昭寧, 嘉穗, 鴻熙, 安瀾, 崇禧, 德輝, 清晏, 隆祚, 熙載, 紹元, 康衢, 泰寧, 明昶, 天祿, 文昭, 靖和, 瑞曦.

- [ ] **Step 1: Write the failing tests**

```ts
// format.test.ts
it('formats Chinese numbers', () => {
  expect([1, 10, 16, 20, 68, 100, 105, 110, 116].map(formatChineseNumber))
    .toEqual(['一', '十', '十六', '二十', '六十八', '一百', '一百零五', '一百一十', '一百一十六']);
});
it('UC-WEB-004 formats the date with 元年', () => {
  expect(formatDate('承平', 1, 'spring-early')).toBe('承平元年 春上');
  expect(formatDate('承平', 2, 'summer-late')).toBe('承平二年 夏下');
});
it('UC-WEB-004 formats changes with labels, signs and U+2212', () => {
  expect(formatChanges([{ stat: 'learning', amount: 3 }, { stat: 'health', amount: -1 }])).toBe('學識 +3，健康 −1');
  expect(formatChanges([])).toBe(uiText.noChange);
});
it('UC-WEB-005 formats age, reign and lifespan', () => {
  expect(formatAge(16)).toBe('十六歲'); expect(formatReign(12)).toBe('在位十二年'); expect(formatLifespan(58)).toBe('享年五十八歲');
});
// index.test.ts
it('UC-CORE-011 offers 20 distinct valid 年號', ...);  // length 20, Set size 20, every isValidEraName
it('labels every stat, palace and action in Chinese', ...); // each label matches /\p{Script=Han}/u
```
Replace the placeholder test in `index.test.ts`. Keep the title and start button tests.

- [ ] **Step 2: Run tests and see them fail**

Run: `npx vitest run packages/content`
Expected: FAIL.

- [ ] **Step 3: Implement the schema, `uiText`, `gameText` and `format.ts`, and export them from `index.ts`**

- [ ] **Step 4: Run tests and see them pass**

Run: `npx vitest run packages/content`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/content package-lock.json
git commit -m "feat(content): stat, palace and action text, 年號 pool and format functions"
```

### Task 4: web — screen transitions

Read first: `packages/web/ARCHITECTURE.md`, `packages/core/ARCHITECTURE.md`.

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/screen.test.ts`

**Interfaces:**
- Consumes: Task 1 and 2 exports from `@emperor/core`.
- Produces in `screen.ts`: the `Screen` union exactly as in the web doc, plus
  - `startGame(seed: number, pool: readonly string[]): Screen` (an `era` screen)
  - `chooseEraName(screen: Screen, input: string): Screen`
  - `goToPalace(screen: Screen, palaceId: PalaceId): Screen`, `goToMap(screen: Screen): Screen`
  - `performAction(screen: Screen, actionId: ActionId): Screen`
  - `continueToMap(screen: Screen): Screen` (from `result` or `summary` to `play`)
  - `restart(): Screen` (`{ screen: 'title' }`)
  - Each returns the screen unchanged when called on the wrong screen kind.

- [ ] **Step 1: Write the failing tests**

- `UC-WEB-002 startGame opens the 年號 screen with seeded suggestions`: `startGame(42, gameText.eraNamePool)` equals `{ screen: 'era', seed: 42, suggestions: drawEraNameSuggestions(42, gameText.eraNamePool), draft: '', error: false }`.
- `UC-WEB-003 a valid 年號 starts the game`: `chooseEraName(era, ' 承平 ')` equals `{ screen: 'play', state: createInitialState(42, '承平') }`.
- `UC-WEB-003 an invalid 年號 shows the error and keeps the typed text`: for `'承'`, `'abc'` and `'<b>'`, the result is the `era` screen with `error: true` and `draft` equal to the input.
- `UC-WEB-004 entering a palace and going back keep the action point`.
- `UC-WEB-004 an action shows its result`: `performAction` in `chongwen` with `study` gives `result` with `actionId: 'study'` and the core `changes`. `continueToMap` gives `play` on the map.
- `UC-WEB-004 the 4th action shows the turn summary`: `summary` with `endedHalfSeason: 'spring-early'`, `totals` from `turnEnd`, and `state.turn` 1.
- `UC-WEB-004 a rejected action leaves the screen unchanged`.
- `UC-WEB-005 death goes to the ending`: 健康 1 with `study` gives `ending`. Death from aging on the 4th action also gives `ending`, not `summary`.
- `UC-WEB-005 restart returns to the title screen`.

- [ ] **Step 2: Run tests and see them fail**

Run: `npx vitest run packages/web/src/screen.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the transitions in `screen.ts`**

`endedHalfSeason` is `getHalfSeason` of the state before the action.

- [ ] **Step 4: Run tests and see them pass**

Run: `npx vitest run packages/web/src/screen.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/screen.ts packages/web/src/screen.test.ts
git commit -m "feat(web): screen transitions for 年號, palace loop and ending"
```

### Task 5: web — render, main, style and screenshots

Read first: `packages/web/ARCHITECTURE.md`, `packages/content/ARCHITECTURE.md`.

**Files:**
- Modify: `packages/web/src/render.ts`, `packages/web/src/render.test.ts`, `packages/web/src/main.ts`, `packages/web/src/style.css`, `packages/web/screenshots.json`
- Modify: `docs/architecture.md` (status of UC-WEB-003 to UC-WEB-005)

**Interfaces:**
- Consumes: Task 3 `uiText`, `gameText` and format functions. Task 4 `Screen` and transitions.
- Produces: `renderScreen(screen: Screen, text: UiText, game: GameText, images: TitleImages): string`, with one exported render function per screen kind (`renderEraScreen`, `renderPlayScreen`, `renderResultScreen`, `renderSummaryScreen`, `renderEndingScreen`), plus `renderHeader(state, text, game)` and `escapeHtml(text: string): string`. Remove `renderPlaceholder` and `renderGameScreen`. `renderTitleScreen` does not change.

- [ ] **Step 1: Write the failing render tests**

One test per screen, using the element IDs in the web doc:
- `UC-WEB-003 renders three suggestions, the input, the confirm button and no error`. With `error: true` it contains `id="era-error"` and `uiText.eraError`. A draft `<b>` renders as `value="&lt;b&gt;"`.
- `UC-WEB-004 header shows date, action point, age and the 4 stats`: for `createInitialState(7, '承平')`, it contains `承平元年 春上`, `朝`, `十六歲`, and `data-stat="health">健康 ${state.stats.health}<`, with all four stats in registry order.
- `UC-WEB-004 map has one button per palace`: `id="palace-chongwen"` to `id="palace-qingong"`, each with its name.
- `UC-WEB-004 palace shows name, description, actions and 返回`.
- `UC-WEB-004 result shows the action name and change line with #continue`.
- `UC-WEB-004 summary shows 春上總結, the totals and 進入春下`.
- `UC-WEB-005 ending shows 駕崩, the 年號, 在位N年, 享年N歲 and 再開新局`.

Replace the old placeholder and game-screen tests. Keep the UC-WEB-001 and UC-WEB-002 title tests.

- [ ] **Step 2: Run tests and see them fail**

Run: `npx vitest run packages/web/src/render.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the render functions**

- [ ] **Step 4: Rewrite `main.ts`**

One click listener on `#app`, using `closest()`: `#start` calls `startGame(seed, gameText.eraNamePool)`, `[data-era]` calls `chooseEraName(current, data-era)`, `#era-confirm` calls `chooseEraName(current, input.value)`, `[data-palace]`, `[data-action]`, `#back-to-map`, `#continue`, `#next-turn` and `#restart` call their transitions. Pressing Enter in `#era-input` confirms too. After each change, redraw.

- [ ] **Step 5: Style the new screens in `style.css`**

Keep the title rules. Add a readable single-column layout: the header as a wrapping row, the map as a 2-column button grid, and buttons with the title button's colors (`#7a1c1c`, `#c9a227`, `#f0d78c`) and at least 44px tall. `#era-error` in dark red. No animation.

- [ ] **Step 6: Update `screenshots.json`**

Keep `title`. Remove `game`. Add these scenarios, each starting with `{ "click": "#start" }`:
- `era-name`: `waitFor #era-screen`.
- `era-name-error`: `click #era-confirm`, `waitFor #era-error`.
- `palace-map`: `click #era-suggestion-0`, `waitFor #palace-map`.
- `palace`: then `click #palace-chongwen`, `waitFor #palace-view`.
- `action-result`: then `click #action-study`, `waitFor #action-result`.
- `turn-summary`: after `#era-suggestion-0`, 3 rounds of `#palace-qingong`, `#action-rest`, `#continue`, then `#palace-qingong`, `#action-rest`, `waitFor #turn-summary`.
- `ending`: after `#era-suggestion-0`, H rounds of `#palace-chongwen`, `#action-study`, where H is the starting 健康 for the screenshot seed. 讀經史 costs exactly 1 健康 and the emperor stays under 40. After each round except the last, click `#next-turn` if the round number is a multiple of 4, else `#continue`. End with `waitFor #ending`.

Descriptions are short Chinese lines, such as 「年號畫面」.

To find H: the screenshot script (`.agent/scripts/take-screenshots.mjs`, `FIXED_RANDOMNESS`) replaces `crypto.getRandomValues`. The seed is the little-endian `Uint32` made of its first 4 byte draws. Compute the seed and `createInitialState(seed, '…').stats.health` with a temporary test or script. Do not commit it. Then write the steps.

- [ ] **Step 7: Run tests, build and check the screenshots**

Run: `npx vitest run packages/web` then `npm run build`. Expected: PASS.
If Playwright's Chromium is installed, run `node .agent/scripts/take-screenshots.mjs --out /tmp/shots`. Expected: every scenario is `ok`, including `ending`. If it is not installed, say so in the task report.

- [ ] **Step 8: Mark UC-WEB-003 to UC-WEB-005 `implemented`, then commit**

```bash
git add packages/web docs/architecture.md
git commit -m "feat(web): 年號, palace map, palace, result, summary and ending screens"
```

### Task 6: whole repo — verify

- [ ] **Step 1:** Run `npm run verify`. Expected: exit code 0, including `check:ids` (every `implemented` use case is referenced by a test).
- [ ] **Step 2:** Fix anything it reports in the task that owns the file, then rerun until it passes.
