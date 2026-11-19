---
name: review-against-docs
description: Check that an agent branch matches the architecture docs, use case IDs, brief and project rules.
---

# Review against docs

Change nothing and post nothing. Compare `git diff origin/main...HEAD` with the docs, and report each problem as a finding with axis `docs` or `originality`.

Report `important` or higher if:
1. Code behaves differently from `docs/architecture.md` or a module `ARCHITECTURE.md`, or a dependency breaks the module table in `CLAUDE.md`.
2. Data flow or class diagrams no longer match the code.
3. A use case is marked `implemented` without a test that references its ID, or new behaviour has no use case.
4. The change does something important that `.agent/plans/issue-<N>/brief.md` does not mention.
5. `core` uses the DOM or unseeded randomness.
6. Player-facing text is not Traditional Chinese.
7. Titles, characters, text, art, music or levels look copied from an existing game, or any existing game is named.
8. The change adds or changes a screen, but `packages/web/screenshots.json` has no scenario that shows it.
9. A screenshot in `.agent-run/screenshots/` shows a broken screen: a failed capture in `manifest.json`, missing text or images, overlapping or cut-off content, or a layout that contradicts the docs. Look at each image with the Read tool. Use axis `docs`.

Also rate risk from `docs/harness/risk-rules.md` and return it as `risk` in the combined verdict. Rate it from what the diff really does, not from the brief.
