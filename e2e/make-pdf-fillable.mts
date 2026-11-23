// End-to-end through the real /make-pdf-fillable page (plan 2.2, 2026-11-23).
// Fields are drawn with the mouse on a two-page PDF (the second page turned 90°), renamed, given
// Polish dropdown choices and a required flag; the downloaded file is read by pdf.js: every field
// exists with its name, type and choices, at the place it was drawn as displayed. Then the same
// file goes through the real /fill-form page with a Polish value — this is the path a person
// takes, and it used to fail on Polish letters (fixed the same day). No request carries a file.
// Run: npm run test:e2e-make-pdf-fillable (needs a running server, E2E_BASE_URL).
import { chromium, type Page, type Request } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
const { t } = await import('../lib/i18n.ts');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.012;

type Annot = { fieldType?: string; fieldName?: string; rect: number[]; options?: { displayValue: string }[]; required?: boolean; multiLine?: boolean };
async function readFields(bytes: Uint8Array) {
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' });
  const doc = await task.promise;
  const out: { page: number; a: Annot; x: number; y: number; w: number; h: number }[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n);
    const vp = pg.getViewport({ scale: 1 });
    for (const a of (await pg.getAnnotations()) as Annot[]) {
      if (!a.fieldType) continue;
      const [x1, y1] = vp.convertToViewportPoint(a.rect[0]!, a.rect[1]!);
      const [x2, y2] = vp.convertToViewportPoint(a.rect[2]!, a.rect[3]!);
      out.push({ page: n - 1, a, x: Math.min(x1!, x2!) / vp.width, y: Math.min(y1!, y2!) / vp.height, w: Math.abs(x2! - x1!) / vp.width, h: Math.abs(y2! - y1!) / vp.height });
    }
  }
  const text = (await (await doc.getPage(1)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
  await task.destroy();
  return { fields: out, text };
}

// A two-page form: the second page is landscape content saved as portrait + /Rotate 90.
const src = await PDFDocument.create();
const helv = await src.embedFont(StandardFonts.Helvetica);
src.addPage([595, 842]).drawText('Wniosek', { x: 60, y: 780, size: 20, font: helv });
const p2 = src.addPage([595, 842]);
p2.setRotation(degrees(90));
p2.drawText('Strona 2', { x: 60, y: 780, size: 20, font: helv });
const source = Buffer.from(await src.save());

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'pl-PL', serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 1280, height: 2300 } });
await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
const page = await ctx.newPage();
const sent: Request[] = [];
page.on('request', (r) => sent.push(r));

/** Draws a box on the visible page, given as fractions of the page picture. */
async function draw(p: Page, x: number, y: number, w: number, h: number) {
  const box = (await p.locator('[data-testid="field-canvas"]').boundingBox())!;
  await p.mouse.move(box.x + x * box.width, box.y + y * box.height);
  await p.mouse.down();
  await p.mouse.move(box.x + (x + w) * box.width, box.y + (y + h) * box.height, { steps: 6 });
  await p.mouse.up();
}
const typeButton = (k: string) => page.locator('main button[aria-pressed]', { hasText: t(`page.makefillable.type_${k}`, 'pl') }).first();

console.log('=== drawing fields on /pl/make-pdf-fillable ===');
await page.goto(`${BASE}/pl/make-pdf-fillable`, { waitUntil: 'networkidle' });
check((await page.locator('h1').innerText()).trim() === t('tool.makefillable', 'pl'), 'the page has the tool name as its heading');
const before = sent.length;
await page.setInputFiles('#fileInput', { name: 'wniosek.pdf', mimeType: 'application/pdf', buffer: source });
await page.locator('[data-testid="field-canvas"] img').waitFor({ timeout: 30_000 });

