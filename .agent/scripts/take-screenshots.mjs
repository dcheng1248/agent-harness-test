// Serves the built web app and photographs each screen in packages/web/screenshots.json.
// Run `npm run build` first. Writes PNGs and manifest.json to .agent-run/screenshots/.
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';
import { parseScenarios } from './lib/screenshots.mjs';

const DIST = 'packages/web/dist';
const OUT = '.agent-run/screenshots';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

const server = createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const file = join(DIST, path === '' || path === '.' ? 'index.html' : path);
  try {
    if (!file.startsWith(normalize(DIST))) throw new Error('outside dist');
    const body = readFileSync(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
});

mkdirSync(OUT, { recursive: true });
const scenarios = parseScenarios(readFileSync('packages/web/screenshots.json', 'utf8'));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
const manifest = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const entry = { name: scenario.name, description: scenario.description };
    try {
      await page.goto(base, { waitUntil: 'networkidle' });
      for (const step of scenario.steps) {
        if (step.click) await page.click(step.click, { timeout: 5000 });
        if (step.waitFor) await page.waitForSelector(step.waitFor, { timeout: 5000 });
        await page.waitForLoadState('networkidle');
      }
      await page.screenshot({ path: join(OUT, `${scenario.name}.png`), fullPage: true });
    } catch (error) {
      entry.error = error.message.split('\n')[0].slice(0, 200);
    }
    manifest.push(entry);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(manifest.map((entry) => `${entry.name}: ${entry.error ?? 'ok'}`).join('\n'));
