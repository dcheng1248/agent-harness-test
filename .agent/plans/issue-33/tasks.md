# 宣政殿 Department Buttons Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 宣政殿 to the palace map, with a row of on-image department buttons whose placeholder options open as a disabled list.

**Architecture:** `core` adds the palace and a data-only department registry. `content` adds the text keyed by those IDs. `web` adds the anchor, background, a court view without the panel, and an optional `department` on the `play` screen toggled by a pure transition.

**Tech Stack:** TypeScript, Vitest, Vite, npm workspaces.

**Spec:** Issue #33; `packages/web/USE_CASES.md` (UC-WEB-004, UC-WEB-007, screen flow); `packages/content/USE_CASES.md` (Text rules); `packages/core/ARCHITECTURE.md` (Registries); `packages/content/ARCHITECTURE.md` (Exports); `packages/web/ARCHITECTURE.md` (Screen state). The docs are already updated on this branch.

## Global Constraints
- Player-facing text is Traditional Chinese and lives only in `content`.
- `core` has no rules for departments: data only. No `GameState` shape change; `SCHEMA_VERSION` stays 3.
- Opening, switching or closing a department never calls `core` and keeps the same `state` object.
- Element IDs are stable: `palace-xuanzheng`, `court-row`, `department-row`, `department-<id>` with `data-department`, `court-options`, `court-option-<id>` with `data-court-option`, `leave-court`.
- One commit per module task. UC-WEB-007 is `planned` until Task 3 marks it `implemented`.

## Review Focus
1. A stale `data-department` value (or any non-department string) reaching `toggleDepartment`: the screen must stay unchanged. Test in Task 3.
2. Calling `toggleDepartment` on the map, in another palace, or on a non-`play` screen: unchanged. Test in Task 3.
3. Re-entering 宣政殿 after 退 must show the list closed. Test in Task 3 (`goToMap` drops `department`).
4. The 宣政殿 map button overlapping 養心殿's: pairwise anchor distance test in Task 3.
5. A palace other than 宣政殿 rendered with an optional `description` missing would print `undefined`: content test in Task 2 asserts every other palace has one.

---

### Task 1: core — 宣政殿 palace and the department registry

Read: `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md`.

**Files:**
- Create: `packages/core/src/model/court.ts`
- Modify: `packages/core/src/model/catalog.ts`, `packages/core/src/index.ts`
- Test: `packages/core/src/rules/turn.test.ts`, create `packages/core/src/model/court.test.ts`

**Interfaces:**
- Produces:
  - `PALACE_IDS = ['chongwen', 'yuhuayuan', 'yanwu', 'yangxin', 'xuanzheng']`; `CATALOG.palaces.xuanzheng = { actions: [] }`.
  - `DEPARTMENT_IDS = ['cabinet', 'personnel', 'revenue', 'rites', 'war', 'justice', 'works'] as const`, `type DepartmentId`.
  - `COURT_OPTION_IDS = ['name-heir', 'change-era', 'recommend-officials', 'appoint-officials', 'hold-exams', 'take-census', 'adjust-taxes', 'relieve-disaster', 'hold-sacrifice', 'conduct-diplomacy', 'conscript-soldiers', 'drill-troops', 'grant-amnesty', 'try-major-case', 'build', 'forge-weapons'] as const`, `type CourtOptionId`.
  - `DEPARTMENTS: Record<DepartmentId, { options: readonly CourtOptionId[] }>`, all exported from `src/index.ts`.

- [ ] **Step 1: Write the failing tests**

In `turn.test.ts`, change the existing `palaces` test: `PALACE_IDS` equals `["chongwen", "yuhuayuan", "yanwu", "yangxin", "xuanzheng"]`, and add `expect(CATALOG.palaces.xuanzheng.actions).toEqual([])`. Add:

