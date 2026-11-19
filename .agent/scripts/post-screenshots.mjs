// Uploads changed and new screenshots to the agent-screenshots branch and keeps one PR comment up to date.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { api, apiList, comment, prFiles, repo } from './lib/github.mjs';
import { changesUi, screenshotComment, uploads } from './lib/screenshots.mjs';
import { ensureBranch, putFile } from './lib/store.mjs';

const BRANCH = 'agent-screenshots';
const DIR = '.agent-run/screenshots';
const { PR: pr, REVIEWED_SHA: sha } = process.env;

if (process.argv[2] === 'check') {
  appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changesUi(prFiles(pr))}\n`);
  process.exit(0);
}

const results = existsSync(`${DIR}/result.json`) ? JSON.parse(readFileSync(`${DIR}/result.json`, 'utf8')) : [];
ensureBranch(BRANCH, '# Agent screenshots\n\nWritten by the pipeline for PR review.\n');
for (const { side, name } of uploads(results)) {
  const content = readFileSync(`${DIR}/${side}/${name}.png`).toString('base64');
  putFile(BRANCH, `pr-${pr}/${sha.slice(0, 7)}/${side}/${name}.png`, content, `screenshots: PR ${pr} ${side} ${name}`);
}

const body = screenshotComment({ repo: repo(), branch: BRANCH, pr, sha, results });
const existing = apiList(`issues/${pr}/comments`).find(
  (item) => item.user.type === 'Bot' && item.body.startsWith('<!-- agent-screenshots -->'),
);
if (existing) api(`issues/comments/${existing.id}`, { method: 'PATCH', body: { body } });
else comment(pr, body);
