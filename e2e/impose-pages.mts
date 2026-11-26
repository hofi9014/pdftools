// End-to-end through the real /pages-per-sheet and /pdf-booklet pages (plan 2.7, 2026-11-26).
// The 27-page report 4 per sheet: 7 sheets with the same text; a 6-page booklet: 4 landscape
// sides with the pages in folding order and the print instruction on screen; no request carries
// the file; an encrypted file gets a Polish message; the English page; axe (WCAG 2.2 AA) in both
// themes with the result on screen, on both tools.
// Run: npm run test:e2e-impose-pages (needs a running server, E2E_BASE_URL).
import { chromium, type Page, type Request } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
const { t } = await import('../lib/i18n.ts');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

async function read(bytes: Uint8Array) {
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' });
  const doc = await task.promise;
  const pages: { w: number; h: number; items: { str: string; x: number }[] }[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n);
    const vp = pg.getViewport({ scale: 1 });
    const tc = await pg.getTextContent();
    pages.push({ w: vp.width, h: vp.height, items: tc.items.flatMap((i) => ('str' in i ? [{ str: i.str, x: i.transform[4] as number }] : [])) });
  }
  await task.destroy();
  return pages;
}

const six = await PDFDocument.create();
const font = await six.embedFont(StandardFonts.Helvetica);
for (let i = 1; i <= 6; i++) six.addPage([595, 842]).drawText(`Strona ${i}`, { x: 250, y: 420, size: 24, font });
const sixBytes = Buffer.from(await six.save());
const report = readFileSync(join(ROOT, 'test-real-pdfs/allegro-raport.pdf'));
const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
const encrypted = Buffer.from(await encryptPDF(new Uint8Array(sixBytes), 'test1234'));

