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

/**
 * Compares the PR's screens ("after") with main's ("before").
 * `differs(name)` says whether two successful captures differ.
 */
export function classifyScreens(after, before, differs) {
  const beforeByName = new Map(before.map((shot) => [shot.name, shot]));
  const results = after.map((shot) => {
    const old = beforeByName.get(shot.name);
    if (shot.error) return { ...shot, status: 'failed' };
    if (!old || old.error) return { ...shot, status: 'new' };
    return { ...shot, status: differs(shot.name) ? 'changed' : 'unchanged' };
  });
  const afterNames = new Set(after.map((shot) => shot.name));
  const removed = before.filter((shot) => !afterNames.has(shot.name)).map((shot) => ({ ...shot, status: 'removed' }));
  return [...results, ...removed];
}

/** Paths, relative to the PR's folder on the screenshot branch, for each image to upload. */
export function uploads(results) {
  return results.flatMap((shot) => {
    if (shot.status === 'changed') return [{ side: 'before', name: shot.name }, { side: 'after', name: shot.name }];
    if (shot.status === 'new') return [{ side: 'after', name: shot.name }];
    return [];
  });
}

export function screenshotComment({ repo, branch, pr, sha, results }) {
  const short = sha.slice(0, 7);
  const url = (side, name) => `https://raw.githubusercontent.com/${repo}/${branch}/pr-${pr}/${short}/${side}/${name}.png`;
  const of = (status) => results.filter((shot) => shot.status === status);
  const lines = [
    '<!-- agent-screenshots -->',
    '## Screenshots',
    '',
    `Commit \`${short}\` compared with \`main\`, using the screens listed in \`packages/web/screenshots.json\`.`,
  ];
  if (results.length === 0) lines.push('', 'Screenshots could not be taken. See the agent review run log.');

  for (const shot of of('changed')) {
    lines.push('', `### Changed: ${shot.name} (${shot.description})`, '', '| Before | After |', '|---|---|');
    lines.push(`| ![before](${url('before', shot.name)}) | ![after](${url('after', shot.name)}) |`);
  }
  for (const shot of of('new')) {
    lines.push('', `### New: ${shot.name} (${shot.description})`, '', `![${shot.name}](${url('after', shot.name)})`);
  }
  for (const shot of of('failed')) lines.push('', `### Failed: ${shot.name} (${shot.description})`, '', shot.error);

  const summary = [];
  if (of('unchanged').length) summary.push(`Unchanged: ${of('unchanged').map((shot) => shot.name).join(', ')}.`);
  if (of('removed').length) summary.push(`Removed from the list: ${of('removed').map((shot) => shot.name).join(', ')}.`);
  if (results.length && !of('changed').length && !of('new').length && !of('failed').length) summary.unshift('No screen changed.');
  if (summary.length) lines.push('', summary.join(' '));
  return `${lines.join('\n')}\n`;
}
