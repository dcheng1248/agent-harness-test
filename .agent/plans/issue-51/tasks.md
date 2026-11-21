# 禮部: 祭祀 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable 禮部 → 祭祀 in 早朝: once per reign year, it costs 國庫, records the year in `GameState`, and makes leaving 早朝 land on 夕 instead of 午.

**Architecture:** `core` gains `GameState.rites` (`sacrificeTurn`), `BALANCE.rites.sacrificeCost`, rules in `src/rules/rites.ts`, and a `returnToMap` that reads the stamp. `content` adds the confirm screen text. `web` adds a `sacrifice` confirm screen, opens 祭祀 in `OPEN_COURT_OPTIONS`, and tags it 本年已祭 once held.

**Tech Stack:** TypeScript, Vitest, Vite, npm workspaces.

**Spec:** Issue #51, `packages/core/USE_CASES.md` (UC-CORE-003, UC-CORE-023), `packages/web/USE_CASES.md` (UC-WEB-004, UC-WEB-007, UC-WEB-017), and the `ARCHITECTURE.md` of each module.

## Global Constraints

- Player-facing text is Traditional Chinese and lives only in `content`.
- `core` has no DOM. 祭祀 draws no random numbers.
- The cost lives only in `BALANCE.rites.sacrificeCost` and is never shown in the UI.
- 祭祀 changes nothing but 國庫 and `rites.sacrificeTurn`: no 民心, no emperor stat, no official effect.
- 外交 (`conduct-diplomacy`) stays "not yet open".
- Every `implemented` use case must be named in a test name or comment. Flip UC-CORE-023 and UC-WEB-017 to `implemented` in the task that tests them.
- Run `npm run verify` before calling the work complete.
- Expect a merge overlap with #42 in `OPEN_COURT_OPTIONS` and the court option tags in `render.ts`. Keep the other entries when resolving.

## Review Focus

1. **Year boundary**: held at 冬下 (turn 7) → at turn 8 (next 春上) `canHoldSacrifice` is true again. Held at 春上 of year 2 (turn 8) → still blocked at 冬下 (turn 15). Test in Task 1.
2. **Leaving after a sacrifice in an earlier half-season of the same year**: `sacrificeTurn` = an earlier turn of this year → `returnToMap` from 宣政殿 lands on 午, not 夕. Test in Task 1.
3. **國庫 below the cost**: with treasury 10,000, `holdSacrifice` succeeds and treasury becomes −40,000. The next turn end applies the bankruptcy loss. Test in Task 1.
4. **Re-entering is impossible, but other options still work after 舉行**: after `confirmSacrifice`, `chooseCourtOption('adjust-taxes')` still opens `taxes`, and `chooseCourtOption('hold-sacrifice')` returns the screen unchanged. Test in Task 3.
5. **Dead emperor**: `holdSacrifice` on a dead state is rejected `'not-in-court'` and changes nothing. Test in Task 1.

---

### Task 1: core — 祭祀 rules, state and 夕 on leaving

Read first: `docs/architecture.md`, `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md`.

**Files:**
- Create: `packages/core/src/model/rites.ts`
- Create: `packages/core/src/rules/rites.ts`
- Create: `packages/core/src/rules/rites.test.ts`
- Modify: `packages/core/src/model/balance.ts`
- Modify: `packages/core/src/model/state.ts`, `packages/core/src/model/state.test.ts`
- Modify: `packages/core/src/rules/turn.ts`, `packages/core/src/rules/turn.test.ts`
- Modify: `packages/core/src/index.ts`
- No other test file changes. Every other test builds its state by spreading `createInitialState(...)`, so the new field arrives on its own. `packages/core/src/model/court.ts` and `court.test.ts` are not touched.
- Modify: `packages/core/USE_CASES.md` (status only)

