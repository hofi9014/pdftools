// "Pages per sheet" and "Booklet" (plan 2.7): every source page must land in its cell upright as
// the reader saw it — also pages turned by /Rotate 90/180/270 and pages whose crop box is not the
// media box — keep its text as text, and nothing outside its crop box may show. Each source page
// carries four coloured squares in the corners AS DISPLAYED (red top-left, green top-right, blue
// bottom-left, black bottom-right) and a label; the imposed sheets are rendered by pdf.js and the
// colours are sampled where the corners must be.
// Run: npm run test:impose-pages
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFArray, PDFDocument, PDFName, StandardFonts, degrees, rgb, type PDFPage } from 'pdf-lib';
import { bookletOrder, chooseLayout, displayedSize, imposePages, SHEET_SIZES } from '../lib/pdf/imposePages.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const MM = 72 / 25.4;

const COLOURS = { tl: [1, 0, 0], tr: [0, 0.7, 0], bl: [0, 0, 1], br: [0, 0, 0] } as const;

/** A point from the top-left of the page as displayed → page coordinates (as the tool assumes). */
function view(page: PDFPage) {
  const crop = page.getCropBox();
  const { w, h, rot } = displayedSize(page);
  const pt = (vx: number, vyTop: number) => {
    const vy = h - vyTop;
    let x = vx, y = vy;
    if (rot === 90) { x = crop.width - vy; y = vx; }
    else if (rot === 180) { x = crop.width - vx; y = crop.height - vy; }
    else if (rot === 270) { x = vy; y = crop.height - vx; }
    return { x: crop.x + x, y: crop.y + y };
  };
  return { w, h, pt };
}

async function makeSource(specs: { size: [number, number]; rotate?: number; crop?: [number, number, number, number] }[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  specs.forEach((sp, i) => {
    const page = doc.addPage(sp.size);
    if (sp.crop) {
      // Something outside the crop box that must never show.
      page.drawRectangle({ x: 0, y: 0, width: sp.size[0], height: sp.size[1], color: rgb(1, 0, 1) });
      page.setCropBox(...sp.crop);
    }
    if (sp.rotate) page.setRotation(degrees(sp.rotate));
    const v = view(page);
    page.drawRectangle({ ...(() => { const a = v.pt(0, 0), b = v.pt(v.w, v.h); return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) }; })(), color: rgb(1, 1, 1) });
    const sq = Math.min(v.w, v.h) * 0.2;
    const corner = (vx: number, vy: number, c: readonly number[]) => {
      const a = v.pt(vx, vy), b = v.pt(vx + sq, vy + sq);
      page.drawRectangle({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y), color: rgb(c[0]!, c[1]!, c[2]!) });
    };
    corner(0, 0, COLOURS.tl); corner(v.w - sq, 0, COLOURS.tr); corner(0, v.h - sq, COLOURS.bl); corner(v.w - sq, v.h - sq, COLOURS.br);
    const c = v.pt(v.w / 2, v.h / 2);
    page.drawText(`P${i + 1}`, { x: c.x, y: c.y, size: 14, font });
  });
  return { bytes: await doc.save(), doc };
}

interface Sheet { w: number; h: number; d: Uint8ClampedArray; labels: { text: string; x: number; y: number }[]; images: number }
async function render(bytes: Uint8Array): Promise<Sheet[]> {
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' });
  const doc = await task.promise;
  const out: Sheet[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n);
    const vp = pg.getViewport({ scale: 1 });
    const c = canvasMod.createCanvas(Math.round(vp.width), Math.round(vp.height));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await pg.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport: vp, canvas: c as unknown as HTMLCanvasElement }).promise;
    const tc = await pg.getTextContent();
    const ops = await pg.getOperatorList();
    out.push({
      w: c.width, h: c.height, d: ctx.getImageData(0, 0, c.width, c.height).data as unknown as Uint8ClampedArray,
      labels: tc.items.flatMap((i) => ('str' in i && i.str.trim() ? [{ text: i.str.trim(), x: i.transform[4] as number, y: i.transform[5] as number }] : [])),
      images: ops.fnArray.filter((f) => f === pdfjs.OPS.paintImageXObject).length,
    });
  }
  await task.destroy();
  return out;
}

