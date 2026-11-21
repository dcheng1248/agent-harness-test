# 宣政殿 options above their own department — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In 宣政殿, open a department's option list directly above the clicked department (right edges aligned, kept inside the image, caret pointing at the button), and put the list right after its button in the markup.

**Architecture:** `web` only. `render.ts` emits `#court-options` immediately after the open department button instead of after all seven. A new pure function `placeCourtOptions` in `src/courtOptions.ts` computes the list's left offset and the caret position from measured rectangles. `main.ts` measures after every draw, on window `resize` and on the 宣政殿 image `load`, and writes inline styles. CSS draws the caret as a `::after` triangle.

**Tech Stack:** TypeScript, Vitest, Vite. Run tests with `npx vitest run packages/web` from the repo root; type-check with `npm run typecheck`.

**Spec:** Issue #39; `packages/web/USE_CASES.md` UC-WEB-007; `packages/web/ARCHITECTURE.md` (Assets section, paragraph on measured placement).

## Global Constraints
- `web` only. No change to `core` or `content`, and no new player-facing text.
- Only `main.ts` touches the DOM. Placement math lives in the pure function and is unit tested.
- Test names or comments carry `UC-WEB-007`.
- Opening, switching and closing a department behave exactly as now. Only position and markup order change.
- No existing game may be named anywhere.
- `npm run verify` must pass at the end.

## Review Focus
1. **內閣 on a narrow viewport.** The list must start at the image's left edge, not off it, and the caret must still point at 內閣's centre (Task 1 test `shifted`).
2. **Exactly at the edge.** When the right-aligned list's left edge equals the image's left edge, no shift happens (Task 1 test `touching`).
3. **Resize after opening.** The button sizes scale with `vw`, so the list must be placed again on `resize`, or it drifts off its button (Task 2, step 3).
4. **Image not yet loaded at first draw.** The stage size depends on the image, so placement runs again on the image's `load` (Task 2, step 3).
5. **Markup order for every department**, including 內閣 (first) and 工 (last): the list comes right after the open button and before the next button, with exactly one list (Task 2 `it.each` test).

---

### Task 1: web — placement function

Read first: `docs/architecture.md`, `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md` (UC-WEB-007).

