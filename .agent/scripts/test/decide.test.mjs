import { describe, expect, it } from 'vitest';
import { decideDispatch, failedRound, issueFromBranch, parseReviewers, routeEvent } from '../lib/decide.mjs';

const reviewers = ['owner'];
const issue = (number, extra = {}) => ({
  number,
  createdAt: `2026-01-0${number}T00:00:00Z`,
  author: 'owner',
  labeledBy: 'owner',
  labels: ['ready-for-agent'],
  blockers: [],
  ...extra,
});
const pr = (labels, extra = {}) => ({ isAgent: true, labels, headSha: 'head', ...extra });
const types = (actions) => actions.map((action) => action.type);
const review = (labels, state, extra = {}) =>
  routeEvent({ kind: 'review', actor: 'owner', reviewers, pr: pr(labels), review: { state, body: '', commitId: 'head', ...extra } });

describe('decideDispatch', () => {
  it('starts the oldest eligible issue up to the limit', () => {
    const result = decideDispatch({ issues: [issue(2), issue(1)], maxActive: 1, reviewers });
    expect(result.start).toEqual([1]);
    expect(result.waiting).toEqual([2]);
  });

  it('starts nothing while the limit is reached', () => {
    const active = issue(1, { labels: ['agent:in-progress', 'needs-clarification'] });
    expect(decideDispatch({ issues: [active, issue(2)], maxActive: 1, reviewers }).start).toEqual([]);
  });

  it('honours a higher limit', () => {
    expect(decideDispatch({ issues: [issue(1), issue(2)], maxActive: 2, reviewers }).start).toEqual([1, 2]);
  });

  it.each([
    [{ state: 'open', stateReason: null }, false],
    [{ state: 'closed', stateReason: 'not_planned' }, false],
    [{ state: 'closed', stateReason: 'duplicate' }, false],
    [{ state: 'closed', stateReason: 'completed' }, true],
  ])('handles blocker %o', (blocker, starts) => {
    const blocked = issue(1, { blockers: [{ number: 9, ...blocker }] });
    expect(decideDispatch({ issues: [blocked], maxActive: 1, reviewers }).start).toEqual(starts ? [1] : []);
  });

  it('moves past a blocked issue to the next eligible one', () => {
    const blocked = issue(1, { blockers: [{ number: 9, state: 'open', stateReason: null }] });
    expect(decideDispatch({ issues: [blocked, issue(2)], maxActive: 1, reviewers }).start).toEqual([2]);
  });

  it('rejects issues from outsiders', () => {
    const issues = [issue(1, { author: 'stranger' }), issue(2, { labeledBy: 'stranger' })];
    const result = decideDispatch({ issues, maxActive: 1, reviewers });
    expect(result.start).toEqual([]);
    expect(result.skipped).toHaveLength(2);
  });
});

describe('routeEvent: clarification', () => {
  const open = { labels: ['agent:in-progress', 'needs-clarification'] };
  const answer = (actor, body, target = open) => routeEvent({ kind: 'answer', actor, reviewers, issue: target, body });

  it('resumes planning on /answer from a reviewer', () => {
    expect(answer('owner', '/answer use option A').at(-1)).toEqual({ type: 'runPlan', mode: 'answer' });
  });

  it('ignores other accounts, other comments and issues not waiting', () => {
    expect(answer('stranger', '/answer hi')).toEqual([]);
    expect(answer('owner', 'thanks')).toEqual([]);
    expect(answer('owner', '/answer hi', { labels: ['agent:in-progress'] })).toEqual([]);
  });
});

