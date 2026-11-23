// Every editor element lands in the file where the preview showed it (FINDING 2026-11-23).
//
// editPdfClient converted canvas pixels to points with the page's raw (unturned) size and the
// media box's origin, so on a page with /Rotate or a crop box that does not start at (0,0) every
// shape, line, picture and drawing went to the wrong place. Measured besides, on any page: a
// circle was drawn centred on its box's top-left corner (half a size off), an arrow lost its head,
// the highlighter ignored the chosen colour and opacity (always yellow, 30%), a freehand line was
// twice as thick as on screen, and a picture was stretched to its box while the preview fits it.
//
// The test draws one element of each kind, saves through the real editPdfClient, renders the
// saved page with pdf.js as a viewer shows it (turned by /Rotate, cut to the crop box) at the
// editor's own scale — so a rendered pixel is a preview pixel — and reads colours where the
// preview draws each element.
// Run: npm run test:edit-pdf-elements-placement
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, degrees } from 'pdf-lib';
import * as canvasMod from '@napi-rs/canvas';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
// The old freehand branch rasterised on a DOM canvas; give it one so the old code runs (to fail
// on positions, not crash).
(globalThis as unknown as { document: unknown }).document = { createElement: () => canvasMod.createCanvas(1, 1) };

const { editPdfClient } = await import('../lib/client-pdf');
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const R = 1.5; // the editor draws pages at 1.5 canvas px per point

// A 20×10 purple picture: in a 90×90 box the preview fits it to 90×45, centred (object-contain).
const pic = canvasMod.createCanvas(20, 10);
const pctx = pic.getContext('2d');
pctx.fillStyle = '#800080'; pctx.fillRect(0, 0, 20, 10);
const picUrl = pic.toDataURL('image/png');

type El = Parameters<typeof editPdfClient>[2][number];
const ELEMENTS: El[] = [
  { type: 'rect', x: 60, y: 60, width: 90, height: 60, color: '#ff0000', opacity: 1 },
  { type: 'circle', x: 200, y: 60, width: 90, height: 60, color: '#00aa00', opacity: 1 },
  { type: 'highlight', x: 60, y: 180, width: 120, height: 40, color: '#0000ff', opacity: 0.5 },
  { type: 'line', x: 60, y: 300, x2: 200, y2: 300, size: 6, color: '#ff00ff', opacity: 1 },
  { type: 'arrow', x: 60, y: 400, x2: 240, y2: 400, size: 4, color: '#ff8800', opacity: 1 },
  { type: 'freehand', x: 0, y: 0, size: 6, color: '#00cccc', opacity: 1, points: [{ x: 300, y: 200 }, { x: 330, y: 230 }, { x: 360, y: 260 }] },
  { type: 'image', x: 280, y: 300, width: 90, height: 90, imageDataUrl: picUrl, opacity: 1 },
];

async function page(rot: number, crop?: [number, number, number, number]): Promise<Uint8Array> {
  const d = await PDFDocument.create();
  const p = d.addPage([400, 500]);
  if (rot) p.setRotation(degrees(rot));
  if (crop) p.setCropBox(...crop);
  return d.save();
}

async function render(bytes: Uint8Array): Promise<(x: number, y: number) => [number, number, number]> {
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
  const doc = await task.promise;
  const pg = await doc.getPage(1);
  const vp = pg.getViewport({ scale: R });
  const c = canvasMod.createCanvas(Math.round(vp.width), Math.round(vp.height));
  const ctx = c.getContext('2d');
  await pg.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport: vp, canvas: c as unknown as HTMLCanvasElement }).promise;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  await task.destroy();
  return (x, y) => { const i = (Math.round(y) * c.width + Math.round(x)) * 4; return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!]; };
}
const close = (a: number[], b: number[], tol = 40) => a.every((v, i) => Math.abs(v - b[i]!) <= tol);
const WHITE = [255, 255, 255];

const CASES: { name: string; rot: number; crop?: [number, number, number, number]; vw: number; vh: number }[] = [
  { name: 'no rotation', rot: 0, vw: 400, vh: 500 },
  { name: '/Rotate 90', rot: 90, vw: 500, vh: 400 },
  { name: '/Rotate 180', rot: 180, vw: 400, vh: 500 },
  { name: '/Rotate 270', rot: 270, vw: 500, vh: 400 },
  { name: 'crop box at (50,60)', rot: 0, crop: [50, 60, 320, 420], vw: 320, vh: 420 },
];

for (const c of CASES) {
  console.log(`\n=== ${c.name} ===`);
  const out = new Uint8Array(await (await editPdfClient(Object.assign(new Blob([await page(c.rot, c.crop) as BlobPart]), { name: 'x.pdf' }) as unknown as File, 0, ELEMENTS, c.vw * R, c.vh * R)).arrayBuffer());
  const px = await render(out);
  check(close(px(105, 90), [255, 0, 0]) && close(px(52, 90), WHITE) && close(px(158, 90), WHITE), 'rectangle: filled inside its box, nothing beside it');
  // A circle centred on the box: its centre is green, the box's top-left corner area is not.
  check(close(px(245, 90), [0, 170, 0]) && close(px(205, 65), WHITE), 'circle: centred in its box');
  // Blue at 50% on white = (127,127,255), multiplied like the preview.
  check(close(px(120, 200), [127, 127, 255], 45), `highlighter: the chosen colour and opacity (${px(120, 200).join(',')})`);
  check(close(px(130, 300), [255, 0, 255]) && close(px(130, 306), WHITE), 'line: on its path, 6 px thick');
  // The head is 10×7 stroke widths with its tip at the end: at 4 px from x=200 (base, ±14 px) to
  // x=240 (tip); 35 px before the tip it is ±12 px wide, the 4 px shaft alone only ±2 px.
  check(close(px(205, 400 - 9), [255, 136, 0], 60) && close(px(120, 400 - 9), WHITE) && close(px(120, 400), [255, 136, 0]), `arrow: has its head (${px(205, 391).join(',')}) at the end`);
  check(close(px(330, 230), [0, 204, 204]) && close(px(330, 237), WHITE), 'freehand: on its path, as thick as on screen (6 px)');
  check(close(px(325, 345), [128, 0, 128]) && close(px(325, 310), WHITE) && close(px(325, 380), WHITE), 'picture: fitted into its box, not stretched (90×45, centred)');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
