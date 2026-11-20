import { describe, expect, it } from 'vitest';
import { retryMode, reviewPassed, reviewedThrough, taskReviews } from '../lib/progress.mjs';

const PASS = '### Spec Compliance\n- ✅ Spec compliant\n### Assessment\n**Task quality:** Approved\n';
const FAIL = '### Spec Compliance\n- ❌ Issues found: missing x\n### Assessment\n**Task quality:** Needs fixes\n';
const FIXED = '### Verdict\n**Fix round:** All findings addressed, no new Critical/Important breakage\n';
const OPEN = '### Verdict\n**Fix round:** Findings remain open — a\n';

let id = 0;
/** One helper call from the main agent and its result, as two execution-log messages. */
function helper(description, head, report, { name = 'Agent', error = false, parent = null } = {}) {
  id += 1;
  const toolId = `tool-${id}`;
  return [
    {
      type: 'assistant',
      parent_tool_use_id: parent,
      message: { content: [{ type: 'tool_use', id: toolId, name, input: { description, prompt: `**Base:** aaaaaaa\n**Head:** ${head}\n` } }] },
    },
    {
      type: 'user',
      parent_tool_use_id: parent,
      message: { content: [{ type: 'tool_result', tool_use_id: toolId, is_error: error, content: [{ type: 'text', text: report }] }] },
    },
  ];
}

describe('reading reviewer verdicts', () => {
  it('passes a clean task review and an all-addressed re-review', () => {
    expect(reviewPassed('review', PASS)).toBe(true);
    expect(reviewPassed('re-review', FIXED)).toBe(true);
  });

  it('fails anything else', () => {
    expect(reviewPassed('review', FAIL)).toBe(false);
    expect(reviewPassed('review', `${PASS}\n- ❌ Issues found: y`)).toBe(false);
    expect(reviewPassed('review', '- ✅ Spec compliant\n**Task quality:** Needs fixes')).toBe(false);
    expect(reviewPassed('re-review', OPEN)).toBe(false);
  });
});

describe('finding reviewed tasks in the execution log', () => {
  it('lists task reviews with their verdict and reviewed commit, ignoring other helpers', () => {
    const log = [
      ...helper('Implement Task 1', '1111111', 'done'),
      ...helper('Review Task 1 (spec + quality)', '1111111', PASS),
      ...helper('Review Task 2 (spec + quality)', '2222222', FAIL, { name: 'Task' }),
      ...helper('Re-review Task 2 fix round 1', '2222223', FIXED),
    ];
    expect(taskReviews(log)).toEqual([
      { task: 1, kind: 'review', passed: true, head: '1111111' },
      { task: 2, kind: 'review', passed: false, head: '2222222' },
      { task: 2, kind: 're-review', passed: true, head: '2222223' },
    ]);
  });

  it('ignores helpers started by other helpers, and failed helper calls', () => {
    const log = [
      ...helper('Review Task 1 (spec + quality)', '1111111', PASS, { parent: 'tool-x' }),
      ...helper('Review Task 2 (spec + quality)', '2222222', PASS, { error: true }),
    ];
    expect(taskReviews(log).map((r) => [r.task, r.passed])).toEqual([[2, false]]);
  });

  it('accepts a plain string result', () => {
    const log = helper('Review Task 1 (spec + quality)', '1111111', PASS);
    log[1].message.content[0].content = PASS;
    expect(taskReviews(log)[0].passed).toBe(true);
  });
});

describe('choosing what to save', () => {
  const review = (task, passed, head = `${task}`.repeat(7)) => ({ task, kind: 'review', passed, head });

  it('stops at the first task whose latest review did not pass', () => {
    const reviews = [review(1, true), review(2, true), review(3, false), review(4, true)];
    expect(reviewedThrough(reviews, 1)).toEqual({ task: 2, head: '2222222' });
  });

  it('uses the latest review of a task', () => {
    expect(reviewedThrough([review(1, false), review(1, true, 'abcdef1')], 1)).toEqual({ task: 1, head: 'abcdef1' });
    expect(reviewedThrough([review(1, true), review(1, false)], 1)).toBeNull();
  });

  it('starts from the first task this run had to do', () => {
    expect(reviewedThrough([review(5, true)], 5)).toEqual({ task: 5, head: '5555555' });
    expect(reviewedThrough([review(5, true)], 1)).toBeNull();
  });

  it('does not count a pass without a reviewed commit', () => {
    expect(reviewedThrough([review(1, true, null)], 1)).toBeNull();
  });
});

describe('the mode a retry starts', () => {
  it.each([
    [{}, 'human'],
    [{ tasksDone: 6, tasksTotal: 6 }, 'human'],
    [{ tasksDone: 0, tasksTotal: 6 }, 'plan'],
    [{ tasksDone: 4, tasksTotal: 6 }, 'resume'],
  ])('%o gives %s', (progress, mode) => {
    expect(retryMode(progress)).toBe(mode);
  });

  it('treats missing progress as finished work', () => {
    expect(retryMode(undefined)).toBe('human');
  });
});
