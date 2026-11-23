// Plan 2.3 (2026-11-23): "Fill form" with a PDF that has no form fields. Before: a red error
// "no fillable fields found" and nothing else to do. Now the page explains it, offers typing
// anywhere (the editor opens with the text tool, black text, the new text's box focused) and
// links to "Make PDF fillable". The downloaded file is checked with pdf.js: the typed text, with
// Polish letters, is on the page where it was clicked.
// Run against a built site: E2E_BASE_URL=http://localhost:3100 npx tsx e2e/fill-form-flat.mts
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

// A printed form: a label and an underline, no AcroForm.
const doc = await PDFDocument.create();
const p = doc.addPage([400, 500]);
const font = await doc.embedFont(StandardFonts.Helvetica);
p.drawText('Name:', { x: 40, y: 420, size: 12, font });
p.drawLine({ start: { x: 90, y: 418 }, end: { x: 360, y: 418 }, thickness: 0.8, color: rgb(0, 0, 0) });
const pdfBytes = await doc.save();

const TYPED = 'Zażółć Gęślą';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1200 }, acceptDownloads: true });
  await page.goto(`${BASE_URL}/pl/fill-form`, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', { name: 'druk.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdfBytes) });

  console.log('=== no fields: explanation instead of an error ===');
  const panel = page.locator('[data-testid="fillform-no-fields"]');
  await panel.waitFor({ timeout: 20000 });
  check(await panel.isVisible(), 'the "no fields" panel is shown');
  check((await page.locator('.bg-red-50').count()) === 0, 'no red error box');
  const link = panel.locator('a');
  check((await link.getAttribute('href')) === '/pl/make-pdf-fillable', `link to "Make PDF fillable" in the page's language (${await link.getAttribute('href')})`);

  console.log('\n=== typing anywhere ===');
  await panel.getByRole('button', { name: 'Wpisz tekst na stronie' }).click();
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForSelector('div.absolute.inset-0.select-none', { timeout: 20000 });
  const textTool = page.locator('button[title$="(T)"]').first();
  check((await textTool.getAttribute('aria-pressed')) === 'true' || (await textTool.getAttribute('class') ?? '').includes('coffee-accent-ink'),
    'the editor opens with the text tool on');
  const cb = (await canvas.boundingBox())!;
  // Click just above the underline, right of the label (page point x=100, y≈422).
  const sx = cb.width / 400, sy = cb.height / 500;
  await page.mouse.click(cb.x + 100 * sx, cb.y + (500 - 436) * sy);
  const box = page.locator('#editor-selected-text');
  await box.waitFor({ timeout: 5000 });
  check(await box.evaluate((el) => el === document.activeElement), 'the new text\'s box has the cursor');
  check((await box.inputValue()) === 'Wpisz tekst', `the placed text starts as "Wpisz tekst", in the page's language (${await box.inputValue()})`);
  await page.keyboard.type(TYPED); // replaces the selected placeholder
  check((await box.inputValue()) === TYPED, 'typing replaces the placeholder');

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.locator('button', { hasText: /Pobierz/ }).last().click(),
  ]);
  const out = new Uint8Array(readFileSync((await download.path())!));

  console.log('\n=== the downloaded file ===');
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
  const task = pdfjs.getDocument({ data: out, verbosity: 0 });
  const pg = await (await task.promise).getPage(1);
  const items = (await pg.getTextContent()).items.filter((i) => 'str' in i) as { str: string; transform: number[] }[];
  const all = items.map((i) => i.str).join(' ');
  const typed = items.find((i) => i.str.includes('Zażółć'));
  await task.destroy();
  check(all.includes('Name:'), 'the original text is still there');
  check(all.replace(/\s+/g, ' ').includes(TYPED), `the typed text is real text in the file, Polish letters included ("${all}")`);
  // Clicked at page point (100, 436 from the bottom): the text box's top-left corner.
  check(!!typed && Math.abs(typed.transform[4]! - 100) < 1 && typed.transform[5]! < 436 && typed.transform[5]! > 420,
    `it is where it was clicked (x ${typed?.transform[4]?.toFixed(1)}, baseline ${typed?.transform[5]?.toFixed(1)})`);
  // 16 px in the editor (1.5 px per point) = 10.7 pt: ordinary form text.
  check(!!typed && Math.abs(typed.transform[0]! - 16 / 1.5) < 0.05, `about 10.7 pt, as a form needs (size ${typed?.transform[0]?.toFixed(2)})`);
  await page.close();

  console.log('\n=== English page: placeholder in English, not the word "Text" ===');
  const en = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
  await en.goto(`${BASE_URL}/en/fill-form`, { waitUntil: 'load' });
  await en.setInputFiles('#fileInput', { name: 'form.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdfBytes) });
  await en.locator('[data-testid="fillform-no-fields"] button').click();
  const c2 = en.locator('canvas').first();
  await c2.waitFor({ state: 'visible', timeout: 20000 });
  await en.waitForSelector('div.absolute.inset-0.select-none', { timeout: 20000 });
  const b2 = (await c2.boundingBox())!;
  await en.mouse.click(b2.x + 120, b2.y + 200);
  check((await en.locator('#editor-selected-text').inputValue()) === 'Type text', 'English placeholder "Type text"');
  await en.close();

  console.log('\n=== the "no fields" panel is legible in both themes (axe) ===');
  const axeSource = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
  for (const theme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ colorScheme: theme, serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
    const pg = await ctx.newPage();
    await pg.goto(`${BASE_URL}/pl/fill-form`, { waitUntil: 'load' });
    if (theme === 'dark') await pg.evaluate(() => document.documentElement.classList.add('dark'));
    await pg.setInputFiles('#fileInput', { name: 'druk.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdfBytes) });
    await pg.locator('[data-testid="fillform-no-fields"]').waitFor();
    await pg.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity), undefined, { timeout: 10000 });
    await pg.addScriptTag({ content: axeSource });
    const res = await pg.evaluate(async () => (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } })
      .axe.run('main', { runOnly: ['color-contrast', 'button-name', 'link-name', 'heading-order'] }));
    const v = res.violations.map((x) => `${x.id}×${x.nodes.length} (${x.nodes[0]?.target.join(' ').slice(0, 50)})`).join(', ');
    check(!v, `${theme}: axe on the page with the panel: ${v || 'clean'}`);
    await ctx.close();
  }

  console.log('\n=== a two-page form: what was typed on page 1 survives moving to page 2 ===');
  {
    const d2 = await PDFDocument.create();
    for (const n of [1, 2]) d2.addPage([400, 500]).drawText(`Page ${n}`, { x: 40, y: 460, size: 12, font: await d2.embedFont(StandardFonts.Helvetica) });
    const two = await browser.newPage({ viewport: { width: 1400, height: 1400 }, acceptDownloads: true });
    await two.goto(`${BASE_URL}/pl/fill-form`, { waitUntil: 'load' });
    await two.setInputFiles('#fileInput', { name: 'dwie.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await d2.save()) });
    await two.locator('[data-testid="fillform-no-fields"] button').click();
    const place = async (text: string) => {
      const cv = two.locator('canvas').first();
      await two.waitForSelector('div.absolute.inset-0.select-none', { timeout: 20000 });
      const bb = (await cv.boundingBox())!;
      await two.mouse.click(bb.x + bb.width * 0.25, bb.y + bb.height * 0.4);
      await two.locator('#editor-selected-text').waitFor();
      await two.waitForFunction(() => document.activeElement?.id === 'editor-selected-text');
      await two.keyboard.type(text);
    };
    await place('Pierwsza strona');
    const thumbs = two.locator('div.lg\\:w-28 > button');
    await thumbs.nth(1).click();
    await two.waitForTimeout(800);
    check((await two.locator('.edit-el').count()) === 0, 'page 2 starts empty');
    await place('Druga strona');
    await thumbs.nth(0).click();
    await two.waitForTimeout(800);
    check((await two.locator('.edit-el').count()) === 1, 'back on page 1, its text is still there');
    const [dl] = await Promise.all([two.waitForEvent('download'), two.locator('button', { hasText: /Pobierz/ }).last().click()]);
    const pdf2 = new Uint8Array(readFileSync((await dl.path())!));
    const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
    const t2 = pdfjs.getDocument({ data: pdf2, verbosity: 0 });
    const docj = await t2.promise;
    const txt = async (n: number) => ((await (await docj.getPage(n)).getTextContent()).items as { str?: string }[]).map((i) => i.str ?? '').join(' ');
    const [a, b] = [await txt(1), await txt(2)];
    await t2.destroy();
    check(a.includes('Pierwsza strona') && !a.includes('Druga'), `page 1 of the file has its own text ("${a.trim()}")`);
    check(b.includes('Druga strona') && !b.includes('Pierwsza'), `page 2 of the file has its own text ("${b.trim()}")`);
    await two.close();
  }
} finally {
  await browser.close();
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
