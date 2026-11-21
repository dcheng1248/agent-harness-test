# Foreign nations on a world grid map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four passive foreign nations and their regions, place every region on a world grid (neighbours from shared edges, replacing `adjacent`), and turn 輿圖 into a read-only, clickable world map.

**Architecture:** `core`'s `RegionData` swaps `adjacent` for `cell: GridCell`, and a new pure `regionNeighbours` in `src/rules/regions.ts` derives neighbours. `content` adds `src/nations.ts` (ID, name, colour per owner), 19 foreign regions and cells for all 28 regions. `web` replaces the atlas table with a CSS grid map, a legend and a region panel, with the selection held as `region?` on the `atlas` screen.

**Tech Stack:** TypeScript, Vitest, Vite, npm workspaces.

**Spec:** Issue #60, `packages/core/USE_CASES.md` (UC-CORE-014), `packages/content/USE_CASES.md` (UC-CONTENT-001, UC-CONTENT-005), `packages/web/USE_CASES.md` (UC-WEB-006), `docs/architecture.md`, and the `ARCHITECTURE.md` of each module.

## Global Constraints

- Player-facing text is Traditional Chinese and lives only in `content`. Never name an existing game anywhere.
- `core` has no DOM. `regionNeighbours` draws no random numbers.
- `GameState` does not change. `SCHEMA_VERSION` stays as it is. Cells and nations are never copied into the state.
- Foreign nations are passive. Do not change any economy, post, works or revenue rule; they already skip non-player regions.
- The home regions keep their IDs, names, stats and order, and stay first in `regions`. Same seed → same officials and stats as before.
- Nation colours live in `content/src/nations.ts` only; every other map style lives in `packages/web/src/style.css`.
- Every `implemented` use case must be named in a test name or comment. UC-CONTENT-005 is new and `planned`; Task 2 adds its tests and flips it to `implemented`.
- Run `npm run verify` before calling the work complete.
- Between the Task 1 and Task 2 commits the root typecheck fails in `packages/content/src/regions.ts` and `regions.test.ts` only (they still use `adjacent`). That is expected; Task 2 fixes it.

## Review Focus

1. **Diagonal cells are not neighbours**: regions at (0,0) and (1,1) → `regionNeighbours` gives neither the other. Test in Task 1.
2. **Unknown or foreign IDs**: `regionNeighbours(regions, 'nope')` → `[]`; a foreign region's neighbours include player regions. Test in Task 1.
3. **高麗 must not touch a home region**: no 高麗 cell is one edge-step from a player cell. Test in Task 2.
4. **Foreign regions leave every existing number alone**: home tax per collection stays 547437, the budget lists only the 9 home regions, and the 官員任命 地方 group still has 9 regions. Tests in Task 2 (tax) and Task 3 (budget rows already compare with `expectedTax`; add the 地方 count check).
5. **Selecting garbage or leaving with a selection**: `selectAtlasRegion(atlas, 'nope')` → same screen object; `closeAtlas` of a screen with `region` set → `play` without `region`; reopening starts with nothing selected. Test in Task 3.

---

### Task 1: core — grid cells and derived neighbours

Read first: `docs/architecture.md`, `packages/core/ARCHITECTURE.md` ("Region data", "Interface"), `packages/core/USE_CASES.md` (UC-CORE-014).

