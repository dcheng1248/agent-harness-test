# 早朝, Officials and 官員任命 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 宣政殿 a morning-only 早朝 that spends the 朝 action point, add generated officials and derived posts to `GameState`, and turn on 吏部 → 官員任命 so the player can move 賦閑 officials into posts.

**Architecture:** `core` adds official stats to the stat registry, post registries and `listPosts`, `GameState.officials` generated in `createInitialState` from a `NamePool`, `canEnterPalace`/`isMorningCourt`, and `appointOfficial`. `content` adds the name pool, post text and `formatPostName`. `web` disables 宣政殿 on the map outside 朝, enables the 官員任命 option, and adds an `appoint` screen.

**Tech Stack:** TypeScript, Vitest, Vite, npm workspaces.

**Spec:** Issue #35; `packages/core/USE_CASES.md` (UC-CORE-003, UC-CORE-004, UC-CORE-012), `packages/content/USE_CASES.md` (UC-CONTENT-002), `packages/web/USE_CASES.md` (UC-WEB-003, UC-WEB-004, UC-WEB-007, UC-WEB-008, screen flow); `packages/core/ARCHITECTURE.md` (State, Name pool, Posts, Registries, Interface); `packages/content/ARCHITECTURE.md`; `packages/web/ARCHITECTURE.md` (Screen state); `GLOSSARY.md`. The docs are already updated on this branch.

## Global Constraints
- Player-facing text is Traditional Chinese and lives only in `content`. Never name an existing game.
- `SCHEMA_VERSION` goes from 3 to 4. No migration (there are no saves).
- All randomness goes through `nextRandom`/`randomInt` on `state.rngState`. Official generation happens after the emperor-stat draws in `createInitialState`, so emperor stats for a given seed do not change.
- Nothing in 宣政殿 or on the 官員任命 screen draws random numbers or changes `actionPoint`, except `returnToMap` leaving 宣政殿 (→ 午).
- Element IDs are stable (listed in Task 3).
- One commit per module task. Between Task 1 and Task 3 the `web` tests fail at runtime because `createInitialState` gains a required argument; run only the module's own tests in Tasks 1 and 2. Task 4 runs everything.
- UC-CORE-003, UC-CORE-004, UC-CONTENT-002 and UC-WEB-008 stay `planned` until the task that tests them marks them `implemented`.

## Review Focus
1. Re-entering 宣政殿 in the same half-season after 退 (now at 午): must be refused, both in `core` and on the map button. Tests in Task 1 and Task 3.
2. A stale or forged `data-post` / `data-official` / `data-sort` value reaching a transition (unknown post, foreign-region post, an emperor stat as sort key, an official who already holds a post): screen unchanged. Tests in Task 3; `core` rejections in Task 1.
3. Appointing to a post whose holder is replaced: exactly one holder per post afterwards, previous holder becomes 賦閑, official count unchanged. Test in Task 1.
4. A name pool too small, or reserved names: generation never repeats a name or uses a reserved one, and throws instead of looping forever. Tests in Task 1.
5. A vacant post (possible once later issues add dismissal) rendering as `undefined`: render test with a hand-made vacancy in Task 3.

---

### Task 1: core — official stats, posts, starting court, 早朝 timing, appointOfficial

Read: `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md`.

**Files:**
- Modify: `packages/core/src/model/stats.ts`, `packages/core/src/model/balance.ts`, `packages/core/src/model/catalog.ts`, `packages/core/src/model/state.ts`, `packages/core/src/rules/turn.ts`, `packages/core/src/index.ts`
- Create: `packages/core/src/model/officials.ts` (types, registries, `listPosts`), `packages/core/src/rules/officials.ts` (generation, name drawing, `appointOfficial`), `packages/core/src/testNames.ts` (test-only name pool)
- Test: `packages/core/src/model/state.test.ts`, `packages/core/src/rules/turn.test.ts`, create `packages/core/src/rules/officials.test.ts`; update every other `createInitialState(...)` call in core tests to pass `TEST_NAMES`.