const browser = await chromium.launch();
async function open(path: string, locale: string, theme: 'light' | 'dark' = 'light'): Promise<{ page: Page; sent: Request[] }> {
  const ctx = await browser.newContext({ locale: locale === 'pl' ? 'pl-PL' : 'en-US', colorScheme: theme, serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/${locale}/${path}`, { waitUntil: 'networkidle' });
  if (theme === 'dark') await p.evaluate(() => document.documentElement.classList.add('dark'));
  const sent: Request[] = [];
  p.on('request', (r) => sent.push(r));
  return { page: p, sent };
}
async function run(p: Page, name: string, buffer: Buffer, btn: string): Promise<{ name: string; bytes: Uint8Array }> {
  await p.setInputFiles('#fileInput', { name, mimeType: 'application/pdf', buffer });
  const [download] = await Promise.all([p.waitForEvent('download', { timeout: 120_000 }), p.locator('main button', { hasText: btn }).click()]);
  return { name: download.suggestedFilename(), bytes: new Uint8Array(readFileSync(await download.path())) };
}

try {
  console.log('=== /pl/pages-per-sheet: the 27-page report, 4 per sheet ===');
  {
    const { page: p, sent } = await open('pages-per-sheet', 'pl');
    check((await p.locator('h1').innerText()).trim() === t('tool.nup', 'pl'), 'the page has the tool name as its heading');
    await p.locator('button[aria-pressed]', { hasText: /^4$/ }).click();
    const out = await run(p, 'raport.pdf', report, t('page.impose.btn_nup', 'pl'));
    check(out.name === `raport${t('file.nup_suffix', 'pl')}.pdf`, `the file is named ${out.name}`);
    const sheets = await read(out.bytes);
    check(sheets.length === 7, `7 sheets (${sheets.length})`);
    const src = await read(new Uint8Array(report));
    const bag = (pages: { items: { str: string }[] }[]) => [...pages.flatMap((pg) => pg.items.map((i) => i.str)).join('').replace(/\s+/g, '')].sort().join('');
    check(bag(sheets) === bag(src), 'the same text is on the sheets');
    check((await p.locator('[data-testid="impose-summary"]').innerText()).trim() === t('page.impose.summary_nup', 'pl', { pages: 27, sheets: 7 }), 'the summary says 27 pages → 7 sheets');
    const uploads = sent.filter((r) => (r.method() !== 'GET' && r.method() !== 'HEAD') || (r.postDataBuffer()?.length ?? 0) > 0);
    check(uploads.length === 0, `no request carries the file (${sent.length} requests, all GET/HEAD without a body)`);
    await p.context().close();
  }

  console.log('\n=== /pl/pdf-booklet: 6 pages ===');
  {
    const { page: p } = await open('pdf-booklet', 'pl');
    check((await p.locator('h1').innerText()).trim() === t('tool.booklet', 'pl'), 'the page has the tool name as its heading');
    const out = await run(p, 'zeszyt.pdf', sixBytes, t('page.impose.btn_booklet', 'pl'));
    const sides = await read(out.bytes);
    check(sides.length === 4 && sides.every((s) => s.w > s.h), `4 landscape sides (${sides.length})`);
    // n = 8: sides 8|1, 2|7, 6|3, 4|5 — pages 7 and 8 are blank.
    const expected = [[null, 1], [2, null], [6, 3], [4, 5]];
    const got = sides.map((s) => [0, 1].map((k) => {
      const it = s.items.find((i) => (k === 0 ? i.x < s.w / 2 : i.x >= s.w / 2) && /Strona \d/.test(i.str));
      return it ? Number(it.str.replace(/\D/g, '')) : null;
    }));
    check(JSON.stringify(got) === JSON.stringify(expected), `pages in folding order: ${JSON.stringify(got)}`);
    check((await p.locator('[data-testid="impose-summary"]').innerText()).includes(t('page.impose.blanks', 'pl', { n: 2 })), 'the page says 2 blank pages were added');
    check((await p.locator('[data-testid="impose-print-tip"]').innerText()).includes(t('page.impose.print_tip', 'pl').slice(0, 30)), 'the print instruction is on screen');
    await p.setInputFiles('#fileInput', { name: 'tajny.pdf', mimeType: 'application/pdf', buffer: encrypted });
    await p.locator('main button', { hasText: t('page.impose.btn_booklet', 'pl') }).click();
    const alert = p.locator('main [role="alert"]');
    await alert.waitFor({ timeout: 30_000 });
    check(/zabezpieczony hasłem/.test(await alert.innerText()), 'an encrypted file gets a Polish message');
    await p.context().close();
  }

  console.log('\n=== English pages ===');
  for (const [path, key] of [['pages-per-sheet', 'nup'], ['pdf-booklet', 'booklet']] as const) {
    const { page: p } = await open(path, 'en');
    check((await p.locator('h1').innerText()).trim() === t(`tool.${key}`, 'en'), `/en/${path}: English heading`);
    const out = await run(p, 'notes.pdf', sixBytes, t(`page.impose.btn_${key}`, 'en'));
    check(out.name === `notes${t(`file.${key}_suffix`, 'en')}.pdf`, `/en/${path}: English file name (${out.name})`);
    await p.context().close();
  }

  console.log('\n=== legible in both themes (axe), with the result on screen ===');
  const axeSource = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
  for (const [path, key] of [['pages-per-sheet', 'nup'], ['pdf-booklet', 'booklet']] as const) {
    for (const theme of ['light', 'dark'] as const) {
      const { page: p } = await open(path, 'pl', theme);
      await run(p, 'a.pdf', sixBytes, t(`page.impose.btn_${key}`, 'pl'));
      await p.locator('[data-testid="impose-summary"]').waitFor();
      await p.waitForFunction(() => document.getAnimations().every((x) => x.playState !== 'running' || x.effect?.getTiming().iterations === Infinity), undefined, { timeout: 10000 });
      await p.addScriptTag({ content: axeSource });
      const res = await p.evaluate(async () => (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } })
        .axe.run('main', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
      const v = res.violations.map((x) => `${x.id}×${x.nodes.length} (${x.nodes[0]?.target.join(' ').slice(0, 50)})`).join(', ');
      check(!v, `${path} ${theme}: axe (WCAG 2.2 AA): ${v || 'clean'}`);
      await p.context().close();
    }
  }
} finally {
  await browser.close();
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
