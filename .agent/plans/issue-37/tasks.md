# 開科取士 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn on 吏部 → 開科取士: in each exam year, at one 早朝, draw 30 candidates and let the player tick the ones to accept as 賦閑.

**Architecture:** `core` gains `GameState.exam` (turn stamp + pending candidates, like `recommendation`) and the rules `isExamYear`, `nextExamYear`, `canHoldExam`, `holdExam` and `confirmExam`. Slot drawing reuses 舉薦's logic through one shared helper. `content` adds UI text. `web` adds an `exam` screen with a sortable checklist, and an enabled or tagged 開科取士 option.

**Tech Stack:** TypeScript, Vitest, Vite. Run tests with `npx vitest run packages/<module>` from the repo root; type-check with `npm run typecheck`.

**Spec:** Issue #37; `packages/core/USE_CASES.md` UC-CORE-018 and UC-CORE-004; `packages/web/USE_CASES.md` UC-WEB-010, UC-WEB-007 and UC-WEB-004; `packages/core/ARCHITECTURE.md` (State, 名臣 data, Interface); `packages/web/ARCHITECTURE.md` (Screen state); `GLOSSARY.md` (科舉).

## Global Constraints
- Player-facing text is Traditional Chinese and lives in `content`.
- `core` has no DOM and uses only `nextRandom` for randomness. Every rule is a pure function returning a new state, and a rejection returns the same state object.
- Test names or comments must carry the UC ID they cover (`UC-CORE-018`, `UC-WEB-010`, `UC-WEB-007`).
- When the implementation is done, mark UC-CORE-018 and UC-WEB-010 `implemented` in their `USE_CASES.md` tables.
- No existing game may be named anywhere.
- `npm run verify` must pass at the end.

## Review Focus
1. **舉薦 must not change** when its drawing moves into the shared helper. The existing `recommend.test.ts` (including the exact `rngState` check) must pass unchanged.
2. **Years 4 and 7 open again, years 2, 3, 5 and 6 don't.** An exam held in 元年 must not block year 4. Test `canHoldExam` at turns 0, 4, 8, 24 and 25 (Task 1).
3. **Names collide within one exam.** The 30 names must be unique among themselves, as well as against officials and reserved names (Task 1 test).
4. **Ticks survive sorting.** Ticks are positions in `state.exam.candidates`, not display rows, so sorting must not move them (Task 3 test).
5. **Bad pick input** from the DOM (`NaN`, `-1`, `30`, `1.5`) must leave the screen unchanged in `web` and be rejected as `unknown-candidate` in `core` (Tasks 1 and 3).

---

### Task 1: core — exam state and rules

Read first: `docs/architecture.md`, `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md` (UC-CORE-004, 017, 018).

**Files:**
- Create: `packages/core/src/model/exam.ts`, `packages/core/src/rules/exam.ts`, `packages/core/src/rules/exam.test.ts`
- Modify: `packages/core/src/model/balance.ts`, `packages/core/src/model/state.ts`, `packages/core/src/model/state.test.ts`, `packages/core/src/rules/officials.ts`, `packages/core/src/rules/officials.test.ts`, `packages/core/src/rules/recommend.ts`, `packages/core/src/index.ts`, `packages/core/USE_CASES.md` (status only)

**Interfaces:**
- Produces (exported from `@emperor/core`):
  - `interface Exam { turn: number; candidates: Candidate[] | null }` (`model/exam.ts`)
  - `GameState.exam: Exam | null` (placed after `recommendation`), `SCHEMA_VERSION = 6`
  - `BALANCE.exam = { intervalYears: 3, candidates: 30, ordinary: Record<OfficialStatId, {min, max}> }`
  - `isExamYear(state: Pick<GameState, 'turn'>): boolean`
  - `nextExamYear(state: Pick<GameState, 'turn'>): number`
  - `canHoldExam(state: GameState): boolean`
  - `holdExam(state: GameState, notables: readonly NotableData[], names: NamePool): HoldExamOutcome`
  - `confirmExam(state: GameState, picks: readonly number[]): ConfirmExamOutcome`
  - types `HoldExamRejection = 'not-in-court' | 'not-exam-year' | 'already-held'`, `ConfirmExamRejection = 'not-in-court' | 'no-candidates' | 'unknown-candidate'`, `HoldExamOutcome`, `ConfirmExamOutcome` (shapes in `packages/core/ARCHITECTURE.md`)

