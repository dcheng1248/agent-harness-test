# 名臣 and 舉薦人選 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a list of about sixty 名臣 in `content`, and turn on 吏部 → 舉薦人選: once per 早朝 the player is shown one candidate (sometimes a 名臣) and accepts or declines.

**Architecture:** `core` gains `NotableData`/`Candidate`/`Recommendation` types, `Official.notable`, `GameState.recommendation`, `BALANCE.recommendation`, and the rules `canRecommend`, `recommend`, `acceptCandidate`, `declineCandidate`. `content` gains `src/notables.ts` (one row per 名臣) and fills `officialNames.reserved` from it. `web` opens 舉薦人選, adds a `recommend` screen, and marks the option as used until the next 早朝.

**Tech Stack:** TypeScript, Vitest, Vite, npm workspaces.

**Spec:** Issue #36; `packages/core/USE_CASES.md` (UC-CORE-004, UC-CORE-017); `packages/content/USE_CASES.md` (UC-CONTENT-002, UC-CONTENT-003); `packages/web/USE_CASES.md` (UC-WEB-004, UC-WEB-007, UC-WEB-009, screen flow); `packages/core/ARCHITECTURE.md` (State, 名臣 data, Interface); `packages/content/ARCHITECTURE.md` (名臣); `packages/web/ARCHITECTURE.md` (Screen state); `docs/architecture.md`; `GLOSSARY.md`. The docs are already updated on this branch.

## Global Constraints
- Player-facing text is Traditional Chinese and lives only in `content`. Never name an existing game.
- `SCHEMA_VERSION` goes from 4 to 5. No migration (there are no saves).
- All randomness goes through `nextRandom`/`randomInt` on `state.rngState`. Only `recommend` draws. `acceptCandidate`, `declineCandidate`, `canRecommend` and every web transition other than the one calling `recommend` leave `rngState` unchanged.
- Nothing here changes `actionPoint`.
- Element IDs are stable (listed in Task 3).
- One commit per module task. Between Task 1 and Task 3 the `web` type check fails (the `Official` and `GameState` shapes change); run only the module's own tests in Tasks 1 and 2. Task 4 runs everything.
- UC-CORE-017, UC-CONTENT-003 and UC-WEB-009 stay `planned` until the task that tests them marks them `implemented`.

## Review Focus
1. Opening 舉薦人選 a second time in the same 早朝 (stale button, or forged `data-court-option`): no second draw, `rngState` unchanged. Tests in Task 1 (`already-used`) and Task 3.
2. A 名臣 already at court being drawn again, or one whose gate is not met: never drawn, even when it is the only 名臣 with weight. Tests in Task 1.
3. A declined 名臣 coming back: eligible again at the next 早朝; an accepted one never. Tests in Task 1.
4. Accept/decline with no candidate, or with a candidate from an earlier half-season: rejected, state unchanged. Tests in Task 1; web screen unchanged in Task 3.
5. Emperor 學識 and 魄力 both 0, or all eligible 名臣 with weight 0: no division by zero; candidate is ordinary. Test in Task 1.

---

### Task 1: core — 名臣 types, recommendation state, 舉薦 rules

Read: `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md`.

**Files:**
- Create: `packages/core/src/model/notables.ts` (types only), `packages/core/src/rules/recommend.ts`, `packages/core/src/rules/recommend.test.ts`
- Modify: `packages/core/src/model/officials.ts` (`Official.notable`), `packages/core/src/model/state.ts` (`recommendation`, `SCHEMA_VERSION = 5`), `packages/core/src/model/balance.ts`, `packages/core/src/rules/officials.ts` (`drawOfficial` sets `notable: null`), `packages/core/src/testNames.ts` (add `TEST_NOTABLES`), `packages/core/src/index.ts`
- Test: `packages/core/src/model/state.test.ts`, `packages/core/src/rules/officials.test.ts` (shape updates), new `recommend.test.ts`

