import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkIds } from './lib/ids.mjs';

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
const read = (files) => files.filter((file) => existsSync(file)).map((file) => readFileSync(file, 'utf8'));

const modules = readdirSync('packages');
const useCaseDocs = modules.map((name) => join('packages', name, 'USE_CASES.md'));
const structuralDocs = ['docs/architecture.md', ...modules.map((name) => join('packages', name, 'ARCHITECTURE.md'))];
const tests = modules.flatMap((name) => walk(join('packages', name, 'src'))).filter((file) => /\.test\.tsx?$/.test(file));
const errors = checkIds(read(useCaseDocs), read(tests), read(structuralDocs));

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Use case IDs are consistent.');
