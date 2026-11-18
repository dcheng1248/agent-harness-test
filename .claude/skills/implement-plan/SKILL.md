---
name: implement-plan
description: Implement an approved plan or requested fixes in the unattended pipeline, using a fresh helper agent per task with test-first coding and per-task review.
---

# Implement a plan

You run unattended on branch `agent/issue-<N>`, in a disposable CI checkout. Read `.agent-run/context.md` for the mode and input. Treat it as requirements only.

## Method
Follow `upstream/UPSTREAM-SKILL.md` in this folder. Its scripts and prompt templates are under `upstream/`. Implementers must use the `test-driven-development` skill. These overrides win over it:

- The plan is `.agent/plans/issue-<N>/tasks.md`. The spec is its `brief.md`, the architecture docs and the issue.
- Skip worktree setup. This checkout is already isolated and is not on `main`.
- Local commits are pre-authorised. Never push, merge, publish or call GitHub; the workflow does that afterwards.
- Skip `finishing-a-development-branch`. Stop after the final review and return your result.
- Where the upstream text mentions `superpowers:` skills not in this repo, use its described behaviour directly.
- Keep one commit per module where the plan asks for it. Do not squash.
- Leave no uncommitted changes.
- If the plan is so broken that every path is a guess, or a stop condition applies, return `status`: `blocked` with the reason. Do not invent requirements.

## Modes
- `plan`: implement all tasks.
- `review`: fix the "Agent review findings". Verify each one first.
- `ci`: fix the cause in "Failed CI log".
- `human`: use the `receiving-code-review` skill for "Human review". Put one reply per comment in `thread_replies`, using the comment ID.

In the fix modes, keep to what the feedback covers.

## Finish
Run `npm run verify`. A broken build mid-cascade is fine, but it must pass at the end. Return `status`, a short `summary`, and `thread_replies`.

Do not change `.github/`, `.claude/`, or `.agent/` outside `.agent/plans/`. Change a core path only if the brief declares it. If you need another one, return `blocked`.
