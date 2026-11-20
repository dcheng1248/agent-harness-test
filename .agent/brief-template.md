# Brief: <short title>

The brief is the plan PR's body. Its job is to give the reviewer a clear picture of the plan without opening `tasks.md` or the docs. Say what changes and how it behaves. Don't just list paths, IDs or yes/no answers.

Everything from the title to "What you'll see" must fit on one screen. Keep the sections below it short too.

## Changes since last review
Only on revisions. Say what moved since the last review and why, one line each. Otherwise leave this section out.

## Summary
Two or three sentences.

## Features
What changes for the player or caller, one or two lines each, describing the behaviour. No IDs.
- 

## Risk
`low`, `medium` or `high`, with one line of reasoning from `docs/harness/risk-rules.md`.

## Decisions to review
Choices the issue left open that the plan made: values, placement, ordering, names. Give each choice and its reason in one line. Write "None" if there are none.
- 

## What you'll see
Screens added or changed, matching the scenarios in `packages/web/screenshots.json`, one line each on what appears. Write "Nothing visible" if there are none.
- 

## Use cases
For each added use case, state its rules in plain words: what triggers it, what happens, and the edge cases and rejections. For each changed use case, write only what differs as "before → after" bullets. Name where exact values live, such as `BALANCE.upkeep`, rather than repeating them. Write "None" if there are none.

**Added `UC-...` <title>**
- 

**Changed `UC-...` <title>**
- before → after

## Architecture
Draw the module or class structure after the change as a Mermaid diagram, then write one or two lines on what changed and why. Write "No change" if nothing does.

## Data flow
Draw it in the same format as Architecture, or write "No change".

Diagrams use these styles. Write the legend line under each diagram. Mark a new or changed edge by adding `(new)` or `(changed)` to its label.
```
classDef added fill:#d8f5d8,stroke:#2e7d32
classDef changed fill:#fff1c2,stroke:#b7791f
classDef removed fill:#fde2e2,stroke:#c62828,stroke-dasharray:5 5
```
Legend: green = new, amber = changed, red dashed = removed.

## Schema and interface changes
One bullet per change: the name, what changed, and why. End with one line on migration: what happens to existing saves or data. Write "None" if there are none.
- 

<details><summary>Full diff</summary>

```diff
```
</details>

## Out of scope
Related things this plan does not do, one line each. Write "None" if there are none.

## Rejected alternatives
- One line each.

<details><summary>Core paths</summary>

## Core paths
List every core path this issue will change, one per line, in backticks. Write "None" if there are none.
- `path`

</details>