**Interfaces:**
- Produces (exported from `@emperor/core`):
  - `interface Rites { sacrificeTurn: number | null }` in `src/model/rites.ts`, which imports nothing from `balance.ts`.
  - `GameState.rites: Rites`, set to `{ sacrificeTurn: null }` by `createInitialState`. `SCHEMA_VERSION` = 9.
  - `BALANCE.rites = { sacrificeCost: 50000 }`.
  - `sacrificedThisYear(state: Pick<GameState, 'turn' | 'rites'>): boolean`: `sacrificeTurn !== null && floor(sacrificeTurn / turnsPerYear) === floor(turn / turnsPerYear)`. Use `getReignYear` from `model/calendar.ts`.
  - `canHoldSacrifice(state: GameState): boolean` = `isMorningCourt(state) && !sacrificedThisYear(state)`.
  - `holdSacrifice(state: GameState): RitesOutcome`. Reject `'not-in-court'` first, then `'already-held'`. On success return `{ ok: true, state: { ...state, nation: { ...state.nation, treasury: treasury - BALANCE.rites.sacrificeCost }, rites: { sacrificeTurn: state.turn } } }`.
  - `type RitesRejection = 'not-in-court' | 'already-held'`; `type RitesOutcome = { ok: false; reason: RitesRejection; state: GameState } | { ok: true; state: GameState }`.
  - `returnToMap`: from `COURT_PALACE_ID`, `actionPoint` = `ACTION_POINTS.indexOf(COURT_ACTION_POINT) + (state.rites.sacrificeTurn === state.turn ? 2 : 1)`. Everything else is unchanged.

- [ ] **Step 1: Write failing tests in `state.test.ts`.** Change the three `schemaVersion` expectations from 8 to 9, and add `rites: { sacrificeTurn: null }` to the `toMatchObject` expectation near line 68. Add `UC-CORE-023 a new game has no 祭祀 recorded`: `expect(state.rites).toEqual({ sacrificeTurn: null })`.

- [ ] **Step 2: Write failing tests in `rites.test.ts`.** Use a `court(over)` helper like `revenue.test.ts`'s (`enterPalace(createInitialState(...), 'xuanzheng')` spread with `over`), plus `ok(outcome)`.
  - `UC-CORE-023 holdSacrifice costs 國庫 and records the turn`: from `court()`, treasury drops by exactly `BALANCE.rites.sacrificeCost`, `rites.sacrificeTurn` is `0`, and `stats`, `regions`, `officials`, `rngState`, `actionPoint` (0) and `location` (`'xuanzheng'`) are equal to before.
  - `UC-CORE-023 may push 國庫 below 0`: `court({ nation: { treasury: 10000 } })` succeeds, and treasury is `10000 - BALANCE.rites.sacrificeCost`.
  - `UC-CORE-023 once per reign year`: after holding at turn 0, `canHoldSacrifice` is false and a second `holdSacrifice` is `{ ok: false, reason: 'already-held' }` with the same state object. For `court({ turn: t, rites: { sacrificeTurn: s } })`: (s=0, t=7) → false; (s=7, t=8) → true; (s=8, t=15) → false; (s=3, t=11) → false; (s=3, t=16) → true. `sacrificedThisYear` matches each (negated), and is false for `sacrificeTurn: null`.
  - `UC-CORE-023 rejections`: on the map (`createInitialState(...)` with no `enterPalace`) → `'not-in-court'`. Dead in court (`court({ dead: true })`) → `'not-in-court'`. Already held and also not in court → `'not-in-court'` (order). `canHoldSacrifice` is false in all three.
  - `UC-CORE-023 bankruptcy applies as usual`: hold with treasury 10,000, `returnToMap`, then `takeAction` at a palace until the turn ends. Every player region's 民心 is lower by at least `BALANCE.bankruptcyMoraleLoss` than without the sacrifice. Compare with the same path without holding, starting from a treasury high enough to stay above 0.
- [ ] **Step 3: Write failing tests in `turn.test.ts`.** Under `describe("宣政殿")`:
  - `UC-CORE-003 UC-CORE-023 leaving after 祭祀 moves the clock to 夕`: `enterPalace(makeState(), 'xuanzheng')`, `holdSacrifice`, `returnToMap` → `location` `'map'`, `actionPoint` 2, `turn` 0. `canEnterPalace(out, 'xuanzheng')` is false. Taking an action at a palace from there moves to `actionPoint` 3 with no turn end, so leaving never ended the turn.
  - `UC-CORE-003 a 祭祀 earlier this year does not spend 午`: `makeState({ turn: 2, rites: { sacrificeTurn: 0 } })` entered at 朝 and left → `actionPoint` 1.
  - Keep the existing `UC-CORE-003` test as it is (leaving without a sacrifice lands on 1).
- [ ] **Step 4: Run** `npm test -w packages/core` — Expected: FAIL (missing exports / `rites` field).
- [ ] **Step 5: Implement** `model/rites.ts`, `BALANCE.rites`, `GameState.rites` + `SCHEMA_VERSION = 9` + the initial value, `rules/rites.ts`, the `returnToMap` change, and the exports in `index.ts` (`sacrificedThisYear`, `canHoldSacrifice`, `holdSacrifice`, and types `Rites`, `RitesRejection`, `RitesOutcome`). Update the doc comment on `returnToMap` to mention 夕 after 祭祀.
- [ ] **Step 6: Run** `npm run typecheck` and `npm test -w packages/core` — Expected: PASS with no edits to other test files. If the type check does report a `GameState` literal elsewhere, add `rites: { sacrificeTurn: null }` there, and if that file is under `packages/core/src/model/**`, say in the PR that it touches a core path. Then set UC-CORE-023 to `implemented`.
- [ ] **Step 7: Commit**
```bash
git add packages/core
git commit -m "feat(core): 祭祀 once per reign year, spending 國庫 and 午"
```

