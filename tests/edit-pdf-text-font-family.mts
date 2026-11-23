// Text placed with the editor's "Text" tool (FINDING 2026-11-23, plan 2.3).
//
// Before: editPdfClient drew a placed text as a PNG picture of the text. Its size grew with the
// square of the chosen size — measured in the real editor: "HHHH Zażółć" at 24 px was 98 pt wide
// on screen and 204 pt wide in the file, and 26 pt higher — and it could not be selected,
// searched or copied. The editor also kept only the page on screen: moving to another page threw
// away what was placed on the previous one.
// Now: real text in the preview's own font (2026-09-22 guard kept: the same family the preview
// draws, for all 12 choices), the preview's size, wrapping and line height, mapped through
// /Rotate and the crop box; and editPdfPages writes several pages at once.
// Run: npm run test:edit-pdf-text-font-family
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { PDFDocument, PDFName, PDFDict, degrees } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('/')) {
    const f = join(ROOT, 'public', url);
    return existsSync(f) ? new Response(new Uint8Array(readFileSync(f)), { status: 200 }) : new Response('not found', { status: 404 });
  }
  return realFetch(input, init);
}) as typeof fetch;

const { editPdfClient, editPdfPages, wrapEditorText } = await import('../lib/client-pdf');
const { fontUrl } = await import('../lib/pdf/fonts');
const fontkit = (await import('@pdf-lib/fontkit')).default;
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const toFile = (b: Uint8Array) => Object.assign(new Blob([b as BlobPart]), { name: 'x.pdf' }) as unknown as File;
const near = (a: number, b: number, tol = 0.6) => Math.abs(a - b) <= tol;

// The editor shows a page at 1.5 canvas px per point.
const R = 1.5;

async function blank(w = 400, h = 500, rotate = 0, crop?: [number, number, number, number]): Promise<Uint8Array> {
  const d = await PDFDocument.create();
  const p = d.addPage([w, h]);
  if (rotate) p.setRotation(degrees(rotate));
  if (crop) p.setCropBox(...crop);
  d.addPage([w, h]);
  return d.save();
}

interface Item { str: string; x: number; y: number; size: number; vx: number; vy: number }
async function textItems(bytes: Uint8Array, pageNo = 1): Promise<Item[]> {
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
  const page = await (await task.promise).getPage(pageNo);
  const vp = page.getViewport({ scale: 1 });
  const items = ((await page.getTextContent()).items.filter((i) => 'str' in i) as { str: string; transform: number[] }[])
    .filter((i) => i.str.trim())
    .map((i) => {
      const [vx, vy] = vp.convertToViewportPoint(i.transform[4]!, i.transform[5]!) as [number, number];
      return { str: i.str, x: i.transform[4]!, y: i.transform[5]!, size: Math.hypot(i.transform[0]!, i.transform[1]!), vx, vy };
    });
  await task.destroy();
  return items;
}

function baseFonts(bytes: Uint8Array, doc: PDFDocument): string[] {
  const res = doc.getPage(0).node.Resources();
  const fonts = res?.lookup(PDFName.of('Font'));
  if (!(fonts instanceof PDFDict)) return [];
  return fonts.keys().map((k) => String((fonts.lookup(k) as PDFDict).get(PDFName.of('BaseFont'))));
}

console.log('=== wrapping as the preview (pre-wrap, break-word) ===');
{
  const w = (s: string) => s.length; // one unit per character
  check(JSON.stringify(wrapEditorText('ab cd ef', w, 5)) === JSON.stringify(['ab cd', 'ef']), 'wraps at a space');
  check(JSON.stringify(wrapEditorText('ab\ncd', w, 10)) === JSON.stringify(['ab', 'cd']), 'keeps a line break');
  check(JSON.stringify(wrapEditorText('abcdefgh', w, 3)) === JSON.stringify(['abc', 'def', 'gh']), 'breaks a word longer than a line');
  check(JSON.stringify(wrapEditorText('ab   cd', w, 4)) === JSON.stringify(['ab', 'cd']), 'spaces at the wrap hang');
  check(JSON.stringify(wrapEditorText('a\n\nb', w, 4)) === JSON.stringify(['a', '', 'b']), 'an empty line stays');
}

