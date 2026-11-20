# Illustrated Palace Map and 御花園 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 翰墨軒 with an action-less 御花園, move 習書畫琴棋 into 崇文館, and replace the map's button grid with the illustrated map, with palace buttons placed on it.

**Architecture:** `core` changes the palace registry only. `content` updates palace text and adds two `UiText` keys. `web` adds `PALACE_ANCHORS` (`src/palaceMap.ts`), renders the map image with absolutely positioned palace buttons, renders an empty-palace line, and takes the map image URL from `main.ts` like the title images.

**Tech Stack:** TypeScript, Vite, Vitest, plain CSS.

**Spec:** Issue #23, `packages/core/USE_CASES.md` (UC-CORE-012), `packages/web/USE_CASES.md` (UC-WEB-004), `packages/core/ARCHITECTURE.md` (registries), `packages/web/ARCHITECTURE.md` (Assets). This plan holds the exact values.

## Global Constraints
- Player-facing text is Traditional Chinese and comes from `content`. Never name an existing game anywhere.
- `core` has no DOM and no `Math.random`. Render functions are pure. Only `main.ts` touches the DOM.
- Test names or comments reference use case IDs (`UC-CORE-012`, `UC-WEB-004`).
- Use `packages/web/src/assets/map-forbidden-city.webp` and its `CREDITS.md` row as they are. Do not re-encode, rename or re-credit it. It is JPEG data with a `.webp` name. Vite and browsers handle it.
- No balance number changes. `BALANCE.actions.arts` stays 才藝 +3.
- After Task 1, `npm run typecheck` fails in `content` and `web` until Tasks 2 and 3 land, because `PalaceId` changes. Each task runs its own Vitest files. Task 4 runs `npm run verify`.
- `GameState.schemaVersion` does not change.

## Review Focus
- Entering 御花園 and trying any action (for example `study`). Expected: rejected as `'not-offered'`, with the state unchanged. Tested in Task 1.
- A palace with no actions rendered. Expected: no empty `#action-list` div, `#no-actions` shown, and `#back-to-map` still present. Tested in Task 3.
- A new `PalaceId` added later without an anchor. Expected: the type check fails (`Record<PalaceId, …>`) and the anchor test fails. Tested in Task 3.
- A narrow window (about 390px). Expected: the buttons keep `min-height: 44px` and stay centred on their anchors. 御花園 and 寢宮 are the closest pair (15% of the image height apart), so check that they do not overlap in the `palace-map` screenshot. Checked in Task 3, Step 7.
- A window wider than 1376px. Expected: the image stops at 1376px, centred, with no upscaling, and the font stops growing at its `clamp` maximum. Covered by the CSS in Task 3.

---

### Task 1: core — replace 翰墨軒 with 御花園 in the palace registry

Read first: `packages/core/ARCHITECTURE.md`, `packages/core/USE_CASES.md`.

**Files:**
- Modify: `packages/core/src/model/catalog.ts`
- Test: `packages/core/src/rules/turn.test.ts`

**Interfaces:**
- Produces: `PALACE_IDS = ['chongwen', 'yuhuayuan', 'yanwu', 'qingong'] as const`. `CATALOG.palaces = { chongwen: { actions: ['study', 'arts'] }, yuhuayuan: { actions: [] }, yanwu: { actions: ['riding'] }, qingong: { actions: ['rest'] } }`. `ACTION_IDS` and `CATALOG.actions` do not change.

