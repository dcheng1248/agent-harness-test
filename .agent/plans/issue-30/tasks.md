# Palace Backgrounds, Header Banner, 輿圖 in 崇文館, 養心殿 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename 寢宮 (`qingong`) to 養心殿 (`yangxin`), give each palace view its own background image with a text panel over it, turn the game header into a banner over the top of the map and palace images, and move 輿圖 from the map into 崇文館.

**Architecture:** `core` renames one palace ID. `content` renames its text, adds `imageAlt` to each palace's text, adds `uiText.closeAtlas`, and changes `uiText.backToMap`. `web` adds `PALACE_BACKGROUNDS` (`src/palaceBackgrounds.ts`), passes it through `ScreenImages`, renders the header inside the image stage on the map and palace views, restricts `openAtlas` to 崇文館, and lays out the palace panel in CSS with a narrow-screen breakpoint.

**Tech Stack:** TypeScript, Vite, Vitest, plain CSS.

**Spec:** Issue #30, `packages/web/USE_CASES.md` (UC-WEB-004, UC-WEB-006, screen flow), `packages/web/ARCHITECTURE.md` (Assets), `packages/content/ARCHITECTURE.md` (Exports). Those doc edits are already on the branch; do not change them. This plan holds the exact values.

## Global Constraints
- Player-facing text is Traditional Chinese and comes from `content`. Never name an existing game anywhere.
- `core` has no DOM and no `Math.random`. Render functions are pure. Only `main.ts` touches the DOM.
- Test names or comments reference use case IDs (`UC-CORE-012`, `UC-WEB-004`, `UC-WEB-006`).
- Use the four images in `packages/web/src/assets/` (`background-chongwen.jpg`, `background-yuhuayuan.jpg`, `background-yanwu.jpg`, `background-yangxin.jpg`) and their `CREDITS.md` rows as they are. Native size is 1344×768.
- `GameState.schemaVersion` does not change (only an allowed value of `location` changes; there are no saves).
- No balance number changes. 養心殿 keeps exactly `['rest']` (靜養).
- After Task 1, `npm run typecheck` fails in `content` and `web` until Tasks 2 and 3 land, because `PalaceId` changes. Each task runs its own Vitest files. Task 5 runs `npm run verify`.
- When done, `grep -rn "qingong\|寢宮" packages docs` returns nothing. Do not edit `.agent/plans/issue-23/` or any other old plan.

## Review Focus
- 輿圖 opened from anywhere but 崇文館 (map, 御花園, 演武場, 養心殿, result, summary, title). Expected: `openAtlas` returns the same screen object. Tested in Task 3.
- Closing 輿圖. Expected: back in 崇文館 (not the map) with the identical `state` object and the same action point. Tested in Task 3.
- A new `PalaceId` added later without a background or alt text. Expected: the type check fails (`Record<PalaceId, …>`) and the background test fails. Tested in Tasks 2 and 4.
- A phone-width window (390px). Expected: the banner stays over the top of the image, the panel sits below the image on a solid dark background, and on the map the palace buttons stay clickable above the banner. Screenshots are taken at 1280px only, so the implementer checks this by resizing the dev server to 390px in Task 4, Step 7.
- Light areas of a background (御花園 sky, 演武場 sky) behind the banner or panel. Expected: text stays readable because both use a dark backdrop of at least 0.72 opacity. Checked in the `palace-empty` and `palace-yanwu` screenshots.

---

### Task 1: core — rename 寢宮 to 養心殿 (`qingong` → `yangxin`)

Read first: `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md`.

**Files:**
- Modify: `packages/core/src/model/catalog.ts`
- Test: `packages/core/src/rules/turn.test.ts`

**Interfaces:**
- Produces: `PALACE_IDS = ['chongwen', 'yuhuayuan', 'yanwu', 'yangxin'] as const`. `CATALOG.palaces.yangxin = { actions: ['rest'] }`. Nothing else changes.