- [ ] **Step 1: Balance and model.** In `balance.ts`, hoist the ordinary-official ranges into a module const (`ORDINARY_RANGES`) used by `BALANCE.officials.ordinary`. Add:
  ```ts
  exam: {
    intervalYears: 3,
    candidates: 30,
    ordinary: {
      administration: { min: 50, max: 75 },
      military: { min: 20, max: 55 },
      ambition: ORDINARY_RANGES.ambition,
      loyalty: ORDINARY_RANGES.loyalty,
    } as Record<OfficialStatId, { min: number; max: number }>,
  },
  ```
  Create `model/exam.ts` with `Exam`. In `state.ts`, add `exam: Exam | null`, set it to `null` in `createInitialState`, and bump `SCHEMA_VERSION` to 6. Update `state.test.ts`: `schemaVersion` is 6 and `exam` is `null` (`UC-CORE-018`).

- [ ] **Step 2: Failing tests for the shared drawing.** In `officials.test.ts`, add `UC-CORE-018 drawOfficial uses the given ordinary table unless the outlier roll hits`. Find an `rngState` whose first draw is ≥ `BALANCE.officials.outlierChance`, call `drawOfficial(r, "x", TEST_NAMES, new Set(), BALANCE.exam.ordinary)`, and assert every stat is inside `BALANCE.exam.ordinary[stat]`. Find one whose first draw is < `outlierChance` and assert the result equals `drawOfficial(r, "x", TEST_NAMES, new Set())`, since both use the outlier table.

- [ ] **Step 3: Refactor.**
  - `drawOfficial(rngState, id, names, taken, table = BALANCE.officials.ordinary)`: the new last parameter replaces the ordinary table only. The outlier roll and table stay.
  - In `recommend.ts`, extract and export:
  ```ts
  function drawCandidate(
    state: GameState, rngState: number, notables: readonly NotableData[], names: NamePool,
    opts: { types: readonly NotableType[]; exclude: ReadonlySet<string>; taken: ReadonlySet<string>;
            table: Record<OfficialStatId, { min: number; max: number }> },
  ): { candidate: Candidate; rngState: number }
  ```
    Use the same draw order as `recommend` today: chance roll; on a hit, filter eligible by gate, not held at court, `type` in `opts.types` and not in `opts.exclude`; weighted pick only if total weight > 0; otherwise `drawOfficial(rng, "", names, opts.taken, opts.table)`.
  - `recommend` calls it with all three types, an empty `exclude`, the officials' names as `taken`, and `BALANCE.officials.ordinary`.
  - Also export `nextOfficialId(officials: readonly Official[]): (n: number) => string` or an equivalent helper giving `official-${highest + n}`, and use it in `acceptCandidate`.
  - Run `recommend.test.ts`. It must pass unchanged.