```ts
it("UC-CORE-012 宣政殿 can be entered and left at any action point without using one", () => {
  for (const actionPoint of [0, 1, 2, 3]) {
    const inside = enterPalace(makeState({ actionPoint }), "xuanzheng");
    expect(inside.location).toBe("xuanzheng");
    expect(inside.actionPoint).toBe(actionPoint);
    expect(takeAction(inside, "study")).toMatchObject({ ok: false, reason: "not-offered" });
    expect(returnToMap(inside).actionPoint).toBe(actionPoint);
  }
});
```

In `court.test.ts` (comment: `// Departments are data for UC-WEB-007.`):

```ts
it("lists the departments and their options in order", () => {
  expect(DEPARTMENT_IDS).toEqual(["cabinet", "personnel", "revenue", "rites", "war", "justice", "works"]);
  expect(Object.keys(DEPARTMENTS)).toEqual([...DEPARTMENT_IDS]);
  expect(DEPARTMENTS.cabinet.options).toEqual(["name-heir", "change-era"]);
  expect(DEPARTMENTS.personnel.options).toEqual(["recommend-officials", "appoint-officials", "hold-exams"]);
  expect(DEPARTMENTS.revenue.options).toEqual(["take-census", "adjust-taxes", "relieve-disaster"]);
  expect(DEPARTMENTS.rites.options).toEqual(["hold-sacrifice", "conduct-diplomacy"]);
  expect(DEPARTMENTS.war.options).toEqual(["conscript-soldiers", "drill-troops"]);
  expect(DEPARTMENTS.justice.options).toEqual(["grant-amnesty", "try-major-case"]);
  expect(DEPARTMENTS.works.options).toEqual(["build", "forge-weapons"]);
});
it("lists each court option under exactly one department", () => {
  const all = DEPARTMENT_IDS.flatMap((d) => DEPARTMENTS[d].options);
  expect([...all].sort()).toEqual([...COURT_OPTION_IDS].sort());
  expect(new Set(all).size).toBe(all.length);
});
```

- [ ] **Step 2: Run** `npx vitest run packages/core`. Expected: FAIL (`court` module missing, `PALACE_IDS` mismatch).

- [ ] **Step 3: Implement** `court.ts` with the Interfaces values (IDs in the order shown), add `xuanzheng` to `PALACE_IDS` and `CATALOG.palaces`, and export the new names and types from `src/index.ts`.

- [ ] **Step 4: Run** `npx vitest run packages/core`. Expected: PASS. (`content` and `web` will not type-check until Tasks 2 and 3.)

- [ ] **Step 5: Commit** `feat(core): add 宣政殿 and the court department registry`.

### Task 2: content — 宣政殿, department and option text

Read: `packages/content/ARCHITECTURE.md`, `packages/content/USE_CASES.md`.

**Files:**
- Modify: `packages/content/src/schema.ts`, `packages/content/src/index.ts`
- Test: `packages/content/src/index.test.ts`

**Interfaces:**
- Consumes: `DepartmentId`, `CourtOptionId`, `DEPARTMENT_IDS`, `COURT_OPTION_IDS`, `PALACE_IDS` from Task 1.
- Produces:
  - `GameText.palaces: Record<PalaceId, { name: string; description?: string; imageAlt: string }>`
  - `GameText.departments: Record<DepartmentId, { label: string; name: string }>`
  - `GameText.courtOptions: Record<CourtOptionId, { name: string }>`
  - `UiText.leaveCourt`, `UiText.leaveCourtLabel`, `UiText.notYetOpen: string`

- [ ] **Step 1: Write the failing tests** in `index.test.ts`.

Add a test named `'UC-WEB-007 宣政殿, department and option text'`:

```ts
expect(gameText.palaces.xuanzheng).toEqual({ name: '宣政殿', imageAlt: '宣政殿內蟠龍金柱林立，百官分列兩側，朝向御座' });
expect(gameText.departments).toEqual({
  cabinet: { label: '內閣', name: '內閣' },
  personnel: { label: '吏', name: '吏部' },
  revenue: { label: '戶', name: '戶部' },
  rites: { label: '禮', name: '禮部' },
  war: { label: '兵', name: '兵部' },
  justice: { label: '刑', name: '刑部' },
  works: { label: '工', name: '工部' },
});
expect(gameText.courtOptions).toEqual({
  'name-heir': { name: '冊立太子' }, 'change-era': { name: '改元' },
  'recommend-officials': { name: '舉薦人選' }, 'appoint-officials': { name: '官員任命' }, 'hold-exams': { name: '開科取士' },
  'take-census': { name: '戶口普查' }, 'adjust-taxes': { name: '調整賦稅' }, 'relieve-disaster': { name: '賑濟災民' },
  'hold-sacrifice': { name: '祭祀' }, 'conduct-diplomacy': { name: '外交' },
  'conscript-soldiers': { name: '徵召士兵' }, 'drill-troops': { name: '操練軍隊' },
  'grant-amnesty': { name: '大赦天下' }, 'try-major-case': { name: '審理要案' },
  build: { name: '建造' }, 'forge-weapons': { name: '打造兵器' },
});
expect(Object.keys(gameText.departments)).toEqual([...DEPARTMENT_IDS]);
expect(Object.keys(gameText.courtOptions).sort()).toEqual([...COURT_OPTION_IDS].sort());
expect(uiText.leaveCourt).toBe('退');
expect(uiText.leaveCourtLabel).toBe('退出宣政殿');
expect(uiText.notYetOpen).toBe('尚未開放');
```

Change `'labels every stat, palace and action in Chinese'`: the description line becomes
`if (id === 'xuanzheng') expect(gameText.palaces[id].description).toBeUndefined(); else expect(gameText.palaces[id].description).toMatch(han);`
and add loops: every `DEPARTMENT_IDS` entry's `label` and `name` match `han`; every `COURT_OPTION_IDS` entry's `name` matches `han`.

- [ ] **Step 2: Run** `npx vitest run packages/content`. Expected: FAIL.

- [ ] **Step 3: Implement** the schema fields from Interfaces in `schema.ts`, and the values from the test in `index.ts` (`palaces.xuanzheng` has no `description` key; `departments` in `DEPARTMENT_IDS` order; `courtOptions` in `COURT_OPTION_IDS` order).

- [ ] **Step 4: Run** `npx vitest run packages/content`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(content): add 宣政殿, department and court option text`.

### Task 3: web — map button, court view, department toggle, screenshots

Read: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md` (UC-WEB-004, UC-WEB-007, screen flow).

**Files:**
- Modify: `packages/web/src/palaceMap.ts`, `packages/web/src/palaceBackgrounds.ts`, `packages/web/src/screen.ts`, `packages/web/src/render.ts`, `packages/web/src/main.ts`, `packages/web/src/style.css`, `packages/web/screenshots.json`, `packages/web/USE_CASES.md` (UC-WEB-007 → `implemented`)
- Test: `packages/web/src/palaceMap.test.ts`, `packages/web/src/screen.test.ts`, `packages/web/src/render.test.ts`

**Interfaces:**
- Consumes: Task 1 and Task 2 Produces.
- Produces:
  - `PALACE_ANCHORS.xuanzheng = { x: 50, y: 50 }`; `PALACE_BACKGROUNDS.xuanzheng` imported from `./assets/background-xuanzheng.jpg`.
  - `Screen` `play`: `{ screen: 'play'; state: GameState; department?: DepartmentId }`.
  - `export const COURT_PALACE: PalaceId = 'xuanzheng'` and `export function toggleDepartment(screen: Screen, departmentId: DepartmentId): Screen` in `screen.ts`.

- [ ] **Step 1: Write the failing tests.**