**Interfaces:**
- Produces (all exported from `src/index.ts`):
  - `type NotableType = 'civil' | 'military' | 'both'`; `interface NotableGate { stat: EmperorStatId; min: number }`; `interface NotableData { id: string; name: string; type: NotableType; stats: OfficialStatValues; gate: NotableGate }`; `interface Candidate { name: string; stats: OfficialStatValues; notable: string | null }`; `interface Recommendation { turn: number; candidate: Candidate | null }` — all in `src/model/notables.ts`.
  - `Official` gains `notable: string | null`. `GameState` gains `recommendation: Recommendation | null` (placed after `officials`). `SCHEMA_VERSION = 5`.
  - In `src/rules/recommend.ts`: `canRecommend(state: GameState): boolean`; `recommend(state: GameState, notables: readonly NotableData[], names: NamePool): RecommendOutcome`; `acceptCandidate(state: GameState): CandidateOutcome`; `declineCandidate(state: GameState): CandidateOutcome`; `type RecommendRejection = 'not-in-court' | 'already-used'`; `type CandidateRejection = 'not-in-court' | 'no-candidate'`; `type RecommendOutcome = { ok: false; reason: RecommendRejection; state: GameState } | { ok: true; state: GameState; candidate: Candidate }`; `type CandidateOutcome = { ok: false; reason: CandidateRejection; state: GameState } | { ok: true; state: GameState }`.

- [ ] **Step 1: Add `BALANCE.recommendation`**

```ts
recommendation: { notableBase: 0.03, notableBonus: 0.05 },
```
Chance = `notableBase + notableBonus * (stats.learning + stats.resolve) / 200` (3–8%).

- [ ] **Step 2: Add `TEST_NOTABLES` to `src/testNames.ts`** (test-only, not exported from `index.ts`)

Four entries (stat shorthand `{a, m, am, l}` = `administration, military, ambition, loyalty`), names built from characters not in `TEST_NAMES` so they never collide with generated names:
- `civil` — `{ id: 'civil', name: '文臣', type: 'civil', stats: { administration: 90, military: 20, ambition: 10, loyalty: 90 }, gate: { stat: 'learning', min: 20 } }`
- `military` — `{ id: 'military', name: '武將', type: 'military', stats: {20, 90, 30, 80}, gate: { stat: 'resolve', min: 20 } }`
- `both` — `{ id: 'both', name: '全才', type: 'both', stats: {85, 85, 40, 85}, gate: { stat: 'learning', min: 20 } }`
- `locked` — `{ id: 'locked', name: '隱士', type: 'civil', stats: {95, 10, 0, 95}, gate: { stat: 'health', min: 101 } }` (gate never met)

- [ ] **Step 3: Write the failing tests in `recommend.test.ts`**

