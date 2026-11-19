// Serves a built web app and photographs each screen in its packages/web/screenshots.json.
// Usage: node take-screenshots.mjs --root <repo checkout> --out <folder>. Build the app first.
// Writes PNGs and manifest.json. A checkout without a screen list gets an empty manifest.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';
import { parseScenarios } from './lib/screenshots.mjs';

const option = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : fallback;
};
const root = resolve(option('root', '.'));
const out = resolve(option('out', '.agent-run/screenshots/after'));
const dist = join(root, 'packages/web/dist');
const listFile = join(root, 'packages/web/screenshots.json');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

// Fixed randomness and time, so an unchanged screen renders identically on main and on the PR.
const FIXED_RANDOMNESS = () => {
  let state = 0x2545f491;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Math.random = next;
  crypto.getRandomValues = (array) => {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(next() * 256);
    return array;
  };
};

mkdirSync(out, { recursive: true });
const manifest = [];

if (existsSync(listFile) && existsSync(dist)) {
  const scenarios = parseScenarios(readFileSync(listFile, 'utf8'));
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    const file = join(dist, path === '' || path === '.' ? 'index.html' : path);
    try {
      if (!file.startsWith(dist)) throw new Error('outside dist');
      const body = readFileSync(file);
      response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    for (const scenario of scenarios) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
      await context.addInitScript(FIXED_RANDOMNESS);
      const page = await context.newPage();
      await page.clock.setFixedTime(new Date('2026-01-01T00:00:00Z'));
      const entry = { name: scenario.name, description: scenario.description };
      try {
        await page.goto(base, { waitUntil: 'networkidle' });
        for (const step of scenario.steps) {
          if (step.click) await page.click(step.click, { timeout: 5000 });
          if (step.waitFor) await page.waitForSelector(step.waitFor, { timeout: 5000 });
          await page.waitForLoadState('networkidle');
        }
        await page.screenshot({ path: join(out, `${scenario.name}.png`), fullPage: true, animations: 'disabled', caret: 'hide' });
      } catch (error) {
        entry.error = error.message.split('\n')[0].slice(0, 200);
      }
      manifest.push(entry);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(manifest.map((entry) => `${entry.name}: ${entry.error ?? 'ok'}`).join('\n') || 'No screen list found.');