`palaceMap.test.ts`, new test `'UC-WEB-004 palace buttons do not overlap'`: for every pair of distinct palaces, `Math.abs(a.x - b.x) >= 10 || Math.abs(a.y - b.y) >= 10`. Also `expect(PALACE_ANCHORS.xuanzheng).toEqual({ x: 50, y: 50 })`.

`screen.test.ts`:
- `'UC-WEB-007 toggling departments in 宣政殿 opens, switches and closes without changing the state'`: from `goToPalace(play, 'xuanzheng')` = `court`, `toggleDepartment(court, 'personnel')` has `department: 'personnel'` and `.state` is `court.state` (`toBe`); then `'war'` switches to `'war'`; then `'war'` again gives a `play` screen with `department` undefined and the same `state` object; `state.actionPoint` never changes.
- `'UC-WEB-007 leaving 宣政殿 closes the list'`: open `'personnel'`, then `goToMap`, then `goToPalace(…, 'xuanzheng')`: `department` is undefined.
- `'UC-WEB-007 toggleDepartment elsewhere or with an unknown ID is unchanged'`: on the map, in `'chongwen'`, on `{ screen: 'title' }`, and in 宣政殿 with `'nope' as DepartmentId`, the result is `toBe` the input.

`render.test.ts`: add `xuanzheng: '/img/bg-xuanzheng.jpg'` to `images.backgrounds`. In `'UC-WEB-004 each palace shows its background…'` loop over `PALACE_IDS.filter((id) => id !== COURT_PALACE)`. Add:
- `'UC-WEB-007 宣政殿 has the image, banner and court row but no panel'`: with `enterPalace(state, 'xuanzheng')` and no department, html starts with `<main id="palace-view" class="court-view">`, contains `<h2 class="visually-hidden">${gameText.palaces.xuanzheng.name}</h2>`, the `palace-image` with `/img/bg-xuanzheng.jpg` and its `imageAlt`, the header before the image, and does not contain `palace-panel`, `palace-description`, `back-to-map` or `court-options`. For each `DEPARTMENT_IDS` id, in order, it contains `<button type="button" id="department-${id}" data-department="${id}" aria-label="${gameText.departments[id].name}" aria-expanded="false">${gameText.departments[id].label}</button>`; then, after the last one, `<button type="button" id="leave-court" aria-label="${uiText.leaveCourtLabel}">${uiText.leaveCourt}</button>`.
- `'UC-WEB-007 an open department is highlighted and lists its disabled options'`: with `department: 'personnel'`, `department-personnel` has `aria-expanded="true"`, the others `"false"`; it contains `<div id="court-options" role="group" aria-label="吏部">`, and for each of `DEPARTMENTS.personnel.options`, in order, `<button type="button" id="court-option-${id}" data-court-option="${id}" disabled>${gameText.courtOptions[id].name}<span class="court-option-tag">${uiText.notYetOpen}</span></button>`; no other department's options appear; `court-options` comes after `department-works` and before `leave-court`.

