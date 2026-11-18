import { appendFileSync, readFileSync } from 'node:fs';
import { decideDispatch, issueFromBranch, parseReviewers } from './lib/decide.mjs';
import { addLabels, apiList, comment, labelNames, removeLabel, runWorkflow } from './lib/github.mjs';

function finishClosedPr() {
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request') return;
  const { pull_request: pr } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const issue = issueFromBranch(pr.head.ref);
  if (issue === null) return;
  removeLabel(issue, 'agent:in-progress');
  if (!pr.merged) comment(issue, `PR #${pr.number} was closed without merging, so this issue is back in triage.`);
}

function labelActor(number) {
  const events = apiList(`issues/${number}/events`).filter(
    (event) => event.event === 'labeled' && event.label?.name === 'ready-for-agent',
  );
  return events.at(-1)?.actor?.login ?? '';
}

function loadIssues() {
  return apiList('issues?state=open')
    .filter((issue) => !issue.pull_request)
    .map((issue) => {
      const labels = labelNames(issue);
      const queued = labels.includes('ready-for-agent') && !labels.includes('agent:in-progress');
      return {
        number: issue.number,
        createdAt: issue.created_at,
        author: issue.user.login,
        labels,
        labeledBy: queued ? labelActor(issue.number) : '',
        blockers: queued
          ? apiList(`issues/${issue.number}/dependencies/blocked_by`).map((blocker) => ({
              number: blocker.number,
              state: blocker.state,
              stateReason: blocker.state_reason,
            }))
          : [],
      };
    });
}

if (!process.env.MAX_ACTIVE_ISSUES) {
  console.log('Repository setup has not run yet, so nothing is dispatched.');
  process.exit(0);
}

finishClosedPr();

const maxActive = Number(process.env.MAX_ACTIVE_ISSUES);
if (!Number.isInteger(maxActive) || maxActive < 1) throw new Error('MAX_ACTIVE_ISSUES must be a positive whole number');

const decision = decideDispatch({
  issues: loadIssues(),
  maxActive,
  reviewers: parseReviewers(process.env.AGENT_REVIEWERS),
});

for (const number of decision.start) {
  addLabels(number, ['agent:in-progress']);
  removeLabel(number, 'ready-for-agent');
  runWorkflow('plan.yml', { issue: String(number), mode: 'new', pr: '' });
}

const summary = [
  `Started: ${decision.start.map((n) => `#${n}`).join(', ') || 'none'}`,
  `Waiting for a free slot: ${decision.waiting.map((n) => `#${n}`).join(', ') || 'none'}`,
  ...decision.skipped.map((item) => `Skipped #${item.number}: ${item.reason}`),
].join('\n\n');
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
