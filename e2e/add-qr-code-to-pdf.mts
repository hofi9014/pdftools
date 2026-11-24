// Add QR code to PDF (plan 2.5, 2026-11-24) through the real page. Every code is read back by an
// independent decoder (jsQR): the PNG and SVG downloads, and the code on the pages of the
// downloaded PDF rendered by pdf.js — on a page as it is and on one turned 90°, in the corner
// chosen on the page as displayed. Also: the link over the code, a text too long for a QR code,
// no request carrying the text or the file, axe (WCAG 2.2 AA) in both themes.
// Run against a built site: E2E_BASE_URL=http://localhost:3100 npx tsx e2e/add-qr-code-to-pdf.mts
import { chromium, type Page } from 'playwright';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import jsQR from 'jsqr';
import * as canvasMod from '@napi-rs/canvas';
import { PDFDocument, PDFName, PDFDict, PDFString, degrees } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const origin = new URL(BASE_URL).origin;
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

async function decodeImage(buf: Buffer, size?: number) {
  const img = await canvasMod.loadImage(buf);
  const w = size ?? img.width, h = size ?? img.height;
  const c = canvasMod.createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { r: jsQR(ctx.getImageData(0, 0, w, h).data as unknown as Uint8ClampedArray, w, h), w, h };
}
async function renderPage(bytes: Uint8Array, n: number) {
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
  const pg = await (await task.promise).getPage(n);
  const vp = pg.getViewport({ scale: 2 });
  const c = canvasMod.createCanvas(Math.round(vp.width), Math.round(vp.height));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await pg.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport: vp, canvas: c as unknown as HTMLCanvasElement }).promise;
  const r = jsQR(ctx.getImageData(0, 0, c.width, c.height).data as unknown as Uint8ClampedArray, c.width, c.height);
  await task.destroy();
  return { r, w: c.width, h: c.height };
}
async function download(page: Page, sel: string) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator(sel).click()]);
  return { bytes: readFileSync((await dl.path())!), name: dl.suggestedFilename() };
}

