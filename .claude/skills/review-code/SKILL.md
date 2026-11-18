---
name: review-code
description: Review an agent branch against origin/main along separate standards and spec axes, for the unattended pipeline.
---

# Review code

Follow `upstream-code-review.md` in this folder, with these overrides:

- The fixed point is `origin/main`. Nobody can answer questions, so never ask.
- The spec is `.agent-run/context.md`, `.agent/plans/issue-<N>/brief.md`, and the architecture docs. Do not use an issue tracker.
- The standards sources are `CLAUDE.md` and each affected `ARCHITECTURE.md`.
- Change nothing, and do not post anything.
- Return findings for the combined verdict instead of a written report:
  - `critical`: wrong behaviour, data loss, or a missing requirement.
  - `important`: a breach of a documented standard, or scope nobody asked for.
  - `minor`: a judgement call, including every code-smell finding.
- Use axis `standards` or `spec`.

The verdict is `changes` if any finding is `critical` or `important`. Otherwise it is `pass`.