- [ ] **Step 4: Failing tests in `rules/exam.test.ts`** (each name starts `UC-CORE-018`). Use the `court()`/`rngWhere` style of `recommend.test.ts`, `TEST_NAMES` and `TEST_NOTABLES`. `atTurn(t)` = `court({ turn: t })`.
  - `isExamYear`: true for turns 0, 7, 24, 48; false for 8, 16, 47. `nextExamYear`: turn 0 → 4, turn 8 → 4, turn 23 → 4, turn 24 → 7.
  - `canHoldExam`: true at `atTurn(0)` and `atTurn(24)`; false at `atTurn(8)`, on the map, and when dead. After `holdExam` at turn 0, it is false at the same turn and at `{...held, turn: 4}`, and true at `{...held, turn: 24}`.
  - Rejections, each returning the same state object (`toBe`): map → `not-in-court`; `atTurn(8)` → `not-exam-year`; holding twice → `already-held`; `{...held, turn: 7}` → `already-held`.
  - Holding at turn 0 gives exactly `BALANCE.exam.candidates` candidates. `out.state.exam` equals `{ turn: 0, candidates: out.candidates }`. Every name is unique, none is an official's name, and none is in `names.reserved` (use `{ ...TEST_NAMES, reserved: ["甲春", "乙夏"] }`).
  - The first slot with `notables = []` equals `drawOfficial(nextRandom(r).rngState, "", TEST_NAMES, officialNames, BALANCE.exam.ordinary)` (name, stats, `notable: null`). This pins that the chance roll is always used up first.
  - With `notables = []`, every ordinary candidate's stats lie entirely within `BALANCE.exam.ordinary` or entirely within `BALANCE.officials.outlier`.
  - Over 50 seeds (`rngState` 0..49), with `stats` 學識 100 and 魄力 100 and `TEST_NOTABLES`: no candidate is `military` or `locked`, no 名臣 appears twice in one exam, and at least one exam across the seeds contains a 名臣.
  - A 名臣 already at court (an official with `notable: "civil"`) never appears across those seeds when `notables = [civil]`.
  - `confirmExam(held, [2, 0, 2])` appends exactly two officials. The first is candidate 0 with ID `official-(highest+1)`, then candidate 2 with `official-(highest+2)`. Both have `post: null` and keep their `notable`. `exam` becomes `{ turn: 0, candidates: null }`, `rngState` is unchanged, and `canHoldExam` is false.
  - `confirmExam(held, [])` is ok. Officials are equal to before, and candidates are `null`.
  - Rejections: on the map → `not-in-court`; `exam: null`, `exam.turn` earlier, or after confirming → `no-candidates`; picks `[-1]`, `[30]` and `[1.5]` → `unknown-candidate`. All return the same state object.
  - Declined 名臣 return. Find a seed where the turn-0 exam has `civil` (notables `[civil]`, 學識 100). Confirm `[]`, then set `turn: 24` and `rngState` back to that seed. `holdExam` again contains `civil`. If you confirm civil's position instead, an exam at turn 24 never contains `civil`.

- [ ] **Step 5: Implement `rules/exam.ts`.**
  - `isExamYear`: `(getReignYear(state) - 1) % BALANCE.exam.intervalYears === 0`.
  - `nextExamYear`: the smallest exam year after the current one.
  - `canHoldExam`: `isMorningCourt && isExamYear && (exam === null || getReignYear({turn: exam.turn, actionPoint: 0}) !== getReignYear(state))`.
  - `holdExam`: check in order `not-in-court`, `not-exam-year`, `already-held`. Then loop `BALANCE.exam.candidates` times calling `drawCandidate` with `types: ["civil", "both"]`, `exclude` = 名臣 IDs drawn so far, `taken` = official names plus candidate names so far, and `table: BALANCE.exam.ordinary`.
  - `confirmExam`: `not-in-court`; pending = `exam !== null && exam.turn === state.turn && exam.candidates !== null`, else `no-candidates`; every pick must be an integer in `[0, candidates.length)`, else `unknown-candidate`. Dedupe and sort the picks, then append in that order.
  - Export everything from `index.ts`.

- [ ] **Step 6: Run** `npx vitest run packages/core` and `npm run typecheck`. Expected: all pass. Set UC-CORE-018 to `implemented`.

- [ ] **Step 7: Commit** `feat(core): 開科取士 exam state and rules`.

---

### Task 2: content — exam text

Read first: `packages/content/ARCHITECTURE.md`, `packages/content/USE_CASES.md`, `packages/web/USE_CASES.md` (UC-WEB-007, UC-WEB-010).

**Files:**
- Modify: `packages/content/src/schema.ts`, `packages/content/src/index.ts`, `packages/content/src/index.test.ts`

**Interfaces:**
- Produces these `UiText` keys and exact values:
  | Key | Value |
  |---|---|
  | `examHeading` | `開科取士` |
  | `examPickColumn` | `錄取` |
  | `examPicked` | `已選` |
  | `confirmExamButton` | `確定錄取` |
  | `examHeld` | `已開科` |
  | `nextExamPrefix` | `下次開科：` |
  | `nextExamSuffix` | `年` |
  | `noExamCandidates` | `此科已無應試者` |

