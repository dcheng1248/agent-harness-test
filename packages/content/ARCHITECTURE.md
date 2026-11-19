# content

Owns Traditional Chinese text and event data. `src/schema.ts` defines the shapes other modules rely on.

Data flow: content is plain data, read by `web` and, once events exist, passed to `core` through typed interfaces.

## UiText
Besides the title screen text, `UiText` has `startButton` (登基), the label of the title screen start button, and `placeholderHeading` and `placeholderBody`, shown on the placeholder game screen.
