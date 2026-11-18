import { addLabels, api, bumpState, comment, gh, removeLabel, requestReview, reviewersFromEnv, runWorkflow, setStage } from './github.mjs';

export function askForReview(pr) {
  try {
    requestReview(pr, reviewersFromEnv());
  } catch {
    console.log('Could not request review. It may already be requested.');
  }
}

/** Applies decisions from decide.mjs. `target` is { issue, pr }, and `labels` are the PR's or issue's current labels. */
export function applyActions(actions, { issue, pr, labels }) {
  let current = [...labels];
  const clearRounds = () => {
    for (const label of current.filter((name) => name.startsWith('review-round:'))) removeLabel(pr, label);
    current = current.filter((name) => !name.startsWith('review-round:'));
  };

  for (const action of actions) {
    console.log(`Action: ${JSON.stringify(action)}`);
    switch (action.type) {
      case 'addLabel':
        addLabels(pr, [action.label]);
        current.push(action.label);
        break;
      case 'removeLabel':
        removeLabel(pr, action.label);
        current = current.filter((name) => name !== action.label);
        break;
      case 'removeIssueLabel':
        removeLabel(issue, action.label);
        break;
      case 'setStage':
        setStage(pr, action.stage, current);
        current = [...current.filter((name) => !name.startsWith('stage:')), action.stage];
        break;
      case 'clearRounds':
        clearRounds();
        break;
      case 'setRound':
        clearRounds();
        addLabels(pr, [`review-round:${action.round}`]);
        current.push(`review-round:${action.round}`);
        break;
      case 'bump':
        bumpState(pr, action.field);
        break;
      case 'comment':
        comment(pr ?? issue, action.body);
        break;
      case 'requestReview':
        askForReview(pr);
        break;
      case 'runPlan':
        runWorkflow('plan.yml', { issue: String(issue), mode: action.mode, pr: pr ? String(pr) : '' });
        break;
      case 'runImplement':
        runWorkflow('implement.yml', { issue: String(issue), pr: String(pr), mode: action.mode });
        break;
      case 'runReview':
        runWorkflow('review.yml', { issue: String(issue), pr: String(pr) });
        break;
      case 'enableAutoMerge':
        gh(['pr', 'merge', String(pr), '--repo', process.env.GITHUB_REPOSITORY, '--auto', '--merge', '--match-head-commit', action.sha]);
        break;
      default:
        throw new Error(`Unknown action: ${action.type}`);
    }
  }
}

export const runUrl = () =>
  `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

export const setCommitStatus = (sha, state, description) =>
  api(`statuses/${sha}`, { method: 'POST', body: { state, context: 'agent-review', description, target_url: runUrl() } });
