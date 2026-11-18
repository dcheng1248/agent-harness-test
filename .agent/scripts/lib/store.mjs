import { api } from './github.mjs';

export const METRICS_BRANCH = 'agent-metrics';

export function readMetricsFile(path) {
  try {
    const file = api(`contents/${path}?ref=${METRICS_BRANCH}`);
    return { sha: file.sha, text: Buffer.from(file.content, 'base64').toString('utf8') };
  } catch {
    return { sha: undefined, text: '' };
  }
}

export function writeMetricsFile(path, text, sha, message) {
  api(`contents/${path}`, {
    method: 'PUT',
    body: { message, branch: METRICS_BRANCH, content: Buffer.from(text).toString('base64'), ...(sha ? { sha } : {}) },
  });
}

export function appendLines(path, records) {
  if (records.length === 0) return;
  for (let attempt = 1; ; attempt += 1) {
    const { sha, text } = readMetricsFile(path);
    try {
      writeMetricsFile(path, `${text}${records.map((record) => JSON.stringify(record)).join('\n')}\n`, sha, `metrics: update ${path}`);
      return;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
}