- [ ] **Step 2: Run** `npx vitest run packages/web`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - `palaceMap.ts`, `palaceBackgrounds.ts`: add `xuanzheng` per Interfaces.
  - `screen.ts`: `department?: DepartmentId` on `play`; `COURT_PALACE`; `toggleDepartment` returns the screen unchanged unless it is `play`, `state.location === COURT_PALACE`, and `DEPARTMENT_IDS` includes the ID; same ID as open → `{ screen: 'play', state }`; otherwise `{ screen: 'play', state, department: departmentId }`. `goToMap` already builds a new `play` screen without `department`; keep it that way.
  - `render.ts`: when `state.location === COURT_PALACE`, return `<main id="palace-view" class="court-view"><h2 class="visually-hidden">NAME</h2><div id="palace-stage" class="image-stage">HEADER<img id="palace-image" …><div id="court-row"><div id="department-row">DEPARTMENT BUTTONS + COURT-OPTIONS (only when open)</div><button id="leave-court" …></div></div></main>`, with the exact markup from the tests. Other palaces render as before; use `palace.description ?? ''` for the now-optional field.
  - `main.ts`: `hit('[data-department]')` → `toggleDepartment(current, dataset.department as DepartmentId)`; `hit('#leave-court')` → `goToMap(current)`. No handler for `data-court-option`.
  - `style.css` (no media query; phone layout is out of scope):
    - `#court-row`: `position: absolute; right: 3%; bottom: 5%; z-index: 2; display: flex; align-items: flex-end; gap: 1.2em; font-size: clamp(0.875rem, 1.6vw, 1.375rem);`
    - `#department-row`: `position: relative; display: flex; gap: 0.4em;`
    - `#department-row > button[data-department]`, `#leave-court`: `margin: 0; min-width: 44px; min-height: 44px; padding: 0.3em 0.8em; font-size: 1em; white-space: nowrap; border: 2px solid #c9a227; border-radius: 0.5em; box-shadow: 0 0.2em 0.8em rgba(0, 0, 0, 0.45); cursor: pointer;`
    - Departments: `color: #f0d78c; background: #7a1c1c;`, hover `#922424`; `[aria-expanded="true"]`: `color: #24140a; background: #c9a227;`.
    - `#leave-court`: `color: #f0d78c; background: rgba(24, 14, 8, 0.78);`, hover `rgba(201, 162, 39, 0.2)` over the same dark.
    - `#court-options`: `position: absolute; right: 0; bottom: calc(100% + 0.5em); display: flex; flex-direction: column; align-items: stretch; gap: 0.4em; min-width: 9em; padding: 0.5em; background: rgba(24, 14, 8, 0.85); border: 2px solid #c9a227; border-radius: 0.5em;`
    - `#court-options button`: `display: flex; justify-content: space-between; align-items: center; gap: 0.6em; min-height: 44px; padding: 0.3em 0.8em; font-size: 1em; white-space: nowrap; color: rgba(245, 234, 208, 0.6); background: transparent; border: 1px solid rgba(201, 162, 39, 0.5); border-radius: 0.4em; cursor: not-allowed;`
    - `.court-option-tag`: `font-size: 0.7em; padding: 0.1em 0.5em; color: #f0d78c; background: rgba(201, 162, 39, 0.25); border-radius: 1em;`
  - `screenshots.json`: change the `palace-map` description to mention the 宣政殿 button (「宮城地圖：頂端半透明橫幅、宮城圖上的五座宮殿按鈕（含宣政殿），圖下無輿圖按鈕」). Append:
    - `palace-xuanzheng`, 「宣政殿畫面：背景圖與頂端橫幅，無面板，右下角一列內閣、六部與退」: click `#start`, `#era-suggestion-0`, `#palace-xuanzheng`; waitFor `#court-row`.
    - `palace-xuanzheng-personnel`, 「宣政殿畫面：展開吏部，選項列於吏字上方，皆尚未開放」: same, then click `#department-personnel`; waitFor `#court-options`.
  - Mark UC-WEB-007 `implemented` in `packages/web/USE_CASES.md`.

- [ ] **Step 4: Run** `npx vitest run packages/web`. Expected: PASS. Then `npm run dev` and check by eye at 1280px: the 宣政殿 map button sits on the hall above the white stairs and clears 養心殿; the row sits over the lower right of the picture; the 吏部 list is centred directly above 吏 and stays inside the image (check 工 too: right-aligned).

- [ ] **Step 5: Commit** `feat(web): add 宣政殿 view with department row and placeholder options`.

### Task 4: whole repo

- [ ] **Step 1:** Run `npm run verify`. Expected: exit code 0, including the use case ID check (UC-WEB-007 `implemented` and referenced by tests).
- [ ] **Step 2:** Fix anything it reports in the owning module's commit style, then rerun until it passes.
