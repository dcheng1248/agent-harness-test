import { issueFromBranch } from './lib/decide.mjs';
import { api, prFiles } from './lib/github.mjs';
import { declaredCorePaths, loadLists, undeclaredCorePaths } from './lib/rules.mjs';

const issue = issueFromBranch(process.env.HEAD_REF);
if (issue === null) {
  console.log('Not an agent branch.');
  process.exit(0);
}
const path = `.agent/plans/issue-${issue}/brief.md`;
const file = api(`contents/${path}?ref=${process.env.HEAD_SHA}`);
const brief = Buffer.from(file.content, 'base64').toString('utf8');
const undeclared = undeclaredCorePaths(
  prFiles(process.env.PR_NUMBER),
  loadLists('core-paths.yml').core_paths,
  declaredCorePaths(brief),
);
if (undeclared.length > 0) {
  console.error(`Core paths changed but not declared in ${path}:\n${undeclared.join('\n')}`);
  process.exit(1);
}
console.log('All changed core paths are declared.');
