import { readFileSync } from 'node:fs';
import { issueFromBranch } from './lib/decide.mjs';
import { apiList, getState, labelNames } from './lib/github.mjs';
import { FOLLOWUP_FIELDS, PR_FIELDS, buildScorecard, makeRecord, parseJsonl, waitingMs } from './lib/metrics.mjs';
import { appendLines, readMetricsFile, writeMetricsFile } from './lib/store.mjs';

const { action, label, pull_request: pr } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const now = new Date().toISOString();
const followup = (type, number, linked = null) =>
  makeRecord(FOLLOWUP_FIELDS, { type, pr: number, linked_pr: linked, at: now });

const labelEvents = (number) =>
  apiList(`issues/${number}/events`)
    .filter((event) => ['labeled', 'unlabeled'].includes(event.event))
    .map((event) => ({ type: event.event, label: event.label.name, at: event.created_at, actor: event.actor?.login ?? '' }));

function prRecord(issue) {
  const state = getState(pr.number);
  const events = labelEvents(pr.number);
  const issueEvents = labelEvents(issue);
  const commits = apiList(`pulls/${pr.number}/commits`);
  const questions = apiList(`issues/${issue}/comments`).filter((item) => item.user.type === 'Bot' && item.body.startsWith('<!-- agent-questions -->'));
  const runs = parseJsonl(readMetricsFile('runs.jsonl').text).filter((run) => run.issue === issue);
  const finalRisk = labelNames(pr).find((name) => name.startsWith('risk:'))?.slice(5) ?? null;
  const closedAt = pr.closed_at ?? now;
  const isHuman = (login) => login && !login.endsWith('[bot]');
  const rounds = state.reviewRounds ?? 0;
  const humanEdits = commits.filter((commit) => isHuman(commit.author?.login ?? commit.commit.author.name)).length;
  return makeRecord(PR_FIELDS, {
    issue,
    pr: pr.number,
    outcome: pr.merged ? 'merged' : 'closed',
    risk_plan: state.riskPlan ?? null,
    risk_after_code: state.riskAfterCode ?? null,
    risk_final: finalRisk,
    risk_corrected: events.some((event) => event.type === 'labeled' && event.label.startsWith('risk:') && isHuman(event.actor)),
    review_rounds: rounds,
    plan_revised: state.planRevisions ?? 0,
    code_revised: state.codeRevisions ?? 0,
    human_edits: humanEdits,
    clarification_questions: questions.length,
    total_ms: Date.parse(closedAt) - Date.parse(pr.created_at),
    waiting_on_human_ms:
      waitingMs(events, ['stage:plan-review', 'stage:human-review'], closedAt) +
      waitingMs(issueEvents, ['needs-clarification'], closedAt),
    total_cost_usd: runs.reduce((sum, run) => sum + (run.cost_usd ?? 0), 0),
    trial_would_skip_plan_gate: state.riskPlan === 'low',
    trial_would_skip_final_approval: state.riskPlan === 'low' && finalRisk === 'low' && rounds === 0,
  });
}

function refreshScorecard() {
  const records = parseJsonl(readMetricsFile('prs.jsonl').text);
  const prs = records.filter((record) => !record.type);
  const followups = records.filter((record) => record.type);
  const current = readMetricsFile('scorecard.md');
  writeMetricsFile('scorecard.md', buildScorecard(prs, followups).markdown, current.sha, 'metrics: update scorecard');
}

const records = [];
const issue = issueFromBranch(pr.head.ref);
if (action === 'labeled' && label?.name === 'escape') records.push(followup('escape', pr.number));
if (action === 'closed') {
  if (issue !== null) records.push(prRecord(issue));
  const reverted = pr.merged ? /^Reverts\s+\S*#(\d+)/m.exec(pr.body ?? '') : null;
  if (reverted) records.push(followup('revert', Number(reverted[1]), pr.number));
}
if (records.length > 0) {
  appendLines('prs.jsonl', records);
  refreshScorecard();
}
