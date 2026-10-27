// The promise the home page makes and tells visitors how to check themselves: a file processed
// by a local tool never leaves the browser. This drives real tool pages with a real PDF and
// records every request the page makes while the tool works: there must be no upload — no request
// other than GET/HEAD, and no request to another host (no consent to statistics is given, so
// there is no Google Analytics either). Downloads of the tool's own code and fonts are GETs.
//
// Run: E2E_BASE_URL=http://localhost:3000 npx tsx e2e/no-upload.mts
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const origin = new URL(BASE).origin;
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

const pdf = readFileSync(join(ROOT, 'test-real-pdfs', 'chrome-report.pdf'));
const browser = await chromium.launch({ headless: true });

const cases: Array<{ slug: string; files: number; button: RegExp }> = [
  { slug: 'compress', files: 1, button: /Kompresja plików PDF/i },
  { slug: 'merge', files: 2, button: /Połącz PDF/ },
  { slug: 'split', files: 1, button: /Podziel plik PDF/ },
  { slug: 'pdf-to-word', files: 1, button: /Konwertuj do formatu Word/ },
];

for (const c of cases) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/pl/${c.slug}`, { waitUntil: 'networkidle' });
  // Only what happens from choosing the file to the download counts.
  const seen: Array<{ method: string; url: string; bytes: number }> = [];
  page.on('request', (r) => seen.push({ method: r.method(), url: r.url(), bytes: r.postDataBuffer()?.length ?? 0 }));
  await page.setInputFiles('#fileInput', Array.from({ length: c.files }, (_, i) => ({ name: `plik${i}.pdf`, mimeType: 'application/pdf', buffer: pdf })));
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    page.locator('button', { hasText: c.button }).last().click(),
  ]);
  await download.path();
  await page.waitForTimeout(1500);
  const notGet = seen.filter((r) => r.method !== 'GET' && r.method !== 'HEAD');
  const foreign = seen.filter((r) => !r.url.startsWith(origin) && !r.url.startsWith('blob:') && !r.url.startsWith('data:'));
  check(notGet.length === 0, `${c.slug}: no upload — ${seen.length} requests, all GET/HEAD${notGet.length ? ` (got ${notGet.map((r) => `${r.method} ${r.url} ${r.bytes} B`).join('; ')})` : ''}`);
  check(foreign.length === 0, `${c.slug}: no request to another host${foreign.length ? ` (${foreign.map((r) => r.url).join('; ')})` : ''}`);
  check(seen.every((r) => r.bytes < 1000), `${c.slug}: no request carries a body (largest ${Math.max(0, ...seen.map((r) => r.bytes))} B; the PDF is ${pdf.length} B)`);
  if (c.slug === 'compress') {
    // Control: the recorder does see an upload when there is one (a POST to a path that does not
    // exist — nothing on the server does any work for it).
    const before = seen.length;
    await page.evaluate(() => fetch('/__no-upload-probe', { method: 'POST', body: 'x'.repeat(5000) }).catch(() => null));
    await page.waitForTimeout(500);
    const probe = seen.slice(before).find((r) => r.method === 'POST');
    check(!!probe && probe.bytes === 5000, 'control: a real upload is recorded (POST, 5000 B)');
  }
  await ctx.close();
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