- [ ] **Step 1: Update `turn.test.ts`.** Replace every `"qingong"` with `"yangxin"`. In the palace-order test, expect `["chongwen", "yuhuayuan", "yanwu", "yangxin"]` and add `expect(CATALOG.palaces.yangxin.actions).toEqual(["rest"]);`.
- [ ] **Step 2: Run `npx vitest run packages/core`.** Expected: FAIL (`yangxin` is not a `PalaceId`).
- [ ] **Step 3: Change `catalog.ts`** to the values in Interfaces (key order: chongwen, yuhuayuan, yanwu, yangxin).
- [ ] **Step 4: Run `npx vitest run packages/core` and `grep -rn qingong packages/core`.** Expected: PASS, and no matches.
- [ ] **Step 5: Commit** `feat(core): rename 寢宮 palace ID qingong to yangxin`.

---

### Task 2: content — 養心殿 text, background alt text, back-button strings

Read first: `packages/content/ARCHITECTURE.md`, `packages/content/USE_CASES.md`.

**Files:**
- Modify: `packages/content/src/schema.ts`, `packages/content/src/index.ts`
- Test: `packages/content/src/index.test.ts`

**Interfaces:**
- Consumes: Task 1's `PalaceId`.
- Produces:
  - `GameText.palaces: Record<PalaceId, { name: string; description: string; imageAlt: string }>`.
  - `UiText.closeAtlas: string` (new). `UiText.backToMap` keeps its key, new value.

Exact values:

| Key | Value |
|---|---|
| `gameText.palaces.chongwen.imageAlt` | `崇文館內燈籠高懸，書畫長卷與案几羅列` |
| `gameText.palaces.yuhuayuan.imageAlt` | `御花園中曲池映橋，石燈佇立，桃花盛開` |
| `gameText.palaces.yanwu.imageAlt` | `演武場上廊柱環立，武人持槍演練` |
| `gameText.palaces.yangxin` | `{ name: '養心殿', description: '天子起居理政之所，可閉目調息，養護龍體。', imageAlt: '養心殿內帷幔低垂，床榻靜置，燈火柔和' }` |
| `uiText.backToMap` | `返回宮城` (was `返回`) |
| `uiText.closeAtlas` | `返回崇文館` (new, placed right after `atlasHeading`) |

Names and descriptions of 崇文館, 御花園 and 演武場 do not change.

- [ ] **Step 1: Update `index.test.ts`.**
  - The `UC-WEB-004 palace text…` test: the `chongwen` and `yuhuayuan` `toEqual` objects gain their `imageAlt` from the table. Add `expect(gameText.palaces.yangxin).toEqual({ name: '養心殿', description: '天子起居理政之所，可閉目調息，養護龍體。', imageAlt: '養心殿內帷幔低垂，床榻靜置，燈火柔和' });`, `expect(uiText.backToMap).toBe('返回宮城');` and `expect(uiText.closeAtlas).toBe('返回崇文館');`. Rename it `UC-WEB-004 UC-WEB-006 palace text, background alt text, map alt and button lines`.
  - In `labels every stat, palace and action in Chinese`, add `expect(gameText.palaces[id].imageAlt).toMatch(han);` inside the palace loop.
- [ ] **Step 2: Run `npx vitest run packages/content`.** Expected: FAIL.
- [ ] **Step 3: Add `imageAlt: string` to `GameText.palaces` and `closeAtlas: string` to `UiText` in `schema.ts`. Set the values in `index.ts`; the `qingong` entry becomes `yangxin`.**
- [ ] **Step 4: Run `npx vitest run packages/content` and `grep -rn "qingong\|寢宮" packages/content`.** Expected: PASS, no matches.
- [ ] **Step 5: Commit** `feat(content): 養心殿 text, palace background alt text, 返回宮城 and 返回崇文館`.

---

### Task 3: web — rename to `yangxin`, move 輿圖 into 崇文館

