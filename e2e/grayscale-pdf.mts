// End-to-end through the real /grayscale-pdf page (plan 2.6, 2026-11-26). The JPEG images are
// decoded and re-encoded by the browser here (createImageBitmap + canvas.toBlob), which the Node
// test (tests/grayscale.mts) can only imitate. A colourful PDF built for the test and a real
// 27-page report are converted on the page; the downloaded files are rendered by pdf.js in Node:
// no coloured pixel is left, every pixel keeps the lightness of the original, the text is the same.
// Also: no request carries the file, an encrypted file gets a message in the page's language,
// the English page, and axe (WCAG 2.2 AA) in both themes with the result on screen.
// Run: npm run test:e2e-grayscale-pdf (needs a running server, E2E_BASE_URL).
import { chromium, type Page, type Request } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts, cmyk, rgb } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
const { t } = await import('../lib/i18n.ts');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

interface Rendered { w: number; h: number; d: Uint8ClampedArray; text: string }
async function render(bytes: Uint8Array, scale: number): Promise<Rendered[]> {
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/', verbosity: 0 });
  const doc = await task.promise;
  const out: Rendered[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n);
    const vp = pg.getViewport({ scale });
    const c = canvasMod.createCanvas(Math.round(vp.width), Math.round(vp.height));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await pg.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport: vp, canvas: c as unknown as HTMLCanvasElement }).promise;
    const tc = await pg.getTextContent();
    out.push({ w: c.width, h: c.height, d: ctx.getImageData(0, 0, c.width, c.height).data as unknown as Uint8ClampedArray, text: tc.items.map((i) => ('str' in i ? i.str : '')).join('') });
  }
  await task.destroy();
  return out;
}

/** Coloured pixels (channels differing by more than 6), and how far the lightness moved. */
function compare(before: Rendered[], after: Rendered[]) {
  let coloured = 0, total = 0, sum = 0;
  const diffs: number[] = [];
  for (let p = 0; p < before.length; p++) {
    const a = before[p]!, b = after[p]!;
    if (a.w !== b.w || a.h !== b.h) return { coloured: -1, mean: 99, p99: 99 };
    for (let i = 0; i < a.d.length; i += 4) {
      const r = b.d[i]!, g = b.d[i + 1]!, bl = b.d[i + 2]!;
      if (Math.max(r, g, bl) - Math.min(r, g, bl) > 6) coloured++;
      const la = 0.299 * a.d[i]! + 0.587 * a.d[i + 1]! + 0.114 * a.d[i + 2]!;
      const lb = 0.299 * r + 0.587 * g + 0.114 * bl;
      const d = Math.abs(la - lb);
      sum += d;
      if ((i / 4) % 7 === 0) diffs.push(d);
      total++;
    }
  }
  diffs.sort((x, y) => x - y);
  return { coloured, mean: sum / total, p99: diffs[Math.floor(diffs.length * 0.99)] ?? 0 };
}

// ---------- the test file: colours of every everyday kind ----------
const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const pg1 = doc.addPage([595, 842]);
pg1.drawText('Raport kwartalny', { x: 50, y: 770, size: 30, font, color: rgb(0.85, 0.1, 0.1) });
pg1.drawText('Sprzedaz rosnie', { x: 50, y: 720, size: 18, font, color: rgb(0.1, 0.3, 0.85) });
pg1.drawRectangle({ x: 50, y: 600, width: 200, height: 80, color: rgb(0.1, 0.7, 0.3), borderColor: rgb(0.9, 0.6, 0.1), borderWidth: 4 });
pg1.drawRectangle({ x: 300, y: 600, width: 200, height: 80, color: cmyk(0, 0.8, 0.9, 0) });
const photo = canvasMod.createCanvas(300, 200);
const g = photo.getContext('2d');
const grad = g.createLinearGradient(0, 0, 300, 200);
grad.addColorStop(0, '#e53935'); grad.addColorStop(0.5, '#fdd835'); grad.addColorStop(1, '#1e88e5');
g.fillStyle = grad; g.fillRect(0, 0, 300, 200);
pg1.drawImage(await doc.embedJpg(new Uint8Array(photo.toBuffer('image/jpeg', 92))), { x: 50, y: 330, width: 300, height: 200 });
const png = canvasMod.createCanvas(120, 120);
const gp = png.getContext('2d');
gp.fillStyle = '#8e24aa'; gp.fillRect(0, 0, 120, 120); gp.fillStyle = '#43a047'; gp.fillRect(30, 30, 60, 60);
pg1.drawImage(await doc.embedPng(new Uint8Array(png.toBuffer('image/png'))), { x: 400, y: 380, width: 120, height: 120 });
const colourful = Buffer.from(await doc.save());
const report = readFileSync(join(ROOT, 'test-real-pdfs/allegro-raport.pdf'));
const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
const encrypted = Buffer.from(await encryptPDF(new Uint8Array(colourful), 'test1234'));

