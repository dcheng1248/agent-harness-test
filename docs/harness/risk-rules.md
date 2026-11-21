# Risk rules

Use the highest level that applies. `.agent/plans/` does not count.

| Level | Applies when |
|---|---|
| High | A breaking change to `GameState` or a content schema, the harness changes, saved games could break, or a mistake would be hard to undo |
| Medium | Any core path changes, including an additive change to `GameState` or a schema, more than one module changes, dependencies or build config change, or behaviour changes across a module boundary |
| Low | Everything else: a small change inside one module, touching no core path |

Core-path changes are never low risk.

A **breaking** change removes, renames or retypes a field, or changes what an existing field or registry entry means, so existing code or data must change with it. An **additive** change only adds a field, a registry entry, a content row or a new function, and leaves everything already there working as before. Adding values to `BALANCE` or entries to a catalogue is additive. Changing existing balance values is not a schema change at all.

**Saved games:** there are none yet, so no change can break one. Once saving ships, any `GameState` change that comes without a migration is high.

`packages/*/USE_CASES.md` is not a core path. Adding or changing a use case does not raise risk by itself. Behaviour changes are still checked at your plan review and in the screenshots.

A script applies the path-based rules after coding (`.agent/risk-rules.yml` and `.agent/core-paths.yml`). It can only raise the rating. It rates harness changes high and core paths medium, but never rates a model or schema file high by path, because a path cannot tell additive from breaking. The planner and agent reviewer apply the judgement rules, including whether a change is breaking. To correct a rating, change the `risk:` label yourself, and the metrics record that.

## Trial mode and skipping gates
Every human gate stays on. Each closed PR records whether it would have skipped you:
- Plan gate: the planner rated it low.
- Final approval: it was rated low at plan and at the end, with no failed review rounds.

The starting bar is 20 consecutive low-risk PRs with no human edits, risk upgrades, reverts or escapes. The scorecard is `scorecard.md` on the `agent-metrics` branch. No skip logic exists yet. Adding one is a manual decision in a later PR, plan gate first and final approval later.
