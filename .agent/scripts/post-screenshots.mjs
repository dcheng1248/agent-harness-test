// Uploads screenshots to the agent-screenshots branch and keeps one PR comment up to date.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { api, apiList, comment, prFiles, repo } from './lib/github.mjs';
import { changesUi, screenshotComment } from './lib/screenshots.mjs';
import { ensureBranch, putFile } from './lib/store.mjs';

const BRANCH = 'agent-screenshots';
const OUT = '.agent-run/screenshots';
const { PR: pr, REVIEWED_SHA: sha } = process.env;

if (process.argv[2] === 'check') {
  appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changesUi(prFiles(pr))}\n`);
  process.exit(0);
}

const manifest = existsSync(`${OUT}/manifest.json`) ? JSON.parse(readFileSync(`${OUT}/manifest.json`, 'utf8')) : [];
ensureBranch(BRANCH, '# Agent screenshots\n\nWritten by the pipeline for PR review.\n');
for (const shot of manifest.filter((entry) => !entry.error)) {
  const content = readFileSync(`${OUT}/${shot.name}.png`).toString('base64');
  putFile(BRANCH, `pr-${pr}/${sha.slice(0, 7)}/${shot.name}.png`, content, `screenshots: PR ${pr} ${shot.name}`);
}

const body = screenshotComment({ repo: repo(), branch: BRANCH, pr, sha, shots: manifest });
const existing = apiList(`issues/${pr}/comments`).find(
  (item) => item.user.type === 'Bot' && item.body.startsWith('<!-- agent-screenshots -->'),
);
if (existing) api(`issues/comments/${existing.id}`, { method: 'PATCH', body: { body } });
else comment(pr, body);
