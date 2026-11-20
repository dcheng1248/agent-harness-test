import { readFileSync } from 'node:fs';
import { applyActions } from './lib/actions.mjs';
import { issueFromBranch, parseReviewers, routeEvent } from './lib/decide.mjs';
import { api, apiList, getState, labelNames, prForBranch } from './lib/github.mjs';

const payload = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const reviewers = parseReviewers(process.env.AGENT_REVIEWERS);

const describePr = (raw) => ({
  isAgent: issueFromBranch(raw.head.ref) !== null,
  labels: labelNames(raw),
  headSha: raw.head.sha,
});

const failedJobsOf = (runId) =>
  apiList(`actions/runs/${runId}/jobs`)
    .flatMap((page) => page.jobs ?? page)
    .filter((job) => job.conclusion === 'failure')
    .map((job) => job.name);

/** The latest CI run on a commit, as { status, conclusion, failedJobs }, or null if there is none. */
function latestCi(sha) {
  const ci = api(`actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=1`).workflow_runs?.[0];
  if (!ci) return null;
  return { status: ci.status, conclusion: ci.conclusion, failedJobs: ci.status === 'completed' ? failedJobsOf(ci.id) : [] };
}

function run(event, raw) {
  const pr = describePr(raw);
  if (event.kind === 'review' && pr.isAgent) {
    const { tasksDone, tasksTotal } = getState(raw.number);
    pr.progress = { tasksDone, tasksTotal };
  }
  const actions = routeEvent({ ...event, pr, reviewers });
  applyActions(actions, { issue: issueFromBranch(raw.head.ref), pr: raw.number, labels: pr.labels });
}

switch (process.env.GITHUB_EVENT_NAME) {
  case 'issue_comment': {
    if (payload.issue.pull_request) {
      const raw = api(`pulls/${payload.issue.number}`);
      run({ kind: 'resume', actor: payload.comment.user.login, body: payload.comment.body, headCi: latestCi(raw.head.sha) }, raw);
      break;
    }
    const issue = api(`issues/${payload.issue.number}`);
    const labels = labelNames(issue);
    const actions = routeEvent({
      kind: 'answer',
      actor: payload.comment.user.login,
      body: payload.comment.body,
      issue: { labels },
      reviewers,
    });
    const pr = actions.length ? prForBranch(`agent/issue-${issue.number}`) : null;
    applyActions(actions, { issue: issue.number, pr: pr?.number, labels });
    break;
  }
  case 'pull_request_review': {
    const { review } = payload;
    run(
      {
        kind: 'review',
        actor: review.user.login,
        review: { state: review.state.toLowerCase(), body: review.body ?? '', commitId: review.commit_id },
      },
      api(`pulls/${payload.pull_request.number}`),
    );
    break;
  }
  case 'pull_request':
    run({ kind: 'label', actor: payload.sender.login, label: payload.label.name }, api(`pulls/${payload.pull_request.number}`));
    break;
  case 'workflow_run': {
    const { workflow_run: ci } = payload;
    if (issueFromBranch(ci.head_branch) === null) break;
    const raw = prForBranch(ci.head_branch);
    if (!raw) break;
    run({ kind: 'ci', sha: ci.head_sha, conclusion: ci.conclusion, failedJobs: failedJobsOf(ci.id) }, api(`pulls/${raw.number}`));
    break;
  }
  default:
    throw new Error(`Unsupported event: ${process.env.GITHUB_EVENT_NAME}`);
}
