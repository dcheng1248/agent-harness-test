# Operating the pipeline

## Flow
```mermaid
flowchart TD
  A[grill-me, then to-tickets] --> B[ready-for-agent]
  B --> C[Dispatch]
  C --> D[Plan and audit]
  D -->|questions| E[You reply /answer]
  E --> D
  D --> F[You review the plan]
  F -->|request changes| D
  F -->|approve| G[Implement]
  G --> H[CI and agent review]
  H -->|problems, up to 3 rounds| G
  H --> I[You give final approval]
  I -->|request changes| G
  I -->|/replan| D
  I -->|approve| J[Auto-merge]
  J --> C
```

## What you do
| When | Do this |
|---|---|
| Planner has questions (`needs-clarification`) | Comment on the issue, starting with `/answer` |
| Plan is ready (`stage:plan-review`) | Read the PR description and doc diff. Approve, or add `plan-approved`, or request changes |
| Code is ready (`stage:human-review`) | Approve to merge automatically, or request changes |
| You want a new plan | Put `/replan` on its own line in your review summary |
| `needs-human` | Read the latest comment. Request changes to send the code back, or fix the cause |
| You first noticed an important change at merge | Add `escape` to the PR |
| A risk rating is wrong | Change the `risk:` label |

Plan approval never merges. Coding commits dismiss it, so the merge always needs your final approval.

## Settings
- `MAX_ACTIVE_ISSUES`: how many issues run at once. Keep it at 1; the rest of the pipeline is designed for one at a time.
- `AGENT_REVIEWERS`: accounts whose issues, labels, reviews and answers count.
- `CLAUDE_AUTH`: see `auth.md`.

## Blocked issues
Add GitHub's "blocked by" link. An issue starts only when all its blockers are closed as completed. A blocker closed as not planned or duplicate keeps it waiting until you remove the link.

## Your own PRs
Harness changes are made by you, and GitHub won't let you approve your own PR. Use the admin merge option. `agent-review` does not run on them.

## Limits of the safeguards
The implementer can run project commands, so its tool list is a guardrail and not a sandbox. The hard protections are required checks, branch protection, your approvals, and the App having no `workflows` permission.

## Metrics
The `agent-metrics` branch holds `runs.jsonl`, `prs.jsonl` and `scorecard.md`. It is public, so it holds only numbers and short labels, never prompts, transcripts, code, issue text, comments or secrets.
