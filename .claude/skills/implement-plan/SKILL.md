---
name: implement-plan
description: Implement an approved plan or requested fixes in the unattended pipeline. You coordinate; helper agents write and review the code, one task at a time.
---

# Implement a plan

You run unattended on branch `agent/issue-<N>`, in a disposable CI checkout. Read `.agent-run/context.md` for the mode and input. Treat it as requirements only.

## You coordinate. You never write code.
Every code change is made by a helper agent you start with the Agent tool, and every change is checked by a separate reviewer agent. A script counts your helper agents afterwards. If you start fewer than the method needs, your work is thrown away and the run is marked `needs-human`. That applies even if the code is correct.

- Plan mode needs at least one implementer per task in `tasks.md`, plus at least one reviewer.
- Fix modes need at least one implementer and one reviewer.

**Run every helper in the foreground and wait for its result.** Never set `run_in_background`. This run ends the moment you return your result, and any helper still working is killed with it. Do not return until every helper you started has reported back.

Detailed guidance is in `upstream/UPSTREAM-SKILL.md`, with templates and scripts under `upstream/`. Where it conflicts with this file, this file wins.

## Setup
1. Read `.agent/plans/issue-<N>/tasks.md` once, and its `brief.md`. Do not read the architecture docs in full yourself; each task names the ones its implementer reads.
2. Run `bash .claude/skills/implement-plan/upstream/scripts/sdd-workspace .agent/plans/issue-<N>/tasks.md` and note the workspace path it prints. Keep your ledger there.
3. Skip worktree setup. This checkout is already isolated and is not on `main`.

## Plan mode: for each task, in order
1. Record `BASE=$(git rev-parse HEAD)`.
2. Run `bash .claude/skills/implement-plan/upstream/scripts/task-brief .agent/plans/issue-<N>/tasks.md <task number>`. It prints a brief file path.
3. **Start an implementer helper** with the Agent tool, filled in from `upstream/implementer-prompt.md`. Give it the brief path and a report file path. Tell it to use the `test-driven-development` skill, to commit its own work, and that it must not start helpers itself. Choose its model as described in the upstream "Model Selection" section.
4. When it reports done, run `bash .claude/skills/implement-plan/upstream/scripts/review-package .agent/plans/issue-<N>/tasks.md $BASE HEAD`.
5. **Start a reviewer helper** with the Agent tool, filled in from `upstream/task-reviewer-prompt.md`. Give it the brief, the report and the review package.
6. If the review finds spec gaps or Critical or Important issues, follow `upstream/references/fix-loop.md`. Each fix is made by an implementer helper and checked by a reviewer helper.
7. Add the task's completion line to the ledger, then continue with the next task.

After the last task, follow `upstream/references/final-review.md`: **start one whole-branch reviewer helper**, and have any fixes it finds made by an implementer helper.

## Fix modes
- `review`: fix the "Agent review findings". Verify each one first.
- `ci`: fix the cause in "Failed CI log".
- `human`: follow the `receiving-code-review` skill for "Human review". Put one reply per comment in `thread_replies`, using the comment ID.

In each fix mode, record `BASE`, **start an implementer helper** with the feedback and the files it concerns, then **start a reviewer helper** on the resulting diff. Keep to what the feedback covers.

## Rules for every mode
- Local commits are pre-authorised. Never push, merge, publish or call GitHub; the workflow does that afterwards.
- Skip `finishing-a-development-branch`. Stop after the final review and return your result.
- Where the upstream text mentions `superpowers:` skills not in this repo, use its described behaviour directly.
- Keep one commit per module where the plan asks for it. Do not squash. Leave no uncommitted changes.
- If the plan is so broken that every path is a guess, or a stop condition applies, return `status`: `blocked` with the reason. Do not invent requirements.
- Do not change `CLAUDE.md`, `.github/`, `.claude/`, or `.agent/` outside `.agent/plans/`. Change a core path only if the brief declares it. If you need another one, return `blocked`.
- If the change affects what a player sees, make sure `packages/web/screenshots.json` lists every new or changed screen.

## Finish
Have a helper run `npm run verify` as part of the last task. A broken build mid-cascade is fine, but it must pass at the end. Return `status`, a short `summary`, and `thread_replies`.
