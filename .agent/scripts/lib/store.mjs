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

/** Creates an orphan branch holding only a README, if the branch does not exist yet. */
export function ensureBranch(branch, readme) {
  try {
    api(`git/ref/heads/${branch}`);
    return;
  } catch {
    // Not there yet.
  }
  const tree = api('git/trees', { method: 'POST', body: { tree: [{ path: 'README.md', mode: '100644', type: 'blob', content: readme }] } });
  const commit = api('git/commits', { method: 'POST', body: { message: `${branch}: start`, tree: tree.sha, parents: [] } });
  api('git/refs', { method: 'POST', body: { ref: `refs/heads/${branch}`, sha: commit.sha } });
}

/** Writes a file whose content is already base64, replacing it if it exists. */
export function putFile(branch, path, base64, message) {
  let sha;
  try {
    sha = api(`contents/${path}?ref=${branch}`).sha;
  } catch {
    // New file.
  }
  api(`contents/${path}`, { method: 'PUT', body: { message, branch, content: base64, ...(sha ? { sha } : {}) } });
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
