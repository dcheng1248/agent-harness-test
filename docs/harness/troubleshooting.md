# Troubleshooting the pipeline

What to do when the pipeline is stuck or a run failed. To see how the parts fit together, read `architecture.md`. For the normal flow, read `operations.md`. To have Claude diagnose a problem locally, run the `pipeline-doctor` skill.

## Where to look
1. **The latest comment from the App** on the issue or PR. Every pause posts one, with a link to the run.
2. **The labels**: one `stage:*` label, plus `needs-human`, `needs-clarification` or `review-round:N`.
3. **Actions runs for the branch** `agent/issue-<N>`. Open the failed step. Agent steps end with a JSON result: `is_error`, `num_turns` and `permission_denials_count` tell you how the agent ended.
4. **Router runs.** Each decision is logged as `Action: {...}`. A run that shows "skipped" means its `if:` didn't match. That's normal for most events.
5. **Dispatch runs**, which list every queued issue it skipped and why.

## Slash commands
| Command | Where | Effect |
|---|---|---|
| `/answer` | A comment on the **issue**, starting the comment | Answers the planner's questions and restarts planning |
| `/replan` | On its own line in your **review summary** on the PR | Plans again from scratch |
| `/resume` | A comment on the **PR**, starting the comment | Continues a PR paused with `needs-human` at `stage:agent-review` |

Only accounts in `AGENT_REVIEWERS` count. When you post a command from Git Bash with `gh`, set `MSYS_NO_PATHCONV=1` first. Otherwise Git Bash rewrites `/resume` into a Windows path.

## Symptoms
| Symptom | Likely cause | Fix |
|---|---|---|
| Issue has `ready-for-agent` but nothing starts | Another issue is running (`MAX_ACTIVE_ISSUES`), an open "blocked by" link, or the issue or label came from an account outside `AGENT_REVIEWERS` | The dispatch run log says which. Dispatch also reruns every hour |
| Issue has `needs-clarification` | The planner has questions | Answer with `/answer`. If an answer changes the requirements, also edit the issue text so the reviewer sees the same thing |
| Issue has `needs-human` after "failed its audit twice" | The plan broke an audit rule twice. Sometimes the audit rule itself is wrong | If the plan is at fault, edit the issue to clear it up. If the rule is wrong, fix the harness and merge first. Then remove `needs-human` and `agent:in-progress`, and add `ready-for-agent` |
| "The plan run failed" (or audit, plan-retry, audit-retry) | The agent crashed, hit a limit, or wrote no plan | Same retry as above. A retry plans from scratch, so put anything from your review into the issue text first |
| PR: "A guard check failed: check-core-paths" | The brief doesn't declare a core path the PR changed | Add the path under "## Core paths" in `.agent/plans/issue-<N>/brief.md` on the branch, push, then comment `/resume` |
| PR: "A guard check failed: harness-guard" | The agent changed `.github/`, `.claude/`, `.agent/` (outside `plans/`) or `CLAUDE.md` | Request changes saying not to touch it, or remove the change by hand and `/resume` |
| PR: "The agent review run failed" or "Agent review did not return a verdict" | Usually a one-off: the reviewer ended without its structured verdict | Comment `/resume`. It reruns only the review if CI passed. **Don't** request changes, which would send the code back to the implementer |
| PR: "too few helper agents" (review) | The reviewer skipped the required two helpers | `/resume` |
| PR: `needs-human` after the third failed round | CI or the agent review failed three times in a row | Read the findings. Request changes with guidance, or fix it yourself, push, and `/resume` |
| PR: "The implement run failed", or an implementation stopped | A crash, a limit, or a task that kept failing review. Tasks that passed are pushed | Request changes. The router picks `resume`, `plan` or `human` from the saved progress (`operations.md`, "Stopped implementations") |
| PR at `stage:agent-review`, no `needs-human`, nothing running | CI is still running, or CI ran on an older commit, so the router ignored it | Wait for CI. If it finished on the current head and no review started, rerun the latest CI run on the branch. Its result then reaches the router |
| PR at `stage:agent-review` with `needs-human`, and you've fixed the cause | The router ignores CI while `needs-human` is set | `/resume` |
| A run failed in "prepare branch" at `git merge` | The issue branch conflicts with `main` | Merge `main` into `agent/issue-<N>` locally, resolve, and push. Then retry as the stage requires: `/resume` in agent review, otherwise request changes |
| A run failed in "prepare branch" at `git diff --quiet` | The branch's harness files differ from `main`'s | Make the harness on the branch match `main`, push, and retry |
| You requested changes on a plan but it looks unchanged | The revision is still running, or your page is stale | Check the PR's commits and the brief's "Changes since last review". Reload. In "Files changed", view all commits |
| You approved but nothing merged | The approval was on an older commit, or checks are still running | Approve the latest commit. Auto-merge waits for the required checks |
| A slash command did nothing | Wrong place, not at the start of the comment, an account outside `AGENT_REVIEWERS`, or the wrong stage | See the table above. `/resume` replies when it doesn't apply |
| A run hit the job's time limit | The work was too big for one run. Nothing is saved | Request changes to retry. If it keeps happening, split the issue |

## After fixing a harness bug
Harness changes apply to the next run once merged to `main`. Retry the stuck issue or PR after the merge, not before.
