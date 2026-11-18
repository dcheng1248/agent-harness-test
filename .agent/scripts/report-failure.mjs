import { runUrl, setCommitStatus } from './lib/actions.mjs';
import { addLabels, comment, labelNames, api } from './lib/github.mjs';

const { ISSUE: issue, PR: pr, STAGE_NAME: stage, REVIEWED_SHA: sha } = process.env;
const target = pr || issue;
if (!labelNames(api(`issues/${target}`)).includes('needs-human')) {
  addLabels(target, ['needs-human']);
  comment(target, `The ${stage} run failed and needs your attention.\n\nRun: ${runUrl()}`);
}
if (sha) setCommitStatus(sha, 'failure', 'Agent review did not finish');