**Interfaces:**
- Produces (all exported from `src/index.ts`):
  - `OFFICIAL_STAT_IDS = ['administration', 'military', 'ambition', 'loyalty'] as const` (文治, 武功, 野心, 忠誠), `type OfficialStatId`, `type OfficialStatValues = Record<OfficialStatId, number>`. `StatOwner` gains `'official'`. `STAT_IDS` = emperor, nation, region, then official IDs. `STAT_REGISTRY` gains the four, each `min: 0, max: 100, owner: 'official'`.
  - `CENTRAL_POST_IDS = ['chancellor', 'grand-general', 'grand-tutor'] as const` → `CentralPostId`; `MINISTRY_DEPARTMENT_IDS = ['personnel', 'revenue', 'rites', 'war', 'justice', 'works'] as const` (typed so each is a `DepartmentId`) → `MinistryDepartmentId`; `MINISTRY_RANKS = ['minister', 'vice-minister'] as const` → `MinistryRankId`; `REGION_OFFICES = ['governor', 'commander'] as const` → `RegionOfficeId`.
  - `type PostId = string`; `type PostInfo` and `interface Official { id: string; name: string; stats: OfficialStatValues; post: PostId | null }` exactly as in `ARCHITECTURE.md`; `interface NamePool { surnames: readonly string[]; givenNames: readonly string[]; reserved: readonly string[] }`.
  - `listPosts(state: Pick<GameState, 'regions'>): PostInfo[]`.
  - `COURT_PALACE_ID: PalaceId = 'xuanzheng'`, `COURT_ACTION_POINT: ActionPointId = 'dawn'` (in `catalog.ts`).
  - `canEnterPalace(state: GameState, palaceId: PalaceId): boolean`, `isMorningCourt(state: GameState): boolean` (in `rules/turn.ts`).
  - `createInitialState(seed: number, eraName: string, regions: readonly RegionData[], names: NamePool): GameState`; `GameState.officials: Official[]`; `SCHEMA_VERSION = 4`.
  - `appointOfficial(state: GameState, postId: PostId, officialId: string): AppointOutcome`, `type AppointRejection`, `type AppointOutcome` (in `rules/officials.ts`).

- [ ] **Step 1: Add `BALANCE.officials`**

```ts
officials: {
  startingIdle: 30,
  outlierChance: 0.1,
  ordinary: { administration: { min: 40, max: 70 }, military: { min: 40, max: 70 }, ambition: { min: 0, max: 80 }, loyalty: { min: 30, max: 80 } },
  outlier: { administration: { min: 20, max: 85 }, military: { min: 20, max: 85 }, ambition: { min: 0, max: 95 }, loyalty: { min: 10, max: 95 } },
  maxNameDraws: 1000,
},
```
Typed as `Record<OfficialStatId, { min: number; max: number }>` for the two range tables. Ranges include both ends.

- [ ] **Step 2: Write `src/testNames.ts`**

`export const TEST_NAMES: NamePool` with 10 distinct single-character surnames, 10 distinct single-character given names, `reserved: []` (100 combinations, enough for 47 or 63 officials). Not exported from `index.ts`.

- [ ] **Step 3: Write the failing tests**

`turn.test.ts`: `makeState` uses `createInitialState(1, "承平", [], TEST_NAMES)`. Replace the test "宣政殿 can be entered and left at any action point without using one" with:

```ts
it("UC-CORE-003 宣政殿 opens only at 朝; leaving moves the clock to 午", () => {
  const dawn = makeState();
  expect(canEnterPalace(dawn, "xuanzheng")).toBe(true);
  const inside = enterPalace(dawn, "xuanzheng");
  expect([inside.location, inside.actionPoint, isMorningCourt(inside)]).toEqual(["xuanzheng", 0, true]);
  expect(takeAction(inside, "study")).toMatchObject({ ok: false, reason: "not-offered" });
  const out = returnToMap(inside);
  expect([out.location, out.actionPoint, out.turn, out.rngState]).toEqual(["map", 1, 0, dawn.rngState]);
  expect(isMorningCourt(out)).toBe(false);
  expect(enterPalace(out, "xuanzheng")).toBe(out); // no second 早朝 this half-season
  for (const actionPoint of [1, 2, 3]) {
    const s = makeState({ actionPoint });
    expect(canEnterPalace(s, "xuanzheng")).toBe(false);
    expect(enterPalace(s, "xuanzheng")).toBe(s);
  }
});
it("UC-CORE-012 other palaces open at every action point; canEnterPalace refuses when dead, off the map or unknown", () => {
  for (const actionPoint of [0, 1, 2, 3])
    for (const p of ["chongwen", "yuhuayuan", "yanwu", "yangxin"] as const)
      expect(canEnterPalace(makeState({ actionPoint }), p)).toBe(true);
  expect(canEnterPalace(makeState({ dead: true }), "chongwen")).toBe(false);
  expect(canEnterPalace(makeState({ location: "chongwen" }), "yanwu")).toBe(false);
  expect(canEnterPalace(makeState(), "nope" as PalaceId)).toBe(false);
  expect(isMorningCourt(makeState({ dead: true, location: "xuanzheng" }))).toBe(false);
});
```
Keep the existing "moving … uses no action point" test (other palaces unchanged).