**Files:**
- Modify: `packages/core/src/model/region.ts`
- Create: `packages/core/src/rules/regions.ts`, `packages/core/src/rules/regions.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify fixtures (replace `adjacent` with `cell`): `packages/core/src/model/state.test.ts` (lines ~20–31), `packages/core/src/rules/officials.test.ts` (~17–19), `revenue.test.ts` (~17–19), `works.test.ts` (~21–23), `rites.test.ts` (~16–18), `turn.test.ts` (~282, ~335, ~376–377). Use cells `{ x: 0, y: 0 }`, `{ x: 1, y: 0 }`, `{ x: 2, y: 0 }` in fixture order within each array. No assertions change.

**Interfaces:**
- Produces (exported from `@emperor/core`):
  - `interface GridCell { x: number; y: number }` in `src/model/region.ts`.
  - `RegionData = { id: string; owner: string; cell: GridCell; start: RegionStatValues }` (no `adjacent`).
  - `regionNeighbours(regions: readonly RegionData[], id: string): string[]` in `src/rules/regions.ts`: find the region with `id` (none → `[]`); return, in `regions` order, the IDs of every other region `r` with `|r.cell.x − c.x| + |r.cell.y − c.y| === 1`.
- `createInitialState` is unchanged in behaviour; it already copies only `id`, `owner` and `start`. Check it does not spread the whole entry.

- [ ] **Step 1: Write failing tests** in `src/rules/regions.test.ts`, each named with `UC-CORE-014`:
  - Plus-shaped fixture: `c` at (1,1), `n` (1,0), `s` (1,2), `w` (0,1), `e` (2,1), `d` (0,0), `far` (3,1); owners mixed (`PLAYER_OWNER` and `'foreign'`). `regionNeighbours(fx, 'c')` equals `['n','s','w','e']` in fixture order (list fixture as n, s, w, e … so the order assertion is meaningful; put `d` and `far` between them to show they are skipped).
  - `regionNeighbours(fx, 'd')` equals `['n','w']` (diagonal `c` excluded).
  - `regionNeighbours(fx, 'far')` equals `['e']`; a lone region with an empty cell around it gives `[]`.
  - Unknown ID → `[]`. The input array is not mutated (`Object.freeze` the fixture and its items).
  - Neighbours are symmetric over the fixture: for every pair, `a ∈ nb(b)` iff `b ∈ nb(a)`.
- [ ] **Step 2: Run** `npx vitest run packages/core/src/rules/regions.test.ts` — expect FAIL (module missing).
- [ ] **Step 3: Implement** `GridCell`, the new `RegionData`, `regionNeighbours`; export `GridCell` type and `regionNeighbours` from `src/index.ts`.
- [ ] **Step 4: Update the fixtures** listed above.
- [ ] **Step 5: Run** `npx vitest run packages/core` — all pass. Run `npx tsc --noEmit` — the only errors are in `packages/content/src/regions.ts` / `regions.test.ts`.
- [ ] **Step 6: Commit** `feat(core): grid cells and derived region neighbours` (core files only).

---

### Task 2: content — nations, foreign regions and the grid

Read first: `packages/content/ARCHITECTURE.md` ("Regions", "Nations", "Exports"), `packages/content/USE_CASES.md` (UC-CONTENT-001, UC-CONTENT-002, UC-CONTENT-005), `packages/core/ARCHITECTURE.md` ("Region data").

**Files:**
- Create: `packages/content/src/nations.ts`, `packages/content/src/nations.test.ts`
- Modify: `packages/content/src/regions.ts`, `packages/content/src/regions.test.ts`
- Modify: `packages/content/src/schema.ts`, `packages/content/src/index.ts`
- Modify: `packages/content/USE_CASES.md` (status only)

**Interfaces:**
- Consumes: `GridCell`, `RegionData`, `regionNeighbours`, `PLAYER_OWNER`, `regionTax` from `@emperor/core`.
- Produces:
  - `interface NationEntry { id: string; name: string; color: string }` in `schema.ts`, exported (type) from `index.ts`.
  - `GameText.nations: readonly NationEntry[]`; `gameText.nations` = `nations` from `src/nations.ts`.
  - New `UiText` keys and values: `ownerLabel: '歸屬'`, `atlasHint: '點選地域，以觀其歸屬、民心、人口與富庶。'`, `closeRegionPanel: '關閉'`, `legendHeading: '圖例'`, `atlasMapLabel: '天下輿圖'`. Keep `regionColumn` (budget uses it) and `capitalMark`.
  - Nation IDs used in Task 3 tests: `PLAYER_OWNER` (`'player'`), `'khitan'`, `'tibet'`, `'goryeo'`, `'nanzhao'`.

**Nations** (`src/nations.ts`, this order):

| id | name | color |
|---|---|---|
| `PLAYER_OWNER` | 本朝 | `#a8322a` |
| `khitan` | 契丹 | `#4a6d8c` |
| `tibet` | 吐蕃 | `#8a6a2f` |
| `goryeo` | 高麗 | `#3f7f5a` |
| `nanzhao` | 南詔 | `#7a4f8f` |

**Regions** (`src/regions.ts`, this order; home regions keep their current `start` values, `capital: false` for all but 關中). Remove every `adjacent`.

