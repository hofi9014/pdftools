// Real /edit-pdf: replace a line of text with Polish text in several fonts and styles, download,
// and read the saved PDF back independently.
//
// Before the fix the editor's fonts were Latin-only WOFF2 subsets: the downloaded PDF carried a
// WOFF2 file as its font program (no reader can use that) and had no glyph for "ą ć ę ł ń ś ź ż".
// What is checked for each choice: the browser has loaded a font that really has the Polish
// letters for the preview, the saved PDF embeds a TrueType program of the chosen family with a
// glyph for every letter, pdf.js loads it without substituting, and the text reads back.
import { chromium, type Page } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFDocument, PDFName, PDFRawStream, StandardFonts, decodePDFRawStream } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;
const fontkitMod = await import('@pdf-lib/fontkit');
interface KitFont { postscriptName: string; hasGlyphForCodePoint(cp: number): boolean }
const fontkit = ((fontkitMod as unknown as { default?: unknown }).default ?? fontkitMod) as { create(b: Uint8Array): KitFont };

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const TEXT = 'Zażółć gęślą jaźń ŁÓDŹ';
const src = await PDFDocument.create();
src.addPage([500, 300]).drawText('Original text to replace', { x: 60, y: 200, size: 16, font: await src.embedFont(StandardFonts.Helvetica) });
const srcBytes = Buffer.from(await src.save());

const browser = await chromium.launch({ headless: true });

async function editWith(font: string, bold: boolean, italic: boolean): Promise<{ bytes: Uint8Array; previewFamily: string; previewHasPolish: boolean }> {
  const page: Page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(`${BASE_URL}/pl/edit-pdf`, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', { name: 'a.pdf', mimeType: 'application/pdf', buffer: srcBytes });
  const hit = page.locator('.text-block-hit').first();
  await hit.waitFor({ state: 'attached', timeout: 30000 });
  await hit.click();
  const area = page.locator('textarea').first();
  await area.waitFor({ state: 'visible', timeout: 10000 });
  await page.getByRole('button', { name: font, exact: true }).click();
  if (bold) await page.getByRole('button', { name: 'B', exact: true }).click();
  if (italic) await page.getByRole('button', { name: 'I', exact: true }).click();
  await area.fill(TEXT);
  // The preview: the family the textarea is set in, and whether the browser has a loaded face
  // of that family which covers the Polish letters (document.fonts.check is false for a family
  // whose only face lacks them or is still loading).
  const previewFamily = await area.evaluate((el) => getComputedStyle(el).fontFamily.split(',')[0]!.replace(/['"]/g, '').trim());
  const previewHasPolish = await page.evaluate(async ({ family, weight, style, sample }) => {
    const spec = `${style} ${weight} 16px "${family}"`;
    await document.fonts.load(spec, sample);
    const faces = [...document.fonts].filter((f) => f.family.replace(/['"]/g, '') === family && f.status === 'loaded');
    return faces.length > 0 && document.fonts.check(spec, sample);
  }, { family: previewFamily, weight: bold ? 700 : 400, style: italic ? 'italic' : 'normal', sample: 'ąćęłńśźż' });
  await page.getByRole('button', { name: 'Zapisz', exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.locator('button', { hasText: /Pobierz/ }).last().click(),
  ]);
  const bytes = new Uint8Array(readFileSync((await download.path())!));
  await page.close();
  return { bytes, previewFamily, previewHasPolish };
}

async function inspect(bytes: Uint8Array): Promise<{ programs: Array<{ truetype: boolean; font: KitFont | null }>; text: string; substituted: string[] }> {
  const doc = await PDFDocument.load(bytes);
  const all = doc.context.enumerateIndirectObjects();
  const programs: Array<{ truetype: boolean; font: KitFont | null }> = [];
  for (const [, obj] of all) {
    if (!(obj instanceof PDFRawStream)) continue;
    const isProgram = all.some(([, d]) => {
      const dict = d as { get?: (n: PDFName) => unknown };
      if (typeof dict.get !== 'function') return false;
      const ref = dict.get(PDFName.of('FontFile2')) ?? dict.get(PDFName.of('FontFile3'));
      return !!ref && doc.context.lookup(ref as never) === obj;
    });
    if (!isProgram) continue;
    const data = decodePDFRawStream(obj).decode();
    let font: KitFont | null = null;
    try { font = fontkit.create(data); } catch { /* not a font */ }
    programs.push({ truetype: Buffer.from(data.subarray(0, 4)).toString('hex') === '00010000', font });
  }
  const pdf = await pdfjsLib.getDocument({ data: bytes.slice(), standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise;
  const page = await pdf.getPage(1);
  const text = (await page.getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
  await page.getOperatorList();
  const substituted: string[] = [];
  const objs = page.commonObjs as unknown as { _objs?: Record<string, { data?: { name?: string; missingFile?: boolean } }> };
  for (const [id, o] of Object.entries(objs._objs ?? {})) if (id.startsWith('g_') && o.data?.missingFile) substituted.push(o.data.name ?? id);
  return { programs, text, substituted };
}

const CASES: Array<[font: string, bold: boolean, italic: boolean, cssFamily: string, embedded: RegExp]> = [
  ['Arial', false, false, 'arimo', /^Arimo-Regular$/],
  ['Arial', true, false, 'arimo', /^Arimo-Bold$/],
  ['Times New Roman', false, true, 'tinos', /^Tinos-Italic$/],
  ['Georgia', true, true, 'gelasio', /^Gelasio-BoldItalic$/],
  ['Verdana', false, false, 'dejavusans', /^DejaVuSans$/],
  ['Cousine', false, true, 'cousine', /^Cousine-Italic$/],
  ['Lato', false, false, 'lato', /^Lato-Regular$/],
];

for (const [font, bold, italic, cssFamily, embedded] of CASES) {
  const label = `${font}${bold ? ' bold' : ''}${italic ? ' italic' : ''}`;
  console.log(`=== ${label} ===`);
  const r = await editWith(font, bold, italic);
  check(r.previewFamily === cssFamily && r.previewHasPolish, `the preview is set in "${r.previewFamily}", loaded, with the Polish letters`);
  const out = await inspect(r.bytes);
  const program = out.programs[0];
  check(out.programs.length === 1 && !!program?.truetype, `one embedded font program, TrueType (${out.programs.length})`);
  check(!!program?.font && embedded.test(program.font.postscriptName), `it is ${program?.font?.postscriptName}`);
  const lacking = program?.font ? [...TEXT].filter((c) => c !== ' ' && !program.font!.hasGlyphForCodePoint(c.codePointAt(0)!)).join('') : TEXT;
  check(lacking === '', `with a glyph for every letter of "${TEXT}"${lacking ? ` — missing ${lacking}` : ''}`);
  check(out.substituted.length === 0, `pdf.js loads it (substituted: ${out.substituted.join(', ') || 'none'})`);
  check(out.text.normalize('NFC').replace(/ +/g, ' ').includes(TEXT), `the edit reads back (${JSON.stringify(out.text.trim().slice(0, 60))})`);
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