const px = (s: Sheet, x: number, yUp: number) => {
  const i = (Math.round(s.h - yUp) * s.w + Math.round(x)) * 4;
  return [s.d[i]! / 255, s.d[i + 1]! / 255, s.d[i + 2]! / 255];
};
const near = (a: number[], b: readonly number[]) => a.every((v, i) => Math.abs(v - b[i]!) < 0.15);

/** The four corners of a placed page (box in sheet coordinates, y up) have the right colours. */
function cornersOk(s: Sheet, box: { x: number; y: number; w: number; h: number }): string | null {
  const d = Math.min(box.w, box.h) * 0.08;
  const got = {
    tl: px(s, box.x + d, box.y + box.h - d), tr: px(s, box.x + box.w - d, box.y + box.h - d),
    bl: px(s, box.x + d, box.y + d), br: px(s, box.x + box.w - d, box.y + d),
  };
  for (const k of ['tl', 'tr', 'bl', 'br'] as const) if (!near(got[k], COLOURS[k])) return `${k} is ${got[k].map((v) => v.toFixed(2)).join(',')}`;
  return null;
}

/** Where the tool must put a page of displayed size (w, h) in a cell. */
function expectedBox(cell: { x: number; y: number; w: number; h: number }, w: number, h: number) {
  const s = Math.min(cell.w / w, cell.h / h);
  return { x: cell.x + (cell.w - w * s) / 2, y: cell.y + (cell.h - h * s) / 2, w: w * s, h: h * s };
}
function cellsOf(sheetW: number, sheetH: number, cols: number, rows: number, m: number) {
  const w = (sheetW - m * (cols + 1)) / cols, h = (sheetH - m * (rows + 1)) / rows;
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: m + c * (w + m), y: sheetH - m - (r + 1) * h - r * m, w, h });
  return out;
}

console.log('=== layout choice ===');
{
  const a4 = SHEET_SIZES.A4;
  const two = chooseLayout(595, 842, a4, 2, 0);
  check(two.sheetW > two.sheetH && two.cols === 2 && two.rows === 1, `2 portrait pages: landscape sheet, side by side (${two.cols}×${two.rows})`);
  const four = chooseLayout(595, 842, a4, 4, 0);
  check(four.sheetW < four.sheetH && four.cols === 2 && four.rows === 2, '4 portrait pages: portrait sheet, 2×2');
  const six = chooseLayout(595, 842, a4, 6, 0);
  check(six.sheetW > six.sheetH && six.cols === 3 && six.rows === 2, `6 portrait pages: landscape sheet, 3 across (${six.cols}×${six.rows})`);
  const twoL = chooseLayout(842, 595, a4, 2, 0);
  check(twoL.sheetW < twoL.sheetH && twoL.cols === 1 && twoL.rows === 2, 'two landscape pages: one above the other on a portrait sheet');
  check(JSON.stringify(bookletOrder(8)) === JSON.stringify([[7, 0], [1, 6], [5, 2], [3, 4]]), 'booklet order of 8 pages: 8|1, 2|7, 6|3, 4|5');
}

const specs: { size: [number, number]; rotate?: number; crop?: [number, number, number, number] }[] = [
  { size: [595, 842] },
  { size: [595, 842], rotate: 90 },
  { size: [595, 842], rotate: 180 },
  { size: [595, 842], rotate: 270 },
  { size: [700, 900], crop: [50, 80, 595, 842] },
  { size: [842, 595] },
];
const { bytes: srcBytes, doc: srcDoc } = await makeSource(specs);

console.log('\n=== the test pages render as intended (control) ===');
{
  const sheets = await render(srcBytes);
  sheets.forEach((s, i) => {
    const err = cornersOk(s, { x: 0, y: 0, w: s.w, h: s.h });
    check(!err, `source page ${i + 1} (rotate ${specs[i]!.rotate ?? 0}${specs[i]!.crop ? ', crop box' : ''}): corners as displayed${err ? ` — ${err}` : ''}`);
  });
}