`state.test.ts`: pass `TEST_NAMES` everywhere; `schemaVersion` expectations become `4`. Change "region data does not change the emperor stats or rngState" to assert only `b.stats` equals `a.stats` (rename to "…does not change the emperor stats"). Add, using the existing two-region `FIXTURE` (a player, b foreign):

```ts
it("UC-CORE-004 a new game fills every post and adds the idle officials", () => {
  const s = createInitialState(7, "承平", FIXTURE, TEST_NAMES);
  const posts = listPosts(s);
  expect(posts).toHaveLength(17);
  expect(s.officials).toHaveLength(47);
  expect(s.officials.map((o) => o.id)).toEqual(Array.from({ length: 47 }, (_, i) => `official-${i + 1}`));
  expect(s.officials.slice(0, 17).map((o) => o.post)).toEqual(posts.map((p) => p.id));
  expect(s.officials.slice(17).every((o) => o.post === null)).toBe(true);
  expect(new Set(s.officials.map((o) => o.name)).size).toBe(47);
  for (const o of s.officials) expect(TEST_NAMES.surnames.some((x) => o.name.startsWith(x) && TEST_NAMES.givenNames.includes(o.name.slice(x.length)))).toBe(true);
  expect(JSON.parse(JSON.stringify(s))).toEqual(s);
});
it("UC-CORE-004 official stats stay in the outlier bounds, and outliers occur", () => {
  let outside = false;
  for (let seed = 0; seed < 40; seed += 1)
    for (const o of createInitialState(seed, "承平", FIXTURE, TEST_NAMES).officials)
      for (const id of OFFICIAL_STAT_IDS) {
        const { min, max } = BALANCE.officials.outlier[id];
        expect(o.stats[id]).toBeGreaterThanOrEqual(min);
        expect(o.stats[id]).toBeLessThanOrEqual(max);
        const ord = BALANCE.officials.ordinary[id];
        if (o.stats[id] < ord.min || o.stats[id] > ord.max) outside = true;
      }
  expect(outside).toBe(true);
});
it("UC-CORE-004 reserved names are never generated; a pool too small throws", () => {
  const reserved = TEST_NAMES.surnames.slice(0, 4).flatMap((s) => TEST_NAMES.givenNames.map((g) => s + g)); // 40 names
  for (let seed = 0; seed < 20; seed += 1) {
    const names = createInitialState(seed, "承平", FIXTURE, { ...TEST_NAMES, reserved }).officials.map((o) => o.name);
    expect(names.some((n) => reserved.includes(n))).toBe(false);
  }
  const tiny = { surnames: TEST_NAMES.surnames.slice(0, 5), givenNames: TEST_NAMES.givenNames.slice(0, 5), reserved: [] };
  expect(() => createInitialState(7, "承平", FIXTURE, tiny)).toThrow();
});
```
Extend the stat registry test: `STAT_IDS` ends with `"administration", "military", "ambition", "loyalty"`, each `[0, 100, "official"]`.

`rules/officials.test.ts` (new). Fixture regions `a` (player), `b` (foreign), `c` (player); `court = enterPalace(createInitialState(3, "承平", REGIONS, TEST_NAMES), "xuanzheng")`:

```ts
it("UC-CORE-004 posts: 中樞, then 六部 尚書/侍郎, then each owned region's 知州/總兵", () => {
  expect(listPosts(court).map((p) => p.id)).toEqual([
    "chancellor", "grand-general", "grand-tutor",
    "personnel-minister", "personnel-vice-minister", "revenue-minister", "revenue-vice-minister",
    "rites-minister", "rites-vice-minister", "war-minister", "war-vice-minister",
    "justice-minister", "justice-vice-minister", "works-minister", "works-vice-minister",
    "a-governor", "a-commander", "c-governor", "c-commander",
  ]);
  expect(listPosts(court)[15]).toEqual({ id: "a-governor", group: "region", region: "a", office: "governor" });
  expect(listPosts(court)[4]).toEqual({ id: "personnel-vice-minister", group: "ministry", department: "personnel", rank: "vice-minister" });
});
it("UC-CORE-004 appointing an idle official replaces the holder, who becomes idle", () => {
  const idle = court.officials.find((o) => o.post === null)!;
  const holder = court.officials.find((o) => o.post === "chancellor")!;
  const out = appointOfficial(court, "chancellor", idle.id);
  if (!out.ok) throw new Error(out.reason);
  const by = (id: string) => out.state.officials.find((o) => o.id === id)!;
  expect([by(idle.id).post, by(holder.id).post]).toEqual(["chancellor", null]);
  expect(out.state.officials.filter((o) => o.post === "chancellor")).toHaveLength(1);
  expect(out.state.officials).toHaveLength(court.officials.length);
  expect([out.state.actionPoint, out.state.rngState, out.state.location]).toEqual([court.actionPoint, court.rngState, "xuanzheng"]);
  const again = appointOfficial(out.state, "a-governor", holder.id); // many appointments per 早朝
  expect(again.ok).toBe(true);
});
it("UC-CORE-004 rejections leave the state unchanged", () => {
  const idle = court.officials.find((o) => o.post === null)!.id;
  const held = court.officials.find((o) => o.post === "grand-tutor")!.id;
  const cases: [GameState, string, string, AppointRejection][] = [
    [returnToMap(court), "chancellor", idle, "not-in-court"],
    [{ ...court, dead: true }, "chancellor", idle, "not-in-court"],
    [court, "b-governor", idle, "region-not-owned"],
    [court, "nope", idle, "unknown-post"],
    [court, "zz-governor", idle, "unknown-post"],
    [court, "chancellor", "official-999", "unknown-official"],
    [court, "chancellor", held, "not-idle"],
    [court, "grand-tutor", held, "not-idle"],
  ];
  for (const [s, post, official, reason] of cases)
    expect(appointOfficial(s, post, official)).toEqual({ ok: false, reason, state: s });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run packages/core`
Expected: FAIL (missing exports `canEnterPalace`, `listPosts`, …).

- [ ] **Step 5: Implement**

- `stats.ts`: the official stat IDs and registry entries (Interfaces above).
- `model/officials.ts`: registries, types, and `listPosts`, built from `regions` filtered to `owner === PLAYER_OWNER`; post IDs as in Interfaces.
- `rules/officials.ts`:
  - internal `drawOfficial(rngState, id, names, taken: ReadonlySet<string>)` returning `{ official: Official (post null), rngState }`. Draw order per official: one `nextRandom` (outlier when `value < BALANCE.officials.outlierChance`); one `randomInt(min, max)` per stat in `OFFICIAL_STAT_IDS` order from the chosen table; then name draws: `randomInt(0, surnames.length - 1)` then `randomInt(0, givenNames.length - 1)`, repeated while the name is in `taken` or `names.reserved`, at most `BALANCE.officials.maxNameDraws` tries, then `throw new Error("official name pool exhausted")`. Export it for later issues (not from `index.ts`).
  - `appointOfficial`: checks in the order of UC-CORE-004. `'region-not-owned'` when some region in `state.regions` with `owner !== PLAYER_OWNER` has `postId === \`${region.id}-${office}\`` for an office in `REGION_OFFICES`. Success maps `officials`: the holder of `postId` gets `post: null`, the chosen official gets `post: postId`; nothing else changes.
