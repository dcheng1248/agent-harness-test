import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkIds } from './lib/ids.mjs';

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const modules = readdirSync('packages');
const docs = ['docs/architecture.md', ...modules.map((name) => join('packages', name, 'ARCHITECTURE.md'))];
const tests = modules.flatMap((name) => walk(join('packages', name, 'src'))).filter((file) => /\.test\.tsx?$/.test(file));
const errors = checkIds(docs.map((file) => readFileSync(file, 'utf8')), tests.map((file) => readFileSync(file, 'utf8')));

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Use case IDs are consistent.');