- [ ] **Step 1: Update the tests in `turn.test.ts`**
  - In "moving", replace every `"hanmo"` with `"yuhuayuan"`.
  - In "rejects actions…", the `'not-offered'` case becomes `const notOffered = enterPalace(makeState(), "yuhuayuan"); expect(takeAction(notOffered, "study")).toEqual({ ok: false, reason: "not-offered", state: notOffered });`. The `'not-allowed-now'` case uses its own `const inChongwen = enterPalace(makeState(), "chongwen")` with the modified catalog and `"study"`.
  - In "aging and death", replace `"hanmo", "arts"` with `"chongwen", "arts"` in all four places.
  - Add:
    ```ts
    it("UC-CORE-012 palaces in map order; 崇文館 offers study then arts; 御花園 offers nothing", () => {
      expect(PALACE_IDS).toEqual(["chongwen", "yuhuayuan", "yanwu", "qingong"]);
      expect(CATALOG.palaces.chongwen.actions).toEqual(["study", "arts"]);
      expect(CATALOG.palaces.yuhuayuan.actions).toEqual([]);
      const inGarden = enterPalace(makeState(), "yuhuayuan");
      expect(inGarden.location).toBe("yuhuayuan");
      expect(inGarden.actionPoint).toBe(0);
      expect(returnToMap(inGarden).location).toBe("map");
    });
    ```
    (import `PALACE_IDS` from `../index`).

- [ ] **Step 2: Run `npx vitest run packages/core`.** Expected: FAIL (`yuhuayuan` is not a `PalaceId`, and the new test fails).

- [ ] **Step 3: Change `catalog.ts`** to the values in Interfaces.

- [ ] **Step 4: Run `npx vitest run packages/core` and `grep -rn hanmo packages/core`.** Expected: PASS, and no matches.

- [ ] **Step 5: Commit** `feat(core): replace 翰墨軒 with 御花園; 崇文館 offers 習書畫琴棋`. The doc edit in `packages/core/USE_CASES.md` is already on the branch. Do not change it. `packages/core/ARCHITECTURE.md` stays unchanged: its `CATALOG.palaces` row names no palaces.

---

### Task 2: content — palace text and the two new UI strings

Read first: `packages/content/ARCHITECTURE.md`, `packages/content/USE_CASES.md`.

**Files:**
- Modify: `packages/content/src/schema.ts`, `packages/content/src/index.ts`
- Test: `packages/content/src/index.test.ts`

**Interfaces:**
- Consumes: Task 1's `PalaceId`.
- Produces: `UiText.mapImageAlt: string`, `UiText.noActions: string`. `gameText.palaces` has the keys `chongwen`, `yuhuayuan`, `yanwu` and `qingong`.

- [ ] **Step 1: Write the failing test** in `index.test.ts`:
  ```ts
  it('UC-WEB-004 palace text for 崇文館 and 御花園, map alt and empty-palace line', () => {
    expect(gameText.palaces.chongwen).toEqual({ name: '崇文館', description: '藏經史典籍之所，學士在此侍講，亦可揮毫撫琴。' });
    expect(gameText.palaces.yuhuayuan).toEqual({ name: '御花園', description: '奇石古木、花徑曲池，四時景致各異。' });
    expect(Object.keys(gameText.palaces)).toEqual([...PALACE_IDS]);
    expect(uiText.mapImageAlt).toBe('宮城俯瞰全圖');
    expect(uiText.noActions).toBe('此處暫無可行之事。');
  });
  ```

- [ ] **Step 2: Run `npx vitest run packages/content`.** Expected: FAIL.

- [ ] **Step 3: Implement.** In `schema.ts`, add `mapImageAlt: string;` after `mapHeading` and `noActions: string;` after `backToMap`. In `index.ts`, add the `uiText` values in the same places. In `gameText.palaces`, replace the `chongwen` description, delete the `hanmo` entry, and add `yuhuayuan: { name: '御花園', description: '奇石古木、花徑曲池，四時景致各異。' }` right after `chongwen`. The `yanwu` and `qingong` text does not change.

- [ ] **Step 4: Run `npx vitest run packages/content` and `grep -rn "hanmo\|翰墨" packages/content`.** Expected: PASS, and no matches.

- [ ] **Step 5: Commit** `feat(content): 御花園 text, new 崇文館 description, map alt and empty-palace line`.

---

### Task 3: web — illustrated map, on-image palace buttons, empty palace

Read first: `docs/architecture.md`, `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md`.

