import { describe, expect, it } from 'vitest';
import { REQUIRED_REVIEW_HELPERS, checkHelpers, countTasks, requiredImplementHelpers } from '../lib/enforce.mjs';

describe('helper agent rules', () => {
  it('counts task headings at any depth', () => {
    const plan = '# Plan\n## Task 1: content\n### Task 2: web\n## Task Overview\n#### Task notes\n## Task 3: repo\n';
    expect(countTasks(plan)).toBe(3);
    expect(countTasks('# Plan\nNo tasks.\n')).toBe(0);
  });

  it('needs one implementer per task plus a review in plan mode', () => {
    expect(requiredImplementHelpers('plan', 3)).toBe(4);
    expect(requiredImplementHelpers('plan', 0)).toBe(2);
  });

  it('needs an implementer and a reviewer in fix modes', () => {
    for (const mode of ['review', 'ci', 'human']) expect(requiredImplementHelpers(mode, 5)).toBe(2);
  });

  it('accepts enough helpers and explains a shortfall', () => {
    expect(checkHelpers(4, 4, 'implement')).toBeNull();
    expect(checkHelpers(0, REQUIRED_REVIEW_HELPERS, 'review')).toContain('used 0 helper agents');
    expect(checkHelpers(1, 2, 'review')).toContain('used 1 helper agent,');
  });
});