- [ ] **Step 1: Failing test** in `index.test.ts`: `UC-WEB-010 開科取士 text` asserts `uiText` contains exactly these eight key/value pairs (`toMatchObject`).
- [ ] **Step 2: Implement.** Add the keys to `UiText` in `schema.ts` (after `noCandidate`) and the values to `uiText`.
- [ ] **Step 3: Run** `npx vitest run packages/content`. Expected: PASS.
- [ ] **Step 4: Commit** `feat(content): 開科取士 text`.

---

### Task 3: web — 開科取士 screen and court option

Read first: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md` (UC-WEB-004, 007, 009, 010).

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/screen.test.ts`, `packages/web/src/render.ts`, `packages/web/src/render.test.ts`, `packages/web/src/main.ts`, `packages/web/src/style.css`, `packages/web/screenshots.json`, `packages/web/USE_CASES.md` (status only)

**Interfaces:**
- Consumes: Task 1's `canHoldExam`, `holdExam`, `confirmExam`, `isExamYear`, `nextExamYear` and `Exam`. Task 2's `UiText` keys. `formatChineseNumber` from `@emperor/content`.
- Produces (in `screen.ts`):
  - `Screen` member `{ screen: 'exam'; state: GameState; picks: number[]; sort?: OfficialStatId }`
  - `OPEN_COURT_OPTIONS = ['recommend-officials', 'appoint-officials', 'hold-exams']`
  - `toggleExamPick(screen: Screen, index: number): Screen`
  - `sortExam(screen: Screen, stat: OfficialStatId): Screen`
  - `confirmExamPicks(screen: Screen): Screen`
  - `examCandidates(state: GameState, sort?: OfficialStatId): { index: number; candidate: Candidate }[]`, which returns the pending candidates of this half-season (empty otherwise), in list order or sorted by `sort` highest first with ties in list order
  - `backToCourt` also accepts `exam`
- Element IDs: `#exam-screen` (main), `#exam-picked` (count line, text `${examPicked}：${n}`), `#exam-list` (table), row `<tr data-exam-row="${i}"[ data-notable="${id}"]>`, checkbox `<input type="checkbox" id="exam-pick-${i}" data-exam-pick="${i}" aria-label="${name}"[ checked]>`, sort buttons `#exam-sort-${stat}` with `data-exam-sort` and `aria-pressed`, `#confirm-exam`, `#no-exam-candidates`, `#back-to-court`.

- [ ] **Step 1: Failing screen tests** (`screen.test.ts`, names start `UC-WEB-010` unless noted):
  - `chooseCourtOption(personnel at turn 0, 'hold-exams', notables, names)` gives `{ screen: 'exam', picks: [] }`, and its `state.exam.candidates` has `BALANCE.exam.candidates` entries. It returns the same screen at turn 8 and after an exam has been held this year (`UC-WEB-007`).
  - `toggleExamPick` adds a pick, keeps picks ascending (`[3]` then 1 → `[1, 3]`), and removes on a second toggle. `NaN`, `-1`, `30`, `1.5`, and a call on another screen return the same screen.
  - `sortExam(s, 'military')` sets `sort` and keeps `picks`. An unknown stat or another screen returns the same screen.
  - `examCandidates(state, 'military')` is ordered by 武功 descending with ties by index. With no sort it is in list order. With no pending candidates it is `[]`.
  - `confirmExamPicks` with picks `[0, 2]` returns `{ screen: 'play', department: 'personnel' }` with 2 more officials, and `canHoldExam` is false. With `picks: []` it also returns to play with officials unchanged. When `core` rejects (no candidates) it returns the same screen.
  - `backToCourt` from `exam` gives `play` in 宣政殿 with `department: 'personnel'`.
  - `UC-WEB-010 the non-exam-year screenshot path reaches 二年`: from `chooseEraName`, repeat 32 times `goToPalace('yangxin')` → `performAction('rest')` → `continueToMap`. Then `goToPalace('xuanzheng')` and `toggleDepartment('personnel')`. `getReignYear` is 2 and `canHoldExam` is false.
