// Safe to re-run. Usage: GITHUB_REPOSITORY=owner/repo node .agent/scripts/setup-repo.mjs --app-id <id> --reviewers <login[,login]>
import { api, gh, repo } from './lib/github.mjs';
import { METRICS_BRANCH } from './lib/store.mjs';

const option = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  const value = index > 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing --${name}`);
  return value;
};
const appId = Number(option('app-id'));
const reviewers = option('reviewers');

const LABELS = {
  'ready-for-agent': ['0e8a16', 'Queued for the pipeline'],
  'agent:in-progress': ['1d76db', 'Issue the pipeline is working on'],
  'needs-clarification': ['d93f0b', 'Planner is waiting for /answer'],
  'stage:planning': ['c5def5', 'Planner working'],
  'stage:plan-review': ['fbca04', 'Waiting for plan review'],
  'stage:implementing': ['c5def5', 'Implementer working'],
  'stage:agent-review': ['c5def5', 'CI and agent review'],
  'stage:human-review': ['fbca04', 'Waiting for final approval'],
  'plan-approved': ['0e8a16', 'Approves the plan at plan review'],
  'needs-human': ['b60205', 'The pipeline stopped and needs you'],
  'risk:low': ['c2e0c6', 'Low risk'],
  'risk:medium': ['fef2c0', 'Medium risk'],
  'risk:high': ['f9d0c4', 'High risk'],
  'plan-revised': ['ededed', 'Plan was revised after review'],
  'code-revised': ['ededed', 'Code was revised after review'],
  'review-round:1': ['ededed', 'Failed agent review rounds'],
  'review-round:2': ['ededed', 'Failed agent review rounds'],
  'review-round:3': ['ededed', 'Failed agent review rounds'],
  escape: ['b60205', 'Important change first noticed at merge'],
};

for (const [name, [color, description]] of Object.entries(LABELS)) {
  gh(['label', 'create', name, '--repo', repo(), '--color', color, '--description', description, '--force']);
}

for (const [name, value] of Object.entries({ AGENT_REVIEWERS: reviewers, MAX_ACTIVE_ISSUES: '1', CLAUDE_AUTH: 'oauth' })) {
  gh(['variable', 'set', name, '--repo', repo(), '--body', value]);
}

api(`/repos/${repo()}`, { method: 'PATCH', body: { allow_auto_merge: true, allow_merge_commit: true } });

let hasMetrics = true;
try {
  api(`git/ref/heads/${METRICS_BRANCH}`);
} catch {
  hasMetrics = false;
}
if (!hasMetrics) {
  const tree = api('git/trees', {
    method: 'POST',
    body: { tree: [{ path: 'README.md', mode: '100644', type: 'blob', content: '# Agent metrics\n\nWritten by the pipeline.\n' }] },
  });
  const commit = api('git/commits', { method: 'POST', body: { message: 'metrics: start', tree: tree.sha, parents: [] } });
  api('git/refs', { method: 'POST', body: { ref: `refs/heads/${METRICS_BRANCH}`, sha: commit.sha } });
}

api('branches/main/protection', {
  method: 'PUT',
  body: {
    required_status_checks: {
      strict: false,
      checks: [
        { context: 'ci' },
        { context: 'harness-guard' },
        { context: 'check-core-paths' },
        { context: 'agent-review', app_id: appId },
      ],
    },
    enforce_admins: false,
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      require_code_owner_reviews: true,
      dismiss_stale_reviews: true,
    },
    restrictions: null,
  },
});
console.log('Repository setup is complete.');
