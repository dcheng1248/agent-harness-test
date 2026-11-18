import { existsSync, readFileSync } from 'node:fs';
import { roundOf } from './lib/decide.mjs';
import { api, labelNames } from './lib/github.mjs';
import { RUN_FIELDS, makeRecord, summarizeExecution } from './lib/metrics.mjs';
import { appendLines } from './lib/store.mjs';

const { ISSUE, PR, STAGE_NAME, STARTED_AT, RESULT, EXECUTION_FILE, CLAUDE_AUTH } = process.env;

try {
  const messages = EXECUTION_FILE && existsSync(EXECUTION_FILE) ? JSON.parse(readFileSync(EXECUTION_FILE, 'utf8')) : [];
  const summary = summarizeExecution(messages);
  const api_login = CLAUDE_AUTH === 'api';
  appendLines('runs.jsonl', [
    makeRecord(RUN_FIELDS, {
      issue: Number(ISSUE),
      pr: PR ? Number(PR) : null,
      stage: STAGE_NAME,
      round: PR ? roundOf(labelNames(api(`pulls/${PR}`))) : 0,
      started_at: STARTED_AT,
      result: RESULT,
      login_type: api_login ? 'api' : 'oauth',
      cost_kind: api_login ? 'billed' : 'estimated',
      ...summary,
    }),
  ]);
} catch (error) {
  // Metrics must never fail the pipeline.
  console.log(`Metrics were not recorded: ${error.message}`);
}
