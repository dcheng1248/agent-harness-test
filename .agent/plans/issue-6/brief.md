# Brief: 登基 start button

## Summary
Add a 登基 button to the title screen. Clicking it picks a random seed, calls a pure `startGame(seed)` in `web` that builds the initial state with `core`, and shows a placeholder game screen. No `core` changes.

## Risk
`high`: the `UiText` content schema changes (new `startButton` field), per `docs/harness/risk-rules.md`. It also touches two modules and core paths.

## Doc impact
- Root: module dependencies no, data flow no (new use case row only)
- Module: use cases yes, data flow yes (web start flow sequence diagram), class diagram no

## IDs added or changed
- `UC-WEB-002` (implemented)

## Core paths
- `docs/architecture.md`
- `packages/web/ARCHITECTURE.md`
- `packages/content/ARCHITECTURE.md`
- `packages/content/src/schema.ts`

## Schema and interface changes
```diff
 export interface UiText {
   ...
+  startButton: string;
 }
```
New in `web`: `type Screen = { screen: 'title' } | { screen: 'game'; state: GameState }` and `startGame(seed: number): Screen`.

## Data flow
Click → `main.ts` seed → `startGame` → `core.createInitialState` → `Screen` → render. See `packages/web/ARCHITECTURE.md`.

## Rejected alternatives
- Keeping screen state in `core`: the issue puts it in `web`.
- Testing the click handler: out of scope.

## Open questions
None.

## Changes since last review
- Human review: the start button now has `type="button"`. Task 2 markup and its test assertion updated; nothing else changed.
