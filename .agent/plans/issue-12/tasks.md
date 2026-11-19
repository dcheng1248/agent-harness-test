# Title Screen Overlay Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the game title on a scroll over the top of the palace image and the 登基 button on the stone path at the bottom of the image.

**Architecture:** The title screen markup becomes one positioned container (`#title-stage`) holding the palace `<img>`, a scroll wrapper with a decorative `<img alt="">` and the `<h1>`, and the start button. CSS positions the scroll and button absolutely in percentages of the container, which is exactly the size of the image. Font sizes use `vw`, which tracks the image because it fills the viewport width.

**Tech Stack:** TypeScript, Vite, Vitest, plain CSS.

**Spec:** Issue #12 and `packages/web/ARCHITECTURE.md` (UC-WEB-001, UC-WEB-002, Assets).

## Global Constraints
- Player-facing text is Traditional Chinese and comes from `content`; no new `content` text. The scroll uses `alt=""`.
- Assets are imported only in `main.ts` and passed to render functions as URLs.
- Palace image: full width, `height: auto`, native aspect ratio, not cropped, not stretched to the viewport.
- Scroll: width 35% of the image, horizontally centered, top 3% of the image.
- Scroll paper panel: x 12–88%, y 26–72% of the scroll image.
- Title: color `#3b1f0e`, font stack `"DFKai-SB", "BiauKai", "KaiTi", serif`, font size `clamp(1.5rem, …vw, …)`.
- Button: background `#7a1c1c` (hover `#922424`), border `2px solid #c9a227`, text `#f0d78c`, soft shadow, at least 44px tall and wide.
- No animation, no web fonts, no change to the game screen.

## Review Focus
- Narrow window (about 360px wide): title clamps to 1.5rem and may overflow the panel; acceptable per issue, but the button must still be a 44px tap target and clickable. Check in the `title` screenshot.
- Very wide window (about 2560px): scroll, title and button must stay in proportion; give both font sizes a `clamp()` maximum so they do not grow beyond the art.
- Palace image not loaded yet: the stage has no height, so overlays could stack at the top. Accept; the screenshot pipeline waits for `#title-palace`.
- The global `img { width: 100% }` rule must not stretch the scroll wrongly; scope image rules by ID.
- Click on the button text or its shadow area still reaches `#start` (`closest('#start')` in `main.ts`), so UC-WEB-002 is unchanged.

---

### Task 1: web — title screen overlay

Read first: `packages/web/ARCHITECTURE.md`, `docs/architecture.md`.

**Files:**
- Modify: `packages/web/src/render.ts`
- Modify: `packages/web/src/main.ts`
- Modify: `packages/web/src/style.css`
- Modify: `packages/web/screenshots.json`
- Test: `packages/web/src/render.test.ts`

**Interfaces:**
- Produces (in `render.ts`):
  - `export type TitleImages = { palace: string; scroll: string };`
  - `renderTitleScreen(text: UiText, images: TitleImages): string`
  - `renderScreen(screen: Screen, text: UiText, images: TitleImages): string`

- [ ] **Step 1: Update the tests in `render.test.ts`**

Use `const images = { palace: '/img/palace.webp', scroll: '/img/scroll.webp' };` and replace the existing title-screen tests:

```ts
it('UC-WEB-001 renders the palace image with the title on a decorative scroll', () => {
  const html = renderTitleScreen(uiText, images);
  expect(html).toContain(`<img id="title-palace" src="/img/palace.webp" alt="${uiText.titleImageAlt}">`);
  expect(html).toContain(`<div id="title-scroll"><img src="/img/scroll.webp" alt=""><h1>${uiText.gameTitle}</h1></div>`);
  expect(html.startsWith('<div id="title-stage">')).toBe(true);
  expect(html.endsWith('</div>')).toBe(true);
});

it('UC-WEB-002 title screen has the start button inside the image stage', () => {
  const html = renderTitleScreen(uiText, images);
  expect(html).toContain(`<button type="button" id="start">${uiText.startButton}</button></div>`);
});
```

Keep the existing UC-WEB-002 game-screen test.

- [ ] **Step 2: Run tests and see them fail**

Run: `npx vitest run packages/web/src/render.test.ts`
Expected: the two title-screen tests FAIL.

- [ ] **Step 3: Change `renderTitleScreen` and `renderScreen`**

Exact markup, in this order:

```html
<div id="title-stage"><img id="title-palace" src="{palace}" alt="{titleImageAlt}"><div id="title-scroll"><img src="{scroll}" alt=""><h1>{gameTitle}</h1></div><button type="button" id="start">{startButton}</button></div>
```

In `main.ts`, also import `./assets/title-scroll.webp` and pass `{ palace: titleImage, scroll: scrollImage }` to `renderScreen`. Do not change the click handler.

- [ ] **Step 4: Rewrite `style.css` for the title screen**

Keep `body` and the bare `h1 { text-align: center }` rule (the game screen uses it). Replace the bare `img` rule with the `#title-palace` rule below. Values:

- `#title-stage`: `position: relative`.
- `#title-palace`: `display: block; width: 100%; height: auto`.
- `#title-scroll`: `position: absolute; top: 3%; left: 50%; width: 35%; transform: translateX(-50%)`.
- `#title-scroll img`: `display: block; width: 100%; height: auto`.
- `#title-scroll h1`: `position: absolute; left: 12%; right: 12%; top: 26%; bottom: 28%; margin: 0; display: flex; align-items: center; justify-content: center; color: #3b1f0e; font-family: "DFKai-SB", "BiauKai", "KaiTi", serif; font-size: clamp(1.5rem, 3.5vw, 5rem); line-height: 1`.
- `button#start`: `position: absolute; left: 50%; bottom: 5%; transform: translateX(-50%); margin: 0; min-width: 44px; min-height: 44px; padding: 0.4em 1.6em; font-size: clamp(1rem, 1.6vw, 2.25rem); color: #f0d78c; background: #7a1c1c; border: 2px solid #c9a227; border-radius: 4px; box-shadow: 0 0.2em 0.8em rgba(0, 0, 0, 0.45); cursor: pointer`. Keep the hover rule. No transitions or animations.

- [ ] **Step 5: Update `screenshots.json`**

Give the `title` scenario `"steps": [{ "waitFor": "#title-palace" }]` and change its description to `標題畫面：卷軸標題與登基按鈕在宮殿圖內`. Leave the `game` scenario as is.

- [ ] **Step 6: Run tests and see them pass**

Run: `npx vitest run packages/web/src/render.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/web
git commit -m "feat(web): place title scroll and start button inside the palace image"
```

### Task 2: whole repo — verify

- [ ] **Step 1:** Run `npm run verify`. Expected: exit code 0, including type checks (the new `.webp` import is covered by `vite-env.d.ts`).
- [ ] **Step 2:** Fix anything it reports in the task that owns the file, then rerun until it passes.