console.log('\n=== 2, 4 and 6 pages per sheet ===');
for (const per of [2, 4, 6] as const) {
  for (const margin of [0, 5]) {
    const res = await imposePages(srcBytes, { mode: 'nup', perSheet: per, sheet: 'A4', marginMm: margin, borders: false });
    const sheets = await render(res.bytes);
    const layout = chooseLayout(595, 842, SHEET_SIZES.A4, per, margin * MM);
    check(sheets.length === Math.ceil(6 / per) && res.sheets === sheets.length, `${per}-up, margin ${margin} mm: ${sheets.length} sheets`);
    const cells = cellsOf(layout.sheetW, layout.sheetH, layout.cols, layout.rows, margin * MM);
    const errs: string[] = [];
    srcDoc.getPages().forEach((p, i) => {
      const s = sheets[Math.floor(i / per)]!;
      const { w, h } = displayedSize(p);
      const box = expectedBox(cells[i % per]!, w, h);
      const err = cornersOk(s, box);
      if (err) errs.push(`P${i + 1}: ${err}`);
      const lab = s.labels.find((l) => l.text === `P${i + 1}`);
      if (!lab || lab.x < box.x || lab.x > box.x + box.w || lab.y < box.y || lab.y > box.y + box.h) errs.push(`P${i + 1}: label not in its cell`);
    });
    check(errs.length === 0, `${per}-up, margin ${margin} mm: every page upright in its cell, in reading order, text kept${errs.length ? ` — ${errs.join('; ')}` : ''}`);
    let magenta = 0;
    for (const s of sheets) for (let k = 0; k < s.d.length; k += 4) if (s.d[k]! > 200 && s.d[k + 1]! < 60 && s.d[k + 2]! > 200) magenta++;
    check(magenta === 0, `${per}-up: nothing outside a crop box shows (${magenta} px)`);
    check(sheets.every((s) => s.images === 0), `${per}-up: pages are drawn as vector content, not pictures`);
  }
}

console.log('\n=== booklet ===');
{
  const res = await imposePages(srcBytes, { mode: 'booklet', sheet: 'A4', marginMm: 0, borders: false });
  const sheets = await render(res.bytes);
  check(sheets.length === 4 && res.sheets === 2 && res.blanksAdded === 2, `6 pages → 2 sheets, 4 sides, 2 blank pages added (${sheets.length}, ${res.sheets}, ${res.blanksAdded})`);
  check(sheets.every((s) => s.w > s.h), 'every side is landscape');
  const cells = cellsOf(sheets[0]!.w, sheets[0]!.h, 2, 1, 0);
  // n = 8: sides 8|1, 2|7, 6|3, 4|5 — pages 7 and 8 are blank.
  const expected = [[null, 1], [2, null], [6, 3], [4, 5]] as const;
  const errs: string[] = [];
  expected.forEach((pair, side) => pair.forEach((num, k) => {
    const s = sheets[side]!;
    if (num === null) {
      const c = cells[k]!;
      const mid = px(s, c.x + c.w / 2, c.y + c.h / 2);
      if (!near(mid, [1, 1, 1]) || s.labels.some((l) => l.x >= c.x && l.x <= c.x + c.w)) errs.push(`side ${side + 1} ${k ? 'right' : 'left'} should be blank`);
      return;
    }
    const p = srcDoc.getPage(num - 1);
    const { w, h } = displayedSize(p);
    const box = expectedBox(cells[k]!, w, h);
    const err = cornersOk(s, box);
    if (err) errs.push(`side ${side + 1} P${num}: ${err}`);
    if (!s.labels.some((l) => l.text === `P${num}` && l.x >= box.x && l.x <= box.x + box.w)) errs.push(`side ${side + 1}: P${num} not in its half`);
  }));
  check(errs.length === 0, `booklet sides 1|P1, P2|–, P6|P3, P4|P5, upright${errs.length ? ` — ${errs.join('; ')}` : ''}`);
  const framed = await imposePages(srcBytes, { mode: 'booklet', sheet: 'A3', marginMm: 5, borders: true });
  const fs = await render(framed.bytes);
  check(Math.abs(fs[0]!.w - 1191) <= 1 && Math.abs(fs[0]!.h - 842) <= 1, `A3 booklet sides are A3 landscape (${fs[0]!.w}×${fs[0]!.h})`);
  const four = await imposePages(srcBytes.slice(0), { mode: 'booklet', sheet: 'A4', marginMm: 0, borders: false });
  check(four.blanksAdded === 2, 'the blank pages are counted for the page');
}