| id | name | owner | cell | 民心 | 人口 | 富庶 |
|---|---|---|---|---|---|---|
| guanzhong | 關中 | player | (2,3) | 65 | 3000000 | 60 |
| hedong | 河東 | player | (3,2) | 60 | 2000000 | 50 |
| hebei | 河北 | player | (4,2) | 55 | 4000000 | 55 |
| zhongyuan | 中原 | player | (3,3) | 60 | 5000000 | 60 |
| shandong | 山東 | player | (4,3) | 60 | 4000000 | 55 |
| jiangnan | 江南 | player | (4,4) | 65 | 4500000 | 75 |
| jingchu | 荊楚 | player | (3,4) | 60 | 3500000 | 55 |
| bashu | 巴蜀 | player | (2,4) | 65 | 3000000 | 60 |
| lingnan | 嶺南 | player | (3,5) | 55 | 1500000 | 40 |
| zuzhou | 祖州 | khitan | (3,0) | 60 | 1500000 | 45 |
| shangjing | 上京 | khitan | (4,0) | 65 | 2500000 | 55 |
| changchun | 長春 | khitan | (5,0) | 55 | 1500000 | 40 |
| huanglong | 黃龍 | khitan | (6,0) | 55 | 2000000 | 45 |
| fengzhou | 豐州 | khitan | (2,1) | 55 | 1500000 | 40 |
| zhongjing | 中京 | khitan | (3,1) | 60 | 2500000 | 50 |
| xingzhong | 興中 | khitan | (4,1) | 60 | 2000000 | 50 |
| dongjing | 東京 | khitan | (5,1) | 60 | 3000000 | 55 |
| xiangxiong | 象雄 | tibet | (0,2) | 55 | 1500000 | 40 |
| qinghai | 青海 | tibet | (1,2) | 55 | 2000000 | 45 |
| supi | 蘇毗 | tibet | (0,3) | 55 | 1500000 | 40 |
| luoxie | 邏些 | tibet | (1,3) | 65 | 3000000 | 55 |
| yalong | 雅隆 | tibet | (0,4) | 60 | 2500000 | 50 |
| duokang | 多康 | tibet | (1,4) | 55 | 2000000 | 45 |
| xijing | 西京 | goryeo | (6,1) | 60 | 2500000 | 55 |
| kaijing | 開京 | goryeo | (6,2) | 65 | 3000000 | 60 |
| qingzhou | 慶州 | goryeo | (6,3) | 60 | 2500000 | 55 |
| taihe | 太和 | nanzhao | (1,5) | 65 | 3000000 | 55 |
| tuodong | 拓東 | nanzhao | (2,5) | 60 | 2000000 | 50 |

Owner `player` means `PLAYER_OWNER` (import it, as now); other owners are the string IDs. Cells are written `cell: { x, y }`.

- [ ] **Step 1: Write failing tests.**
  - `nations.test.ts`, named `UC-CONTENT-005`: names in order equal `['本朝','契丹','吐蕃','高麗','南詔']`; first ID is `PLAYER_OWNER`; IDs unique; colours unique and each matches `/^#[0-9a-f]{6}$/i`; every region's owner is a nation ID; every nation owns ≥ 1 region; `gameText.nations` is that list.
  - `regions.test.ts`, named `UC-CONTENT-001` (replace the "9 home regions" and "adjacency" tests; keep the rest):
    - the first 9 names are the old list in order and all have owner `PLAYER_OWNER`; no later region has owner `PLAYER_OWNER`; 28 regions; per-nation counts 契丹 8, 吐蕃 6, 高麗 3, 南詔 2; foreign regions are grouped in nation-list order (owners of regions 9.. never go back to an earlier nation).
    - IDs unique, names unique.
    - no two regions share a cell (`${x},${y}` set size 28); every `x`, `y` is a non-negative integer.
    - each nation's regions are one connected block: BFS from its first region over `regionNeighbours(gameText.regions, id)` restricted to the same owner reaches all of them. Run this for 本朝 too.
    - 高麗 shares no edge with a home region: for every 高麗 region, no ID in `regionNeighbours` has owner `PLAYER_OWNER`.
    - rough geography: every 契丹 `y` < every home `y`; every 吐蕃 `x` < every home `x`; every 高麗 `x` > every home `x` and ≥ every 契丹 `x`; every 南詔 cell has `x` < the home mean `x` and `y` > the home mean `y`.
    - foreign 民心 and 富庶 each lie within [min, max] of the home regions'; foreign mean 人口 < home mean 人口.
    - the 547437 tax test sums only regions with owner `PLAYER_OWNER`.
  - Keep `only 關中 is the capital` and the reserved-ID test; they now run over all 28 regions.
- [ ] **Step 2: Run** `npx vitest run packages/content` — expect FAIL.
- [ ] **Step 3: Implement** `schema.ts` (`NationEntry`, `GameText.nations`, the five `UiText` keys), `nations.ts`, `regions.ts` from the tables, and wire `nations` and the `uiText` values in `index.ts`.
- [ ] **Step 4: Run** `npx vitest run packages/content` — pass. Run `npx tsc --noEmit` — clean except possibly `web` (the new `UiText` keys are only added, so `web` should already compile).
- [ ] **Step 5: Update** `packages/content/USE_CASES.md`: flip UC-CONTENT-005 from `planned` to `implemented` (status only). Check `npm run check:ids` passes.
- [ ] **Step 6: Commit** `feat(content): foreign nations and world grid cells`.

