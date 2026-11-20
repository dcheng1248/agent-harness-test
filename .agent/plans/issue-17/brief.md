# Brief: Core loop: 年號, palace map, emperor stats, aging and death

## Summary
The first playable loop. 登基 opens a 年號 screen (3 seeded suggestions, or a typed 2-character name). The emperor then spends 4 action points per half-season on actions in 4 palaces, changing 健康, 學識, 才藝 and 魄力, until 健康 reaches 0 and a 駕崩 ending leads back to the title screen. Stats, palaces and actions are registries in `core`, tunables are in one `BALANCE` table, and all text comes from `content`.

## Risk
`high`: the `GameState` data model (schema version 1 to 2) and the `content` schema change, in all three modules.

## Doc impact
- Root: module dependencies no (`content --> core` is already in the diagram), data flow no. Use case table yes.
- Package manifests: `packages/content/package.json` gains `"@emperor/core": "*"`, because `content` now imports `core` IDs and types for the first time (Task 3, with `npm install` updating `package-lock.json`).
- `core`: use cases yes, data flow no, class diagram yes (`GameState`, registries, `BALANCE`, state diagram).
- `content`: use cases no, data flow yes, class diagram yes (`UiText` keys, `GameText`, format functions).
- `web`: use cases yes, data flow yes (screen states).

## IDs added or changed
- `UC-CORE-001` (adds 魄力; implemented here), `UC-CORE-011` 年號, `UC-CORE-012` turn loop, `UC-CORE-013` aging and death
- `UC-WEB-002` (登基 opens the 年號 screen), `UC-WEB-003` 年號 screen, `UC-WEB-004` play screens, `UC-WEB-005` ending

## Core paths
- `docs/architecture.md`
- `packages/core/ARCHITECTURE.md`
- `packages/content/ARCHITECTURE.md`
- `packages/web/ARCHITECTURE.md`
- `packages/core/src/model/**`
- `packages/core/src/index.ts`
- `packages/content/src/schema.ts`

## Schema and interface changes
```diff
-GameState { schemaVersion: 1, seed, rngState }
+GameState { schemaVersion: 2, seed, rngState, eraName, turn, actionPoint, location, stats, turnDeltas, dead }
-createInitialState(seed)
+createInitialState(seed, eraName), plus enterPalace, returnToMap, takeAction and the 年號 helpers
+GameText (labels for stats, palaces, actions, time; 年號 pool); UiText loses its placeholder keys
-type Screen = title | game
+type Screen = title | era | play | result | summary | ending
```
There are no saves yet, so nothing needs migrating. The values for details the issue leaves open are in the module docs.

## Data flow
No change at the root. See the `core` and `web` state diagrams.

## Rejected alternatives
- Fixed stat fields on `GameState`: the issue asks for a registry.
- A debug shortcut for the ending screenshot: a fixed seed and a computed click sequence reach it.
- Format functions in `web`: text rules belong in `content`.

## Open questions
None.
