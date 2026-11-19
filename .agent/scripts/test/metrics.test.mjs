import { describe, expect, it } from 'vitest';
import {
  PR_FIELDS,
  RUN_FIELDS,
  buildScorecard,
  makeRecord,
  parseJsonl,
  summarizeExecution,
  waitingMs,
} from '../lib/metrics.mjs';

const pr = (number, extra = {}) => ({
  pr: number, outcome: 'merged', risk_plan: 'low', risk_final: 'low', risk_corrected: false,
  human_edits: 0, review_rounds: 0, ...extra,
});

describe('metric records', () => {
  it('fills every allowed field', () => {
    const record = makeRecord(RUN_FIELDS, { issue: 1, result: 'success' });
    expect(Object.keys(record)).toEqual(RUN_FIELDS);
    expect(record.pr).toBeNull();
  });

  it.each(['prompt', 'transcript', 'code', 'issue_text', 'comment', 'secret'])('rejects the field %s', (field) => {
    expect(() => makeRecord(PR_FIELDS, { [field]: 'x' })).toThrow('not allowed');
  });

  it('rejects long text, multi-line text and objects in allowed fields', () => {
    expect(() => makeRecord(RUN_FIELDS, { result: 'x'.repeat(65) })).toThrow('not allowed');
    expect(() => makeRecord(RUN_FIELDS, { result: 'a\nb' })).toThrow('not allowed');
    expect(() => makeRecord(RUN_FIELDS, { result: { text: 'x' } })).toThrow('not allowed');
  });

  it('reads only summary numbers from an agent run', () => {
    const tool = (name) => ({ type: 'tool_use', name, input: { prompt: 'private' } });
    const summary = summarizeExecution([
      { type: 'system', subtype: 'init', model: 'm' },
      { type: 'assistant', message: 'private' },
      { type: 'assistant', message: { content: [{ type: 'text', text: 'private' }, tool('Skill'), tool('Task')] } },
      { type: 'assistant', message: { content: [tool('Agent'), tool('Read')] } },
      { type: 'assistant', parent_tool_use_id: 'helper', message: { content: [tool('Agent'), tool('Edit')] } },
      {
        type: 'result',
        duration_ms: 5,
        total_cost_usd: 0.5,
        usage: { input_tokens: 1, cache_read_input_tokens: 10, cache_creation_input_tokens: 100, output_tokens: 2 },
        result: 'private',
      },
    ]);
    expect(summary).toEqual({
      model: 'm', duration_ms: 5, input_tokens: 111, output_tokens: 2, cost_usd: 0.5,
      tool_calls: 4, subagent_calls: 2, skill_calls: 1,
    });
    expect(JSON.stringify(makeRecord(RUN_FIELDS, summary))).not.toContain('private');
  });

  it('handles a run that produced no result', () => {
    expect(summarizeExecution([])).toMatchObject({ input_tokens: null, tool_calls: 0, subagent_calls: 0 });
  });

  it('adds up waiting time', () => {
    const events = [
      { type: 'labeled', label: 'stage:plan-review', at: '2026-01-01T00:00:00Z' },
      { type: 'unlabeled', label: 'stage:plan-review', at: '2026-01-01T00:01:00Z' },
      { type: 'labeled', label: 'stage:human-review', at: '2026-01-01T00:02:00Z' },
      { type: 'labeled', label: 'other', at: '2026-01-01T00:02:00Z' },
    ];
    expect(waitingMs(events, ['stage:plan-review', 'stage:human-review'], '2026-01-01T00:03:00Z')).toBe(120000);
  });

  it('parses JSON lines', () => {
    expect(parseJsonl('{"a":1}\n\n{"a":2}\n')).toEqual([{ a: 1 }, { a: 2 }]);
  });
});

describe('scorecard', () => {
  it('counts the current clean low-risk streak', () => {
    expect(buildScorecard([pr(1), pr(2), pr(3)], []).streak).toBe(3);
  });

  it.each([
    ['human edits', { human_edits: 1 }],
    ['a risk upgrade', { risk_final: 'medium' }],
    ['a corrected rating', { risk_corrected: true }],
  ])('resets the streak after %s', (_name, change) => {
    expect(buildScorecard([pr(1), pr(2, change), pr(3)], []).streak).toBe(1);
  });

  it.each(['revert', 'escape'])('resets the streak after a %s', (type) => {
    expect(buildScorecard([pr(1), pr(2), pr(3)], [{ type, pr: 2 }]).streak).toBe(1);
  });

  it('reports by risk level and marks the starting bar', () => {
    const prs = Array.from({ length: 20 }, (_, index) => pr(index + 1));
    const card = buildScorecard([...prs, pr(21, { risk_plan: 'high', risk_final: 'high', review_rounds: 2 })], []);
    expect(card.rows.find((row) => row.risk === 'low').clean).toBe(20);
    expect(card.rows.find((row) => row.risk === 'high').avg).toBe(2);
    expect(card.markdown).toContain('starting bar reached');
  });
});