---

### Task 3: web — the 輿圖 world map

Read first: `packages/web/ARCHITECTURE.md` ("Assets" positions paragraph, "Screen state"), `packages/web/USE_CASES.md` (UC-WEB-006), `packages/content/ARCHITECTURE.md` ("Nations").

**Files:**
- Modify: `packages/web/src/screen.ts`, `packages/web/src/screen.test.ts`
- Modify: `packages/web/src/render.ts`, `packages/web/src/render.test.ts`
- Modify: `packages/web/src/main.ts`
- Modify: `packages/web/src/style.css`
- Modify: `packages/web/screenshots.json`

**Interfaces:**
- Consumes: `gameText.regions` (`RegionEntry` with `cell`), `gameText.nations` (`NationEntry`), `uiText.ownerLabel`, `atlasHint`, `closeRegionPanel`, `legendHeading`, `atlasMapLabel`, `capitalMark`, `closeAtlas`, `atlasHeading`; `formatAmount` from content.
- Produces:
  - `Screen` member `{ screen: 'atlas'; state: GameState; region?: string }`.
  - `selectAtlasRegion(screen: Screen, region: string | null): Screen`: not `atlas` → return `screen`; `null` → `{ screen: 'atlas', state }` (no `region` key); ID found in `screen.state.regions` → `{ screen: 'atlas', state, region }`; otherwise return `screen`. Keeps the same `state` object.
  - `openAtlas` unchanged (no `region` key). `closeAtlas` unchanged (returns `{ screen: 'play', state }`).

**Markup** (`renderAtlasScreen`), in this order inside `<main id="atlas">`:
1. `<h2>輿圖</h2>` (`atlasHeading`).
2. `<div id="atlas-map" role="group" aria-label="${atlasMapLabel}" style="--cols:${cols}">` where `cols = max cell.x + 1`, `rows = max cell.y + 1` over the drawn regions. Drawn regions = each `state.regions` entry that has a `game.regions` entry with the same ID (others are skipped). Cells in row-major order (`y` outer, `x` inner), every `(x, y)` in `0..cols-1 × 0..rows-1`:
   - region: `<button type="button" class="map-cell${selected ? ' selected' : ''}" data-region="${id}" aria-pressed="${selected}" style="grid-column:${x+1};grid-row:${y+1};background:${color}">${name}${capital ? `<span class="capital-mark">${capitalMark}</span>` : ''}</button>`. `color` is the owner's nation colour; when the owner has no nation entry, leave out `background:` from the style.
   - empty: `<div class="map-cell map-empty" aria-hidden="true" style="grid-column:${x+1};grid-row:${y+1}"></div>`.
   - Escape IDs and names with `escapeHtml`.
3. Selected region present → `<section id="region-panel"><h3 id="region-panel-name">${name}</h3><dl><dt>${ownerLabel}</dt><dd id="region-owner">${nationName}</dd><dt>${statLabels.morale}</dt><dd id="region-morale">${morale}</dd><dt>${statLabels.population}</dt><dd id="region-population">${formatAmount(population)}</dd><dt>${statLabels.prosperity}</dt><dd id="region-prosperity">${prosperity}</dd></dl><button type="button" id="close-region-panel">${closeRegionPanel}</button></section>`. Owner with no nation entry → show the owner ID. Name falls back to the ID. Stats come from `state.regions`. Otherwise → `<p id="atlas-hint">${atlasHint}</p>`.
4. `<section id="map-legend"><h3>${legendHeading}</h3><ul>` then per nation `<li data-nation="${id}"><span class="legend-swatch" style="background:${color}"></span>${name}</li>` then `</ul></section>`.
5. `<button type="button" id="close-atlas">${closeAtlas}</button>`.

Remove the atlas table markup.

**main.ts click handling** (add before the generic branches that could match): `hit('#atlas-map [data-region]')` → `selectAtlasRegion(current, el.dataset.region ?? '')`; `hit('#close-region-panel')` → `selectAtlasRegion(current, null)`. Scope the region selector to `#atlas-map` so summary and budget `data-region` rows never match.

