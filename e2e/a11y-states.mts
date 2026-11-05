// Accessibility of what a tool shows AFTER it is used (plan item 1.1c, 2026-11-05).
// e2e/a11y-axe.mts measures freshly loaded pages only; the error messages, warnings, the
// "files" list and the result panels appear later and had never been measured. This drives
// every tool page through the real UI twice — once with a broken file (the error state) and
// once with a valid one (the result state) — and runs axe on what is on screen, in the light
// and the dark theme (the dark class on <html> is what the theme toggle sets).
//
// The AI tools are measured with their results by e2e/ai-tools.mts and are not repeated here.
// Run against a dev or production server: E2E_BASE_URL (default http://localhost:3000).
import { chromium, type Page } from 'playwright';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph } from 'docx';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createCanvas } from '@napi-rs/canvas';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const ENFORCED = new Set([
  'color-contrast', 'label', 'select-name', 'target-size', 'button-name', 'link-name',
  'aria-allowed-attr', 'aria-valid-attr-value', 'duplicate-id-aria', 'heading-order', 'image-alt',
]);
const ONLY = process.env.E2E_TOOLS?.split(',');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

// ---------- files ----------
async function pdf(pages = 2): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) doc.addPage([595, 842]).drawText(`Page ${i + 1} of a test document`, { x: 72, y: 760, size: 14, font });
  return Buffer.from(await doc.save());
}
function png(): Buffer {
  const c = createCanvas(240, 160);
  const g = c.getContext('2d');
  g.fillStyle = '#3366aa'; g.fillRect(0, 0, 240, 160);
  g.fillStyle = '#ffffff'; g.fillRect(40, 40, 160, 80);
  return c.toBuffer('image/png');
}
async function xlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.addRows([['Name', 'Amount'], ['Apples', 3], ['Pears', 5]]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
async function docx(): Promise<Buffer> {
  return Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph('A test document.'), new Paragraph('Second paragraph.')] }] }));
}
async function odt(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
  zip.file('META-INF/manifest.xml', '<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>');
  zip.file('content.xml', '<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2"><office:body><office:text><text:p>A test document.</text:p><text:p>Second paragraph.</text:p></office:text></office:body></office:document-content>');
  return zip.generateAsync({ type: 'nodebuffer' });
}
const broken = (ext: string) => ({ name: `broken.${ext}`, mimeType: 'application/octet-stream', buffer: Buffer.from('This is not a real file, just some text.') });

