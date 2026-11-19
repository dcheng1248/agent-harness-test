// Minimum helper-agent use, so the per-task method cannot be skipped silently.

export const countTasks = (tasksMarkdown) => (tasksMarkdown.match(/^#+[ \t]+Task[ \t]+\d+\b/gm) ?? []).length;

/** Plan mode: one implementer per task, plus at least one review. Fix modes: one implementer and one reviewer. */
export function requiredImplementHelpers(mode, taskCount) {
  return mode === 'plan' ? Math.max(taskCount, 1) + 1 : 2;
}

/** The code review runs its standards and spec reviewers as two helpers. */
export const REQUIRED_REVIEW_HELPERS = 2;

export function checkHelpers(actual, required, stage) {
  if (actual >= required) return null;
  return `The ${stage} agent used ${actual} helper agent${actual === 1 ? '' : 's'}, but its method needs at least ${required}, so its result was not accepted.`;
}