**Files:**
- Create: `packages/web/src/courtOptions.ts`, `packages/web/src/courtOptions.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Span { left: number; right: number }
  export interface CourtOptionsPlacement { left: number; caretX: number }
  export function placeCourtOptions(row: Span, button: Span, image: Span, listWidth: number): CourtOptionsPlacement
  ```
  All inputs are viewport pixels (`getBoundingClientRect`). `row` is `#department-row` (the list's containing block). Result `left` is the list's border-box left edge relative to `row.left`. `caretX` is the button centre relative to the list's border-box left edge.

- [ ] **Step 1: Write the failing tests** in `courtOptions.test.ts`, `describe('UC-WEB-007 placeCourtOptions', ...)`:
  - `right-aligned`: `placeCourtOptions({left:600,right:1000}, {left:900,right:940}, {left:0,right:1000}, 150)` → `{ left: 190, caretX: 130 }`.
  - `shifted`: `placeCourtOptions({left:20,right:420}, {left:20,right:70}, {left:10,right:500}, 150)` → `{ left: -10, caretX: 35 }` (list starts at the image's left edge, 10 = image left, caret still on the button centre 45).
  - `touching`: `placeCourtOptions({left:100,right:500}, {left:200,right:260}, {left:110,right:600}, 150)` → `{ left: 10, caretX: 120 }` (no shift: 260 − 150 = 110).
- [ ] **Step 2: Run** `npx vitest run packages/web/src/courtOptions.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `placeCourtOptions`:
  ```ts
  const outerLeft = Math.max(button.right - listWidth, image.left);
  return { left: outerLeft - row.left, caretX: (button.left + button.right) / 2 - outerLeft };
  ```
  `image.right` is accepted but unused (the list's right edge is the button's, which is inside the image).
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: No commit yet.** This issue changes one module, so Task 1 and Task 2 land as one `web` commit at the end of Task 2.

### Task 2: web — markup order, CSS, DOM placement and screenshots

Read first: `packages/web/ARCHITECTURE.md`, `packages/web/USE_CASES.md` (UC-WEB-007).

**Files:**
- Modify: `packages/web/src/render.ts` (`renderCourtView`), `packages/web/src/render.test.ts` (`describe('宣政殿')`), `packages/web/src/style.css` (`#court-options`), `packages/web/src/main.ts` (`draw`), `packages/web/screenshots.json`

**Interfaces:**
- Consumes: `placeCourtOptions`, `Span` from `./courtOptions` (Task 1).

- [ ] **Step 1: Update the render test.** Replace the test `the options of %s are always the last child of the department row, above 工` with `it.each(DEPARTMENT_IDS)('UC-WEB-007 the options of %s follow its own button in the department row', ...)` asserting:
  ```ts
  const at = DEPARTMENT_IDS.indexOf(open);
  const before = DEPARTMENT_IDS.slice(0, at + 1).map((id) => departmentButton(id, id === open)).join('');
  const after = DEPARTMENT_IDS.slice(at + 1).map((id) => departmentButton(id, false)).join('');
  expect(html).toContain(`<div id="department-row">${before}<div id="court-options">${options}</div>${after}</div>`);
  expect(html.split('id="court-options"').length).toBe(2);
  ```
  The other 宣政殿 tests stay as they are.
- [ ] **Step 2: Run** `npx vitest run packages/web/src/render.test.ts`. Expected: FAIL for every department except 工. Then change `renderCourtView` so the list string is appended right after the button whose `id === open` (inside the `DEPARTMENT_IDS.map`), not after the joined buttons. Run again. Expected: PASS.
- [ ] **Step 3: DOM placement in `main.ts`.** Add `placeCourtList(): void`, called at the end of `draw()`:
  - Find `#court-options`, `#department-row`, `#palace-image` and `#department-row button.is-open` under `root`; return if any is missing.
  - Call `placeCourtOptions(row.getBoundingClientRect(), button.getBoundingClientRect(), image.getBoundingClientRect(), list.offsetWidth)`.
  - Write `list.style.left = \`${left}px\`` and `list.style.setProperty('--caret-x', \`${caretX}px\`)`.
  - Register once (outside `draw`): `window.addEventListener('resize', placeCourtList)`. Inside `draw`, after rendering, if `#palace-image` exists and is not `complete`, add a one-time `load` listener that calls `placeCourtList`.
- [ ] **Step 4: CSS for `#court-options`.** Replace the comment `Always right-aligned with the last department (工)…` with `Placed above the open department by main.ts (placeCourtOptions); the caret points at that button.` Replace `right: 0` with `left: 0` (fallback before placement). Keep `bottom: calc(100% + 0.5em)` and everything else. Add:
  ```css
  #court-options::after {
    content: '';
    position: absolute;
    top: 100%;
    left: calc(var(--caret-x, 50%) - 2px); /* 2px = list border; --caret-x is from the border-box edge */
    transform: translateX(-50%);
    border-left: 0.45em solid transparent;
    border-right: 0.45em solid transparent;
    border-top: 0.45em solid #c9a227;
  }
  ```
  (`top: 100%` of the padding box puts the caret's top at the inside of the bottom border, so it overlaps the 2px border and fills the 0.5em gap above the button.)
- [ ] **Step 5: Screenshots.** In `packages/web/screenshots.json`, keep `palace-xuanzheng-personnel` unchanged and add, right after it, two scenarios with the same first three steps (`#start`, `#era-suggestion-0`, `#palace-xuanzheng`):
  - `palace-xuanzheng-cabinet`, description `宣政殿畫面：展開內閣，選項列表在內閣上方，不超出圖左緣，箭頭指向內閣`, then `click #department-cabinet`, `waitFor #court-options`.
  - `palace-xuanzheng-works`, description `宣政殿畫面：展開工部，選項列表在工部上方右緣對齊，箭頭指向工部`, then `click #department-works`, `waitFor #court-options`.
- [ ] **Step 6: Verify** `npx vitest run packages/web` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 7: Commit** `packages/web/` as `feat(web): open 宣政殿 options above the clicked department` (one commit for the module, including Task 1's files).

### Task 3: whole repo — verify

- [ ] **Step 1:** Run `npm run verify` from the repo root. Expected: exit 0.
- [ ] **Step 2:** Confirm UC-WEB-007 stays `implemented` in `packages/web/USE_CASES.md` and is referenced by the new tests in `courtOptions.test.ts` and `render.test.ts`.