Helpers in the test file: `court(over?: Partial<GameState>)` = `enterPalace(createInitialState(1, '承平', [], TEST_NAMES), 'xuanzheng')` with `over` spread in (set `stats` there); `rngWhere(pred: (v: number) => boolean): number` scans `rngState` 0, 1, 2… until `pred(nextRandom(r).value)`; `rngWhere2(pred1, pred2)` does the same for the first two draws. Tests (each name starts with `UC-CORE-017`):
- `canRecommend`: true in a fresh 早朝; false on the map, when dead, and after `recommend` in the same turn; true again for the same state with `turn + 1` (still in court). `createInitialState` gives `recommendation: null`, every official `notable: null`, and `schemaVersion: 5` (put the last assertion in `state.test.ts`).
- Rejections: `recommend` on the map → `'not-in-court'`; after a successful `recommend` → `'already-used'` with the state returned `toBe` the input. `acceptCandidate`/`declineCandidate` on a fresh 早朝 → `'no-candidate'`; on the map → `'not-in-court'`; with `recommendation: { turn: state.turn - 1, candidate: X }` → `'no-candidate'`.
- Chance: stats `learning 100, resolve 100`, `rngState = rngWhere(v => v >= 0.03 && v < 0.08)` → candidate has a non-null `notable`; same rngState with `learning 0, resolve 0` → `notable: null`.
- Weighted pick: stats `learning 30, resolve 90` (health 50, arts 50), notables `[civil, military]`. With `rngWhere2(v => v < 0.03, v => v < 30/120 - 0.01)` → `civil`; with `rngWhere2(v => v < 0.03, v => v > 30/120 + 0.01)` → `military`. Weight 0: stats `learning 50, resolve 0`, notables `[{ ...military, gate: { stat: 'learning', min: 0 } }]` (eligible but weight 0), first draw a hit → ordinary (`notable: null`), no throw. Stats `learning 0, resolve 0` with `[civil, locked]` → ordinary.
- Eligibility: notables `[civil]` and an official already at court with `notable: 'civil'` → on a hit, the candidate is ordinary. `locked` is never drawn: over 200 hit rngStates with notables `[locked, both]`, every candidate is `both`.
- Ordinary candidate: on a miss, `candidate.name`/`stats` equal `drawOfficial(rngAfterFirstDraw, …, TEST_NAMES, takenNames)`'s, the name is not any official's name, and `state.rngState` equals that draw's `rngState`.
- Accept: a new official is appended with `id` `official-<highest existing number + 1>`, `post: null`, the candidate's `name`, `stats`, `notable`; `recommendation` becomes `{ turn, candidate: null }`; `rngState` unchanged; `canRecommend` false.
- Decline: officials unchanged, `recommendation.candidate` null, `rngState` unchanged. A declined 名臣 can be drawn again with `turn + 1` (same stats, hit rngState); an accepted one cannot.

Run: `npm test -w packages/core` — Expected: FAIL (missing exports).

- [ ] **Step 4: Implement**

`src/model/notables.ts`: the types above. `Official.notable`, `GameState.recommendation`, `SCHEMA_VERSION = 5`; `createInitialState` sets `recommendation: null`; `drawOfficial` returns `notable: null`.

`src/rules/recommend.ts`:
- `canRecommend`: `isMorningCourt(state) && state.recommendation?.turn !== state.turn`.
- `recommend`: reject in that order; one `nextRandom` draw `roll`; eligible = notables whose `state.stats[gate.stat] >= gate.min` and whose `id` is not any official's `notable`; weight = `civil` 2 × 學識, `military` 2 × 魄力, `both` 學識 + 魄力 (2 × the average, so integers); if `roll.value < chance` and total weight > 0, a second draw picks: `target = value × total`, the first eligible entry, in list order, whose running weight sum exceeds `target`. Otherwise `drawOfficial(rng, '', names, takenNames)` and use its name and stats. Store `{ turn: state.turn, candidate }` and the new `rngState`.
- `acceptCandidate`/`declineCandidate`: reject `'not-in-court'` if `!isMorningCourt`, `'no-candidate'` if `recommendation?.turn !== state.turn` or `candidate === null`. New ID: parse the number after `official-` in every ID, take the highest, add 1.

Export everything listed under Interfaces from `src/index.ts`.

