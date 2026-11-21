---
name: pipeline-doctor
description: Diagnose a stuck or failed agent pipeline issue or PR for the repo owner, working locally with gh, and propose the fix from docs/harness/troubleshooting.md. Use when the user says a pipeline run failed, an issue or PR is stuck, nothing is running, or asks what to do about a pipeline comment. Never used inside pipeline runs.
---

# Pipeline doctor

You help the repo owner on their own machine. You are not part of an unattended pipeline run. If `.agent-run/context.md` exists and this session is running in GitHub Actions, stop: this skill is not for pipeline agents.

Read `docs/harness/troubleshooting.md` and `docs/harness/architecture.md` first. They are the source of truth. This skill only says how to gather the facts and act on them.

## 1. Find the target
From the user's message, get the issue number `N` or the PR number. An agent PR's branch is `agent/issue-<N>`. If the user gave only one of the two numbers, look up the other with `gh pr list --state all --head agent/issue-<N>` or the PR's `headRefName`.

## 2. Gather the facts
Read-only commands. Run them before suggesting anything.
- Labels and recent comments on the issue and the PR: `gh issue view` / `gh pr view` with `--json labels,comments`. The App's latest comment usually names the problem and links the run.
- The PR's bookkeeping comment (`<!-- agent-state: … -->`), for task progress and the plan's risk rating.
- Recent runs on the branch: `gh run list --branch agent/issue-<N>`. Also check the `review.yml`, `plan.yml` and `implement.yml` runs, which are dispatched against `main` and show the issue in their inputs and logs.
- For a failed run: `gh run view <id> --log-failed`. For a failed agent step, read the final result JSON (`is_error`, `num_turns`, `permission_denials_count`) and any `##[error]` lines.
- For a decision that didn't happen, read the router run's `Action:` lines, and check `routeEvent` in `.agent/scripts/lib/decide.mjs` for the exact conditions.
- For the latest CI on the head commit: `gh pr checks <pr>`.

## 3. Diagnose
Match the facts to a row in the troubleshooting table, and quote the evidence (label, comment, log line). If no row fits, explain what you found and which part of `architecture.md` it touches, and say plainly that the runbook doesn't cover it.

If the cause is a harness bug (rules that disagree, a missing case in the router), say so. Propose the fix as a separate harness PR from `main`, and retry the stuck work only after it merges.

## 4. Propose, then act only when told
Give the fix in one or two steps. Ask before doing anything that changes GitHub: comments (including slash commands), labels, reviews, reruns, pushes, or edits to issues.
- Slash commands go in as plain text at the start of the comment. In Git Bash, set `MSYS_NO_PATHCONV=1` first, or `/resume` turns into a Windows path. Check the posted text afterwards.
- A comment posted with `gh` appears under the user's name.
- Never remove `needs-human` and rerun things to "push through" a guard failure without the user agreeing. The guard exists so they decide.

## 5. Improve the runbook
If you found a symptom the runbook lacks, offer to add its row to `docs/harness/troubleshooting.md` in a harness PR.