### Task 2: content — 祭祀 screen text

Read first: `packages/content/ARCHITECTURE.md`, `packages/content/USE_CASES.md`.

**Files:**
- Modify: `packages/content/src/schema.ts` (`UiText`)
- Modify: `packages/content/src/index.ts` (`uiText`)
- Modify: `packages/content/src/index.test.ts`

**Interfaces:**
- Produces new `UiText` keys, all `string`:

| Key | Text |
|---|---|
| `sacrificeHeading` | 祭祀 |
| `sacrificeHint` | 舉行祭祀須耗國庫，並佔用午時，可減低本年天災之虞。 |
| `confirmSacrifice` | 舉行 |
| `sacrificeBack` | 返回 |
| `sacrificeUsed` | 本年已祭 |

The court option names already exist (`hold-sacrifice` 祭祀, `conduct-diplomacy` 外交) and do not change.

- [ ] **Step 1: Write the failing test** in `index.test.ts`: `UC-WEB-017 祭祀 text`. Expect `uiText.sacrificeUsed` to be `'本年已祭'`, `uiText.confirmSacrifice` `'舉行'`, `uiText.sacrificeBack` `'返回'`, and `uiText.sacrificeHint` to contain `國庫`, `午` and `天災` and no ASCII or Chinese digits (`/[0-9０-９一二三四五六七八九十百千萬]/` does not match).
- [ ] **Step 2: Run** `npm test -w packages/content` — Expected: FAIL.
- [ ] **Step 3: Implement** the schema keys and the text from the table. Place them after the levy keys.
- [ ] **Step 4: Run** `npm test -w packages/content` — Expected: PASS.
- [ ] **Step 5: Commit**
```bash
git add packages/content
git commit -m "feat(content): 祭祀 screen text"
```

### Task 3: web — 祭祀 confirm screen and 禮部 option

Read first: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md`.

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/screen.test.ts`
- Modify: `packages/web/src/render.ts`, `packages/web/src/render.test.ts`
- Modify: `packages/web/src/main.ts`
- Modify: `packages/web/src/style.css`
- Modify: `packages/web/screenshots.json`
- Modify: `packages/web/USE_CASES.md` (status only)

**Interfaces:**
- Consumes: Task 1's `canHoldSacrifice` and `holdSacrifice`, and the `returnToMap` change. Task 2's text keys.
- Produces:
  - `Screen` gains `{ screen: 'sacrifice'; state: GameState }`.
  - `OPEN_COURT_OPTIONS` gains `'hold-sacrifice'` (not `'conduct-diplomacy'`).
  - `chooseCourtOption(…, 'hold-sacrifice', …)` returns `{ screen: 'sacrifice', state }` when `canHoldSacrifice(state)`, and otherwise the same screen.
  - `confirmSacrifice(screen: Screen): Screen` in `screen.ts`: only from `sacrifice`. It calls `holdSacrifice` and on success returns `{ screen: 'play', state: outcome.state, department: 'rites' }`. Otherwise it returns the same screen.
  - `backToCourt` returns `sacrifice` to `{ screen: 'play', state, department: 'rites' }`.
  - `renderSacrificeScreen(screen, text, game)` in `render.ts`, wired into `renderScreen`.

**Markup (element IDs):**
- Court: when `option === 'hold-sacrifice' && !canHoldSacrifice(screen.state)`, render `<button type="button" id="court-option-hold-sacrifice" data-court-option="hold-sacrifice" disabled>${name}<span class="court-option-tag">${text.sacrificeUsed}</span></button>`, the same pattern as 額外徵稅.
- `sacrifice`: `${renderHeader(...)}<main id="sacrifice-screen"><h2>${text.sacrificeHeading}</h2><p id="sacrifice-hint">${text.sacrificeHint}</p><button type="button" id="confirm-sacrifice">${text.confirmSacrifice}</button><button type="button" id="back-to-court">${text.sacrificeBack}</button></main>`.