- `state.ts`: `officials` field; `SCHEMA_VERSION = 4`; after the emperor stats, generate one official per `listPosts({ regions })` post (holding it), then `BALANCE.officials.startingIdle` idle ones, IDs `official-1`, `official-2`, … in generation order, threading `rngState` and the set of taken names.
- `catalog.ts`: `COURT_PALACE_ID`, `COURT_ACTION_POINT`.
- `turn.ts`: `canEnterPalace` (alive, on the map, `PALACE_IDS` includes it, and for `COURT_PALACE_ID` only when `getActionPointId(state) === COURT_ACTION_POINT`); `enterPalace` returns the state unchanged unless `canEnterPalace`; `isMorningCourt` = `!state.dead && state.location === COURT_PALACE_ID`; `returnToMap` from 宣政殿 sets `actionPoint` to `ACTION_POINTS.indexOf(COURT_ACTION_POINT) + 1`, otherwise only `location`.
- `index.ts`: export everything in Interfaces.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run packages/core && npx tsc --noEmit -p packages/core` (or the root typecheck, ignoring `web` errors about the new argument)
Expected: PASS.

- [ ] **Step 7: Mark use cases and commit**

In `packages/core/USE_CASES.md` set UC-CORE-003 and UC-CORE-004 to `implemented`.

```bash
git add packages/core
git commit -m "feat(core): officials, posts, 早朝 timing and appointOfficial"
```

---

### Task 2: content — name pool, official stat labels, post text, formatPostName

Read: `packages/content/ARCHITECTURE.md`, `packages/content/USE_CASES.md`, and `packages/core/ARCHITECTURE.md` ("Name pool", "Posts").

**Files:**
- Create: `packages/content/src/officialNames.ts`, `packages/content/src/officialNames.test.ts`
- Modify: `packages/content/src/schema.ts`, `packages/content/src/index.ts`, `packages/content/src/format.ts`, `packages/content/src/index.test.ts`, `packages/content/src/format.test.ts`, `packages/content/src/regions.test.ts`

**Interfaces:**
- Consumes: `NamePool`, `PostInfo`, `CentralPostId`, `MinistryRankId`, `RegionOfficeId`, `CENTRAL_POST_IDS`, `MINISTRY_DEPARTMENT_IDS`, `createInitialState`, `listPosts` from Task 1.
- Produces:
  - `GameText` gains `centralPosts: Record<CentralPostId, { name: string }>`, `ministryRanks: Record<MinistryRankId, { name: string }>`, `regionOffices: Record<RegionOfficeId, { name: string }>`, `officialNames: NamePool`. `statLabels` gains the four official stats.
  - `UiText` gains the keys in Step 3.
  - `formatPostName(post: PostInfo): string` exported from `index.ts`.

- [ ] **Step 1: Write the failing tests**

`officialNames.test.ts`:
```ts
it("UC-CONTENT-002 the name pool: about 100 surnames, about 200 given names, distinct Han, none reserved yet", () => {
  const { surnames, givenNames, reserved } = gameText.officialNames;
  expect(surnames.length).toBeGreaterThanOrEqual(90);
  expect(givenNames.length).toBeGreaterThanOrEqual(180);
  expect(reserved).toHaveLength(0);
  expect(new Set(surnames).size).toBe(surnames.length);
  expect(new Set(givenNames).size).toBe(givenNames.length);
  for (const n of [...surnames, ...givenNames]) expect(n).toMatch(/^\p{Script=Han}{1,2}$/u);
});
it("UC-CONTENT-002 a new game with the real pool has 63 officials with distinct names", () => {
  for (let seed = 0; seed < 20; seed += 1) {
    const s = createInitialState(seed, "承平", gameText.regions, gameText.officialNames);
    expect(s.officials).toHaveLength(63);
    expect(listPosts(s)).toHaveLength(33);
    expect(new Set(s.officials.map((o) => o.name)).size).toBe(63);
  }
});
```
`format.test.ts`:
```ts
it("UC-CONTENT-002 formatPostName", () => {
  expect(formatPostName({ id: "chancellor", group: "central", office: "chancellor" })).toBe("丞相");
  expect(formatPostName({ id: "grand-general", group: "central", office: "grand-general" })).toBe("大將軍");
  expect(formatPostName({ id: "personnel-minister", group: "ministry", department: "personnel", rank: "minister" })).toBe("吏部尚書");
  expect(formatPostName({ id: "works-vice-minister", group: "ministry", department: "works", rank: "vice-minister" })).toBe("工部侍郎");
  expect(formatPostName({ id: "guanzhong-governor", group: "region", region: "guanzhong", office: "governor" })).toBe("關中知州");
  expect(formatPostName({ id: "guanzhong-commander", group: "region", region: "guanzhong", office: "commander" })).toBe("關中總兵");
});
```
`regions.test.ts`: `UC-CONTENT-002 region IDs never equal a 部 or central post ID` — no region `id` is in `MINISTRY_DEPARTMENT_IDS` or `CENTRAL_POST_IDS`.
`index.test.ts`: `UC-WEB-008 official stat labels, post and appointment text` — exact values of Step 3. The existing `STAT_IDS` label loop covers the new stats.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/content`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `statLabels`: `administration: '文治', military: '武功', ambition: '野心', loyalty: '忠誠'`.
- `centralPosts`: `chancellor: '丞相'`, `'grand-general': '大將軍'`, `'grand-tutor': '太傅'`. `ministryRanks`: `minister: '尚書'`, `'vice-minister': '侍郎'`. `regionOffices`: `governor: '知州'`, `commander: '總兵'`.
- `uiText` additions: `appointHeading: '官員任命'`, `postGroupCentral: '中樞'`, `postGroupMinistry: '六部'`, `postGroupRegion: '地方'`, `postColumn: '官位'`, `holderColumn: '在任'`, `nameColumn: '姓名'`, `vacant: '空缺'`, `idleHeading: '賦閑官員'`, `noIdleOfficials: '並無賦閑官員'`, `appointButton: '任命'`, `backToPosts: '返回官位列表'`, `backToCourt: '返回宣政殿'`.
- `officialNames.ts`: `export const officialNames: NamePool` with about 100 distinct common Chinese surnames (Traditional characters; one or two characters, as the issue does not restrict compound surnames) and about 200 distinct male given names of one or two Traditional Han characters, in a plain classical register; `reserved: []` with a comment that the 名臣 issue fills it from the 名臣 list. `gameText.officialNames = officialNames`.
- `formatPostName` in `format.ts`: central → `centralPosts[office].name`; ministry → `departments[department].name + ministryRanks[rank].name`; region → the region entry's `name` (fall back to the ID) `+ regionOffices[office].name`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/content`
Expected: PASS.