await typeButton('text').click();
await draw(page, 0.2, 0.15, 0.5, 0.04);
await page.locator('#mf-name').fill('Imię i nazwisko');
await typeButton('dropdown').click();
await draw(page, 0.2, 0.25, 0.35, 0.04);
await page.locator('#mf-options').fill('Warszawa\nKraków\n\nGdańsk');
await typeButton('checkbox').click();
await draw(page, 0.2, 0.35, 0.04, 0.03);
await page.locator('#mf-required').check();
await typeButton('multiline').click();
await draw(page, 0.1, 0.45, 0.8, 0.15);
await typeButton('signature').click();
await draw(page, 0.55, 0.8, 0.35, 0.08);
check((await page.getByText(t('page.makefillable.count', 'pl', { n: 5 })).count()) === 1, 'five fields counted on the page');
// Move to page 2 (turned 90°: the picture is landscape) and draw one field there.
await page.locator('main button', { hasText: t('redact.next', 'pl') }).click();
await page.waitForFunction(() => { const i = document.querySelector('[data-testid="field-canvas"] img') as HTMLImageElement | null; return !!i && i.naturalWidth > i.naturalHeight; }, undefined, { timeout: 30_000 });
check(true, 'page 2 is shown turned (landscape picture)');
await typeButton('text').click();
await draw(page, 0.1, 0.2, 0.5, 0.06);

const [download] = await Promise.all([page.waitForEvent('download'), page.locator('main button', { hasText: t('page.makefillable.btn', 'pl') }).click()]);
check(download.suggestedFilename() === `wniosek${t('file.fillable_suffix', 'pl')}.pdf`, `file name ${download.suggestedFilename()}`);
const out = new Uint8Array(readFileSync(await download.path()));
const { fields } = await readFields(out);
const f = (name: string) => fields.find((x) => x.a.fieldName === name);
check(fields.length === 6, `six fields in the file (${fields.length})`);
const name = f('Imię i nazwisko');
check(!!name && name.a.fieldType === 'Tx' && near(name.x, 0.2) && near(name.y, 0.15) && near(name.w, 0.5), 'the renamed text field is in the file where it was drawn');
const dd = f(`${t('page.makefillable.type_dropdown', 'pl')} 1`);
check(!!dd && dd.a.options?.map((o) => o.displayValue).join('|') === 'Warszawa|Kraków|Gdańsk', `dropdown choices with Polish letters, empty line dropped (${dd?.a.options?.map((o) => o.displayValue).join('|')})`);
check(!!f(`${t('page.makefillable.type_checkbox', 'pl')} 1`)?.a.required, 'the checkbox is required');
check(f(`${t('page.makefillable.type_multiline', 'pl')} 1`)?.a.multiLine === true, 'the multi-line field is multi-line');
check(f(`${t('page.makefillable.type_signature', 'pl')} 1`)?.a.fieldType === 'Sig', 'the signature field is a signature field');
const turned = fields.find((x) => x.page === 1);
check(!!turned && near(turned.x, 0.1) && near(turned.y, 0.2) && near(turned.w, 0.5) && near(turned.h, 0.06), `the field on the turned page is where it was drawn, as displayed (${turned?.x.toFixed(3)}, ${turned?.y.toFixed(3)})`);
await page.locator('main [role="status"]').filter({ hasText: t('page.makefillable.success', 'pl', { n: 6 }) }).waitFor();
check(true, 'the page says the PDF with six fields was downloaded');
const uploads = sent.slice(before).filter((r) => (r.method() !== 'GET' && r.method() !== 'HEAD') || (r.postDataBuffer()?.length ?? 0) > 0);
check(uploads.length === 0, 'no request carries the file');

console.log('\n=== the result filled in with /pl/fill-form (Polish value) ===');
await page.goto(`${BASE}/pl/fill-form`, { waitUntil: 'networkidle' });
await page.setInputFiles('#fileInput', { name: 'wniosek-formularz.pdf', mimeType: 'application/pdf', buffer: Buffer.from(out) });
const input = page.locator('main input[type="text"]').first();
await input.waitFor({ timeout: 30_000 });
await input.fill('Zażółć Gęślą');
const [filled] = await Promise.all([page.waitForEvent('download', { timeout: 30_000 }), page.locator('main button[class*="w-full"]').last().click()]);
const filledBytes = new Uint8Array(readFileSync(await filled.path()));
check((await readFields(filledBytes)).text.includes('Zażółć Gęślą'), 'the filled-in, flattened PDF shows the Polish value on the page');

console.log('\n=== an encrypted file ===');
const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
await page.goto(`${BASE}/pl/make-pdf-fillable`, { waitUntil: 'networkidle' });
await page.setInputFiles('#fileInput', { name: 'tajny.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await encryptPDF(new Uint8Array(source), 'test1234')) });
const alert = page.locator('main [role="alert"]');
await alert.waitFor({ timeout: 30_000 });
check(/zabezpieczony hasłem/.test(await alert.innerText()), 'an encrypted file gets a Polish message');

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
