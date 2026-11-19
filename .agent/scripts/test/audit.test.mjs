import { describe, expect, it } from 'vitest';
import { AUDIT_HEADING, auditFeedback } from '../lib/audit.mjs';

describe('audit feedback', () => {
  it('gives nothing when the audit passed', () => {
    expect(auditFeedback({ pass: true, problems: [] })).toBeNull();
  });

  it('lists every problem when the audit failed', () => {
    const text = auditFeedback({ pass: false, problems: ['padding is wrong', 'brief omits a path'] });
    expect(text.startsWith(AUDIT_HEADING)).toBe(true);
    expect(text).toContain('- padding is wrong');
    expect(text).toContain('- brief omits a path');
  });

  it.each([null, {}, { pass: false, problems: [] }])('treats a missing result as a failure: %j', (audit) => {
    expect(auditFeedback(audit)).toContain('- The audit returned no result.');
  });
});
