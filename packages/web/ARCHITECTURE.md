# web

Owns the Vite user interface. Rendering functions take data and return markup, so they can be tested without a browser.

Data flow: player input becomes a `core` action, and the resulting state is rendered with `content` text.

## Assets
`web` owns image assets. They live in `src/assets/` and are imported through Vite, so the build fingerprints them. Player-facing text, including image alt text, still comes from `content`.

The entry point (`main.ts`) imports the asset and passes its URL to the render function as an argument, so render tests do not depend on Vite.

## Use cases
- UC-WEB-001: the title screen renders an `<h1>` with the game title above an `<img>` of the palace, scaled to the viewport width with its aspect ratio kept.