- [ ] **Step 5: Mark and commit**

Set UC-CONTENT-002 to `implemented` in `packages/content/USE_CASES.md`.

```bash
git add packages/content
git commit -m "feat(content): official name pool, post names and appointment text"
```

---

### Task 3: web — 早朝 timing on the map, 官員任命 option and screen

Read: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md` (UC-WEB-003, 004, 007, 008, screen flow).

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/render.ts`, `packages/web/src/main.ts`, `packages/web/src/style.css`, `packages/web/screenshots.json`
- Test: `packages/web/src/screen.test.ts`, `packages/web/src/render.test.ts`

**Interfaces:**
- Consumes: Task 1 (`canEnterPalace`, `isMorningCourt`, `listPosts`, `appointOfficial`, `COURT_PALACE_ID`, `OFFICIAL_STAT_IDS`, `PostId`, `OfficialStatId`, `Official`, `NamePool`) and Task 2 (`formatPostName`, `gameText.officialNames`, the new `uiText` keys).
- Produces in `screen.ts`:
  - `Screen` gains `{ screen: 'appoint'; state: GameState; post?: PostId; sort?: OfficialStatId }`.
  - `chooseEraName(screen, input, regions: readonly RegionData[], names: NamePool): Screen`.
  - `COURT_PALACE = COURT_PALACE_ID`; `OPEN_COURT_OPTIONS: readonly CourtOptionId[] = ['appoint-officials']`.
  - `chooseCourtOption(screen, optionId: CourtOptionId): Screen` — `play` with `isMorningCourt(state)` and an open option → `{ screen: 'appoint', state }` (same `state` object); else unchanged.
  - `selectPost(screen, postId: PostId): Screen` — `appoint` and `postId` in `listPosts(state)` → same screen with `post` set (keeps `sort`); else unchanged.
  - `sortIdle(screen, stat: OfficialStatId): Screen` — `appoint` and `stat` in `OFFICIAL_STAT_IDS` → `sort` set; else unchanged.
  - `appoint(screen, officialId: string): Screen` — `appoint` with `post` set: calls `appointOfficial`; on success `{ screen: 'appoint', state: newState, sort }` (post cleared); rejected or no post → unchanged.
  - `cancelPost(screen): Screen` — `appoint` → same without `post`; else unchanged.
  - `backToCourt(screen): Screen` — `appoint` → `{ screen: 'play', state, department: 'personnel' }`; else unchanged.
  - `idleOfficials(state: GameState, sort?: OfficialStatId): Official[]` — `post === null` officials, in `officials` order, or stably sorted by `sort` descending.

- [ ] **Step 1: Write the failing tests**

