// OCR engine decisions that can be checked without a browser (the recognition itself is covered
// end to end by e2e/ocr-real-scan.mts on real scans):
//
//  1. Text layer on rotated / offset pages. The recognised canvas is what a viewer sees (pdf.js
//     applies /Rotate and renders the crop box), but words were written in raw page space with
//     page.getSize() — on a scan stored as a landscape box + /Rotate 90 (routine scanner output)
//     the whole layer landed in the wrong place, sideways.
//  2. Resolution: 144 DPI first, 300 DPI only for a page the engine is unsure about, never a
//     canvas above OCR_MAX_PIXELS.
//  3. Output: tesseract.js returns words only when `blocks` is requested — without it the
//     "searchable PDF" had no text layer at all.
//  4. Languages: every language the page offers must be downloaded by the asset script, and a
//     language without data must be detected before the engine is started (tesseract.js swallows
//     a failed language download and its promise never settles).
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFDocument, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const canvasMod = await import('@napi-rs/canvas');
if (!(globalThis as Record<string, unknown>).DOMMatrix) (globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

const ocr = await import('../lib/client-ocr');
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
const fontBytes = readFileSync(join(ROOT, 'public/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf'));

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

/** Where a viewer shows the single text-layer word: left edge, baseline from the top, direction. */
async function visualWord(bytes: Uint8Array): Promise<{ x: number; baseline: number; upright: boolean; viewW: number; viewH: number }> {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const item = tc.items.find((i) => 'str' in i && i.str.trim()) as { transform: number[] };
  const t = pdfjsLib.Util.transform(vp.transform, item.transform) as number[];
  return { x: t[4]!, baseline: t[5]!, upright: t[0]! > 0 && Math.abs(t[1]!) < 1e-6, viewW: vp.width, viewH: vp.height };
}

console.log('=== text layer follows what the viewer sees (rotation, box origin) ===');
// The word's box on the recognised canvas, in pixels at 2x: left 200, top 300, bottom 340
// → on screen at x = 100 pt, bottom of the box 170 pt from the top.
const WORD = [{ text: 'Rotated', bbox: { x0: 200, y0: 300, x1: 420, y1: 340 } }];
for (const rotation of [0, 90, 180, 270]) {
  const orig = await PDFDocument.create();
  // Raw box 400 x 600 with an origin that is NOT (0,0).
  const p = orig.addPage([400, 600]);
  p.setMediaBox(30, 50, 400, 600);
  p.setRotation(degrees(rotation));
  const viewW = rotation % 180 === 0 ? 400 : 600;
  const viewH = rotation % 180 === 0 ? 600 : 400;
  const out = await PDFDocument.create();
  out.registerFontkit(fontkit);
  const font = await out.embedFont(fontBytes, { subset: true });
  await ocr.createOcrPage(out, orig, 0, WORD, font, viewW * 2, viewH * 2);
  const v = await visualWord(await out.save());
  check(Math.abs(v.viewW - viewW) < 0.5 && Math.abs(v.viewH - viewH) < 0.5, `/Rotate ${rotation}: sanity — the viewer sees ${viewW} x ${viewH} (${v.viewW} x ${v.viewH})`);
  check(Math.abs(v.x - 100) < 0.5 && Math.abs(v.baseline - 170) < 0.5, `/Rotate ${rotation}: the word is at (100, 170) on screen (got ${v.x.toFixed(1)}, ${v.baseline.toFixed(1)})`);
  check(v.upright, `/Rotate ${rotation}: the word reads left to right on screen`);
}

console.log('\n=== resolution: 144 DPI first, 300 DPI when unsure, bounded canvas ===');
check(ocr.OCR_BASE_SCALE === 2, 'first pass at scale 2 (144 DPI)');
check(Math.abs(ocr.ocrRenderScale(595.28, 841.89) - 300 / 72) < 1e-9, 'A4 fine pass is 300 DPI');
check(Math.abs(ocr.ocrRenderScale(612, 792) - 300 / 72) < 1e-9, 'Letter fine pass is 300 DPI');
{
  // A0 poster: 300 DPI would be 139 megapixels.
  const s = ocr.ocrRenderScale(2384, 3370);
  const px = 2384 * s * 3370 * s;
  check(px <= ocr.OCR_MAX_PIXELS * 1.001 && s < 300 / 72, `an A0 page is capped at ${ocr.OCR_MAX_PIXELS / 1e6} MP (${(px / 1e6).toFixed(1)} MP, scale ${s.toFixed(2)})`);
  check(ocr.ocrRenderScale(20000, 20000) >= 1, 'the scale never drops below 1');
}
check(/const baseScale = Math\.min\(OCR_BASE_SCALE, fineScale\)/.test(readFileSync(join(ROOT, 'lib/client-ocr.ts'), 'utf8')), 'the first pass is capped too (an A0 page at scale 2 would be 32 MP)');
check(ocr.ocrNeedsFinePass(29) && ocr.ocrNeedsFinePass(62) && ocr.ocrNeedsFinePass(0), 'low confidence (garbled small print measured at 29-33) asks for the fine pass');
check(!ocr.ocrNeedsFinePass(83) && !ocr.ocrNeedsFinePass(95), 'confident pages (measured 83-95) are not read twice');
check(ocr.ocrNeedsFinePass(Number.NaN), 'a missing confidence is treated as unsure');

const src = readFileSync(join(ROOT, 'lib/client-ocr.ts'), 'utf8');
console.log('\n=== the engine is asked for words, and failures cannot hang ===');
check(/\.recognize\([^)]*\{\s*text:\s*true,\s*blocks:\s*true\s*\}\)/.test(src), 'recognize() requests the `blocks` output (words + boxes)');
check(!/toDataURL/.test(src) && !/preprocessCanvas/.test(src), 'the contrast step that thinned strokes is gone');
check(/ocrLanguageAvailable\(language\)[\s\S]{0,200}language-unavailable[\s\S]{0,400}createWorker\(/.test(src), 'the language data is checked BEFORE the engine starts');
check(/errorHandler:/.test(src) && /Promise\.race\(\[/.test(src), 'an engine error rejects instead of leaving the promise pending');

console.log('\n=== language availability check ===');
const fake = (status: number, type: string) => (async () => new Response(null, { status, headers: { 'content-type': type } })) as unknown as typeof fetch;
check(await ocr.ocrLanguageAvailable('pol', fake(200, 'application/gzip')), '200 with data → available');
check(!(await ocr.ocrLanguageAvailable('xyz', fake(404, 'text/html'))), '404 → unavailable');
check(!(await ocr.ocrLanguageAvailable('xyz', fake(200, 'text/html; charset=utf-8'))), 'a 200 HTML "not found" page is not data');
check(!(await ocr.ocrLanguageAvailable('xyz', (async () => { throw new Error('offline'); }) as unknown as typeof fetch)), 'a network error → unavailable');
{
  let asked = '';
  await ocr.ocrLanguageAvailable('chi_sim', (async (u: string) => { asked = u; return new Response(null, { status: 200 }); }) as unknown as typeof fetch);
  check(asked === '/tesseract/lang-data/chi_sim.traineddata.gz', `it asks for the file Tesseract will fetch (${asked})`);
}

console.log('\n=== every offered language is provisioned ===');
const listed = JSON.parse(readFileSync(join(ROOT, 'lib/ocr-languages.json'), 'utf8')) as string[];
const pageSrc = readFileSync(join(ROOT, 'app/ocr-pdf/page.tsx'), 'utf8');
const offered = [...pageSrc.matchAll(/\{ value: '([a-z_]+)', labelKey: 'page\.ocr\.lang_/g)].map((m) => m[1]!);
check(offered.length >= 30, `sanity: read the page's language list (${offered.length})`);
check([...offered].sort().join() === [...listed].sort().join(), `the page offers exactly the provisioned languages (${listed.length})`);
const script = readFileSync(join(ROOT, 'scripts/copy-tesseract-assets.mjs'), 'utf8');
check(/ocr-languages\.json/.test(script) && !/const langs = \['pol', 'eng'\]/.test(script), 'the asset script downloads every listed language, not just pol and eng');
check(/page\.ocr\.err_language_unavailable/.test(pageSrc), 'the page shows the localized "language data unavailable" message');
const i18n = readFileSync(join(ROOT, 'lib/i18n.ts'), 'utf8');
check((i18n.match(/'page\.ocr\.err_language_unavailable':/g) ?? []).length === 16, 'that message exists in all 16 locales');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
