import { issueFromBranch } from './lib/decide.mjs';
import { prFiles } from './lib/github.mjs';
import { protectedChanges } from './lib/rules.mjs';

if (issueFromBranch(process.env.HEAD_REF) === null) {
  console.log('Not an agent branch.');
  process.exit(0);
}
const changed = protectedChanges(prFiles(process.env.PR_NUMBER));
if (changed.length > 0) {
  console.error(`Agent PRs may not change the harness:\n${changed.join('\n')}`);
  process.exit(1);
}
console.log('No harness files changed.');
