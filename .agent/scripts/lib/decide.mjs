// Pure decision logic for the dispatcher and router. No network or file access here.
import { retryMode } from './progress.mjs';

export const STAGES = [
  'stage:planning',
  'stage:plan-review',
  'stage:implementing',
  'stage:agent-review',
  'stage:human-review',
];
export const MAX_REVIEW_ROUNDS = 3;
export const GUARD_JOBS = ['harness-guard', 'check-core-paths'];

export const parseReviewers = (value = '') =>
  value.split(',').map((name) => name.trim().toLowerCase()).filter(Boolean);

const isReviewer = (actor, reviewers) => reviewers.includes(String(actor).toLowerCase());

export const issueFromBranch = (ref = '') => {
  const match = /^agent\/issue-(\d+)$/.exec(ref);
  return match ? Number(match[1]) : null;
};

export const stageOf = (labels) => labels.find((label) => STAGES.includes(label)) ?? null;

export const roundOf = (labels) =>
  labels.reduce((max, label) => {
    const match = /^review-round:(\d+)$/.exec(label);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

const blockerOpen = (blocker) => !(blocker.state === 'closed' && blocker.stateReason === 'completed');

export function decideDispatch({ issues, maxActive, reviewers }) {
  const active = issues.filter((issue) => issue.labels.includes('agent:in-progress'));
  const skipped = [];
  const eligible = [];
  const queued = issues
    .filter((issue) => issue.labels.includes('ready-for-agent') && !issue.labels.includes('agent:in-progress'))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.number - b.number);

  for (const issue of queued) {
    const blockers = issue.blockers.filter(blockerOpen).map((blocker) => blocker.number);
    if (!isReviewer(issue.author, reviewers)) {
      skipped.push({ number: issue.number, reason: 'author is not an allowed reviewer' });
    } else if (!isReviewer(issue.labeledBy, reviewers)) {
      skipped.push({ number: issue.number, reason: 'label was not added by an allowed reviewer' });
    } else if (blockers.length > 0) {
      skipped.push({ number: issue.number, reason: `blocked by #${blockers.join(', #')}` });
    } else {
      eligible.push(issue.number);
    }
  }

  const slots = Math.max(0, maxActive - active.length);
  return { start: eligible.slice(0, slots), waiting: eligible.slice(slots), skipped };
}

const hasReplan = (body = '') => /^\s*\/replan\b/m.test(body);

const replan = () => [
  { type: 'clearRounds' },
  { type: 'removeLabel', label: 'needs-human' },
  { type: 'addLabel', label: 'plan-revised' },
  { type: 'bump', field: 'planRevisions' },
  { type: 'setStage', stage: 'stage:planning' },
  { type: 'runPlan', mode: 'revise' },
];

const approvePlan = () => [
  { type: 'removeLabel', label: 'plan-approved' },
  { type: 'setStage', stage: 'stage:implementing' },
  { type: 'runImplement', mode: 'plan' },
];

function routeReview({ pr, review, actor, reviewers }) {
  if (!pr.isAgent || !isReviewer(actor, reviewers)) return [];
  const stage = stageOf(pr.labels);
  const needsHuman = pr.labels.includes('needs-human');
  const { state, body, commitId } = review;
  // A stopped run also waits at the code gate, so you can send it back with Request changes.
  const atCodeGate =
    stage === 'stage:human-review' ||
    (needsHuman && (stage === 'stage:agent-review' || stage === 'stage:implementing'));

  if (stage === 'stage:plan-review') {
    if (state === 'approved') return approvePlan();
    if (state === 'changes_requested' || hasReplan(body)) return replan();
    return [];
  }
  if (!atCodeGate) return [];
  if (hasReplan(body) && state !== 'approved') return replan();
  if (state === 'changes_requested') {
    // A run that stopped before every task passed review continues the plan instead of revising code.
    const mode = retryMode(pr.progress);
    if (mode !== 'human') {
      return [
        { type: 'clearRounds' },
        { type: 'removeLabel', label: 'needs-human' },
        { type: 'setStage', stage: 'stage:implementing' },
        { type: 'runImplement', mode },
      ];
    }
    return [
      { type: 'clearRounds' },
      { type: 'removeLabel', label: 'needs-human' },
      { type: 'addLabel', label: 'code-revised' },
      { type: 'bump', field: 'codeRevisions' },
      { type: 'setStage', stage: 'stage:implementing' },
      { type: 'runImplement', mode: 'human' },
    ];
  }
  if (state === 'approved' && stage === 'stage:human-review' && !needsHuman) {
    if (commitId !== pr.headSha) {
      return [{ type: 'comment', body: 'This approval is for an older commit, so auto-merge was not enabled.' }];
    }
    return [{ type: 'enableAutoMerge', sha: pr.headSha }];
  }
  return [];
}

export function failedRound(labels, mode) {
  const next = roundOf(labels) + 1;
  const actions = [{ type: 'setRound', round: next }, { type: 'bump', field: 'reviewRounds' }];
  if (next >= MAX_REVIEW_ROUNDS) {
    return [...actions, { type: 'addLabel', label: 'needs-human' }, { type: 'requestReview' }];
  }
  return [...actions, { type: 'setStage', stage: 'stage:implementing' }, { type: 'runImplement', mode }];
}

function routeCi({ pr, sha, conclusion, failedJobs }) {
  if (!pr.isAgent || stageOf(pr.labels) !== 'stage:agent-review') return [];
  if (pr.labels.includes('needs-human') || sha !== pr.headSha) return [];
  if (conclusion === 'success') return [{ type: 'runReview' }];
  if (conclusion === 'cancelled' || conclusion === 'skipped') return [];
  if (failedJobs.some((job) => GUARD_JOBS.includes(job))) {
    return [
      { type: 'addLabel', label: 'needs-human' },
      { type: 'comment', body: `A guard check failed: ${failedJobs.join(', ')}. This needs your decision.` },
      { type: 'requestReview' },
    ];
  }
  return failedRound(pr.labels, 'ci');
}

const hasResume = (body = '') => /^\s*\/resume\b/.test(body);

/**
 * `/resume` on a PR paused with `needs-human` in `stage:agent-review`, after you fixed the cause.
 * `headCi` is the latest CI run on the PR's head commit: { status, conclusion, failedJobs }, or null.
 */
function routeResume({ pr, actor, body, reviewers, headCi }) {
  if (!pr.isAgent || !hasResume(body) || !isReviewer(actor, reviewers)) return [];
  if (!pr.labels.includes('needs-human') || stageOf(pr.labels) !== 'stage:agent-review') {
    return [{
      type: 'comment',
      body: '`/resume` only continues a PR paused with `needs-human` at `stage:agent-review`. Nothing was changed.',
    }];
  }
  if (!headCi || headCi.status !== 'completed') {
    return [
      { type: 'removeLabel', label: 'needs-human' },
      { type: 'comment', body: 'Resumed. The agent review starts when CI passes on the latest commit.' },
    ];
  }
  if (headCi.conclusion === 'success') {
    return [{ type: 'removeLabel', label: 'needs-human' }, { type: 'runReview' }];
  }
  const jobs = headCi.failedJobs.length ? headCi.failedJobs.join(', ') : headCi.conclusion;
  return [{
    type: 'comment',
    body: `CI on the latest commit did not pass (${jobs}), so the PR stays paused. Fix it, then comment \`/resume\` again.`,
  }];
}

export function routeEvent(event) {
  const { kind, actor, reviewers } = event;
  if (kind === 'answer') {
    const { issue, body } = event;
    const ready =
      /^\/answer\b/.test(body.trimStart()) &&
      isReviewer(actor, reviewers) &&
      issue.labels.includes('needs-clarification') &&
      issue.labels.includes('agent:in-progress');
    return ready
      ? [{ type: 'removeIssueLabel', label: 'needs-clarification' }, { type: 'runPlan', mode: 'answer' }]
      : [];
  }
  if (kind === 'review') return routeReview(event);
  if (kind === 'resume') return routeResume(event);
  if (kind === 'label') {
    const { pr, label } = event;
    const allowed =
      label === 'plan-approved' &&
      pr.isAgent &&
      isReviewer(actor, reviewers) &&
      stageOf(pr.labels) === 'stage:plan-review';
    return allowed ? approvePlan() : [];
  }
  if (kind === 'ci') return routeCi(event);
  return [];
}

/** What to do after a failed run, by the workflow's STAGE_NAME. Matches docs/harness/troubleshooting.md. */
export function failureHint(stage) {
  if (stage === 'agent review' || stage === 'review') {
    return 'To rerun only the agent review, comment `/resume` on this PR. To send the code back to the implementer, request changes.';
  }
  if (stage === 'implement') return 'To retry, request changes on this PR.';
  return 'To retry, remove `needs-human` and `agent:in-progress` from the issue, then add `ready-for-agent`.';
}
