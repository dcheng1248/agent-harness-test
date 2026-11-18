import { runUrl } from './lib/actions.mjs';
import { addLabels, api, comment, git, labelNames, pushBranch, setStage } from './lib/github.mjs';

const { ISSUE: issue, PR: pr, BASE_SHA: base, IMPLEMENT_OUTPUT: raw } = process.env;
let result = null;
try {
  result = JSON.parse(raw);
} catch {
  // Handled below as a failed run.
}

function stop(message) {
  addLabels(pr, ['needs-human']);
  comment(pr, `${message}\n\nRun: ${runUrl()}`);
  process.exit(1);
}

if (result?.status !== 'done') stop(`The implementer stopped: ${result?.summary ?? 'it returned no result.'}`);
if (git(['status', '--porcelain'])) stop('The implementer left uncommitted changes.');
if (git(['rev-parse', 'HEAD']) === base) stop('The implementer made no commits.');

setStage(pr, 'stage:agent-review', labelNames(api(`pulls/${pr}`)));
pushBranch(`agent/issue-${issue}`);
for (const reply of result.thread_replies ?? []) {
  api(`pulls/${pr}/comments/${reply.comment_id}/replies`, { method: 'POST', body: { body: reply.body } });
}
