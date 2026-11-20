# Risk rules

Use the highest level that applies. `.agent/plans/` does not count.

| Level | Applies when |
|---|---|
| High | The data model or a content schema changes, the harness changes, saved games could break, or a mistake would be hard to undo |
| Medium | Any core path changes, more than one module changes, dependencies or build config change, or behaviour changes across a module boundary |
| Low | Everything else: a small change inside one module, touching no core path |

Core-path changes are never low risk.

`packages/*/USE_CASES.md` is not a core path. Adding or changing a use case does not raise risk by itself. Behaviour changes are still checked at your plan review and in the screenshots.

A script applies the path-based rules after coding (`.agent/risk-rules.yml` and `.agent/core-paths.yml`). It can only raise the rating. The planner and agent reviewer apply the judgement rules. To correct a rating, change the `risk:` label yourself, and the metrics record that.

## Trial mode and skipping gates
Every human gate stays on. Each closed PR records whether it would have skipped you:
- Plan gate: the planner rated it low.
- Final approval: it was rated low at plan and at the end, with no failed review rounds.

The starting bar is 20 consecutive low-risk PRs with no human edits, risk upgrades, reverts or escapes. The scorecard is `scorecard.md` on the `agent-metrics` branch. No skip logic exists yet. Adding one is a manual decision in a later PR, plan gate first and final approval later.
