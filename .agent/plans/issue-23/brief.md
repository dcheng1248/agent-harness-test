# Brief: Illustrated palace map with on-image palace buttons; 御花園 replaces 翰墨軒

## Summary
The palace map becomes the illustrated palace map, with each palace name as a red-and-gold button on its place in the picture. 翰墨軒 is removed and its 才藝 action moves into 崇文館. A new 御花園 takes its slot and has no actions yet.

## Features
- The map is the full illustration under the header: window-wide up to its own width, never cropped or stretched.
- The four palace names are buttons on their buildings. They scale with the image and keep at least a 44px tap target.
- 崇文館 offers 讀經史 then 習書畫琴棋 (才藝 +3, as before) and has a new description.
- Entering 御花園 shows its name, description, 「此處暫無可行之事。」 and 返回宮城.

## Risk
`high`: the palace registry (`core/src/model`) and the content schema change, and both are high-risk paths.

## Decisions to review
- Map alt text (`mapImageAlt`) is 「宮城俯瞰全圖」. The issue gave only the key.
- 輿圖 sits centred below the image. The issue did not place it.
- Palace button font is `clamp(0.875rem, 1.6vw, 1.375rem)`, so it stops growing when the image does.
- The empty-palace line is `<p id="no-actions">`, shown instead of `#action-list`.
- The 御花園 and 寢宮 anchors were moved from the issue's (50%,13%) and (50%,28%) to (50%,11%) and (50%,33%) so the two buttons don't overlap at 390px wide (44px tap target). Labels still sit on their places.

## What you'll see
- `palace-map` (changed): the palace illustration below the header, with four red-and-gold name buttons on their buildings and 輿圖 below the image.
- `palace` (changed): 崇文館 with its new description and two action buttons, 讀經史 and 習書畫琴棋.
- `palace-empty` (new): 御花園 with its description, 「此處暫無可行之事。」 and 返回.

## Use cases
**Changed `UC-WEB-004` Game screens**
- Palace map: a grid of palace buttons, then 輿圖 → the illustration, sized like the title image (full window width, capped at its native width, aspect ratio kept, never cropped). Each palace button is centred on its anchor, a percentage position on the image kept in `PALACE_ANCHORS`. The buttons scale with the image and keep a 44px minimum tap target. The 宮城 heading is in the markup but visually hidden. 輿圖 follows the map. Every catalog palace must have an anchor inside 0–100%.
- Palace: always an action list → a palace with no actions shows a "nothing to do here" line (`uiText.noActions`) in place of the list. It still has its name, description and 返回.

**Changed `UC-CORE-012` Turn loop**
- Nothing said about empty palaces → a palace may offer no actions. It can still be entered and left, and every action there is rejected as `'not-offered'`.

## Architecture
```mermaid
flowchart LR
  subgraph core
    CATALOG["CATALOG.palaces: chongwen, yuhuayuan, yanwu, qingong"]:::changed
  end
  subgraph content
    gameText["gameText.palaces"]:::changed
    uiText["uiText + mapImageAlt, noActions"]:::changed
  end
  subgraph web
    anchors["palaceMap.ts PALACE_ANCHORS"]:::added
    render["renderPlayScreen(screen, text, game, mapImage)"]:::changed
    main["main.ts imports map image"]:::changed
  end
  CATALOG --> gameText
  CATALOG -->|PalaceId (changed)| anchors
  anchors -->|left/top % (new)| render
  main -->|map image URL (new)| render
  gameText --> render
  uiText --> render
classDef added fill:#d8f5d8,stroke:#2e7d32
classDef changed fill:#fff1c2,stroke:#b7791f
classDef removed fill:#fde2e2,stroke:#c62828,stroke-dasharray:5 5
```
Legend: green = new, amber = changed, red dashed = removed.

`web` gains one small file, `src/palaceMap.ts`, that holds each palace's position on the image. The positions live in TypeScript, not CSS, so the type check and a test catch a palace with no position. `packages/web/ARCHITECTURE.md` records this pattern under "Assets". The module boundaries do not change.

## Data flow
No change. The map image URL goes from `main.ts` to the render functions, like the title images already do.

## Schema and interface changes
- `PALACE_IDS` (`core`): `'hanmo'` is removed, and `'yuhuayuan'` is added in its slot. `PalaceId`, `GameState.location` and `CATALOG.palaces` follow. 翰墨軒 is replaced, as the issue asks.
- `CATALOG.palaces` (`core`): `chongwen` offers `['study', 'arts']`, and `yuhuayuan` offers `[]`. The `Catalog` type already allows an empty list.
- `UiText` (`content` schema): adds `mapImageAlt` (alt text of the map image) and `noActions` (the empty-palace line).
- `GameText.palaces` (`content`): drops `hanmo` and adds `yuhuayuan`. Its type is still `Record<PalaceId, …>`, so the type check enforces this.
- `renderPlayScreen` (`web`): gains a 4th parameter, `mapImage: string`. `TitleImages` is renamed `ScreenImages` and gains `map`. `renderScreen` passes `images.map` through.
- New `PALACE_ANCHORS: Record<PalaceId, { x: number; y: number }>` in `packages/web/src/palaceMap.ts`.

`GameState.schemaVersion` stays the same: only the allowed values of `location` change, and no saves exist, so nothing migrates.

<details><summary>Full diff</summary>

```diff
-PALACE_IDS = ['chongwen', 'hanmo', 'yanwu', 'qingong']
+PALACE_IDS = ['chongwen', 'yuhuayuan', 'yanwu', 'qingong']
-palaces: { chongwen: ['study'], hanmo: ['arts'], yanwu: ['riding'], qingong: ['rest'] }
+palaces: { chongwen: ['study', 'arts'], yuhuayuan: [], yanwu: ['riding'], qingong: ['rest'] }
 UiText { …, mapHeading, … }
+UiText.mapImageAlt: string
+UiText.noActions: string
-type TitleImages = { palace: string; scroll: string }
+type ScreenImages = { palace: string; scroll: string; map: string }
-renderPlayScreen(screen, text, game)
+renderPlayScreen(screen, text, game, mapImage: string)
+PALACE_ANCHORS: Record<PalaceId, { x: number; y: number }>
```
</details>

## Out of scope
- Any action for 御花園.
- Changing balance numbers. 習書畫琴棋 keeps 才藝 +3.
- Re-encoding `map-forbidden-city.webp`. The file is JPEG data with a `.webp` name. Browsers detect the real format, and the issue says to use the file as it is.
- Hover tooltips or highlighting the buildings themselves.
- `packages/core/ARCHITECTURE.md` is unchanged, because its `CATALOG.palaces` row names no palaces.
- The UC-WEB-004 map bullet is rewritten in `packages/web/USE_CASES.md`, where it has lived since #25, not in `ARCHITECTURE.md`.

## Rejected alternatives
- Anchors in `style.css`, one rule per palace ID: a test could not check that every palace has one.
- An SVG image map (`<map>`/`<area>`): areas cannot show the visible red-and-gold labels the issue asks for.
- Hiding the heading with `display: none`: that would also hide it from screen readers.

<details><summary>Core paths</summary>

## Core paths
- `packages/web/ARCHITECTURE.md`
- `packages/core/src/model/**`
- `packages/content/src/schema.ts`

</details>
