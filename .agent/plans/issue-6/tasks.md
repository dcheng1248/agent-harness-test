# 登基 start button Implementation Plan

**Goal:** Title screen button that starts a new game and shows a placeholder game screen.
**Spec:** Issue #6 (`.agent-run/context.md`), `docs/architecture.md` (UC-WEB-002), `packages/web/ARCHITECTURE.md` and `packages/content/ARCHITECTURE.md` (already edited by the planner; do not re-edit).
Use TDD. One commit per module. No `core` changes.

## Task 1: content
Read `packages/content/ARCHITECTURE.md`.
Files: `packages/content/src/schema.ts`, `src/index.ts`, `src/index.test.ts`.
- [ ] Test first in `index.test.ts`: `uiText.startButton === '登基'`; run `npm test -w packages/content`, see fail.
- [ ] Add `startButton: string` to `UiText`, and `startButton: '登基'` to `uiText`. `placeholderHeading` (遊戲建置中) and `placeholderBody` (敬請期待。) already exist; keep them.
- [ ] Run tests, pass. Commit `feat(content): add start button text`.

## Task 2: web
Read `packages/web/ARCHITECTURE.md` and `packages/content/ARCHITECTURE.md`.
Files: create `packages/web/src/screen.ts` and `src/screen.test.ts`; modify `render.ts`, `render.test.ts`, `main.ts`, `style.css`.
- [ ] Tests first (see them fail):
  - `render.test.ts`, name containing `UC-WEB-002`: `renderTitleScreen(uiText, '/img/test.webp')` contains `<button type="button"` and `uiText.startButton`; keep the UC-WEB-001 assertions passing.
  - `render.test.ts`, name containing `UC-WEB-002`: new `renderGameScreen(uiText)` contains `<h1>${uiText.placeholderHeading}</h1>` and `<p>${uiText.placeholderBody}</p>`.
  - `screen.test.ts`, name containing `UC-WEB-002`: `startGame(42)` toEqual `{ screen: 'game', state: createInitialState(42) }` (import from `@emperor/core`).
- [ ] `screen.ts`: export `type Screen = { screen: 'title' } | { screen: 'game'; state: GameState }` and pure `startGame(seed: number): Screen`.
- [ ] `render.ts`: add a `<button type="button" id="start">` with `text.startButton` to `renderTitleScreen`, after the `<img>`. Add `renderGameScreen(text: UiText): string` (may reuse `renderPlaceholder`; keep it and its test). Add `renderScreen(screen: Screen, text: UiText, imageUrl: string): string` choosing between them.
- [ ] `main.ts`: keep the current `Screen` in a variable and render with `renderScreen`. Use event delegation on `#app` for clicks on `#start`: pick `crypto.getRandomValues(new Uint32Array(1))[0]`, set `startGame(seed)`, re-render. Only `main.ts` touches the DOM. Do not test it.
- [ ] CSS: center the button below the image (`display:block; margin:1rem auto`), simple styling in a dark red and gold palette, no custom art.
- [ ] Run web tests and `npm run build -w packages/web`. Commit `feat(web): start a new game from the title screen`.

## Task 3: whole repo
- [ ] Run `npm run verify`; fix any failures in the relevant module, with a commit.
