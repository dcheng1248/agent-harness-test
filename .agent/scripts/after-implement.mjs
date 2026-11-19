import { existsSync, readFileSync } from 'node:fs';
import { runUrl } from './lib/actions.mjs';
import { checkHelpers, countTasks, requiredImplementHelpers } from './lib/enforce.mjs';
import { addLabels, api, comment, git, labelNames, pushBranch, setStage } from './lib/github.mjs';
import { summarizeExecution } from './lib/metrics.mjs';

const { ISSUE: issue, PR: pr, MODE: mode, BASE_SHA: base, IMPLEMENT_OUTPUT: raw, EXECUTION_FILE: executionFile } = process.env;
let result = null;
try {
  result = JSON.parse(raw);
} catch {
  // Handled below as a failed run.
}

function stop(message) {
  addLabels(pr, ['needs-human']);
  comment(pr, `${message}\n\nNothing was pushed. To retry, request changes on this PR.\n\nRun: ${runUrl()}`);
  process.exit(1);
}

if (result?.status !== 'done') stop(`The implementer stopped: ${result?.summary ?? 'it returned no result.'}`);

const messages = executionFile && existsSync(executionFile) ? JSON.parse(readFileSync(executionFile, 'utf8')) : [];
const tasksFile = `.agent/plans/issue-${issue}/tasks.md`;
const taskCount = existsSync(tasksFile) ? countTasks(readFileSync(tasksFile, 'utf8')) : 0;
const shortfall = checkHelpers(summarizeExecution(messages).subagent_calls, requiredImplementHelpers(mode, taskCount), 'implement');
if (shortfall) stop(shortfall);

if (git(['status', '--porcelain'])) stop('The implementer left uncommitted changes.');
if (git(['rev-parse', 'HEAD']) === base) stop('The implementer made no commits.');

setStage(pr, 'stage:agent-review', labelNames(api(`pulls/${pr}`)));
pushBranch(`agent/issue-${issue}`);
for (const reply of result.thread_replies ?? []) {
  api(`pulls/${pr}/comments/${reply.comment_id}/replies`, { method: 'POST', body: { body: reply.body } });
}