Read first: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md`.

**Files:**
- Modify: `packages/web/src/palaceMap.ts`, `packages/web/src/screen.ts`, `packages/web/src/render.ts`, `packages/web/screenshots.json`
- Test: `packages/web/src/screen.test.ts`, `packages/web/src/render.test.ts`

**Interfaces:**
- Consumes: Task 1's `PalaceId`, Task 2's `uiText.closeAtlas` and `uiText.backToMap`.
- Produces:
  - `PALACE_ANCHORS.yangxin = { x: 50, y: 33 }` (the old `qingong` anchor, renamed).
  - `export const ATLAS_PALACE: PalaceId = 'chongwen';` in `screen.ts`.
  - `openAtlas(screen)`: returns `{ screen: 'atlas', state: screen.state }` only when `screen.screen === 'play' && screen.state.location === ATLAS_PALACE`; otherwise returns `screen` itself. `closeAtlas` is unchanged.
  - Map markup no longer contains `#open-atlas` or `#map-footer`.
  - Palace markup: after the action list (or `#no-actions`) comes `<div id="palace-nav">`, holding `<button type="button" id="open-atlas">${text.atlasButton}</button>` only when `state.location === ATLAS_PALACE`, then `<button type="button" id="back-to-map">${text.backToMap}</button>`.
  - Atlas close button: `<button type="button" id="close-atlas">${text.closeAtlas}</button>`.

- [ ] **Step 1: Update `screen.test.ts`.**
  - Replace every `'qingong'` with `'yangxin'`.
  - Replace the `UC-WEB-006 opening 輿圖 from the map…` test with `UC-WEB-006 opening 輿圖 from 崇文館 uses no action point and closing returns to 崇文館`: `const screen = goToPalace(afterOneAction(), 'chongwen')`; assert `screen.state.actionPoint === 1` and `location === 'chongwen'`; `atlas = openAtlas(screen)` `toEqual({ screen: 'atlas', state: screen.state })` and `atlas.state` `toBe(screen.state)`; `closeAtlas(atlas)` `toEqual(screen)` and its `state` `toBe(screen.state)`.
  - Replace the `cannot be opened from…` test with `UC-WEB-006 輿圖 cannot be opened from the map, another palace, a result, a summary or the title`: `openAtlas(x)` `toBe(x)` for `afterOneAction()` (map), `goToPalace(afterOneAction(), id)` for each of `'yuhuayuan'`, `'yanwu'`, `'yangxin'`, `performAction(inChongwen(), 'study')`, `fourthAction()`, and `{ screen: 'title' }`.
- [ ] **Step 2: Update `render.test.ts`.**
  - Map test (rename to `UC-WEB-004 map shows the image with one positioned button per palace, a hidden heading and no 輿圖`): replace the `open-atlas` index assertion with `expect(html).not.toContain('open-atlas'); expect(html).not.toContain('map-footer');`.
  - Delete `UC-WEB-004 the palace map has the 輿圖 entry`. Add `UC-WEB-006 only 崇文館 shows 輿圖, after the actions and before 返回宮城`: for 崇文館, `html` matches `/id="open-atlas"[^>]*>輿圖</`, `indexOf('id="palace-nav"') > indexOf('id="action-arts"')`, and `indexOf('id="open-atlas"') < indexOf('id="back-to-map"')`; for `yuhuayuan`, `yanwu` and `yangxin`, `not.toContain('open-atlas')`.
  - In the palace test, assert `` toContain(`id="back-to-map">${uiText.backToMap}<`) `` and `uiText.backToMap === '返回宮城'` instead of the bare `'返回'`.
  - Atlas test: `/id="close-atlas"[^>]*>返回崇文館</`.
- [ ] **Step 3: Run `npx vitest run packages/web`.** Expected: FAIL.
- [ ] **Step 4: Implement** the Interfaces above in `palaceMap.ts`, `screen.ts` and `render.ts` (render imports `ATLAS_PALACE` from `./screen`). `main.ts` needs no change: its `#open-atlas` and `#close-atlas` handlers stay.
- [ ] **Step 5: Update `screenshots.json`.** Replace every `#palace-qingong` with `#palace-yangxin` (routes `turn-summary` and `turn-summary-tax`). The `atlas` route becomes `#start`, `#era-suggestion-0`, `#palace-chongwen`, `#open-atlas`, waitFor `#atlas`.
- [ ] **Step 6: Run `npx vitest run packages/web` and `grep -rn qingong packages/web`.** Expected: PASS, no matches.
- [ ] **Step 7: Commit** `feat(web): rename to 養心殿 and move 輿圖 into 崇文館`.

