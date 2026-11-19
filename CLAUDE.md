# Project conventions

A Traditional Chinese, text-based emperor-raising web game, built through an agent pipeline.

## Game rules
- The game's title, characters, text, art, music and levels must be original, and must not be copied from any existing game.
- Never name an existing game anywhere in this repo, including docs, issues and agent instructions.
- Player-facing text is Traditional Chinese.

## Modules
| Module | Owns | May depend on |
|---|---|---|
| `packages/core` | Game state and rules. No DOM. Seeded randomness only, so tests are deterministic. | nothing |
| `packages/content` | Chinese text and event data | `core` |
| `packages/web` | Vite UI | `core`, `content` |

Read `docs/architecture.md` and the `ARCHITECTURE.md` of each module you touch before changing it.

## Specs and tests
- Architecture docs are the spec. Diagrams are Mermaid.
- Use case IDs are `UC-<MODULE>-NNN`. A use case marked `implemented` must be referenced by a test name or comment.
- Run `npm run verify` before calling work complete.

## Pipeline
See `docs/harness/operations.md`. Agents must not change this file, `.github/`, `.claude/`, or `.agent/` other than `.agent/plans/`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for this repo, used through the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. `ready-for-agent` also queues the issue for the pipeline. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` and `docs/adr/`. See `docs/agents/domain.md`.
