import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  classifyRisk,
  declaredCorePaths,
  loadLists,
  matchesAny,
  maxRisk,
  parseLists,
  protectedChanges,
  undeclaredCorePaths,
} from '../lib/rules.mjs';

const corePaths = loadLists('core-paths.yml').core_paths;
const rules = loadLists('risk-rules.yml');
const risk = (files) => classifyRisk(files, { corePaths, rules }).level;

describe('path rules', () => {
  it('parses list files', () => {
    expect(parseLists('# note\nitems:\n  - "a/**"\n  - b # why\n')).toEqual({ items: ['a/**', 'b'] });
  });

  it('matches globs', () => {
    expect(matchesAny('packages/web/ARCHITECTURE.md', ['packages/*/ARCHITECTURE.md'])).toBe(true);
    expect(matchesAny('packages/core/src/model/a/b.ts', ['packages/core/src/model/**'])).toBe(true);
    expect(matchesAny('packages/core/src/rng.ts', ['packages/core/src/model/**'])).toBe(false);
  });

  it('protects the harness but allows plans', () => {
    const files = ['.github/workflows/ci.yml', '.claude/skills/a.md', '.agent/scripts/a.mjs', 'CLAUDE.md', '.agent/plans/issue-1/brief.md', 'docs/a.md'];
    expect(protectedChanges(files)).toEqual(files.slice(0, 4));
  });

  it('finds undeclared core paths', () => {
    const brief = '## Core paths\n- `docs/architecture.md`\n\n## Other\n- `packages/core/src/index.ts`\n';
    const declared = declaredCorePaths(brief);
    expect(declared).toEqual(['docs/architecture.md']);
    expect(undeclaredCorePaths(['docs/architecture.md', 'packages/core/src/index.ts', 'packages/web/src/a.ts'], corePaths, declared))
      .toEqual(['packages/core/src/index.ts']);
  });

  it('counts a test file as declared when the file it tests is declared', () => {
    const files = ['packages/core/src/model/state.test.ts', 'packages/core/src/model/stats.test.ts', 'packages/core/src/model/state.ts'];
    expect(undeclaredCorePaths(files, corePaths, ['packages/core/src/model/state.ts']))
      .toEqual(['packages/core/src/model/stats.test.ts']);
  });

  it('reads core paths folded in a details block at the end of the brief', () => {
    const brief = '## Rejected alternatives\n- `not/a/path`\n\n<details><summary>Core paths</summary>\n\n## Core paths\n- `docs/architecture.md`\n- `packages/core/src/index.ts`\n\n</details>\n';
    expect(declaredCorePaths(brief)).toEqual(['docs/architecture.md', 'packages/core/src/index.ts']);
  });

  it('reads core paths from the brief template layout', () => {
    const template = readFileSync('.agent/brief-template.md', 'utf8');
    expect(declaredCorePaths(template)).toEqual(['path']);
  });
});

describe('risk rules', () => {
  it('rates a small single-module change low', () => {
    expect(risk(['packages/web/src/render.ts', '.agent/plans/issue-1/brief.md'])).toBe('low');
  });

  it('never rates a core-path change low', () => {
    for (const file of corePaths.map((glob) => glob.replace('**', 'x.ts').replace('*', 'web'))) {
      expect(risk([file])).not.toBe('low');
    }
  });

  it('raises for several modules, dependencies, the data model and the harness', () => {
    expect(risk(['packages/web/src/a.ts', 'packages/content/src/a.ts'])).toBe('medium');
    expect(risk(['package-lock.json'])).toBe('medium');
    expect(risk(['packages/core/src/model/state.ts'])).toBe('high');
    expect(risk(['.github/workflows/ci.yml'])).toBe('high');
  });

  it('keeps the higher rating', () => {
    expect(maxRisk('low', 'medium')).toBe('medium');
    expect(maxRisk('high', 'medium')).toBe('high');
  });
});

describe('use case files', () => {
  it('do not raise risk on their own', () => {
    expect(risk(['packages/web/USE_CASES.md', 'packages/web/src/style.css', 'packages/web/screenshots.json'])).toBe('low');
  });

  it('leave architecture files at medium or above', () => {
    expect(risk(['packages/web/ARCHITECTURE.md'])).toBe('medium');
  });
});
