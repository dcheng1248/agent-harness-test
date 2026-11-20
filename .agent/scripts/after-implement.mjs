import { existsSync, readFileSync } from 'node:fs';
import { runUrl } from './lib/actions.mjs';
import { checkHelpers, countTasks, requiredImplementHelpers } from './lib/enforce.mjs';
import { addLabels, api, comment, getState, git, labelNames, pushBranch, setStage, updateState } from './lib/github.mjs';
import { summarizeExecution } from './lib/metrics.mjs';
import { reviewedThrough, taskReviews } from './lib/progress.mjs';

const { ISSUE: issue, PR: pr, MODE: mode, BASE_SHA: base, IMPLEMENT_OUTPUT: raw, EXECUTION_FILE: executionFile } = process.env;
const branch = `agent/issue-${issue}`;
let result = null;
try {
  result = JSON.parse(raw);
} catch {
  // Handled below as a failed run.
}

const messages = executionFile && existsSync(executionFile) ? JSON.parse(readFileSync(executionFile, 'utf8')) : [];
const helpers = summarizeExecution(messages).subagent_calls;
const tasksFile = `.agent/plans/issue-${issue}/tasks.md`;
const taskCount = existsSync(tasksFile) ? countTasks(readFileSync(tasksFile, 'utf8')) : 0;
const planMode = ['plan', 'resume'].includes(mode);
const tasksBefore = mode === 'resume' ? (getState(pr).tasksDone ?? 0) : 0;

const succeeds = (args) => {
  try {
    git(args);
    return true;
  } catch {
    return false;
  }
};

/** Pushes the commit of the last task whose review passed, if every gate allows it. Returns what happened. */
function saveReviewedTasks() {
  const found = reviewedThrough(taskReviews(messages), tasksBefore + 1);
  if (!found) return { reason: `Task ${tasksBefore + 1} did not pass its task review in this run.` };
  if (!succeeds(['rev-parse', '--verify', '--quiet', `${found.head}^{commit}`])) {
    return { reason: `The commit the Task ${found.task} reviewer saw (${found.head}) does not exist.` };
  }
  const sha = git(['rev-parse', `${found.head}^{commit}`]);
  if (sha === base || !succeeds(['merge-base', '--is-ancestor', base, sha]) || !succeeds(['merge-base', '--is-ancestor', sha, 'HEAD'])) {
    return { reason: `The commit the Task ${found.task} reviewer saw (${sha.slice(0, 7)}) is not new work on this branch.` };
  }
  if (!succeeds(['diff', '--quiet', base, sha, '--', '.github', '.claude', 'CLAUDE.md', '.agent', ':(exclude).agent/plans'])) {
    return { reason: 'The reviewed commits change protected harness files.' };
  }
  const shortfall = checkHelpers(helpers, found.task - tasksBefore + 1, 'implement');
  if (shortfall) return { reason: shortfall };
  pushBranch(branch, sha);
  return { task: found.task, sha };
}

function stop(message) {
  let note = 'Nothing was pushed. To retry, request changes on this PR.';
  if (planMode) {
    const saved = saveReviewedTasks();
    const done = saved.task ?? tasksBefore;
    updateState(pr, { tasksDone: done, tasksTotal: taskCount });
    if (saved.task) {
      const range = saved.task === tasksBefore + 1 ? `Task ${saved.task}` : `Tasks ${tasksBefore + 1}–${saved.task}`;
      note = `${range} passed their task reviews, so the branch now has Tasks 1–${saved.task} of ${taskCount} (up to ${saved.sha.slice(0, 7)}). Later work was not pushed.`;
      note += saved.task < taskCount
        ? ` To continue from Task ${saved.task + 1}, request changes on this PR.`
        : ' The whole-branch review and final checks may not have run. Request changes on this PR to send it back for fixes.';
    } else {
      note = `Nothing was pushed. ${saved.reason}`;
      note += done > 0 ? ` To continue from Task ${done + 1}, request changes on this PR.` : ' To retry, request changes on this PR.';
    }
  }
  addLabels(pr, ['needs-human']);
  comment(pr, `${message}\n\n${note}\n\nRun: ${runUrl()}`);
  process.exit(1);
}

if (result?.status !== 'done') stop(`The implementer stopped: ${result?.summary ?? 'it returned no result.'}`);

const shortfall = checkHelpers(helpers, requiredImplementHelpers(mode, taskCount, tasksBefore), 'implement');
if (shortfall) stop(shortfall);

if (git(['status', '--porcelain'])) stop('The implementer left uncommitted changes.');
if (git(['rev-parse', 'HEAD']) === base) stop('The implementer made no commits.');

setStage(pr, 'stage:agent-review', labelNames(api(`pulls/${pr}`)));
pushBranch(branch);
if (planMode) updateState(pr, { tasksDone: taskCount, tasksTotal: taskCount });
for (const reply of result.thread_replies ?? []) {
  api(`pulls/${pr}/comments/${reply.comment_id}/replies`, { method: 'POST', body: { body: reply.body } });
}
