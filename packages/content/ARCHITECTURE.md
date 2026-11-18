# content

Owns Traditional Chinese text and event data. `src/schema.ts` defines the shapes other modules rely on.

Data flow: content is plain data, read by `web` and, once events exist, passed to `core` through typed interfaces.
