import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { changesUi, parseScenarios, screenshotComment } from '../lib/screenshots.mjs';

describe('screenshots', () => {
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

  it('writes a comment with images and failures', () => {
    const body = screenshotComment({
      repo: 'o/r', branch: 'agent-screenshots', pr: 8, sha: 'abcdef123',
      shots: [{ name: 'title', description: '標題畫面' }, { name: 'game', description: '遊戲', error: 'timeout' }],
    });
    expect(body).toContain('<!-- agent-screenshots -->');
    expect(body).toContain('](https://raw.githubusercontent.com/o/r/agent-screenshots/pr-8/abcdef1/title.png)');
    expect(body).toContain('Failed: timeout');
  });

  it('says so when nothing was captured', () => {
    expect(screenshotComment({ repo: 'o/r', branch: 'b', pr: 1, sha: 'abcdef1', shots: [] })).toContain('could not be taken');
  });
});