console.log('\n=== comments, stamps and filled form fields stay on the sheet ===');
{
  const d = await PDFDocument.create();
  const pg = d.addPage([595, 842]);
  pg.setRotation(degrees(90));
  const form = d.getForm();
  const field = form.createTextField('imie');
  field.setText('Wypelnione pole');
  field.addToPage(pg, { x: 100, y: 600, width: 250, height: 30 });
  const ctx = d.context;
  const box = (r: number, g: number, b: number) => ctx.register(ctx.stream(`${r} ${g} ${b} rg 0 0 60 40 re f`, { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 60, 40] }));
  const orange = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Square', Rect: [300, 200, 420, 280], F: 4, AP: { N: box(1, 0.55, 0) } }));
  const hidden = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Square', Rect: [100, 200, 220, 280], F: 2, AP: { N: box(0, 1, 1) } }));
  const annots = pg.node.lookup(PDFName.of('Annots'), PDFArray);
  annots.push(orange); annots.push(hidden);
  const res = await imposePages(await d.save(), { mode: 'nup', perSheet: 2, sheet: 'A4', marginMm: 0, borders: false });
  const [sheet] = await render(res.bytes);
  check(sheet!.labels.some((l) => l.text.includes('Wypelnione pole')), 'the value of a filled form field is on the sheet');
  let orangePx = 0, cyanPx = 0;
  for (let k = 0; k < sheet!.d.length; k += 4) {
    const [r, g, b] = [sheet!.d[k]!, sheet!.d[k + 1]!, sheet!.d[k + 2]!];
    if (r > 230 && g > 110 && g < 170 && b < 40) orangePx++;
    if (r < 40 && g > 230 && b > 230) cyanPx++;
  }
  check(orangePx > 500, `a visible annotation is drawn (${orangePx} orange px)`);
  check(cyanPx === 0, `a hidden annotation is not (${cyanPx} cyan px)`);
}

console.log('\n=== a blank page (no content stream) ===');
{
  const d = await PDFDocument.create();
  d.addPage([595, 842]);
  d.addPage([595, 842]).drawText('Druga', { x: 100, y: 400, size: 20, font: await d.embedFont(StandardFonts.Helvetica) });
  let err = '';
  let res: Awaited<ReturnType<typeof imposePages>> | null = null;
  try { res = await imposePages(await d.save(), { mode: 'nup', perSheet: 2, sheet: 'A4', marginMm: 0, borders: true }); } catch (e) { err = (e as Error).message; }
  check(!!res && res.sheets === 1, `a PDF with a blank page is imposed${err ? ` — ${err}` : ''}`);
  if (res) check((await render(res.bytes))[0]!.labels.some((l) => l.text === 'Druga'), 'the next page is still there');
}

console.log('\n=== a real 27-page report ===');
{
  const real = readFileSync(join(ROOT, 'test-real-pdfs/allegro-raport.pdf'));
  const res = await imposePages(real, { mode: 'nup', perSheet: 4, sheet: 'A4', marginMm: 5, borders: true });
  const sheets = await render(res.bytes);
  check(sheets.length === 7, `27 pages, 4 per sheet → 7 sheets (${sheets.length})`);
  const before = await (async () => {
    const t = pdfjs.getDocument({ data: new Uint8Array(real), verbosity: 0 });
    const d = await t.promise;
    let s = '';
    for (let n = 1; n <= d.numPages; n++) s += (await (await d.getPage(n)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join('');
    await t.destroy();
    return s.replace(/\s+/g, '');
  })();
  const t2 = pdfjs.getDocument({ data: res.bytes.slice(), verbosity: 0 });
  const d2 = await t2.promise;
  let after = '';
  for (let n = 1; n <= d2.numPages; n++) after += (await (await d2.getPage(n)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join('');
  await t2.destroy();
  const bag = (s: string) => [...s].sort().join('');
  check(bag(after.replace(/\s+/g, '')) === bag(before), 'the same text, character for character, is on the sheets');
}

console.log('\n=== refusals ===');
{
  const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
  let msg = '';
  try { await imposePages(await encryptPDF(srcBytes, 'x'), { mode: 'nup', perSheet: 2, sheet: 'A4', marginMm: 0, borders: false }); } catch (e) { msg = (e as Error).message; }
  check(/zabezpieczony hasłem/.test(msg), 'an encrypted PDF is refused with the usual message');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
