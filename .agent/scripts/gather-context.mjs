// Writes .agent-run/context.md. Only text from allowed reviewers and this pipeline goes in.
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseReviewers } from './lib/decide.mjs';
import { api, apiList, getState, repo } from './lib/github.mjs';

const { ISSUE: issueNumber, PR: prNumber, MODE: mode } = process.env;
const reviewers = parseReviewers(process.env.AGENT_REVIEWERS);
const allowed = (user) => reviewers.includes(user.login.toLowerCase());
const isBot = (item) => item.user.type === 'Bot';
const parts = [`# Run context\n\nMode: ${mode}`];

const issue = api(`issues/${issueNumber}`);
if (!allowed(issue.user)) throw new Error('Issue author is not an allowed reviewer');
parts.push(`## Issue #${issue.number}: ${issue.title}\n\n${issue.body ?? ''}`);

const comments = apiList(`issues/${issueNumber}/comments`);
const history = comments.filter(
  (item) => (isBot(item) && item.body.startsWith('<!-- agent-questions -->')) || (allowed(item.user) && /^\s*\/answer\b/.test(item.body)),
);
if (history.length > 0) {
  parts.push(`## Questions and your answers\n\n${history.map((item) => item.body).join('\n\n---\n\n')}`);
}

if (prNumber) {
  const reviews = apiList(`pulls/${prNumber}/reviews`).filter((item) => allowed(item.user) && item.state !== 'PENDING');
  const latest = reviews.filter((item) => item.state === 'CHANGES_REQUESTED' || /^\s*\/replan\b/m.test(item.body ?? '')).at(-1);
  if (mode === 'resume') {
    const { tasksDone = 0, tasksTotal } = getState(prNumber);
    const total = tasksTotal ? ` of ${tasksTotal}` : '';
    parts.push(`## Progress\n\nTasks 1–${tasksDone}${total} are already on this branch and passed their task reviews. Start at Task ${tasksDone + 1}.`);
  }
  if (latest && ['revise', 'human', 'resume'].includes(mode)) {
    const inline = apiList(`pulls/${prNumber}/reviews/${latest.id}/comments`);
    parts.push(`## Human review (authoritative)\n\n${latest.body ?? ''}`);
    for (const item of inline) {
      parts.push(`### Comment ${item.id} on ${item.path}:${item.line ?? item.original_line ?? '?'}\n\n${item.body}`);
    }
  }
  if (mode === 'review') {
    const findings = apiList(`issues/${prNumber}/comments`).filter((item) => isBot(item) && item.body.startsWith('<!-- agent-findings -->')).at(-1);
    if (findings) parts.push(`## Agent review findings\n\n${findings.body}`);
  }
  if (mode === 'ci') {
    const pr = api(`pulls/${prNumber}`);
    const runs = api(`actions/runs?head_sha=${pr.head.sha}&event=pull_request&per_page=20`).workflow_runs;
    const failed = runs.find((run) => run.name === 'CI' && run.conclusion === 'failure');
    if (failed) {
      const log = execFileSync('gh', ['run', 'view', String(failed.id), '--repo', repo(), '--log-failed'], {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
      });
      parts.push(`## Failed CI log (last 200 lines)\n\n\`\`\`\n${log.split('\n').slice(-200).join('\n')}\n\`\`\``);
    }
  }
}

mkdirSync('.agent-run', { recursive: true });
writeFileSync('.agent-run/context.md', `${parts.join('\n\n')}\n`);