const browser = await chromium.launch();
async function open(locale: string, theme: 'light' | 'dark' = 'light'): Promise<{ page: Page; sent: Request[] }> {
  const ctx = await browser.newContext({ locale: locale === 'pl' ? 'pl-PL' : 'en-US', colorScheme: theme, serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/${locale}/grayscale-pdf`, { waitUntil: 'networkidle' });
  if (theme === 'dark') await p.evaluate(() => document.documentElement.classList.add('dark'));
  const sent: Request[] = [];
  p.on('request', (r) => sent.push(r));
  return { page: p, sent };
}
async function convert(p: Page, name: string, buffer: Buffer, locale: string): Promise<{ name: string; bytes: Uint8Array }> {
  await p.setInputFiles('#fileInput', { name, mimeType: 'application/pdf', buffer });
  const [download] = await Promise.all([
    p.waitForEvent('download', { timeout: 120_000 }),
    p.locator('main button', { hasText: t('page.grayscale.btn', locale) }).click(),
  ]);
  return { name: download.suggestedFilename(), bytes: new Uint8Array(readFileSync(await download.path())) };
}

try {
  console.log('=== /pl/grayscale-pdf: a PDF with coloured text, shapes, CMYK, a JPEG and a PNG ===');
  {
    const { page: p, sent } = await open('pl');
    check((await p.locator('h1').innerText()).trim() === t('tool.grayscale', 'pl'), 'the page has the tool name as its heading');
    const out = await convert(p, 'raport.pdf', colourful, 'pl');
    check(out.name === `raport${t('file.grayscale_suffix', 'pl')}.pdf`, `the file is named ${out.name}`);
    const [before, after] = [await render(colourful, 1), await render(out.bytes, 1)];
    const c = compare(before, after);
    check(c.coloured === 0, `no coloured pixel is left (${c.coloured})`);
    check(c.mean <= 2 && c.p99 <= 8, `every pixel keeps its lightness (mean ${c.mean.toFixed(2)}, p99 ${c.p99.toFixed(1)})`);
    check(after[0]!.text === before[0]!.text, 'the text is the same text');
    const summary = await p.locator('[data-testid="grayscale-summary"]').innerText();
    check(summary.trim() === t('page.grayscale.summary', 'pl', { pages: 1, colours: summary.match(/\d+/g)?.[1] ?? '?', images: 2, gradients: 0 }), `the summary counts the page and both images (${summary.trim()})`);
    check(await p.locator('[data-testid="grayscale-overlay"]').count() === 0, 'no cover layer was needed');
    const uploads = sent.filter((r) => (r.method() !== 'GET' && r.method() !== 'HEAD') || (r.postDataBuffer()?.length ?? 0) > 0);
    check(uploads.length === 0, `no request carries the file (${sent.length} requests, all GET/HEAD without a body)`);
    await p.context().close();
  }

  console.log('\n=== a real 27-page report with photos (JPEG through the browser) ===');
  {
    const { page: p } = await open('pl');
    const out = await convert(p, 'allegro.pdf', report, 'pl');
    const [before, after] = [await render(report, 0.5), await render(out.bytes, 0.5)];
    check(after.length === 27, `27 pages (${after.length})`);
    const c = compare(before, after);
    check(c.coloured === 0, `no coloured pixel is left on any page (${c.coloured})`);
    check(c.mean <= 2 && c.p99 <= 8, `every pixel keeps its lightness (mean ${c.mean.toFixed(2)}, p99 ${c.p99.toFixed(1)})`);
    check(after.every((pg, i) => pg.text === before[i]!.text), 'the text of every page is the same');
    check(await p.locator('[data-testid="grayscale-overlay"]').count() === 0, 'no cover layer was needed');
    console.log(`  (${report.length} → ${out.bytes.length} bytes)`);
    await p.context().close();
  }

  console.log('\n=== an encrypted file, and the English page ===');
  {
    const { page: p } = await open('pl');
    await p.setInputFiles('#fileInput', { name: 'tajny.pdf', mimeType: 'application/pdf', buffer: encrypted });
    await p.locator('main button', { hasText: t('page.grayscale.btn', 'pl') }).click();
    const alert = p.locator('main [role="alert"]');
    await alert.waitFor({ timeout: 30_000 });
    check(/zabezpieczony hasłem/.test(await alert.innerText()), `an encrypted file gets a Polish message (${(await alert.innerText()).trim().slice(0, 60)})`);
    await p.context().close();
    const { page: en } = await open('en');
    check((await en.locator('h1').innerText()).trim() === 'Grayscale PDF', 'English heading');
    const out = await convert(en, 'report.pdf', colourful, 'en');
    check(out.name === 'report-grayscale.pdf', `English file name (${out.name})`);
    await en.context().close();
  }

  console.log('\n=== legible in both themes (axe), with the result on screen ===');
  const axeSource = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
  for (const theme of ['light', 'dark'] as const) {
    const { page: p } = await open('pl', theme);
    await convert(p, 'a.pdf', colourful, 'pl');
    await p.locator('[data-testid="grayscale-summary"]').waitFor();
    await p.waitForFunction(() => document.getAnimations().every((x) => x.playState !== 'running' || x.effect?.getTiming().iterations === Infinity), undefined, { timeout: 10000 });
    await p.addScriptTag({ content: axeSource });
    const res = await p.evaluate(async () => (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } })
      .axe.run('main', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
    const v = res.violations.map((x) => `${x.id}×${x.nodes.length} (${x.nodes[0]?.target.join(' ').slice(0, 50)})`).join(', ');
    check(!v, `${theme}: axe (WCAG 2.2 AA): ${v || 'clean'}`);
    await p.context().close();
  }
} finally {
  await browser.close();
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
