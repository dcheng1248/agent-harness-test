---
name: review-code
description: Review an agent branch against origin/main along separate standards and spec axes, using two helper reviewers, for the unattended pipeline.
---

# Review code

Background and the code-smell list are in `upstream-code-review.md` in this folder. Where it conflicts with this file, this file wins.

## Required method
You must **start two helper reviewers with the Agent tool, in the same message**, so they run in parallel. A script counts them. With fewer than two, the review is rejected and the PR is marked `needs-human`, even if your verdict is correct.

Run both in the foreground: never set `run_in_background`. This run ends when you return your verdict, and a helper still working is killed with it.

1. Pin the fixed point: `origin/main`. Confirm `git diff origin/main...HEAD` is not empty.
2. **Standards helper.** Give it the diff command, `git log origin/main..HEAD --oneline`, the standards sources (`CLAUDE.md` and each affected `ARCHITECTURE.md`), and the full smell baseline from `upstream-code-review.md`. Use that file's Standards brief.
3. **Spec helper.** Give it the same diff command and commit list, plus the spec: `.agent-run/context.md`, `.agent/plans/issue-<N>/brief.md` and `tasks.md`, the affected `USE_CASES.md` files, and the architecture docs. Use that file's Spec brief.
4. Wait for both. Turn their reports into findings for the combined verdict.

## Overrides
- Nobody can answer questions, so never ask. Do not use an issue tracker.
- Change nothing, and do not post anything.
- Severity:
  - `critical`: wrong behaviour, data loss, or a missing requirement.
  - `important`: a breach of a documented standard, or scope nobody asked for.
  - `minor`: a judgement call, including every code-smell finding.
- Use axis `standards` or `spec`.

The verdict is `changes` if any finding is `critical` or `important`. Otherwise it is `pass`.