`screen.test.ts`: `newState()` and every `chooseEraName` call pass `gameText.officialNames`. Replace "UC-WEB-007 leaving 宣政殿 closes the list" with:
```ts
it('UC-WEB-007 退 closes the list, moves the clock to 午, and 宣政殿 cannot be re-entered', () => {
  const back = goToMap(toggleDepartment(inCourt(), 'personnel'));
  if (back.screen !== 'play') throw new Error('unexpected');
  expect([back.state.location, back.state.actionPoint, back.department]).toEqual(['map', 1, undefined]);
  const again = goToPalace(back, 'xuanzheng');
  if (again.screen !== 'play') throw new Error('unexpected');
  expect(again.state).toBe(back.state);
});
```
Add `describe('官員任命')` with `appointScreen = chooseCourtOption(toggleDepartment(inCourt(), 'personnel'), 'appoint-officials')`:
- `UC-WEB-007 only 官員任命 opens, only during 早朝`: result is `{ screen: 'appoint', state: <same object as court.state> }`; `chooseCourtOption(court, 'recommend-officials')` and `chooseCourtOption(play(newState()), 'appoint-officials')` are `toBe` their input.
- `UC-WEB-008 selecting a post, sorting and appointing`: `selectPost(s, 'chancellor')` has `post: 'chancellor'`; `selectPost(s, 'nope')`, `selectPost(s, 'b-governor'-style foreign id)` → `toBe(s)` (use `'nope'` and `'zz-governor'`); `sortIdle(s, 'loyalty').sort === 'loyalty'`, `sortIdle(s, 'health' as OfficialStatId)` `toBe(s)`; `appoint(s, idleId)` without a post `toBe(s)`; with `post: 'chancellor'` and `sort: 'loyalty'` → `screen 'appoint'`, `post` undefined, `sort 'loyalty'`, the idle official now holds `chancellor`, `state.actionPoint` 0; `appoint` with a held official's ID → `toBe` input.
- `UC-WEB-008 back to posts and back to 宣政殿`: `cancelPost` drops `post`; `backToCourt(s)` equals `{ screen: 'play', state: s.state, department: 'personnel' }`; then `goToMap` gives `actionPoint` 1. Both `toBe` input from a `play` screen.
- `UC-WEB-008 idleOfficials order`: no sort → same order as `state.officials.filter(o => o.post === null)`; with `'administration'` → non-increasing `stats.administration`, and equal values keep `officials` order.