describe('routeEvent: plan gate', () => {
  it('starts coding on approval and never merges', () => {
    const actions = review(['stage:plan-review'], 'approved');
    expect(types(actions)).toContain('runImplement');
    expect(types(actions)).not.toContain('enableAutoMerge');
  });

  it('accepts the plan-approved label only from a reviewer at plan review', () => {
    const event = { kind: 'label', label: 'plan-approved', reviewers, pr: pr(['stage:plan-review']) };
    expect(types(routeEvent({ ...event, actor: 'owner' }))).not.toContain('enableAutoMerge');
    expect(types(routeEvent({ ...event, actor: 'owner' }))).toContain('runImplement');
    expect(routeEvent({ ...event, actor: 'stranger' })).toEqual([]);
    expect(routeEvent({ ...event, actor: 'owner', pr: pr(['stage:human-review']) })).toEqual([]);
  });

  it('sends requested changes back to the planner', () => {
    expect(review(['stage:plan-review'], 'changes_requested')).toContainEqual({ type: 'runPlan', mode: 'revise' });
  });

  it('ignores reviews from other accounts', () => {
    const event = { kind: 'review', actor: 'stranger', reviewers, pr: pr(['stage:plan-review']), review: { state: 'approved', body: '', commitId: 'head' } };
    expect(routeEvent(event)).toEqual([]);
  });
});

describe('routeEvent: final gate', () => {
  it('enables auto-merge only for approval of the latest commit', () => {
    expect(review(['stage:human-review'], 'approved')).toEqual([{ type: 'enableAutoMerge', sha: 'head' }]);
    expect(types(review(['stage:human-review'], 'approved', { commitId: 'old' }))).toEqual(['comment']);
  });

  it('does not merge from other stages', () => {
    for (const stage of ['stage:planning', 'stage:implementing', 'stage:agent-review']) {
      expect(types(review([stage], 'approved'))).not.toContain('enableAutoMerge');
    }
    expect(types(review(['stage:agent-review', 'needs-human'], 'approved'))).not.toContain('enableAutoMerge');
  });

  it('sends code changes to implement and resets rounds', () => {
    const actions = review(['stage:human-review', 'review-round:2'], 'changes_requested');
    expect(types(actions)).toContain('clearRounds');
    expect(actions).toContainEqual({ type: 'runImplement', mode: 'human' });
  });

  it('sends /replan to the planner', () => {
    const actions = review(['stage:human-review'], 'changes_requested', { body: 'Rethink.\n/replan' });
    expect(actions).toContainEqual({ type: 'runPlan', mode: 'revise' });
    expect(types(actions)).toContain('clearRounds');
    expect(types(actions)).not.toContain('runImplement');
  });

  it('lets you redirect a PR that gave up', () => {
    expect(review(['stage:agent-review', 'needs-human'], 'changes_requested')).toContainEqual({ type: 'runImplement', mode: 'human' });
  });
});

describe('routeEvent: CI', () => {
  const ci = (labels, conclusion, extra = {}) =>
    routeEvent({ kind: 'ci', pr: pr(labels), sha: 'head', conclusion, failedJobs: [], ...extra });

  it('starts review when CI passes on the latest commit', () => {
    expect(ci(['stage:agent-review'], 'success')).toEqual([{ type: 'runReview' }]);
    expect(ci(['stage:agent-review'], 'success', { sha: 'old' })).toEqual([]);
    expect(ci(['stage:implementing'], 'success')).toEqual([]);
  });

  it('counts a failure as a round', () => {
    expect(ci(['stage:agent-review'], 'failure')).toContainEqual({ type: 'runImplement', mode: 'ci' });
  });

  it('escalates guard failures instead of retrying', () => {
    const actions = ci(['stage:agent-review'], 'failure', { failedJobs: ['check-core-paths'] });
    expect(actions).toContainEqual({ type: 'addLabel', label: 'needs-human' });
    expect(types(actions)).not.toContain('runImplement');
  });
});

describe('helpers', () => {
  it('gives up after three failed rounds', () => {
    expect(types(failedRound(['review-round:1'], 'review'))).toContain('runImplement');
    const actions = failedRound(['review-round:2'], 'review');
    expect(actions).toContainEqual({ type: 'addLabel', label: 'needs-human' });
    expect(types(actions)).not.toContain('runImplement');
  });

  it('parses branches and reviewer lists', () => {
    expect(issueFromBranch('agent/issue-12')).toBe(12);
    expect(issueFromBranch('feature/x')).toBeNull();
    expect(parseReviewers(' Owner, other ,')).toEqual(['owner', 'other']);
  });
});