---

### Task 4: web — palace backgrounds, header banner and panel layout

Read first: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md`.

**Files:**
- Create: `packages/web/src/palaceBackgrounds.ts`, `packages/web/src/palaceBackgrounds.test.ts`
- Modify: `packages/web/src/render.ts`, `packages/web/src/main.ts`, `packages/web/src/style.css`, `packages/web/screenshots.json`
- Test: `packages/web/src/render.test.ts`

**Interfaces:**
- Consumes: Task 2's `gameText.palaces[id].imageAlt`, Task 3's `ATLAS_PALACE` and palace markup.
- Produces:
  - `export const PALACE_BACKGROUNDS: Record<PalaceId, string>` in `palaceBackgrounds.ts`, built from four default imports of `./assets/background-<id>.jpg`.
  - `export type ScreenImages = { palace: string; scroll: string; map: string; backgrounds: Record<PalaceId, string> }`.
  - `renderPlayScreen(screen: Of<'play'>, text: UiText, game: GameText, images: ScreenImages): string` (4th parameter was `mapImage: string`). `renderScreen` passes `images`.
  - Map markup: `<main id="palace-map"><h2 class="visually-hidden">…</h2><div id="map-stage" class="image-stage">${header}<img id="map-image" …>${buttons}</div></main>`. Nothing is rendered before `<main>`.
  - Palace markup: `<main id="palace-view"><div id="palace-stage" class="image-stage">${header}<img id="palace-image" src="${images.backgrounds[id]}" alt="${palace.imageAlt}"></div><div id="palace-panel"><h2>${name}</h2><p id="palace-description">${description}</p>${actions or #no-actions}<div id="palace-nav">…</div></div></main>`.
  - Result, summary and atlas markup are unchanged: they still start with `<header id="game-header"`.

- [ ] **Step 1: Write `palaceBackgrounds.test.ts`:**
  ```ts
  it('UC-WEB-004 every palace has a background image', () => {
    expect(Object.keys(PALACE_BACKGROUNDS).sort()).toEqual([...PALACE_IDS].sort());
    for (const id of PALACE_IDS) expect(PALACE_BACKGROUNDS[id]).toMatch(new RegExp(`background-${id}\\.jpg`));
  });
  ```
  Vitest resolves image imports to their path string. If it does not, stop and report rather than mocking.
- [ ] **Step 2: Update `render.test.ts`.**
  - `images` gains `backgrounds: { chongwen: '/img/bg-chongwen.jpg', yuhuayuan: '/img/bg-yuhuayuan.jpg', yanwu: '/img/bg-yanwu.jpg', yangxin: '/img/bg-yangxin.jpg' }`. Every `renderPlayScreen(…, '/img/map.webp')` call passes `images`.
  - Map test adds: `html.startsWith('<main id="palace-map">')`; `indexOf('id="map-stage"') < indexOf('<header id="game-header"') < indexOf('id="map-image"')`.
  - New `UC-WEB-004 each palace shows its background with the header as a banner and a text panel`: for every `id` of `PALACE_IDS`, `html.startsWith('<main id="palace-view">')`; contains `` `<img id="palace-image" src="/img/bg-${id}.jpg" alt="${gameText.palaces[id].imageAlt}">` ``; `indexOf('id="palace-stage"') < indexOf('<header id="game-header"') < indexOf('id="palace-image"') < indexOf('id="palace-panel"')`; the panel contains the `<h2>` name, `id="palace-description"` with the description, and `id="back-to-map"`.
  - New `UC-WEB-004 screens without an image keep the header above the content`: result, summary and atlas `html.startsWith('<header id="game-header"')`.
- [ ] **Step 3: Run `npx vitest run packages/web`.** Expected: FAIL.
- [ ] **Step 4: Implement** `palaceBackgrounds.ts`, the `render.ts` changes, and `main.ts` passing `{ palace: titleImage, scroll: scrollImage, map: mapImage, backgrounds: PALACE_BACKGROUNDS }`.
- [ ] **Step 5: `style.css`.**
  - Remove `#palace-view` from the shared `max-width: 32rem` text-block rule. Remove the `#map-footer` rule. Remove `#open-atlas` from the filled red button rules.
  - `.image-stage { position: relative; margin: 0 auto; }`. `#map-stage` keeps `max-width: 1376px`. `#palace-view { position: relative; max-width: 1344px; margin: 0 auto; }`. `#palace-image { display: block; width: 100%; height: auto; }`.
  - Banner: `.image-stage > #game-header { position: absolute; top: 0; left: 0; right: 0; z-index: 1; max-width: none; margin: 0; padding: 0.5rem 1rem; justify-content: center; font-size: clamp(0.8125rem, 1.4vw, 1.125rem); color: #f0d78c; background: rgba(20, 12, 6, 0.72); border-bottom: 1px solid rgba(201, 162, 39, 0.6); }`.
  - `#map-stage button[data-palace]` gains `z-index: 2`, so map buttons stay clickable above the banner on narrow screens.
  - Panel, narrow default (below the breakpoint, the panel sits below the image): `#palace-panel { padding: 1rem; font-size: 1.125rem; line-height: 1.6; color: #f5ead0; background: #24140a; } #palace-panel h2 { margin: 0 0 0.25rem; color: #f0d78c; } #palace-description { margin: 0; }`.
  - Breakpoint `@media (min-width: 768px)`: `#palace-panel { position: absolute; left: 50%; bottom: 4%; transform: translateX(-50%); box-sizing: border-box; width: min(40rem, 92%); max-height: 62%; overflow-y: auto; padding: 1rem 1.5rem; background: rgba(24, 14, 8, 0.78); border: 2px solid #c9a227; border-radius: 0.5em; }`.
  - `#palace-nav { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.75rem; padding-top: 0.25rem; border-top: 1px solid rgba(201, 162, 39, 0.6); }`. `#open-atlas { margin-right: auto; min-width: 44px; min-height: 44px; margin-top: 0.5rem; padding: 0.4em 1em; font-size: 1.125rem; color: #f0d78c; background: transparent; border: 2px solid #c9a227; border-radius: 0.5em; cursor: pointer; }`, hover `background: rgba(201, 162, 39, 0.2)`.
- [ ] **Step 6: Update `screenshots.json`.**
  - `palace-map` description: `宮城地圖：頂端半透明橫幅、宮城圖上的宮殿按鈕，圖下無輿圖按鈕`.
  - `palace` description: `崇文館畫面：背景圖、頂端橫幅、半透明面板內的讀經史與習書畫琴棋，另有輿圖按鈕`.
  - `palace-empty` description: `御花園畫面：背景圖與面板，此處暫無可行之事`.
  - Add after `palace-empty`: `palace-yanwu` (`演武場畫面：背景圖與面板，騎射`; steps `#start`, `#era-suggestion-0`, `#palace-yanwu`, waitFor `#palace-view`) and `palace-yangxin` (`養心殿畫面：背景圖與面板，靜養`; steps `#start`, `#era-suggestion-0`, `#palace-yangxin`, waitFor `#palace-view`).
  - `atlas` description: `輿圖畫面（自崇文館開啟），返回崇文館`.
- [ ] **Step 7: Run `npx vitest run packages/web`, `npm run typecheck`, then `npm run dev` and check at 1280px and 390px wide**: banner over the image top on map and palace views; panel over the image at 1280px and below it at 390px; on the map at 390px the 御花園 and 崇文館 buttons sit above the banner and are clickable. Expected: PASS, and the layout as described.
- [ ] **Step 8: Commit** `feat(web): palace backgrounds, header banner over images, panel layout`.

---

### Task 5: whole repo — verify

- [ ] **Step 1: Run `npm run verify`.** Expected: typecheck, tests, build and `check:ids` all pass.
- [ ] **Step 2: Run `grep -rn "qingong\|寢宮" packages docs`.** Expected: no matches.
- [ ] **Step 3:** If anything needed fixing, commit it in the module it belongs to.
