// Metrics go to a public branch. Only these fields, with short scalar values, may be written.

export const RUN_FIELDS = [
  'issue', 'pr', 'stage', 'round', 'started_at', 'duration_ms', 'result', 'login_type', 'model',
  'input_tokens', 'output_tokens', 'cost_usd', 'cost_kind',
];
export const PR_FIELDS = [
  'issue', 'pr', 'outcome', 'risk_plan', 'risk_after_code', 'risk_final', 'risk_corrected',
  'review_rounds', 'plan_revised', 'code_revised', 'human_edits', 'clarification_questions',
  'total_ms', 'waiting_on_human_ms', 'total_cost_usd', 'trial_would_skip_plan_gate',
  'trial_would_skip_final_approval',
];
export const FOLLOWUP_FIELDS = ['type', 'pr', 'linked_pr', 'at'];

export function makeRecord(fields, values) {
  const record = {};
  for (const key of Object.keys(values)) {
    if (!fields.includes(key)) throw new Error(`Metrics field not allowed: ${key}`);
  }
  for (const key of fields) {
    const value = values[key] ?? null;
    const scalar = value === null || ['number', 'boolean'].includes(typeof value);
    const shortText = typeof value === 'string' && value.length <= 64 && !/\s{2,}|[\r\n]/.test(value);
    if (!scalar && !shortText) throw new Error(`Metrics value not allowed for ${key}`);
    record[key] = value;
  }
  return record;
}

export function summarizeExecution(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const init = list.find((m) => m.type === 'system' && m.subtype === 'init');
  const result = [...list].reverse().find((m) => m.type === 'result');
  return {
    model: init?.model ?? null,
    duration_ms: result?.duration_ms ?? null,
    input_tokens: result?.usage?.input_tokens ?? null,
    output_tokens: result?.usage?.output_tokens ?? null,
    cost_usd: result?.total_cost_usd ?? null,
  };
}

/** Sums time spent under any waiting label, from labeled and unlabeled events. */
export function waitingMs(events, waitingLabels, endAt) {
  const open = new Map();
  let total = 0;
  const end = Date.parse(endAt);
  const ordered = [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  for (const { type, label, at } of ordered) {
    if (!waitingLabels.includes(label)) continue;
    if (type === 'labeled' && !open.has(label)) open.set(label, Date.parse(at));
    if (type === 'unlabeled' && open.has(label)) {
      total += Date.parse(at) - open.get(label);
      open.delete(label);
    }
  }
  for (const start of open.values()) total += end - start;
  return total;
}

export const parseJsonl = (text = '') =>
  text.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));

export const STREAK_TARGET = 20;

function isClean(pr, badPrs) {
  const order = ['low', 'medium', 'high'];
  const upgraded = order.indexOf(pr.risk_final) > order.indexOf(pr.risk_plan);
  return pr.outcome === 'merged' && !pr.human_edits && !upgraded && !pr.risk_corrected && !badPrs.has(pr.pr);
}

export function buildScorecard(prs, followups) {
  const badPrs = new Set(followups.filter((f) => ['revert', 'escape'].includes(f.type)).map((f) => f.pr));
  const rows = ['low', 'medium', 'high'].map((risk) => {
    const group = prs.filter((pr) => pr.risk_final === risk);
    const merged = group.filter((pr) => pr.outcome === 'merged');
    const clean = merged.filter((pr) => isClean(pr, badPrs)).length;
    const rounds = group.reduce((sum, pr) => sum + (pr.review_rounds ?? 0), 0);
    return { risk, total: group.length, merged: merged.length, clean, rounds, avg: group.length ? rounds / group.length : 0 };
  });
  let streak = 0;
  for (const pr of [...prs].reverse().filter((item) => item.risk_plan === 'low' && item.outcome === 'merged')) {
    if (!isClean(pr, badPrs)) break;
    streak += 1;
  }
  const lines = [
    '# Agent scorecard',
    '',
    `Low-risk clean streak: **${streak} / ${STREAK_TARGET}**${streak >= STREAK_TARGET ? ' (starting bar reached; any skip is still your manual decision)' : ''}`,
    '',
    '| Risk | PRs | Merged | Clean merges | Avg review rounds |',
    '|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.risk} | ${r.total} | ${r.merged} | ${r.clean} | ${r.avg.toFixed(1)} |`),
    '',
    `Reverts: ${followups.filter((f) => f.type === 'revert').length}. Escapes: ${followups.filter((f) => f.type === 'escape').length}.`,
    '',
  ];
  return { streak, rows, markdown: lines.join('\n') };
}
