# Brief: Title and start button inside the palace image

## Summary
On the title screen, the game title moves onto a decorative scroll placed over the top of the palace image, and the 登基 button moves onto the stone path at the bottom of the image. All sizes and positions are percentages of the image or viewport-width units, so the layout scales with the image. Only `packages/web` changes; the click flow is unchanged.

## Risk
`medium`: `packages/web/ARCHITECTURE.md` is a core path. Otherwise it is one module, with no schema, data model or cross-module change.

## Doc impact
- Root: module dependencies no, data flow no
- Module (`web`): use cases yes (UC-WEB-001, UC-WEB-002 reworded; the Assets section now covers several assets and decorative `alt=""` images), data flow no, class diagram no

## IDs added or changed
- `UC-WEB-001` (title now on a scroll over the image)
- `UC-WEB-002` (button now over the image at bottom center; click flow unchanged)

## Core paths
- `packages/web/ARCHITECTURE.md`

## Schema and interface changes
`web` internal render functions only. `content` and `UiText` do not change.
```diff
- renderTitleScreen(text: UiText, imageUrl: string): string
- renderScreen(screen: Screen, text: UiText, imageUrl: string): string
+ type TitleImages = { palace: string; scroll: string };
+ renderTitleScreen(text: UiText, images: TitleImages): string
+ renderScreen(screen: Screen, text: UiText, images: TitleImages): string
```

## Data flow
No change.

## Rejected alternatives
- Scroll as a CSS `background-image`: the URL is fingerprinted by Vite and would have to be injected as an inline style; an `<img alt="">` is simpler and still decorative.
- New alt text in `content` for the scroll: the issue says the scroll is decorative and `content` gets no new text.
- Making the image cover the viewport: the issue requires native aspect ratio, no crop.

## Open questions
None.