- [ ] **Step 5: Run** `npm test -w packages/core` and `npx tsc -p packages/core --noEmit` (or the package's typecheck script) — Expected: PASS.

- [ ] **Step 6: Mark UC-CORE-017 `implemented`** in `packages/core/USE_CASES.md`. Commit: `feat(core): 名臣 data types and 舉薦 rules`.

---

### Task 2: content — 名臣 list and reserved names

Read: `packages/content/ARCHITECTURE.md`, `packages/content/USE_CASES.md`, `packages/core/ARCHITECTURE.md` ("名臣 data").

**Files:**
- Create: `packages/content/src/notables.ts`, `packages/content/src/notables.test.ts`
- Modify: `packages/content/src/schema.ts` (`NotableEntry`, `GameText.notables`, new `UiText` keys), `packages/content/src/index.ts`, `packages/content/src/officialNames.ts`, `packages/content/src/officialNames.test.ts`

**Interfaces:**
- Consumes: `NotableData`, `NotableType` from Task 1.
- Produces: `interface NotableEntry extends NotableData { era: string }` (exported type); `gameText.notables: readonly NotableEntry[]`; `officialNames.reserved = notables.map((n) => n.name)`; `UiText` keys `recommendHeading`, `notableMark`, `acceptCandidate`, `declineCandidate`, `recommendUsed`, `noCandidate`.

- [ ] **Step 1: Write the failing tests** (`notables.test.ts`, names start with `UC-CONTENT-003`)
- 55 to 65 entries; IDs unique and kebab-case ASCII; names unique, 2–4 Han characters; `era` non-empty.
- Every stat within its `STAT_REGISTRY` bounds; `gate.stat` is in `EMPEROR_STAT_IDS`; `gate.min` between 1 and 100.
- All three types appear; `civil` entries have 文治 > 武功, `military` entries 武功 > 文治, `both` entries both ≥ 70.
- At least 5 entries have 野心 ≥ 80, and `sima-yi` is one of them.
- At least 10 entries have `gate.min` ≤ 35.
- `wei-qing` has gate `{ stat: 'resolve', min: 60 }`.

In `officialNames.test.ts`, replace `expect(reserved).toHaveLength(0)` with: `reserved` equals `gameText.notables.map((n) => n.name)`, and the existing 20-seed test also asserts no generated name is in `reserved`. Rename that test to drop "none reserved yet".

Run: `npm test -w packages/content` — Expected: FAIL.

- [ ] **Step 2: Write `src/notables.ts`**

`export const notables: readonly NotableEntry[]`, one object literal per line, in this order (stats are 文治/武功/野心/忠誠, i.e. `administration/military/ambition/loyalty`; gate stats: 學識 `learning`, 魄力 `resolve`, 健康 `health`, 才藝 `arts`):

| id | name | era | type | 文治 | 武功 | 野心 | 忠誠 | gate |
|---|---|---|---|---|---|---|---|---|
| guan-zhong | 管仲 | 春秋・齊 | civil | 95 | 55 | 45 | 75 | learning 55 |
| yan-ying | 晏嬰 | 春秋・齊 | civil | 85 | 20 | 15 | 90 | learning 30 |
| sun-wu | 孫武 | 春秋・吳 | military | 50 | 98 | 25 | 75 | resolve 55 |
| wu-zixu | 伍子胥 | 春秋・吳 | both | 75 | 85 | 40 | 85 | resolve 50 |
| fan-li | 范蠡 | 春秋・越 | civil | 88 | 60 | 30 | 70 | learning 45 |
| shang-yang | 商鞅 | 戰國・秦 | civil | 92 | 50 | 60 | 70 | resolve 55 |
| wu-qi | 吳起 | 戰國・魏 | both | 80 | 92 | 65 | 55 | resolve 60 |
| sun-bin | 孫臏 | 戰國・齊 | military | 55 | 93 | 25 | 80 | learning 45 |
| bai-qi | 白起 | 戰國・秦 | military | 30 | 99 | 50 | 85 | resolve 70 |
| lian-po | 廉頗 | 戰國・趙 | military | 35 | 88 | 40 | 90 | resolve 30 |
| li-mu | 李牧 | 戰國・趙 | military | 50 | 92 | 20 | 95 | resolve 50 |
| lin-xiangru | 藺相如 | 戰國・趙 | civil | 82 | 25 | 20 | 95 | learning 25 |
| yue-yi | 樂毅 | 戰國・燕 | military | 65 | 92 | 30 | 85 | resolve 55 |
| wang-jian | 王翦 | 秦 | military | 50 | 94 | 30 | 85 | resolve 60 |
| li-si | 李斯 | 秦 | civil | 92 | 30 | 85 | 50 | learning 55 |
| meng-tian | 蒙恬 | 秦 | military | 55 | 88 | 20 | 98 | resolve 30 |
| xiao-he | 蕭何 | 西漢 | civil | 95 | 35 | 25 | 90 | learning 50 |
| zhang-liang | 張良 | 西漢 | civil | 88 | 75 | 10 | 85 | learning 60 |
| han-xin | 韓信 | 西漢 | military | 50 | 100 | 75 | 55 | resolve 70 |
| wei-qing | 衛青 | 西漢 | military | 50 | 95 | 15 | 95 | resolve 60 |
| huo-qubing | 霍去病 | 西漢 | military | 30 | 97 | 30 | 95 | resolve 65 |
| huo-guang | 霍光 | 西漢 | civil | 88 | 40 | 85 | 65 | learning 50 |
| wang-mang | 王莽 | 西漢 | civil | 80 | 25 | 100 | 10 | learning 45 |
| ma-yuan | 馬援 | 東漢 | military | 55 | 88 | 25 | 90 | health 35 |
| ban-chao | 班超 | 東漢 | both | 72 | 85 | 30 | 90 | resolve 30 |
| xun-yu | 荀彧 | 三國・魏 | civil | 94 | 30 | 10 | 95 | learning 55 |
| guo-jia | 郭嘉 | 三國・魏 | civil | 90 | 70 | 20 | 85 | learning 35 |
| sima-yi | 司馬懿 | 三國・魏 | both | 92 | 90 | 98 | 30 | learning 65 |
| zhuge-liang | 諸葛亮 | 三國・蜀漢 | both | 98 | 85 | 15 | 100 | learning 75 |
| guan-yu | 關羽 | 三國・蜀漢 | military | 60 | 95 | 40 | 100 | resolve 60 |
| zhao-yun | 趙雲 | 三國・蜀漢 | military | 50 | 92 | 10 | 100 | health 30 |
| zhou-yu | 周瑜 | 三國・吳 | both | 85 | 92 | 40 | 85 | arts 55 |
| lu-xun | 陸遜 | 三國・吳 | both | 85 | 90 | 30 | 85 | learning 50 |
| xie-an | 謝安 | 東晉 | civil | 92 | 70 | 20 | 90 | arts 50 |
| wang-meng | 王猛 | 前秦 | civil | 95 | 70 | 25 | 90 | learning 55 |
| gao-jiong | 高熲 | 隋 | civil | 92 | 70 | 25 | 85 | learning 50 |
| fang-xuanling | 房玄齡 | 唐 | civil | 95 | 35 | 15 | 95 | learning 55 |
| du-ruhui | 杜如晦 | 唐 | civil | 92 | 30 | 15 | 90 | learning 50 |
| wei-zheng | 魏徵 | 唐 | civil | 88 | 20 | 10 | 92 | learning 45 |
| li-jing | 李靖 | 唐 | military | 70 | 98 | 20 | 90 | resolve 65 |
| zhangsun-wuji | 長孫無忌 | 唐 | civil | 85 | 45 | 80 | 65 | learning 45 |
| di-renjie | 狄仁傑 | 唐 | civil | 93 | 45 | 15 | 92 | learning 55 |
| guo-ziyi | 郭子儀 | 唐 | both | 75 | 94 | 15 | 98 | resolve 55 |
| an-lushan | 安祿山 | 唐 | military | 30 | 85 | 100 | 5 | resolve 30 |
| zhao-pu | 趙普 | 北宋 | civil | 88 | 40 | 50 | 80 | learning 30 |
| kou-zhun | 寇準 | 北宋 | civil | 85 | 45 | 35 | 90 | resolve 50 |
| fan-zhongyan | 范仲淹 | 北宋 | both | 92 | 72 | 15 | 95 | learning 60 |
| bao-zheng | 包拯 | 北宋 | civil | 85 | 20 | 10 | 100 | learning 30 |
| wang-anshi | 王安石 | 北宋 | civil | 90 | 30 | 50 | 85 | learning 65 |
| di-qing | 狄青 | 北宋 | military | 40 | 92 | 20 | 90 | resolve 35 |
| yue-fei | 岳飛 | 南宋 | military | 60 | 97 | 15 | 100 | resolve 65 |
| qin-hui | 秦檜 | 南宋 | civil | 75 | 15 | 90 | 25 | learning 30 |
| wen-tianxiang | 文天祥 | 南宋 | civil | 82 | 50 | 10 | 100 | learning 55 |
| yelu-chucai | 耶律楚材 | 元 | civil | 92 | 40 | 20 | 88 | learning 50 |
| liu-ji | 劉基 | 明 | both | 92 | 75 | 25 | 85 | learning 60 |
| xu-da | 徐達 | 明 | military | 65 | 95 | 20 | 95 | resolve 55 |
| yu-qian | 于謙 | 明 | both | 88 | 75 | 15 | 100 | learning 50 |
| zhang-juzheng | 張居正 | 明 | civil | 96 | 35 | 80 | 70 | learning 60 |
| qi-jiguang | 戚繼光 | 明 | military | 60 | 96 | 20 | 95 | resolve 55 |
| wang-yangming | 王陽明 | 明 | both | 92 | 85 | 20 | 90 | learning 65 |

`officialNames.ts`: `reserved: notables.map((n) => n.name)` (remove the old comment). `index.ts`: `gameText.notables = notables`; export type `NotableEntry`.

New `uiText` values: `recommendHeading: '舉薦人選'`, `notableMark: '名臣'`, `acceptCandidate: '錄用'`, `declineCandidate: '婉拒'`, `recommendUsed: '已舉薦'`, `noCandidate: '此次早朝已無候選人'`.

- [ ] **Step 3: Run** `npm test -w packages/content` — Expected: PASS.

- [ ] **Step 4: Mark UC-CONTENT-003 `implemented`.** Commit: `feat(content): 名臣 list and reserved names`.

---

### Task 3: web — 舉薦人選 screen and used state

Read: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md`, `packages/core/USE_CASES.md` (UC-CORE-017).

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/render.ts`, `packages/web/src/main.ts`, `packages/web/src/style.css`, `packages/web/screenshots.json`
- Test: `packages/web/src/screen.test.ts`, `packages/web/src/render.test.ts`

**Interfaces:**
- Consumes: Task 1's `canRecommend`, `recommend`, `acceptCandidate`, `declineCandidate`, `NotableData`; Task 2's `gameText.notables`, `NotableEntry`, new `UiText` keys.
- Produces:
  - `Screen` gains `{ screen: 'recommend'; state: GameState }`.
  - `OPEN_COURT_OPTIONS = ['recommend-officials', 'appoint-officials']`.
  - `chooseCourtOption(screen: Screen, optionId: CourtOptionId, notables: readonly NotableData[], names: NamePool): Screen` — for `recommend-officials` it returns the screen unchanged unless `canRecommend`, else calls `recommend` and returns `{ screen: 'recommend', state }`. `appoint-officials` behaves as before.
  - `acceptRecommendation(screen: Screen): Screen`, `declineRecommendation(screen: Screen): Screen` — only from `recommend`; on `ok` → `{ screen: 'play', state, department: 'personnel' }`; otherwise unchanged.
  - `backToCourt` also accepts `recommend`.
  - `renderRecommendScreen(screen: Of<'recommend'>, text: UiText, game: GameText): string`.

Element IDs: `#recommend-screen` (main), `#candidate` (with `data-notable="<id>"` only for a 名臣), `#candidate-name`, `#candidate-era` (名臣 only; contains a `.notable-mark` span with `notableMark`, then the era), `#candidate-stats` (table: four stat label headers, one row of values), `#accept-candidate`, `#decline-candidate`; with no candidate, `#no-candidate` line and `#back-to-court`. The used option stays `#court-option-recommend-officials`, `disabled`, with `<span class="court-option-tag">已舉薦</span>` (`text.recommendUsed`).

- [ ] **Step 1: Write the failing tests** (names start with `UC-WEB-009` or `UC-WEB-007`)
- `screen.test.ts`: update existing `chooseCourtOption` calls to pass `gameText.notables, gameText.officialNames`; the existing assertion that `recommend-officials` returns the screen unchanged becomes: it opens `recommend` with `state.recommendation.turn === state.turn` and a candidate. A second `chooseCourtOption(…'recommend-officials'…)` from `play` after declining returns `toBe` the same screen. Accept → `play` in 宣政殿, `department: 'personnel'`, one more official, last one 賦閑. Decline → same official count. `acceptRecommendation` from `play` → unchanged. `backToCourt` from `recommend` → `play` with `personnel`.
- Harness seed test: `UC-WEB-009 the screenshot scenarios reach an ordinary candidate and a 名臣 with the harness seed`. Compute the seed `take-screenshots.mjs` gives `crypto.getRandomValues(new Uint32Array(1))`: start `s = 0x2545f491`, draw four bytes with `nextRandom` (`floor(value × 256)`, advancing `s` each time), assemble little-endian. Replay the click paths of `recommend-ordinary` and `recommend-notable` through the screen transitions (`startGame`, `chooseEraName` with suggestion 0, `goToPalace`, `toggleDepartment`, `chooseCourtOption`, `declineRecommendation`, `goToMap`, `performAction`, `continueToMap`) and assert `notable` is `null` and non-null respectively.
- `render.test.ts`: ordinary candidate → no `data-notable`, no `#candidate-era`, name HTML-escaped, four stats; 名臣 candidate → `data-notable`, `#candidate-era` containing `名臣` and the era from `gameText.notables`. Court view with `recommendation.turn === state.turn` → recommend option `disabled` with `已舉薦`; with an older turn → enabled, no tag. No candidate → `#no-candidate` and `#back-to-court`, no accept/decline.

Run: `npm test -w packages/web` — Expected: FAIL.

- [ ] **Step 2: Implement** `screen.ts`, `render.ts` (header bar like 官員任命; `renderScreen` case `recommend`), `main.ts` (pass `gameText.notables, gameText.officialNames` to `chooseCourtOption`; `#accept-candidate` → `acceptRecommendation`, `#decline-candidate` → `declineRecommendation`), `style.css` (candidate card styled like the appoint tables; `.notable-mark` a small gold tag; reuse `.court-option-tag` for the used tag).

- [ ] **Step 3: Find the 名臣 click path.** With the harness seed, simulate: each half-season enter 宣政殿, open 吏部, either use 舉薦 and decline, or skip it; 退; then 養心殿 → 靜養 three times (`#continue`, `#continue`, `#next-turn`). Search use/skip choices per half-season for the shortest path whose last 舉薦 draws a 名臣. If the first 舉薦 with the harness seed is already a 名臣, swap: `recommend-notable` is the short path and `recommend-ordinary` is found by the same search.

- [ ] **Step 4: Update `packages/web/screenshots.json`**
- `recommend-ordinary` — 「舉薦人選：一般候選人，錄用或婉拒」: `#start`, `#era-suggestion-0`, `#palace-xuanzheng`, `#department-personnel`, `#court-option-recommend-officials`, waitFor `#candidate:not([data-notable])`.
- `recommend-notable` — 「舉薦人選：名臣候選人，顯示朝代」: the path from Step 3, ending at the 舉薦 click, waitFor `#candidate[data-notable]`.
- `personnel-recommended` — 「宣政殿吏部：本次早朝已舉薦，舉薦人選停用」: as `recommend-ordinary`, then `#decline-candidate`, waitFor `#court-option-recommend-officials[disabled]`.
- `palace-xuanzheng-personnel` description becomes 「宣政殿畫面：展開吏部，舉薦人選與官員任命可點選，開科取士尚未開放」.

- [ ] **Step 5: Run** `npm test -w packages/web` and `npm run build -w packages/web` — Expected: PASS.

- [ ] **Step 6: Mark UC-WEB-009 `implemented`.** Commit: `feat(web): 舉薦人選 screen`.

---

### Task 4: whole repo

- [ ] **Step 1:** Run `npm run verify`. Expected: PASS, including the use case ID check (UC-CORE-017, UC-CONTENT-003, UC-WEB-009 each referenced by a test name).
- [ ] **Step 2:** Fix anything it reports in the module that owns it, and commit there.
