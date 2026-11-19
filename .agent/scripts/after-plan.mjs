import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { askForReview, runUrl } from './lib/actions.mjs';
import { addLabels, api, comment, getState, git, labelNames, pushBranch, removeLabel, reviewersFromEnv, setStage, updateState } from './lib/github.mjs';
import { summarizeExecution } from './lib/metrics.mjs';
import { classifyRisk, loadLists, maxRisk } from './lib/rules.mjs';

const { ISSUE: issue, PR: existingPr, PLAN_OUTPUT: planJson, AUDIT_OUTPUT: auditJson, EXECUTION_FILE } = process.env;
const parse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
const output = (name, value) => appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
const plan = parse(planJson);
const branch = `agent/issue-${issue}`;
const planDir = `.agent/plans/issue-${issue}`;

function needsHuman(message) {
  const target = existingPr || issue;
  addLabels(target, ['needs-human']);
  comment(target, `${message}\n\nRun: ${runUrl()}`);
}

function askQuestions() {
  const mentions = reviewersFromEnv().map((name) => `@${name}`).join(' ');
  const questions = plan.questions.map((question, index) => `${index + 1}. ${question}`).join('\n');
  comment(issue, `<!-- agent-questions -->\n${mentions} The planner needs answers before it can continue.\n\n${questions}\n\nReply with a comment starting \`/answer\`.`);
  addLabels(issue, ['needs-clarification']);
}

function publish() {
  for (const file of ['brief.md', 'tasks.md']) {
    if (!existsSync(`${planDir}/${file}`)) throw new Error(`Planner did not write ${planDir}/${file}`);
  }
  git(['add', '-A']);
  if (git(['status', '--porcelain'])) git(['commit', '-m', `docs(plan): plan issue #${issue}`]);
  pushBranch(branch);

  const brief = readFileSync(`${planDir}/brief.md`, 'utf8');
  const body = `${brief}\n\nCloses #${issue}\n`;
  const pr = existingPr
    ? api(`pulls/${existingPr}`, { method: 'PATCH', body: { body } })
    : api('pulls', { method: 'POST', body: { title: plan.pr_title, head: branch, base: 'main', body, draft: true } });

  const files = git(['diff', '--name-only', 'origin/main...HEAD']).split('\n').filter(Boolean);
  const floor = classifyRisk(files, { corePaths: loadLists('core-paths.yml').core_paths, rules: loadLists('risk-rules.yml') });
  const risk = maxRisk(plan.risk, floor.level);
  const labels = labelNames(pr);
  for (const label of labels.filter((name) => name.startsWith('risk:') && name !== `risk:${risk}`)) removeLabel(pr.number, label);
  addLabels(pr.number, [`risk:${risk}`]);
  setStage(pr.number, 'stage:plan-review', labels);
  updateState(pr.number, { ...getState(pr.number), riskPlan: risk });

  for (const reply of plan.thread_replies ?? []) {
    api(`pulls/${pr.number}/comments/${reply.comment_id}/replies`, { method: 'POST', body: { body: reply.body } });
  }
  askForReview(pr.number);
  output('pr', pr.number);
}

switch (process.argv[2]) {
  case 'status': {
    const missing = ['brief.md', 'tasks.md'].filter((file) => !existsSync(`${planDir}/${file}`));
    if (plan?.status === 'ready' && missing.length > 0) {
      const messages = EXECUTION_FILE && existsSync(EXECUTION_FILE) ? JSON.parse(readFileSync(EXECUTION_FILE, 'utf8')) : [];
      const denied = summarizeExecution(messages).denied_tools;
      needsHuman(
        `The planner reported a finished plan but did not write ${missing.join(' or ')}, so nothing was audited or published.` +
          (denied ? ` These tools were denied to it: ${denied}.` : '') +
          '\n\nTo retry, remove `needs-human` and `agent:in-progress` from the issue, then add `ready-for-agent`.',
      );
      output('status', 'failed-reported');
      break;
    }
    output('status', ['ready', 'questions'].includes(plan?.status) ? plan.status : 'failed');
    break;
  }
  case 'questions':
    askQuestions();
    break;
  case 'publish': {
    const audit = parse(auditJson);
    if (audit?.pass !== true) {
      const problems = (audit?.problems ?? ['The audit returned no result.']).map((item) => `- ${item}`).join('\n');
      needsHuman(`The plan failed its audit, so it was not published.\n\n${problems}`);
      process.exit(1);
    }
    publish();
    break;
  }
  default:
    throw new Error('Expected status, questions or publish');
}
