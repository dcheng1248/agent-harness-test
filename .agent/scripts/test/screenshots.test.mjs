import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { changesUi, classifyScreens, parseScenarios, screenshotComment, uploads } from '../lib/screenshots.mjs';

const shot = (name, extra = {}) => ({ name, description: `${name} screen`, ...extra });

describe('screen list', () => {
  it('detects UI changes', () => {
    expect(changesUi(['packages/web/src/render.ts'])).toBe(true);
    expect(changesUi(['packages/content/src/index.ts'])).toBe(true);
    expect(changesUi(['packages/core/src/rng.ts', 'docs/architecture.md'])).toBe(false);
  });

  it('accepts the repo scenario file', () => {
    const scenarios = parseScenarios(readFileSync('packages/web/screenshots.json', 'utf8'));
    expect(scenarios.map((s) => s.name)).toEqual(['title', 'game']);
  });

  it.each([
    ['an empty list', []],
    ['a bad name', [{ name: 'Bad Name', description: 'x' }]],
    ['a duplicate name', [{ name: 'a', description: 'x' }, { name: 'a', description: 'y' }]],
    ['a missing description', [{ name: 'a' }]],
    ['an unknown step', [{ name: 'a', description: 'x', steps: [{ evaluate: 'alert(1)' }] }]],
    ['an unsafe selector', [{ name: 'a', description: 'x', steps: [{ click: '#a`); alert(1); (`' }] }]],
  ])('rejects %s', (_label, list) => {
    expect(() => parseScenarios(JSON.stringify(list))).toThrow();
  });
});

describe('comparing with main', () => {
  const after = [shot('title'), shot('game'), shot('menu'), shot('broken', { error: 'timeout' })];
  const before = [shot('title'), shot('game'), shot('old')];
  const results = classifyScreens(after, before, (name) => name === 'title');
  const status = Object.fromEntries(results.map((r) => [r.name, r.status]));

  it('classifies each screen', () => {
    expect(status).toEqual({ title: 'changed', game: 'unchanged', menu: 'new', broken: 'failed', old: 'removed' });
  });

  it('treats a screen that failed on main as new', () => {
    expect(classifyScreens([shot('a')], [shot('a', { error: 'x' })], () => false)[0].status).toBe('new');
  });

  it('uploads only what you need to see', () => {
    expect(uploads(results)).toEqual([
      { side: 'before', name: 'title' },
      { side: 'after', name: 'title' },
      { side: 'after', name: 'menu' },
    ]);
  });

  it('shows changes side by side and sums up the rest', () => {
    const body = screenshotComment({ repo: 'o/r', branch: 'b', pr: 8, sha: 'abcdef123', results });
    expect(body).toContain('<!-- agent-screenshots -->');
    expect(body).toContain('### Changed: title');
    expect(body).toContain('](https://raw.githubusercontent.com/o/r/b/pr-8/abcdef1/before/title.png) | ![after](https://raw.githubusercontent.com/o/r/b/pr-8/abcdef1/after/title.png) |');
    expect(body).toContain('### New: menu');
    expect(body).toContain('### Failed: broken');
    expect(body).toContain('Unchanged: game.');
    expect(body).toContain('Removed from the list: old.');
    expect(body).not.toContain('after/game.png');
  });

  it('says when nothing changed', () => {
    const quiet = classifyScreens([shot('a')], [shot('a')], () => false);
    expect(screenshotComment({ repo: 'o/r', branch: 'b', pr: 1, sha: 'abcdef1', results: quiet })).toContain('No screen changed. Unchanged: a.');
  });

  it('says when nothing was captured', () => {
    expect(screenshotComment({ repo: 'o/r', branch: 'b', pr: 1, sha: 'abcdef1', results: [] })).toContain('could not be taken');
  });
});
