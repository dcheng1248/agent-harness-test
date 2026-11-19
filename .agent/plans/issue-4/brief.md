# Brief: Placeholder title screen

## Summary
Show a title screen: `<h1>` 九重天子 centered above the palace image, which scales to viewport width. Adds two `uiText` fields, a pure `renderTitleScreen(text, imageUrl)`, and sets the page `<title>`.

## Risk
`high`: the `UiText` content schema changes (risk-rules: content schema change). Also touches several core paths and two modules.

## Doc impact
- Root: module dependencies no, data flow no (new use case row only)
- Module (web): use cases yes, data flow no (asset ownership note), class diagram no
- Module (content): none

## IDs added or changed
- `UC-WEB-001`

## Core paths
- `docs/architecture.md`
- `packages/web/ARCHITECTURE.md`
- `packages/content/src/schema.ts`

## Schema and interface changes
```diff
 export interface UiText {
   placeholderHeading: string;
   placeholderBody: string;
+  gameTitle: string;
+  titleImageAlt: string;
 }
```
Web: new `renderTitleScreen(text: UiText, imageUrl: string): string`.

## Data flow
No change.

## Rejected alternatives
- Removing the old placeholder fields/function: not requested; left in place.
- Importing the image inside the render function: would tie tests to Vite.

## Open questions
None.