const valid = {
  pdf: { name: 'test.pdf', mimeType: 'application/pdf', buffer: await pdf() },
  pdf2: { name: 'second.pdf', mimeType: 'application/pdf', buffer: await pdf(1) },
  png: { name: 'image.png', mimeType: 'image/png', buffer: png() },
  xlsx: { name: 'sheet.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: await xlsx() },
  docx: { name: 'doc.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await docx() },
  odt: { name: 'doc.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer: await odt() },
};

// ---------- driving a tool ----------
type Mode = 'error' | 'result';
const EXT: Record<string, keyof typeof valid> = { 'excel-to-pdf': 'xlsx', 'jpg-to-pdf': 'png', 'openoffice-to-pdf': 'odt', 'word-to-pdf': 'docx' };

async function upload(page: Page, slug: string, mode: Mode): Promise<boolean> {
  const inputs = page.locator('main input[type="file"]');
  if (await inputs.count() === 0) return false;
  const kind = EXT[slug] ?? 'pdf';
  const one = mode === 'error' ? broken(valid[kind].name.split('.').pop()!) : valid[kind];
  if (slug === 'compare-pdf') {
    await inputs.nth(0).setInputFiles(one);
    await inputs.nth(1).setInputFiles(mode === 'error' ? broken('pdf') : valid.pdf2);
  } else if (slug === 'merge') {
    await inputs.first().setInputFiles(mode === 'error' ? [one, broken('pdf')] : [valid.pdf, valid.pdf2]);
  } else {
    await inputs.first().setInputFiles(one);
  }
  return true;
}

async function prepare(page: Page, slug: string, mode: Mode): Promise<void> {
  if (slug === 'protect-pdf') {
    for (const f of await page.locator('main input[type="password"]').all()) await f.fill('test1234');
  }
  if (slug === 'unlock-pdf') await page.locator('main input[type="password"]').first().fill('wrong-password');
  if (slug === 'html-to-pdf') await page.locator('main textarea').first().fill('<h1>Test</h1><p>A paragraph.</p>');
  if (slug === 'url-to-pdf') await page.locator('main input[type="url"], main input[type="text"]').first().fill(mode === 'error' ? 'http://127.0.0.1/' : `${BASE}/pl`);
  if (slug === 'sign-pdf') {
    const typed = page.locator('main button', { hasText: /Wpisz|Type|Tekst/i }).first();
    if (await typed.count()) await typed.click().catch(() => {});
    const name = page.locator('main input[type="text"]').first();
    if (await name.count()) await name.fill('Jan Kowalski').catch(() => {});
  }
  if (['delete-pages', 'extract-pages', 'reorder-pages', 'redact-pdf'].includes(slug) && mode === 'result') {
    const thumb = page.locator('main [role="button"], main button[aria-pressed]').first();
    if (await thumb.count()) await thumb.click().catch(() => {});
  }
}

const STATE = 'main [class*="text-red-"], main [class*="bg-red-50"], main [class*="text-green-7"], main [class*="bg-green-50"], main [role="alert"], main [class*="bg-yellow-50"], main [class*="bg-amber-50"]';

async function axe(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async () => (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[]; any: { message: string }[] }[] }[] }> } }).axe.run(
    { include: [['main']], exclude: [['[data-watermark-preview]']] },
    { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
  ));
  return res.violations.filter((v) => ENFORCED.has(v.id)).flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ').slice(0, 70)} — ${(n.any[0]?.message ?? '').slice(0, 90)}`));
}

const { tools } = await import('../lib/tools.ts');
const slugs = tools.filter((t) => !t.disabled && !['aichat', 'aisummary', 'translate'].includes(t.key)).map((t) => t.slug).filter((s) => !ONLY || ONLY.includes(s));
const browser = await chromium.launch();
const noState: string[] = [];

for (const slug of slugs) {
  for (const mode of ['error', 'result'] as Mode[]) {
    if (mode === 'result' && slug === 'unlock-pdf') continue; // needs an encrypted file; its error is measured
    if (mode === 'error' && slug === 'html-to-pdf') continue; // pasted code has no broken-file state
    const ctx = await browser.newContext({ locale: 'pl-PL', colorScheme: 'light', serviceWorkers: 'block', acceptDownloads: true });
    await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); localStorage.setItem('theme', 'light'); } catch { /* */ } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/pl/${slug}`, { waitUntil: 'networkidle' });
    const uploaded = await upload(page, slug, mode);
    await page.waitForTimeout(1500);
    await prepare(page, slug, mode);
    const button = page.locator('main button[class*="w-full"][class*="py-3"]:enabled, main button[class*="w-full"][class*="py-4"]:enabled').first();
    let clicked = false;
    if (await button.count()) { await button.click().catch(() => {}); clicked = true; }
    const reached = await page.waitForSelector(STATE, { timeout: 45_000 }).then(() => true, () => false);
    await page.waitForTimeout(800);
    if (!reached) noState.push(`${slug}/${mode}${uploaded ? '' : ' (no upload)'}${clicked ? '' : ' (no button)'}`);
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), theme === 'dark');
      await page.waitForTimeout(150);
      const bad = await axe(page);
      check(bad.length === 0, `${theme} /pl/${slug} ${mode}${reached ? '' : ' (no state shown)'}: ${bad.length ? '\n      ' + bad.slice(0, 6).join('\n      ') : 'clean'}`);
    }
    await ctx.close();
  }
}

// A run that never reached its state measured nothing new; that must not pass quietly.
check(noState.length === 0, `every run reached its error or result state (${noState.join(', ') || 'all'})`);
await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
