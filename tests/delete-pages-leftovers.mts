// Delete pages: the deleted page's content must not stay in the saved file, and nothing any other
// page uses may be lost. FINDING 2026-10-27 (found while writing the Delete pages guide):
// pdf.removePage() only detaches the page and pdf-lib saves every object it holds, so a page
// "deleted" because it carried confidential data was still in the file — text and images
// readable with any PDF inspection tool. deletePages now drops what only the removed pages used
// (dropRemovedPagesObjects in lib/client-pdf.ts).
//
// The guard side matters as much: on 2026-09-28 a reachability sweep in redaction stripped the
// fonts of every page of a user's file (see lib/pdf-raster.ts). So besides "the secret is gone"
// this checks shared fonts and images, resources inherited from the page tree, and a real
// 27-page report whose remaining pages must render pixel for pixel as before.
//
// Run: npx tsx tests/delete-pages-leftovers.mts
import { PDFDocument, PDFName, PDFDict, StandardFonts } from 'pdf-lib';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;
const { deletePages } = await import('../lib/client-pdf.ts');

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const asFile = (b: Uint8Array) => Object.assign(new Blob([b]), { name: 'a.pdf' }) as unknown as File;
const fontData = join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/';

/** Every stream of the file, decompressed where possible, as text — what an inspection tool sees. */
function fileStreams(bytes: Uint8Array): string {
  const s = Buffer.from(bytes).toString('latin1');
  let out = s;
  for (const m of s.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    try { out += inflateSync(Buffer.from(m[1]!, 'latin1')).toString('latin1'); } catch { /* not deflated */ }
  }
  return out;
}
const hex = (t: string) => Buffer.from(t, 'latin1').toString('hex').toUpperCase();
const contains = (bytes: Uint8Array, t: string) => { const all = fileStreams(bytes); return all.includes(t) || all.toUpperCase().includes(hex(t)); };

async function texts(bytes: Uint8Array): Promise<string[]> {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: fontData }).promise;
  const out: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) out.push((await (await doc.getPage(p)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' '));
  return out;
}
async function renders(bytes: Uint8Array, scale = 0.6): Promise<Buffer[]> {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: fontData }).promise;
  const out: Buffer[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale });
    const canvas = canvasMod.createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    await page.render({ canvasContext: canvas.getContext('2d') as unknown as CanvasRenderingContext2D, viewport: vp, canvas: canvas as unknown as HTMLCanvasElement }).promise;
    out.push(Buffer.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data));
  }
  return out;
}

// A tiny PNG made from a canvas, one per colour.
const png = (color: string) => { const c = canvasMod.createCanvas(8, 8); const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 8, 8); return c.toBuffer('image/png'); };

console.log('=== a secret page is gone; shared font and image stay ===');
{
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const shared = await pdf.embedPng(png('#00aa00'));
  const secretImg = await pdf.embedPng(png('#aa0000'));
  const p1 = pdf.addPage([300, 300]); p1.drawText('KEEP ONE', { x: 40, y: 200, size: 20, font }); p1.drawImage(shared, { x: 40, y: 40, width: 60, height: 60 });
  const p2 = pdf.addPage([300, 300]); p2.drawText('SECRETWORD', { x: 40, y: 200, size: 20, font }); p2.drawImage(secretImg, { x: 40, y: 40, width: 60, height: 60 }); p2.drawImage(shared, { x: 150, y: 40, width: 60, height: 60 });
  const p3 = pdf.addPage([300, 300]); p3.drawText('KEEP THREE', { x: 40, y: 200, size: 20, font }); p3.drawImage(shared, { x: 40, y: 40, width: 60, height: 60 });
  const src = await pdf.save({ useObjectStreams: false });
  const secretImgCount = (b: Uint8Array) => (Buffer.from(b).toString('latin1').match(/\/Subtype \/Image/g) ?? []).length;
  check(contains(src, 'SECRETWORD') && secretImgCount(src) === 2, 'sanity: the source holds the secret text and two images');
  const out = await deletePages(asFile(src), [1]);
  check(!contains(out, 'SECRETWORD'), 'the deleted page’s text is not in the saved file');
  check(secretImgCount(out) === 1, `only the shared image is left (${secretImgCount(out)} image)`);
  const t = await texts(out);
  check(t.length === 2 && /KEEP ONE/.test(t[0]!) && /KEEP THREE/.test(t[1]!), 'the other pages keep their text');
  const before = await renders(src), after = await renders(out);
  check(after[0]!.equals(before[0]!) && after[1]!.equals(before[2]!), 'the other pages render exactly as before (shared font and image intact)');
}

console.log('\n=== resources inherited from the page tree (the shape that broke redaction) ===');
{
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = [pdf.addPage([300, 300]), pdf.addPage([300, 300]), pdf.addPage([300, 300])];
  pages.forEach((p, i) => p.drawText(i === 1 ? 'SECRETWORD' : `Page ${i}`, { x: 50, y: 150, size: 24, font }));
  const pagesRoot = pdf.context.lookup(pdf.catalog.get(PDFName.of('Pages')), PDFDict);
  pagesRoot.set(PDFName.of('Resources'), pages[0]!.node.get(PDFName.of('Resources'))!);
  for (const p of pages) p.node.delete(PDFName.of('Resources'));
  const src = await pdf.save({ useObjectStreams: false });
  const out = await deletePages(asFile(src), [1]);
  const re = await PDFDocument.load(out);
  const fontsOk = re.getPages().every((p) => {
    const res = p.node.Resources();
    const fonts = res?.lookupMaybe(PDFName.of('Font'), PDFDict);
    return !!fonts && fonts.entries().length > 0 && fonts.entries().every(([, v]) => re.context.lookup(v) !== undefined);
  });
  check(fontsOk, 'both remaining pages still resolve their inherited fonts');
  const t = await texts(out);
  check(t[0] === 'Page 0' && t[1] === 'Page 2', `text intact (${JSON.stringify(t)})`);
  check(!contains(out, 'SECRETWORD'), 'the deleted page’s text is gone');
  const before = await renders(src), after = await renders(out);
  check(after[0]!.equals(before[0]!) && after[1]!.equals(before[2]!), 'renders exactly as before');
}

console.log('\n=== a real 27-page report: delete pages 2, 5 and 10 ===');
{
  const src = new Uint8Array(readFileSync(join(ROOT, 'test-real-pdfs', 'allegro-raport.pdf')));
  const removed = [1, 4, 9];
  const out = await deletePages(asFile(src), removed);
  const before = await renders(src, 0.35), after = await renders(out, 0.35);
  const kept = before.filter((_, i) => !removed.includes(i));
  check(after.length === 24, `24 pages left (got ${after.length})`);
  const same = after.filter((img, i) => img.equals(kept[i]!)).length;
  check(same === 24, `every remaining page renders pixel for pixel as before (${same}/24)`);
  const srcTexts = await texts(src), outTexts = await texts(out);
  check(JSON.stringify(outTexts) === JSON.stringify(srcTexts.filter((_, i) => !removed.includes(i))), 'their text is identical');
  check(out.length < src.length, `the file is smaller (${src.length} → ${out.length} B)`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
