# Title screen Implementation Plan

**Goal:** Render a title screen (h1 + palace image) in `web`.
**Spec:** Issue #4 (`.agent-run/context.md`), `docs/architecture.md` (UC-WEB-001) and `packages/web/ARCHITECTURE.md` (already edited by the planner; do not re-edit).
Use TDD. One commit per module. No `core` changes.

## Task 1: content
Read `packages/content/ARCHITECTURE.md`.
Files: `packages/content/src/schema.ts`, `src/index.ts`, `src/index.test.ts`.
- [ ] Test first in `index.test.ts`: `uiText.gameTitle === '九重天子'` and `uiText.titleImageAlt === '暮色中的紫禁城大殿'`; run `npm test -w packages/content`, see fail.
- [ ] Add `gameTitle: string; titleImageAlt: string;` to `UiText`; add the two values to `uiText`.
- [ ] Run tests, pass. Commit `feat(content): add title screen text`.

## Task 2: web
Read `packages/web/ARCHITECTURE.md` and `packages/content/ARCHITECTURE.md`.
Files: `packages/web/src/render.ts`, `render.test.ts`, `main.ts`, `index.html`, a style file (e.g. `src/style.css`), plus a Vite client type reference if `tsc` needs it (e.g. `src/vite-env.d.ts` with `/// <reference types="vite/client" />`).
- [ ] Test first in `render.test.ts`, name containing `UC-WEB-001`: `renderTitleScreen(uiText, '/img/test.webp')` contains `<h1>九重天子</h1>` (use `uiText.gameTitle`) and `<img src="/img/test.webp" alt="暮色中的紫禁城大殿"` (via `uiText.titleImageAlt`). Run, see fail.
- [ ] Implement `export function renderTitleScreen(text: UiText, imageUrl: string): string` returning `<h1>…</h1><img src="…" alt="…">`. Keep `renderPlaceholder` and its test.
- [ ] `main.ts`: `import titleImage from './assets/title-forbidden-city.webp'`, import the CSS, render `renderTitleScreen(uiText, titleImage)`.
- [ ] CSS: h1 centered; img `display:block; width:100%; height:auto`.
- [ ] `index.html` `<title>` → `九重天子`.
- [ ] Run web tests and the web build (if a script exists); confirm the image is fingerprinted. Commit `feat(web): show title screen`.

## Task 3: whole repo
- [ ] Run `npm run verify`; fix any failures in the relevant module, with a commit.