**Files:**
- Create: `packages/web/src/palaceMap.ts`, `packages/web/src/palaceMap.test.ts`
- Modify: `packages/web/src/render.ts`, `packages/web/src/main.ts`, `packages/web/src/style.css`, `packages/web/screenshots.json`
- Test: `packages/web/src/render.test.ts`, `packages/web/src/screen.test.ts`

**Interfaces:**
- Consumes: Task 1's `PALACE_IDS` and `PalaceId`, and Task 2's `uiText.mapImageAlt` and `uiText.noActions`.
- Produces:
  - `export const PALACE_ANCHORS: Record<PalaceId, { x: number; y: number }>` in `palaceMap.ts`, set to `{ chongwen: { x: 22, y: 15 }, yuhuayuan: { x: 50, y: 13 }, yanwu: { x: 18, y: 70 }, qingong: { x: 50, y: 28 } }`.
  - `export type ScreenImages = { palace: string; scroll: string; map: string }`, which replaces `TitleImages`. `renderTitleScreen(text, images: ScreenImages)` and `renderScreen(screen, text, game, images: ScreenImages)` keep the rest of their signatures.
  - `renderPlayScreen(screen, text, game, mapImage: string): string`.

- [ ] **Step 1: Write the failing tests.**

  `palaceMap.test.ts`:
  ```ts
  it('UC-WEB-004 every palace has an anchor inside the image', () => {
    expect(Object.keys(PALACE_ANCHORS).sort()).toEqual([...PALACE_IDS].sort());
    for (const id of PALACE_IDS) {
      const { x, y } = PALACE_ANCHORS[id];
      for (const v of [x, y]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
    }
  });
  ```

  `render.test.ts`: add `map: '/img/map.webp'` to `images`. Replace the test "map has one button per palace" with:
  ```ts
  it('UC-WEB-004 map shows the image with one positioned button per palace, a hidden heading and 輿圖 after', () => {
    const html = renderPlayScreen({ screen: 'play', state }, uiText, gameText, '/img/map.webp');
    expect(html).toContain(`<h2 class="visually-hidden">${uiText.mapHeading}</h2>`);
    expect(html).toContain(`<img id="map-image" src="/img/map.webp" alt="${uiText.mapImageAlt}">`);
    let last = -1;
    for (const id of PALACE_IDS) {
      const { x, y } = PALACE_ANCHORS[id];
      const at = html.indexOf(`<button type="button" id="palace-${id}" data-palace="${id}" style="left:${x}%;top:${y}%">${gameText.palaces[id].name}</button>`);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
    expect(html.indexOf('id="open-atlas"')).toBeGreaterThan(html.indexOf('</div>', last));
    expect(html).not.toContain('palace-grid');
  });
  ```
  Extend the 崇文館 palace test: `#action-study` comes before `#action-arts`, and `gameText.actions.arts.name` is present. Add:
  ```ts
  it('UC-WEB-004 a palace with no actions shows the empty line instead of an action list', () => {
    const html = renderPlayScreen({ screen: 'play', state: enterPalace(state, 'yuhuayuan') }, uiText, gameText, '/img/map.webp');
    expect(html).toContain('id="palace-view"');
    expect(html).toContain(gameText.palaces.yuhuayuan.name);
    expect(html).toContain(gameText.palaces.yuhuayuan.description);
    expect(html).toContain(`<p id="no-actions">${uiText.noActions}</p>`);
    expect(html).not.toContain('action-list');
    expect(html).not.toContain('data-action');
    expect(html).toContain('id="back-to-map"');
  });
  ```
  Update every other `renderPlayScreen` call in the file to pass `'/img/map.webp'`.

  `screen.test.ts` line 145: change `'hanmo'` to `'yuhuayuan'`.

- [ ] **Step 2: Run `npx vitest run packages/web`.** Expected: FAIL.

- [ ] **Step 3: Implement `palaceMap.ts`** with the values in Interfaces.