**style.css** (replace the `#atlas-scroll` and `#atlas-table*` rules):
```css
#atlas-map {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 4.5rem));
  gap: 2px;
  justify-content: center;
  margin: 1rem 0;
}
.map-cell {
  aspect-ratio: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font: inherit;
  font-size: clamp(0.75rem, 3vw, 1rem);
  line-height: 1.1;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.35);
  cursor: pointer;
}
.map-cell:hover { filter: brightness(1.15); }
.map-cell.selected { outline: 3px solid #f0d78c; outline-offset: -3px; }
.map-empty { background: #e6dcc3; border-color: transparent; cursor: default; }
.capital-mark { font-size: 0.7em; color: #f0d78c; }
#map-legend ul { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; padding: 0; list-style: none; }
.legend-swatch { display: inline-block; width: 1em; height: 1em; margin-right: 0.3em; vertical-align: middle; border: 1px solid rgba(0, 0, 0, 0.35); }
#region-panel { margin: 0.5rem 0; padding: 0.5rem 1rem; border: 2px solid #c9a227; border-radius: 0.5em; }
#region-panel dl { display: grid; grid-template-columns: auto 1fr; gap: 0.2rem 1rem; margin: 0.5rem 0; }
#region-panel dd { margin: 0; }
```
Add `#close-region-panel` to the shared button rule list and its `:hover` list (next to `#close-atlas`).

**screenshots.json:** keep the `atlas` scenario (update its description to `輿圖：天下格狀地圖與圖例（自崇文館開啟）`; add `{ "waitFor": "#atlas-map" }` as its last step). Add, right after it, `atlas-region` with description `輿圖：點選上京，顯示歸屬契丹與民心、人口、富庶`, steps: `click #start`, `click #era-suggestion-0`, `click #palace-chongwen`, `click #open-atlas`, `waitFor #atlas-map`, `click #atlas-map [data-region="shangjing"]`, `waitFor #region-panel`.

- [ ] **Step 1: Write failing tests**, each named `UC-WEB-006`:
  - `screen.test.ts`: `selectAtlasRegion` on an opened atlas with `'shangjing'` → `{ screen: 'atlas', state, region: 'shangjing' }` with `state` the same object; then `'guanzhong'` switches; then `null` → `toEqual({ screen: 'atlas', state })` and `'region' in s` is false; `'nope'` → same object (`toBe`); on `{ screen: 'title' }` → same object. `closeAtlas` of an atlas with `region` → `toEqual(playScreen)` (no `region`); reopening gives no `region`. Keep the existing open/close tests.
  - `render.test.ts` (replace the "lists every region" test):
    - 28 `class="map-cell` buttons with `data-region`, and `7 × 6 − 28 = 14` `map-empty` cells; `style="--cols:7"`.
    - the `guanzhong` button has `grid-column:3;grid-row:4`, `background:#a8322a`, contains `關中` and `<span class="capital-mark">京師</span>`; the `shangjing` button has `background:#4a6d8c` and no capital mark; no other button has a capital mark.
    - no `id="region-panel"`, has `id="atlas-hint"`; no `atlas-table`.
    - legend: 5 `data-nation` items in order 本朝, 契丹, 吐蕃, 高麗, 南詔, each with its colour.
    - with `region: 'shangjing'`: panel has name 上京, owner 契丹, 民心 65, 人口 `formatAmount(2500000)`, 富庶 55, and `id="close-region-panel"`; the `shangjing` cell has `selected` and `aria-pressed="true"`; no `atlas-hint`.
    - with `region: 'guanzhong'`: owner 本朝.
    - a state with an extra region `zz` (owner `'zz'`) not in content → not drawn; a content region missing from state → its cell is `map-empty`.
    - `id="close-atlas"` still reads 返回崇文館; header still first (existing test).
  - `render.test.ts`, 官員任命: the 地方 group lists 9 regions (18 region posts), unchanged by foreign regions.
- [ ] **Step 2: Run** `npx vitest run packages/web` — expect FAIL.
- [ ] **Step 3: Implement** `selectAtlasRegion`, the new `renderAtlasScreen`, the `main.ts` handlers, CSS and `screenshots.json`.
- [ ] **Step 4: Run** `npx vitest run packages/web` — pass. Run `npm run dev`, open 崇文館 → 輿圖, check the map fits a 375 px wide viewport without sideways scroll, names are readable on every colour, clicking 上京 opens the panel, 關閉 clears it.
- [ ] **Step 5: Commit** `feat(web): 輿圖 world grid map with region panel and legend`.

---

### Task 4: whole repo — verify

- [ ] **Step 1:** Run `npm run verify`. Expected: typecheck, all tests, build and `check:ids` pass.
- [ ] **Step 2:** `grep -rn "adjacent" packages docs` returns nothing.
- [ ] **Step 3:** Fix anything that fails in the module that owns it, and commit there.
