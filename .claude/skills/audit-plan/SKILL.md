---
name: audit-plan
description: Independently audit a planned issue, checking that brief.md honestly reports everything important in tasks.md and the doc changes.
---

# Audit a plan

You are a fresh reviewer and did not write this plan. Change nothing. Read `.agent-run/context.md`, `.agent/plans/issue-<N>/brief.md`, `.agent/plans/issue-<N>/tasks.md`, and the uncommitted changes shown by `git diff` and `git status`.

Fail the audit if any of these is true:
1. `tasks.md` or the doc changes contain an important change the brief omits: a schema or interface change, a new dependency, a core path, a behaviour change, or a new or changed use case.
2. A path in `.agent/core-paths.yml` will change but is missing from "## Core paths" in the brief.
3. The plan guesses at something the issue and answers leave open.
4. The plan misses a requirement in the issue or adds work nobody asked for.
5. The risk rating is lower than `docs/harness/risk-rules.md` allows.
6. Tasks are out of dependency order, or a task does not name the `ARCHITECTURE.md` and `USE_CASES.md` files to read.
7. The brief is longer than about one screen.
8. The work breaks the originality rule in `CLAUDE.md`, or names an existing game.
9. An architecture file (`docs/architecture.md` or a `packages/*/ARCHITECTURE.md`) changes although the structure does not: module boundaries, dependencies, data flow, the shape of `GameState` or schemas, a public interface, or a shared pattern. Behaviour belongs in `USE_CASES.md`.
10. A doc change adds exact values, such as numbers, balance values, colours, sizes, positions, fonts, wording or element IDs. Those belong in `tasks.md` and the code. Naming where a value lives, such as `BALANCE.upkeep`, is fine.

Return `pass` and a list of specific `problems`. An empty list means `pass` is true.