`render.test.ts`: `state` built with `gameText.officialNames`.
- `UC-WEB-004 宣政殿 is a disabled map button outside 朝`: at `actionPoint: 1`, map html contains `id="palace-xuanzheng"` button with ` disabled` and no other `data-palace` button is disabled; at `actionPoint: 0` none is disabled (the existing exact button markup stays unchanged when enabled; add ` disabled` right before `>` of the opening tag when refused).
- Update `UC-WEB-007 an open department …` and the `it.each` test: for `personnel`, `appoint-officials` renders as `<button type="button" id="court-option-appoint-officials" data-court-option="appoint-officials">官員任命</button>` (no `disabled`, no tag); every other option keeps the disabled markup with the tag.
- `UC-WEB-008 the post list`: `renderScreen({ screen: 'appoint', state: court }, …)` contains `id="game-header"`, `id="appoint-screen"`, `<h2>官員任命</h2>`, sections `post-group-central`, `post-group-ministry`, `post-group-region` in that order with headings 中樞, 六部, 地方; one `data-post="<id>"` button per `listPosts` entry (33), in order, each with `formatPostName(post)` text, and the holder's escaped name and four stats in the row; no `idle-list`.
- `UC-WEB-008 a vacant post shows 空缺`: a state where the chancellor's holder has `post: null` → the chancellor row shows `空缺` and no `undefined` anywhere in the html.
- `UC-WEB-008 a selected post lists the idle officials`: with `post: 'chancellor'`, `sort: 'military'`: `id="selected-post"` contains `丞相` and the holder's name; `id="idle-list"` has 30 `data-official` buttons in `idleOfficials(state, 'military')` order, each with text `任命`; `#sort-military` has `aria-pressed="true"` and the other three `aria-pressed="false"`; `back-to-posts` and `back-to-court` present; no `post-group-central`.
- `UC-WEB-008 no idle officials`: all idle removed from `officials` → `id="no-idle"` with `並無賦閑官員`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/web`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `screen.ts`: the Interfaces above. `goToPalace` stays as is (core refuses).
- `render.ts`:
  - Map buttons: append ` disabled` when `!canEnterPalace(state, id)`.
  - Court options: enabled markup for `OPEN_COURT_OPTIONS`, existing disabled markup otherwise.
  - `renderAppointScreen(screen, text, game)` wired into `renderScreen`: `renderHeader(...)` then `<main id="appoint-screen"><h2>官員任命</h2>…</main>`.
    - Without `post`: `<div id="post-groups">` with three `<section id="post-group-<central|ministry|region>"><h3>…</h3><div class="table-scroll"><table class="post-table">`; header row 官位, 在任, 文治, 武功, 野心, 忠誠; one `<tr data-post-row="<id>">` per post with `<th scope="row"><button type="button" id="post-<id>" data-post="<id>">名稱</button></th>`, holder name cell (or `空缺` with class `vacant`), four stat cells (empty when vacant).
    - With `post`: `<h3 id="selected-post">` with the post name and `在任：` holder name or `空缺`; `<div class="table-scroll"><table id="idle-list">` header: 姓名, then one `<th><button type="button" id="sort-<stat>" data-sort="<stat>" aria-pressed="…">label</button></th>` per official stat, then an empty header; one row per `idleOfficials(state, sort)` official: name, four stats, `<button type="button" id="appoint-<officialId>" data-official="<officialId>">任命</button>`. Empty → `<p id="no-idle">並無賦閑官員</p>` instead of the table. Then `<button type="button" id="back-to-posts">返回官位列表</button>`.
    - Always last: `<button type="button" id="back-to-court">返回宣政殿</button>`.
    - Escape official names with `escapeHtml`.
- `main.ts`: `chooseEraName(..., gameText.regions, gameText.officialNames)`; click handlers for `[data-court-option]` → `chooseCourtOption`, `[data-post]` → `selectPost`, `[data-sort]` → `sortIdle`, `[data-official]` → `appoint`, `#back-to-posts` → `cancelPost`, `#back-to-court` → `backToCourt`.
- `style.css`:
  - `#appoint-screen` joins the text-screen block but with `max-width: 48rem`; `.table-scroll { overflow-x: auto; }`; `.post-table, #idle-list` styled like `#atlas-table` (`width: 100%`, collapsed borders, `1px solid #c9a227` row borders, `0.4rem 0.6rem` padding, numbers right-aligned, first column left-aligned).
  - Post, sort and appoint buttons: `min-height: 44px`, `padding: 0.3em 0.8em`, same red/gold style as `#action-list button`; `[data-sort][aria-pressed="true"]` uses `color: #24140a; background: #c9a227`; `.vacant { color: #8b6b4a; }`.
  - `#back-to-posts`, `#back-to-court` join the shared red/gold button rule.
  - `#map-stage button[data-palace]:disabled { opacity: 0.5; cursor: not-allowed; }` and no hover change when disabled.
  - Enabled court option: `#court-options button:not(:disabled) { color: #f0d78c; background: #7a1c1c; border: 1px solid #c9a227; cursor: pointer; }` with hover `#922424`.
- `screenshots.json`:
  - Add `palace-map-noon` ("宮城地圖（午）：早朝已過，宣政殿按鈕停用"): click `#start`, `#era-suggestion-0`, `#palace-xuanzheng`, `#leave-court`; waitFor `#palace-xuanzheng[disabled]`.
  - Change `palace-xuanzheng-personnel`'s description to "宣政殿畫面：展開吏部，官員任命可點選，舉薦人選與開科取士尚未開放" (steps unchanged).
  - Add `appoint-posts` ("官員任命：中樞、六部、地方官位與在任官員"): … `#palace-xuanzheng`, `#department-personnel`, `#court-option-appoint-officials`; waitFor `#post-groups`.
  - Add `appoint-idle` ("官員任命：選定丞相後列出賦閑官員，可依屬性排序"): same, then click `#post-chancellor`; waitFor `#idle-list`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/web`
Expected: PASS.

- [ ] **Step 5: Mark and commit**

Set UC-WEB-008 to `implemented` in `packages/web/USE_CASES.md`.

```bash
git add packages/web
git commit -m "feat(web): morning-only 宣政殿 and the 官員任命 screen"
```

---

### Task 4: whole repo — verify

- [ ] **Step 1: Run** `npm run verify`
Expected: typecheck, all tests, build and `check:ids` pass. Fix anything that fails in the module it belongs to, as a follow-up commit for that module.
