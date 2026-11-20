import { execFileSync } from 'node:child_process';
import { STAGES } from './decide.mjs';

export const repo = () => {
  const value = process.env.GITHUB_REPOSITORY;
  if (!value) throw new Error('GITHUB_REPOSITORY is not set');
  return value;
};

export const gh = (args, input) =>
  execFileSync('gh', args, { encoding: 'utf8', input, maxBuffer: 50 * 1024 * 1024, stdio: ['pipe', 'pipe', 'inherit'] });

export const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }).trim();

export function api(path, { method = 'GET', body } = {}) {
  const args = ['api', '-X', method, path.startsWith('/') ? path : `repos/${repo()}/${path}`];
  if (body !== undefined) args.push('--input', '-');
  const output = gh(args, body === undefined ? undefined : JSON.stringify(body));
  return output.trim() ? JSON.parse(output) : null;
}

export function apiList(path) {
  const separator = path.includes('?') ? '&' : '?';
  const output = gh(['api', '--paginate', '--slurp', `repos/${repo()}/${path}${separator}per_page=100`]);
  return JSON.parse(output).flat();
}

export const labelNames = (item) => item.labels.map((label) => (typeof label === 'string' ? label : label.name));

export const addLabels = (number, labels) => api(`issues/${number}/labels`, { method: 'POST', body: { labels } });

export function removeLabel(number, label) {
  try {
    api(`issues/${number}/labels/${encodeURIComponent(label)}`, { method: 'DELETE' });
  } catch {
    // The label was not present.
  }
}

export function setStage(number, stage, currentLabels) {
  for (const label of currentLabels.filter((name) => STAGES.includes(name) && name !== stage)) removeLabel(number, label);
  addLabels(number, [stage]);
}

export const comment = (number, body) => api(`issues/${number}/comments`, { method: 'POST', body: { body } });

export const runWorkflow = (file, inputs) =>
  api(`actions/workflows/${file}/dispatches`, { method: 'POST', body: { ref: 'main', inputs } });

export const prFiles = (number) => apiList(`pulls/${number}/files`).map((file) => file.filename);

export const requestReview = (number, reviewers) =>
  api(`pulls/${number}/requested_reviewers`, { method: 'POST', body: { reviewers } });

export function prForBranch(branch) {
  const [owner] = repo().split('/');
  return apiList(`pulls?state=open&head=${owner}:${encodeURIComponent(branch)}`)[0] ?? null;
}

const STATE_MARKER = '<!-- agent-state:';

function stateComment(number) {
  return apiList(`issues/${number}/comments`).find((item) => item.user.type === 'Bot' && item.body.startsWith(STATE_MARKER)) ?? null;
}

export function getState(number) {
  const found = stateComment(number);
  if (!found) return {};
  return JSON.parse(found.body.slice(STATE_MARKER.length, found.body.indexOf('-->')).trim());
}

export function updateState(number, change) {
  const found = stateComment(number);
  const current = found ? JSON.parse(found.body.slice(STATE_MARKER.length, found.body.indexOf('-->')).trim()) : {};
  const next = { ...current, ...change };
  const body = `${STATE_MARKER} ${JSON.stringify(next)} -->\nPipeline bookkeeping. Please leave this comment in place.`;
  if (found) api(`issues/comments/${found.id}`, { method: 'PATCH', body: { body } });
  else comment(number, body);
  return next;
}

export function bumpState(number, field) {
  const state = getState(number);
  return updateState(number, { [field]: (state[field] ?? 0) + 1 });
}

export function pushBranch(branch, commit = 'HEAD') {
  const token = process.env.GH_TOKEN;
  const remote = `https://x-access-token:${token}@github.com/${repo()}.git`;
  try {
    execFileSync('git', ['push', remote, `${commit}:refs/heads/${branch}`], { stdio: 'pipe' });
  } catch (error) {
    const detail = String(error.stderr ?? '').split(token).join('***').trim();
    throw new Error(`Could not push ${branch}${detail ? `:\n${detail}` : ''}`);
  }
}

export const reviewersFromEnv = () =>
  (process.env.AGENT_REVIEWERS ?? '').split(',').map((name) => name.trim()).filter(Boolean);
