// Compares .agent-run/screenshots/after (the PR) with .agent-run/screenshots/before (main).
// Writes .agent-run/screenshots/result.json, listing each screen as changed, new, unchanged, removed or failed.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import pixelmatch from 'pixelmatch';
import pngjs from 'pngjs';
import { classifyScreens } from './lib/screenshots.mjs';

const DIR = '.agent-run/screenshots';
// Ignore anti-aliasing noise: a screen counts as changed only above this many differing pixels.
const MIN_CHANGED_PIXELS = 50;

const manifest = (side) => {
  const file = `${DIR}/${side}/manifest.json`;
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
};

function differs(name) {
  const [a, b] = ['before', 'after'].map((side) => pngjs.PNG.sync.read(readFileSync(`${DIR}/${side}/${name}.png`)));
  if (a.width !== b.width || a.height !== b.height) return true;
  return pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 }) > MIN_CHANGED_PIXELS;
}

const results = classifyScreens(manifest('after'), manifest('before'), differs);
writeFileSync(`${DIR}/result.json`, `${JSON.stringify(results, null, 2)}\n`);
console.log(results.map((shot) => `${shot.name}: ${shot.status}`).join('\n') || 'Nothing to compare.');