- [ ] **Step 1: Write failing tests in `screen.test.ts`** (court = `enterPalace(newState(), 'xuanzheng')`, court screen = `{ screen: 'play', state: court, department: 'rites' }`):
  - `UC-WEB-007 祭祀 opens its screen once per reign year`: `chooseCourtOption(courtScreen, 'hold-sacrifice', …)` → `{ screen: 'sacrifice', state: court }`. With `rites.sacrificeTurn` = `turn`, it returns the same screen. `'conduct-diplomacy'` still returns the same screen.
  - `UC-WEB-017 confirmSacrifice holds it and returns to 禮部`: the result is `play`, `department` `'rites'`, `state.location` `'xuanzheng'`, `state.actionPoint` 0, and treasury lower by `BALANCE.rites.sacrificeCost`. `confirmSacrifice` from `levy` or `play` returns the same screen.
  - `UC-WEB-017 返回 does not hold it`: `backToCourt(sacrificeScreen)` → `{ screen: 'play', state: court, department: 'rites' }` with the same state object.
  - `UC-WEB-007 leaving after 祭祀 lands on 夕`: `goToMap(confirmSacrifice(sacrificeScreen))` → `state.location` `'map'`, `state.actionPoint` 2.
  - Review focus 4: after `confirmSacrifice`, `chooseCourtOption(result, 'adjust-taxes', …)` → `taxes`, and `chooseCourtOption(result, 'hold-sacrifice', …)` returns `result`.
- [ ] **Step 2: Write failing tests in `render.test.ts`:**
  - `UC-WEB-007 禮部 lists 祭祀 enabled and 外交 not yet open`: open `rites`. `court-option-hold-sacrifice` has no `disabled` and no tag, and `court-option-conduct-diplomacy` is disabled with `uiText.notYetOpen`. After `confirmSacrifice`, `court-option-hold-sacrifice` is `disabled` with `uiText.sacrificeUsed`, and the header shows `gameText.actionPointLabels.dawn`.
  - `UC-WEB-017 祭祀 screen`: contains `id="sacrifice-screen"`, `id="sacrifice-hint"` with `uiText.sacrificeHint`, `id="confirm-sacrifice"` and `id="back-to-court"`. The text inside `<main …>` (strip tags) matches no digit `/[0-9]/` and does not contain `formatTaels(BALANCE.rites.sacrificeCost)`.
  - `UC-WEB-004` header-bar test (the loop over image-less screens): add the rendered `sacrifice` screen, which starts with `<header id="game-header"`.
- [ ] **Step 3: Run** `npm test -w packages/web` — Expected: FAIL.
- [ ] **Step 4: Implement** the `screen.ts` and `render.ts` changes per Interfaces and Markup.
- [ ] **Step 5: Wire `main.ts`:** in the click listener add `#confirm-sacrifice` → `confirmSacrifice`. `#back-to-court` already calls `backToCourt`.
- [ ] **Step 6: Style:** add `#sacrifice-screen` to the shared selector list with `#levy-screen` in `style.css`. Style `#confirm-sacrifice` like `#confirm-levy`.
- [ ] **Step 7: Add scenarios to `screenshots.json`.** Each starts with `click #start`, `click #era-suggestion-0`, `click #palace-xuanzheng`, `click #department-rites`.
  - `palace-xuanzheng-rites` — 「宣政殿畫面：展開禮部，祭祀可用、外交尚未開放」 — `waitFor #court-options`.
  - `hold-sacrifice` — 「祭祀：耗國庫、佔用午時、可減天災之提示，舉行與返回」 — `click #court-option-hold-sacrifice`, `waitFor #sacrifice-screen`.
  - `rites-sacrificed` — 「祭祀後：返回宣政殿禮部，祭祀標示本年已祭，仍在朝時」 — the `hold-sacrifice` steps, then `click #confirm-sacrifice`, `waitFor #court-option-hold-sacrifice[disabled]`.
  - `palace-map-dusk` — 「祭祀後退朝：宮城地圖時辰為夕」 — the `rites-sacrificed` steps, then `click #leave-court`, `waitFor #palace-xuanzheng[disabled]`.
- [ ] **Step 8: Run** `npm test -w packages/web` — Expected: PASS. Set UC-WEB-017 to `implemented`.
- [ ] **Step 9: Commit**
```bash
git add packages/web
git commit -m "feat(web): 禮部 祭祀 confirm screen"
```

### Task 4: whole repo — verify

- [ ] **Step 1:** `npm run verify` — Expected: exits 0 (typecheck, tests, build, `check:ids`).
- [ ] **Step 2:** Fix anything it reports in the module that owns it, and commit there.
