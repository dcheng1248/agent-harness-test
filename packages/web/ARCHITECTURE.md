# web

Owns the Vite user interface. Rendering functions take data and return markup, so they can be tested without a browser.

Behaviour is described in `USE_CASES.md`. Layout values (sizes, colours, fonts, positions) live in `src/style.css`, and element IDs live in the render code.

Data flow: player input becomes a `core` action, and the resulting state is rendered with `content` text.

## Assets
`web` owns image assets. They live in `src/assets/` and are imported through Vite, so the build fingerprints them. Player-facing text, including image alt text, still comes from `content`.

The entry point (`main.ts`) imports each asset and passes its URL to the render functions as an argument, so render tests do not depend on Vite.

Purely decorative images use `alt=""` and get no text from `content`.

Positions on an image that tests must check live in TypeScript, not `src/style.css`. The palace anchors on the map are `PALACE_ANCHORS` in `src/palaceMap.ts`, a `Record<PalaceId, { x: number; y: number }>` in percent of the image, so the type check catches a palace without an anchor. The render code writes each anchor as inline `left` and `top` styles.

## Screen state
`web` tracks the current screen. `core` tracks map or palace in `GameState.location`. `src/screen.ts` holds the pure transitions.

```ts
type Screen =
  | { screen: 'title' }
  | { screen: 'era'; seed: number; suggestions: string[]; draft: string; error: boolean }
  | { screen: 'play'; state: GameState }
  | { screen: 'result'; state: GameState; actionId: ActionId; changes: StatChange[] }
  | { screen: 'summary'; state: GameState; actionId: ActionId; changes: StatChange[]; endedHalfSeason: HalfSeasonId; totals: StatChange[]; economy: EconomyReport }
  | { screen: 'atlas'; state: GameState }
  | { screen: 'ending'; state: GameState };
```

`play` renders the map or the palace from `state.location`. A rejected action leaves the screen unchanged. Render functions take a `Screen` and the `content` text and return markup. Only `main.ts` touches the DOM: one click listener finds the element by ID or `data-*` attribute, calls a transition, and redraws.

Interactive elements get stable IDs, or `data-*` attributes for repeated items, so tests and `screenshots.json` scenarios can find them.

```mermaid
sequenceDiagram
  participant P as Player
  participant M as main.ts
  participant S as screen.ts
  participant C as core
  P->>M: click action button
  M->>S: performAction(screen, actionId)
  S->>C: takeAction(state, actionId)
  C-->>S: ActionOutcome
  S-->>M: result, summary, ending or same screen
  M->>P: render
```
