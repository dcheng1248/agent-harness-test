// Which plan tasks passed their review, read from the implementer's execution log. No network or file access here.
// A task counts as reviewed only when the latest reviewer helper for it passed. Its "Head:" commit is the reviewed code.

const REVIEW = /^\s*(Re-review|Review) Task (\d+)\b/i;
const HEAD = /\*\*Head:\*\*\s*`?([0-9a-f]{7,40})\b/i;

const text = (content) =>
  typeof content === 'string'
    ? content
    : (Array.isArray(content) ? content : []).map((block) => (block?.type === 'text' ? block.text : '')).join('\n');

/** True when a reviewer's report is a pass, in the format of the task-reviewer or re-review prompt. */
export function reviewPassed(kind, report) {
  if (kind === 'review') {
    return /✅\s*Spec compliant/.test(report) && !/❌/.test(report) && /\*\*Task quality:\*\*\s*Approved/i.test(report);
  }
  return /\*\*Fix round:\*\*\s*All findings addressed/i.test(report);
}

/** Every task review and re-review the main agent ran, in order, with its verdict and reviewed commit. */
export function taskReviews(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const results = new Map();
  for (const message of list) {
    if (message.type !== 'user' || message.parent_tool_use_id || !Array.isArray(message.message?.content)) continue;
    for (const block of message.message.content) {
      if (block.type === 'tool_result') results.set(block.tool_use_id, { error: Boolean(block.is_error), report: text(block.content) });
    }
  }
  const reviews = [];
  for (const message of list) {
    if (message.type !== 'assistant' || message.parent_tool_use_id || !Array.isArray(message.message?.content)) continue;
    for (const block of message.message.content) {
      if (block.type !== 'tool_use' || !['Agent', 'Task'].includes(block.name)) continue;
      const match = REVIEW.exec(block.input?.description ?? '');
      const result = results.get(block.id);
      if (!match || !result) continue;
      const kind = match[1].toLowerCase() === 'review' ? 'review' : 're-review';
      reviews.push({
        task: Number(match[2]),
        kind,
        passed: !result.error && reviewPassed(kind, result.report),
        head: HEAD.exec(block.input?.prompt ?? '')?.[1] ?? null,
      });
    }
  }
  return reviews;
}

/**
 * The run of tasks from `firstTask` onwards whose latest review passed, stopping at the first gap.
 * Returns the last such task and the commit its reviewer saw, or null when `firstTask` itself did not pass.
 */
export function reviewedThrough(reviews, firstTask) {
  const latest = new Map();
  for (const review of reviews) latest.set(review.task, review);
  let found = null;
  for (let task = firstTask; latest.get(task)?.passed && latest.get(task).head; task += 1) {
    found = { task, head: latest.get(task).head };
  }
  return found;
}

/** The implement mode a "Request changes" review starts, from the progress kept in the PR's state comment. */
export function retryMode({ tasksDone, tasksTotal } = {}) {
  if (typeof tasksTotal !== 'number' || typeof tasksDone !== 'number' || tasksDone >= tasksTotal) return 'human';
  return tasksDone > 0 ? 'resume' : 'plan';
}