const text = 'https://optimapdf.com/pl/łącz?a=1';
const browser = await chromium.launch();
try {
  console.log('=== the code: preview, PNG and SVG read back ===');
  const ctx = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/pl/add-qr-code-to-pdf`, { waitUntil: 'networkidle' });
  const seen: { method: string; url: string; bytes: number }[] = [];
  page.on('request', (q) => seen.push({ method: q.method(), url: q.url(), bytes: q.postDataBuffer()?.length ?? 0 }));
  // The cookie banner is fixed at the bottom and would cover the preview in the screenshot.
  await page.getByRole('button', { name: 'Odrzucam' }).click();
  await page.locator('#qr-text').fill(text);
  const preview = page.locator('[data-testid="qr-preview"]');
  await preview.waitFor();
  check((await preview.getAttribute('aria-label'))?.includes(text) === true, 'the preview is an image named after the text');
  const shot = await decodeImage(await preview.screenshot());
  check(shot.r?.data === text, `the preview on screen reads ("${shot.r?.data}")`);
  // A denser code too (it had a fractional number of pixels per module and did not read).
  const long = `Zamówienie 2026/11/24: ${'pozycja zażółć; '.repeat(18)}`.trim(); // the page trims the text
  await page.locator('#qr-text').fill(long);
  await page.waitForTimeout(200);
  const shot2 = await decodeImage(await preview.screenshot());
  check(shot2.r?.data === long, `a dense code (${new TextEncoder().encode(long).length} B, version ${shot2.r?.version ?? '?'}) also reads from the screen`);
  await page.locator('#qr-text').fill(text);
  check((await page.locator('[data-testid="qr-count"]').innerText()).startsWith(`${new TextEncoder().encode(text).length} z 2331`), 'the byte count is shown (UTF-8 bytes)');
  const png = await download(page, '[data-testid="qr-png"]');
  const pr = await decodeImage(png.bytes);
  check(png.name === 'kod-qr.png' && pr.r?.data === text && pr.w >= 1000, `PNG ${png.name}, ${pr.w} px, reads ("${pr.r?.data}")`);
  const svg = await download(page, '[data-testid="qr-svg"]');
  const sr = await decodeImage(svg.bytes, 600);
  check(svg.name === 'kod-qr.svg' && sr.r?.data === text, `SVG ${svg.name} reads ("${sr.r?.data}")`);

  console.log('\n=== on a PDF: every page, top left of the page as displayed, also when turned ===');
  const d = await PDFDocument.create();
  d.addPage([595, 842]);
  d.addPage([595, 842]).setRotation(degrees(90));
  await page.setInputFiles('#fileInput', { name: 'umowa.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await d.save()) });
  await page.getByRole('button', { name: '4 cm' }).click();
  await page.getByRole('button', { name: 'Góra — lewo' }).click();
  await page.getByRole('button', { name: 'Każda strona' }).click();
  const out = await download(page, '[data-testid="qr-submit"]');
  check(out.name === 'umowa-z-kodem-qr.pdf', `named after the file (${out.name})`);
  check(await page.locator('main [role="status"]').isVisible(), 'the page says it is done');
  for (const n of [1, 2]) {
    const { r, w, h } = await renderPage(new Uint8Array(out.bytes), n);
    const cx = r ? (r.location.topLeftCorner.x + r.location.bottomRightCorner.x) / 2 : -1;
    const cy = r ? (r.location.topLeftCorner.y + r.location.bottomRightCorner.y) / 2 : -1;
    const upright = !!r && r.location.topLeftFinderPattern.x < r.location.topRightFinderPattern.x && r.location.topLeftFinderPattern.y < r.location.bottomLeftFinderPattern.y;
    check(r?.data === text && cx < w * 0.3 && cy < h * 0.3 && upright, `page ${n}${n === 2 ? ' (turned 90°)' : ''}: reads, top left (${Math.round((cx / w) * 100)}%/${Math.round((cy / h) * 100)}%), upright`);
  }
  const lib = await PDFDocument.load(out.bytes);
  const a = lib.getPage(0).node.Annots()?.lookup(0, PDFDict);
  const uri = a ? (a.lookup(PDFName.of('A'), PDFDict).lookup(PDFName.of('URI')) as PDFString).decodeText() : '';
  check(uri === new URL(text).href, `the code is a link to the address (${uri})`);

  console.log('\n=== a text too long for a QR code ===');
  await page.locator('#qr-text').fill('ź'.repeat(1200));
  check((await page.locator('[data-testid="qr-count"]').innerText()).includes('2400 z 2331') && await preview.count() === 0 && await page.locator('[data-testid="qr-submit"]').isDisabled(),
    'refused with the byte count, no preview, the button is off');
  await page.waitForTimeout(500);
  const bad = seen.filter((q) => (q.method !== 'GET' && q.method !== 'HEAD') || q.bytes > 0 || !(q.url.startsWith(origin) || q.url.startsWith('blob:') || q.url.startsWith('data:')));
  check(bad.length === 0, `neither the text nor the PDF leaves the browser: ${seen.length} requests, all GET to this site${bad.length ? ` (${bad.map((q) => `${q.method} ${q.url}`).join('; ')})` : ''}`);
  await ctx.close();

  console.log('\n=== the longest code fits a phone screen ===');
  {
    const ph = await browser.newPage({ viewport: { width: 375, height: 800 } });
    await ph.goto(`${BASE_URL}/pl/add-qr-code-to-pdf`, { waitUntil: 'load' });
    await ph.locator('#qr-text').fill('x'.repeat(2331));
    const box = await ph.locator('[data-testid="qr-preview"]').boundingBox();
    const sw = await ph.evaluate(() => document.documentElement.scrollWidth);
    check(!!box && box.x >= 0 && box.x + box.width <= 375 && Math.abs(box.width - box.height) < 1 && sw <= 375,
      `a version-40 preview stays inside 375 px and square (${box?.width.toFixed(0)}×${box?.height.toFixed(0)}, page ${sw} px)`);
    await ph.close();
  }

  console.log('\n=== legible in both themes (axe), with the code, a file and the result on screen ===');
  const axeSource = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
  for (const theme of ['light', 'dark'] as const) {
    const c2 = await browser.newContext({ colorScheme: theme, serviceWorkers: 'block', viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    const pg = await c2.newPage();
    await pg.goto(`${BASE_URL}/pl/add-qr-code-to-pdf`, { waitUntil: 'load' });
    if (theme === 'dark') await pg.evaluate(() => document.documentElement.classList.add('dark'));
    await pg.locator('#qr-text').fill('Zażółć gęślą jaźń');
    await pg.setInputFiles('#fileInput', { name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await d.save()) });
    await download(pg, '[data-testid="qr-submit"]');
    await pg.waitForFunction(() => document.getAnimations().every((x) => x.playState !== 'running' || x.effect?.getTiming().iterations === Infinity), undefined, { timeout: 10000 });
    await pg.addScriptTag({ content: axeSource });
    const res = await pg.evaluate(async () => (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } })
      .axe.run('main', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
    const v = res.violations.map((x) => `${x.id}×${x.nodes.length} (${x.nodes[0]?.target.join(' ').slice(0, 50)})`).join(', ');
    check(!v, `${theme}: axe (WCAG 2.2 AA): ${v || 'clean'}`);
    await c2.close();
  }
} finally {
  await browser.close();
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