- [ ] **Step 4: Implement `render.ts`.**
  - Map markup: `${header}<main id="palace-map"><h2 class="visually-hidden">${mapHeading}</h2><div id="map-stage"><img id="map-image" src="${mapImage}" alt="${mapImageAlt}">${buttons}</div><div id="map-footer"><button type="button" id="open-atlas">${atlasButton}</button></div></main>`. Each button is exactly `<button type="button" id="palace-${id}" data-palace="${id}" style="left:${x}%;top:${y}%">${name}</button>`, in `PALACE_IDS` order.
  - Palace markup: when `CATALOG.palaces[location].actions` is empty, output `<p id="no-actions">${text.noActions}</p>` where `<div id="action-list">…</div>` would go. Otherwise nothing changes.
  - `renderScreen` passes `images.map` to `renderPlayScreen`.

- [ ] **Step 5: Implement `main.ts`.** Add `import mapImage from './assets/map-forbidden-city.webp';` and pass `{ palace: titleImage, scroll: scrollImage, map: mapImage }`.

- [ ] **Step 6: Implement `style.css`.**
  - Remove `#palace-map` from the shared `max-width: 32rem` block. Delete the `#palace-grid` rule, and remove `#palace-grid button` from the shared button rules and their `:hover` rules.
  - `.visually-hidden`: `position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;`
  - `#map-stage`: `position: relative; max-width: 1376px; margin: 0 auto;` (1376px is the image's native width).
  - `#map-image`: `display: block; width: 100%; height: auto;`
  - `#map-stage button[data-palace]`: `position: absolute; transform: translate(-50%, -50%); margin: 0; min-width: 44px; min-height: 44px; padding: 0.3em 0.8em; font-size: clamp(0.875rem, 1.6vw, 1.375rem); white-space: nowrap; color: #f0d78c; background: #7a1c1c; border: 2px solid #c9a227; border-radius: 0.5em; box-shadow: 0 0.2em 0.8em rgba(0, 0, 0, 0.45); cursor: pointer;` and `:hover { background: #922424; }`
  - `#map-footer`: `max-width: 32rem; margin: 0 auto; padding: 1rem; text-align: center;`
  - `#no-actions` needs no new rule.

- [ ] **Step 7: Update `screenshots.json`, then check the anchors.**
  - Set the `palace-map` description to `"宮城地圖：宮城圖上的宮殿按鈕與下方輿圖按鈕"`.
  - Set the `palace` description to `"崇文館畫面：讀經史與習書畫琴棋"`.
  - Right after `palace`, insert:
    ```json
    {
      "name": "palace-empty",
      "description": "御花園畫面：此處暫無可行之事",
      "steps": [
        { "click": "#start" },
        { "click": "#era-suggestion-0" },
        { "click": "#palace-yuhuayuan" },
        { "waitFor": "#palace-view" }
      ]
    }
    ```
    Use the file's existing multi-line formatting.
  - Confirm that `grep -n "#palace-" packages/web/screenshots.json` lists only `chongwen`, `qingong` and `yuhuayuan`.
  - If a browser is available, run `npm run build && npx vite preview` in `packages/web`, then look at the map at 1376px and 390px wide. Change `PALACE_ANCHORS` only if a label sits off its building or two labels overlap. Record any change in the commit message. If no browser is available, keep the values above. The pipeline screenshots show them to the reviewer.

- [ ] **Step 8: Run `npx vitest run packages/web` and `grep -rn "hanmo\|翰墨\|palace-grid\|TitleImages" packages`.** Expected: PASS, and no matches.

- [ ] **Step 9: Commit** `feat(web): illustrated palace map with on-image palace buttons; empty-palace view`.

---

### Task 4: whole repo — verify

- [ ] **Step 1: Run `grep -rn "hanmo\|翰墨" --exclude-dir=node_modules --exclude-dir=.git .`.** Expected: matches only under `.agent/plans/`.
- [ ] **Step 2: Run `npm run verify`.** Expected: the typecheck, tests, build and `check:ids` all pass, and the output ends with "Use case IDs are consistent."
- [ ] **Step 3:** If anything needed fixing, commit it to the module it belongs to, using the same message style.
