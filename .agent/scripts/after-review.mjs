import { applyActions, askForReview, runUrl, setCommitStatus } from './lib/actions.mjs';
import { failedRound } from './lib/decide.mjs';
import { addLabels, api, comment, gh, getState, labelNames, prFiles, removeLabel, repo, setStage, updateState } from './lib/github.mjs';
import { classifyRisk, loadLists, maxRisk } from './lib/rules.mjs';

const { ISSUE: issue, PR: pr, REVIEWED_SHA: sha, VERDICT: raw } = process.env;
const current = api(`pulls/${pr}`);
const labels = labelNames(current);

if (current.head.sha !== sha) {
  console.log('The PR moved on during review, so this verdict is ignored.');
  process.exit(0);
}

let verdict = null;
try {
  verdict = JSON.parse(raw);
} catch {
  // Handled below.
}

if (!['pass', 'changes'].includes(verdict?.verdict)) {
  setCommitStatus(sha, 'failure', 'Agent review did not finish');
  addLabels(pr, ['needs-human']);
  comment(pr, `Agent review did not return a verdict.\n\nRun: ${runUrl()}`);
  process.exit(1);
}

const floor = classifyRisk(prFiles(pr), { corePaths: loadLists('core-paths.yml').core_paths, rules: loadLists('risk-rules.yml') });
const labelled = labels.find((name) => name.startsWith('risk:'))?.slice(5) ?? 'low';
const state = getState(pr);
const risk = maxRisk(maxRisk(labelled, floor.level), verdict.risk ?? 'low');
if (risk !== labelled) {
  removeLabel(pr, `risk:${labelled}`);
  addLabels(pr, [`risk:${risk}`]);
  comment(pr, `Risk raised from ${labelled} to ${risk} after coding: ${floor.reasons.join(', ') || 'agent review'}.`);
}
updateState(pr, { ...state, riskAfterCode: risk });

if (verdict.verdict === 'pass') {
  setCommitStatus(sha, 'success', 'Agent review passed');
  if (current.draft) gh(['pr', 'ready', pr, '--repo', repo()]);
  setStage(pr, 'stage:human-review', labels);
  askForReview(pr);
} else {
  setCommitStatus(sha, 'failure', 'Agent review found problems');
  const findings = (verdict.findings ?? [])
    .map((item) => `- **${item.severity} / ${item.axis}** \`${item.file ?? 'general'}\`: ${item.summary}`)
    .join('\n');
  comment(pr, `<!-- agent-findings -->\nAgent review found problems.\n\n${findings}`);
  applyActions(failedRound(labels, 'review'), { issue: Number(issue), pr: Number(pr), labels });
}