- [ ] **Step 2: Implement `screen.ts`.** `chooseCourtOption` handles `hold-exams`: if `!canHoldExam` return the same screen, else call `holdExam` → `{ screen: 'exam', state, picks: [] }`. `confirmExamPicks` calls `confirmExam(state, picks)` and on ok returns `{ screen: 'play', state, department: 'personnel' }`.
- [ ] **Step 3: Failing render tests** (`render.test.ts`):
  - `UC-WEB-010` with a held exam: the header bar comes before `<main id="exam-screen">`, there is an `<h2>` with `examHeading`, `#exam-picked` reads `已選：0`, and the rows follow `examCandidates` order, each with an unchecked checkbox, the escaped name and four stat cells.
  - `UC-WEB-010` a candidate with `notable` set (build the state by hand) has `data-notable` on its row and `<span class="notable-mark">名臣</span>` in its name cell. Ordinary rows have neither.
  - `UC-WEB-010` with `sort: 'military'` and `picks: [0, 2]`: rows are in sorted order, `#exam-sort-military` has `aria-pressed="true"` (the others `"false"`), checkboxes 0 and 2 are `checked`, and the count reads `已選：2`.
  - `UC-WEB-010` with no pending candidates, there is `#no-exam-candidates` and `#back-to-court`, and no `#confirm-exam` and no `#exam-list`.
  - `UC-WEB-007` 開科取士 is enabled at turn 0. After an exam at turn 0 it is `disabled` with `<span class="court-option-tag">已開科</span>`. At turn 8 it is `disabled` with the tag `下次開科：四年`, built from `nextExamPrefix + formatChineseNumber(nextExamYear(state)) + nextExamSuffix`. Rename the existing test "only 官員任命 enabled" to match the new open set. Its `optionButton` helper already follows `OPEN_COURT_OPTIONS`.
- [ ] **Step 4: Implement `render.ts`.**
  - `renderExamScreen(screen: Of<'exam'>, text, game)` follows `renderRecommendScreen` and `renderIdleList`. The table header is `examPickColumn`, `nameColumn`, then four sort buttons. The rows come from `examCandidates`. `#confirm-exam` goes below the table.
  - Wire `renderExamScreen` into `renderScreen`.
  - In `renderCourtView`, for `hold-exams` when `!canHoldExam(state)`, use a disabled button whose tag is `examHeld` if `isExamYear(state)`, else the next-exam text.
- [ ] **Step 5: `main.ts`.** Add handlers before `[data-action]`:
  - `[data-exam-pick]` → `toggleExamPick(current, Number(dataset.examPick))`
  - `[data-exam-sort]` → `sortExam`
  - `#confirm-exam` → `confirmExamPicks`
- [ ] **Step 6: `style.css`.** Add `#exam-screen` to the `#appoint-screen, #recommend-screen` rule. Style `#exam-list` like `#idle-list` (share selectors), with sort buttons like `#idle-list button[data-sort]` and a checkbox at least 24px square. Give `#exam-picked` and `#confirm-exam` the look of `#accept-candidate`.
- [ ] **Step 7: `screenshots.json`.**
  - Change the description of `palace-xuanzheng-personnel` to `宣政殿畫面：展開吏部，舉薦人選、官員任命與開科取士皆可點選`.
  - Add `exam-checklist` (`開科取士：三十名應試者清單，可勾選與依屬性排序`): `#start`, `#era-suggestion-0`, `#palace-xuanzheng`, `#department-personnel`, `#court-option-hold-exams`, then waitFor `#exam-list`.
  - Add `personnel-non-exam-year` (`宣政殿吏部（二年）：非開科之年，開科取士停用並顯示下次開科`): `#start`, `#era-suggestion-0`, then eight turns of `[#palace-yangxin, #action-rest, #continue] × 3` + `[#palace-yangxin, #action-rest, #next-turn]`, then `#palace-xuanzheng`, `#department-personnel`, and waitFor `#court-option-hold-exams[disabled]`.
- [ ] **Step 8: Run** `npx vitest run packages/web` and `npm run typecheck`. Expected: all pass. Set UC-WEB-010 to `implemented`.
- [ ] **Step 9: Commit** `feat(web): 開科取士 screen`.

---

### Task 4: Whole-repo verification

- [ ] **Step 1:** Run `npm run verify`. Expected: typecheck, tests, build and `check:ids` all pass.
- [ ] **Step 2:** Confirm that UC-CORE-018 and UC-WEB-010 are `implemented` and referenced by test names. Fix anything that fails, and commit to the module it belongs to.
