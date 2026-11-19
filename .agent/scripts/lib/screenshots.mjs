// Pure helpers for UI screenshots.

export const UI_PATHS = /^packages\/(web|content)\//;
export const changesUi = (files) => files.some((file) => UI_PATHS.test(file));

const NAME = /^[a-z0-9-]+$/;
const SELECTOR = /^[#.\w\-\[\]="' :>]+$/;

/** Validates packages/web/screenshots.json and returns its scenarios. */
export function parseScenarios(text) {
  const list = JSON.parse(text);
  if (!Array.isArray(list) || list.length === 0) throw new Error('screenshots.json must be a non-empty list');
  const names = new Set();
  for (const item of list) {
    if (!NAME.test(item.name ?? '')) throw new Error(`Bad scenario name: ${item.name}`);
    if (names.has(item.name)) throw new Error(`Duplicate scenario name: ${item.name}`);
    names.add(item.name);
    if (typeof item.description !== 'string') throw new Error(`Scenario ${item.name} needs a description`);
    for (const step of item.steps ?? []) {
      const [kind, ...extra] = Object.keys(step);
      if (extra.length || !['click', 'waitFor'].includes(kind) || !SELECTOR.test(step[kind])) {
        throw new Error(`Scenario ${item.name} has an unsupported step: ${JSON.stringify(step)}`);
      }
    }
  }
  return list.map((item) => ({ name: item.name, description: item.description, steps: item.steps ?? [] }));
}

export function screenshotComment({ repo, branch, pr, sha, shots }) {
  const short = sha.slice(0, 7);
  const lines = [
    '<!-- agent-screenshots -->',
    '## Screenshots',
    '',
    `Taken automatically at commit \`${short}\`, from the screens listed in \`packages/web/screenshots.json\`.`,
  ];
  if (shots.length === 0) lines.push('', 'Screenshots could not be taken. See the agent review run log.');
  for (const shot of shots) {
    lines.push('', `### ${shot.name}: ${shot.description}`);
    lines.push(
      shot.error
        ? `Failed: ${shot.error}`
        : `![${shot.name}](https://raw.githubusercontent.com/${repo}/${branch}/pr-${pr}/${short}/${shot.name}.png)`,
    );
  }
  return `${lines.join('\n')}\n`;
}
