import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AGENT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Parses the small YAML subset used here: top-level keys holding lists of strings. */
export function parseLists(text) {
  const result = {};
  let key = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '').trimEnd();
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const heading = /^([A-Za-z_]+):$/.exec(line);
    const item = /^\s+-\s+["']?(.+?)["']?$/.exec(line);
    if (heading) {
      key = heading[1];
      result[key] = [];
    } else if (item && key) {
      result[key].push(item[1]);
    } else {
      throw new Error(`Unsupported line: ${line}`);
    }
  }
  return result;
}

export const loadLists = (name) => parseLists(readFileSync(join(AGENT_ROOT, name), 'utf8'));

export function globToRegExp(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*' && glob[i + 1] === '*') {
      source += '.*';
      i += 1;
    } else if (char === '*') {
      source += '[^/]*';
    } else {
      source += char.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${source}$`);
}

export const matchesAny = (file, globs) => globs.some((glob) => globToRegExp(glob).test(file));

export const isProtectedHarnessPath = (file) =>
  file === 'CLAUDE.md' || (!file.startsWith('.agent/plans/') && /^(\.github|\.claude|\.agent)\//.test(file));

export const protectedChanges = (files) => files.filter(isProtectedHarnessPath);

/** Reads the backticked paths listed under "## Core paths" in a brief. */
export function declaredCorePaths(brief) {
  const section = /^## Core paths\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(brief)?.[1] ?? '';
  return [...section.matchAll(/^\s*-\s+`([^`]+)`/gm)].map((match) => match[1]);
}

/** `a/b.test.ts` → `a/b.ts`. Null for a file that is not a test. */
const testedFile = (file) => (/\.test\.[^./]+$/.test(file) ? file.replace(/\.test(\.[^./]+)$/, '$1') : null);

/**
 * Core paths changed but not declared. A test file counts as declared when the file it tests is,
 * because the planner cannot know in advance which tests the implementer will touch.
 */
export function undeclaredCorePaths(files, corePaths, declared) {
  const isDeclared = (file) => matchesAny(file, declared) || (testedFile(file) !== null && matchesAny(testedFile(file), declared));
  return files.filter((file) => matchesAny(file, corePaths) && !isDeclared(file));
}

const LEVELS = ['low', 'medium', 'high'];
export const maxRisk = (a, b) => (LEVELS.indexOf(a) >= LEVELS.indexOf(b) ? a : b);

export function classifyRisk(allFiles, { corePaths, rules }) {
  const files = allFiles.filter((file) => !file.startsWith('.agent/plans/'));
  const reasons = [];
  let level = 'low';
  const raise = (to, reason) => {
    level = maxRisk(level, to);
    reasons.push(reason);
  };
  const modules = new Set(files.map((file) => /^packages\/([^/]+)\//.exec(file)?.[1]).filter(Boolean));

  if (files.some((file) => matchesAny(file, rules.high_paths ?? []))) raise('high', 'high-risk path changed');
  if (files.some(isProtectedHarnessPath)) raise('high', 'harness path changed');
  if (files.some((file) => matchesAny(file, corePaths))) raise('medium', 'core path changed');
  if (files.some((file) => matchesAny(file, rules.medium_paths ?? []))) raise('medium', 'dependency or build config changed');
  if (modules.size > 1) raise('medium', 'more than one module changed');
  return { level, reasons };
}