console.log('\n=== the 12 fonts: real text in the family the preview draws ===');
const FONTS = ['Arial', 'Arimo', 'Cousine', 'Georgia', 'Lato', 'Noto Sans', 'Open Sans', 'PT Sans', 'Roboto', 'Times New Roman', 'Tinos', 'Verdana'];
for (const font of FONTS) {
  const text = 'Zażółć gęślą';
  const out = new Uint8Array(await (await editPdfClient(toFile(await blank()), 0,
    [{ type: 'text', x: 60, y: 90, text, size: 24, font: font as never, width: 400, height: 40, color: '#000000' }], 400 * R, 500 * R)).arrayBuffer());
  const doc = await PDFDocument.load(out);
  const expected = fontkit.create(readFileSync(join(ROOT, 'public', fontUrl(font, 400, false)!))).postscriptName;
  const names = baseFonts(out, doc);
  const items = await textItems(out);
  check(names.some((n) => n.includes(expected)) && items.map((i) => i.str).join('').replace(/\s/g, '') === text.replace(/\s/g, ''),
    `${font}: text "${text}" is real text in ${expected} (fonts: ${names.join(', ')}; text: ${items.map((i) => i.str).join('|')})`);
}

console.log('\n=== size and place match the preview ===');
for (const size of [11, 24, 40]) {
  const el = { type: 'text' as const, x: 90, y: 120, text: 'HHHH', size, font: 'Arial' as never, width: 600, height: 60, color: '#000000' };
  const out = new Uint8Array(await (await editPdfClient(toFile(await blank()), 0, [el], 400 * R, 500 * R)).arrayBuffer());
  const [it] = await textItems(out);
  // Preview: font-size `size` canvas px = size / R points; line height 1.2; top at y / R.
  const sizePt = size / R;
  // Arimo: ascent 0.905 em, descent 0.212 em (hhea) — the first baseline in a 1.2 line box.
  const baselineFromTop = 120 / R + (1.2 * sizePt - (0.905 + 0.212) * sizePt) / 2 + 0.905 * sizePt;
  check(!!it && near(it.size, sizePt, 0.01), `${size} px: drawn at ${sizePt.toFixed(2)} pt (got ${it?.size.toFixed(2)})`);
  check(!!it && near(it.x, 90 / R, 0.01) && near(500 - it.y, baselineFromTop, 0.3),
    `${size} px: starts at the box's left edge and the preview's baseline (x ${it?.x.toFixed(2)} vs ${(90 / R).toFixed(2)}, baseline ${(500 - (it?.y ?? 0)).toFixed(2)} vs ${baselineFromTop.toFixed(2)})`);
}

console.log('\n=== wrapping in the file follows the box width ===');
{
  const text = 'Jan Kowalski ul. Długa 5 Warszawa';
  const out = new Uint8Array(await (await editPdfClient(toFile(await blank()), 0,
    [{ type: 'text', x: 30, y: 30, text, size: 18, font: 'Arial' as never, width: 150, height: 80, color: '#000000' }], 400 * R, 500 * R)).arrayBuffer());
  const items = await textItems(out);
  const ys = items.map((i) => i.y).filter((y, k, a) => a.findIndex((z) => Math.abs(z - y) < 1) === k);
  check(ys.length >= 2 && items.map((i) => i.str).join(' ').replace(/\s+/g, ' ') === text, `wrapped onto ${ys.length} lines, nothing lost (${items.map((i) => i.str).join(' | ')})`);
  check(items.every((i) => i.x + 0 >= 30 / R - 0.01) && ys.every((y, k) => k === 0 || near(ys[k - 1]! - y, 1.2 * 18 / R, 0.6)), `lines 1.2 apart, all from the left edge (x: ${items.map((i) => i.x.toFixed(1)).join(',')}; y: ${ys.join(',')})`);
}

