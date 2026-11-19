// The planner gets one automatic retry after a failed audit, with the audit's problems as input.

export const AUDIT_HEADING = '## Plan audit problems (fix these)';

/** Returns null when the audit passed, otherwise a context section listing its problems. */
export function auditFeedback(audit) {
  if (audit?.pass === true) return null;
  const problems = audit?.problems?.length ? audit.problems : ['The audit returned no result.'];
  return [
    AUDIT_HEADING,
    '',
    'An independent audit rejected your plan. The plan files from your first attempt are still in place. Fix every problem below, keep everything else, and return the result as usual.',
    '',
    ...problems.map((problem) => `- ${problem}`),
  ].join('\n');
}