console.log('\n=== a turned page and a crop box ===');
for (const rot of [90, 180, 270]) {
  // The preview shows the page turned: 500 wide, 400 tall for 90/270.
  const visW = rot % 180 ? 500 : 400, visH = rot % 180 ? 400 : 500;
  const out = new Uint8Array(await (await editPdfClient(toFile(await blank(400, 500, rot)), 0,
    [{ type: 'text', x: 150, y: 90, text: 'Abc', size: 30, font: 'Arial' as never, width: 300, height: 50, color: '#000000' }], visW * R, visH * R)).arrayBuffer());
  const [it] = await textItems(out);
  const sizePt = 30 / R;
  const base = 90 / R + (1.2 * sizePt - 1.117 * sizePt) / 2 + 0.905 * sizePt;
  check(!!it && near(it.vx, 150 / R, 0.3) && near(it.vy, base, 0.3), `/Rotate ${rot}: on the page as seen, where it was placed (${it?.vx.toFixed(1)},${it?.vy.toFixed(1)} vs ${(150 / R).toFixed(1)},${base.toFixed(1)})`);
}
{
  const out = new Uint8Array(await (await editPdfClient(toFile(await blank(400, 500, 0, [50, 60, 300, 400])), 0,
    [{ type: 'text', x: 30, y: 45, text: 'Abc', size: 30, font: 'Arial' as never, width: 300, height: 50, color: '#000000' }], 300 * R, 400 * R)).arrayBuffer());
  const [it] = await textItems(out);
  const base = 45 / R + (1.2 * 20 - 1.117 * 20) / 2 + 0.905 * 20;
  check(!!it && near(it.vx, 30 / R, 0.3) && near(it.vy, base, 0.3), `crop box not at (0,0): placed in the visible area (${it?.vx.toFixed(1)},${it?.vy.toFixed(1)})`);
}

console.log('\n=== a letter the chosen font lacks ===');
{
  const out = new Uint8Array(await (await editPdfClient(toFile(await blank()), 0,
    [{ type: 'text', x: 30, y: 30, text: 'Dvořák', size: 24, font: 'Lato' as never, width: 300, height: 40, color: '#000000' }], 400 * R, 500 * R)).arrayBuffer());
  const names = baseFonts(out, await PDFDocument.load(out));
  check(names.some((n) => n.includes('LiberationSans')) && (await textItems(out)).map((i) => i.str).join('') === 'Dvořák', `Lato has no "ř": written in Liberation Sans (${names.join(', ')})`);
}

console.log('\n=== several pages in one file ===');
{
  const out = new Uint8Array(await (await editPdfPages(toFile(await blank()), [
    { pageIndex: 0, elements: [{ type: 'text', x: 30, y: 30, text: 'Strona pierwsza', size: 20, font: 'Arial' as never, width: 400, height: 40, color: '#000000' }], pageWidth: 400 * R, pageHeight: 500 * R },
    { pageIndex: 1, elements: [{ type: 'text', x: 30, y: 30, text: 'Strona druga', size: 20, font: 'Arial' as never, width: 400, height: 40, color: '#000000' }], pageWidth: 400 * R, pageHeight: 500 * R },
  ])).arrayBuffer());
  const p1 = (await textItems(out, 1)).map((i) => i.str).join(' ');
  const p2 = (await textItems(out, 2)).map((i) => i.str).join(' ');
  check(p1 === 'Strona pierwsza' && p2 === 'Strona druga', `each page gets its own text ("${p1}" / "${p2}")`);
  const fonts = new Set<string>();
  const d = await PDFDocument.load(out);
  for (const pg of d.getPages()) {
    const f = pg.node.Resources()?.lookup(PDFName.of('Font'));
    if (f instanceof PDFDict) for (const k of f.keys()) fonts.add(String(f.get(k)));
  }
  check(fonts.size === 1, `the font is embedded once for both pages (${fonts.size})`);
}

console.log('\n=== the editor keeps the elements of other pages ===');
{
  const src = readFileSync(join(ROOT, 'components/edit-pdf/PdfEditor.tsx'), 'utf8');
  check(/otherPagesRef/.test(src) && /undoRedo\.reset\(saved\.get\(p\)\?\.elements \?\? \[\]\)/.test(src), 'moving to another page saves this page\'s elements and restores the other page\'s');
  check(/editPdfPages\(sourceFile, pageEdits\)/.test(src) && !/editPdfClient\(/.test(src), 'the download writes every page that has elements');
}

globalThis.fetch = realFetch;
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
