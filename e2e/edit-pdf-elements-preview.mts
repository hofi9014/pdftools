// The real /edit-pdf: draw a rectangle, a circle, a highlight, a line, an arrow and a freehand
// stroke, download, and compare the preview with the saved page as a viewer shows it, pixel by
// pixel (FINDING 2026-11-23). On a page with /Rotate the saved shapes went elsewhere; on any page
// the circle was off by half its size, the arrow had no head, the highlight was always yellow at
// 30 % and the freehand line twice as thick. Run on a page as it is and on one turned 90°.
// Run against a built site: E2E_BASE_URL=http://localhost:3100 npx tsx e2e/edit-pdf-elements-preview.mts
import { chromium, type Page } from 'playwright';
import { readFileSync } from 'node:fs';
import { PDFDocument, degrees } from 'pdf-lib';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as canvasMod from '@napi-rs/canvas';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

async function draw(page: Page, rot: number, withText = false): Promise<{ preview: Buffer; pdf: Uint8Array }> {
  const d = await PDFDocument.create();
  const p = d.addPage([400, 500]);
  if (rot) p.setRotation(degrees(rot));
  await page.goto(`${BASE_URL}/pl/edit-pdf`, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', { name: 'strona.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await d.save()) });
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForSelector('div.absolute.inset-0.select-none', { timeout: 30000 });
  const cb = (await canvas.boundingBox())!;
  const tool = (k: string) => page.locator(`button[title$="(${k})"]`).first().click();
  // Coordinates for the page shown at full size (600 px wide, 750 turned); scaled when the window
  // shows it smaller.
  const s = cb.width / (rot % 180 ? 750 : 600);
  const at = (x: number, y: number) => [cb.x + x * s, cb.y + y * s] as const;
  const drag = async (pts: [number, number][]) => {
    await page.mouse.move(...at(...pts[0]!)); await page.mouse.down();
    for (const pt of pts.slice(1)) await page.mouse.move(...at(...pt), { steps: 6 });
    await page.mouse.up();
  };
  await tool('R'); await page.mouse.click(...at(40, 40));
  await tool('C'); await page.mouse.click(...at(200, 40));
  await tool('H'); await page.mouse.click(...at(40, 200));
  await tool('L'); await drag([[350, 60], [480, 140]]);
  await tool('A'); await drag([[330, 230], [560, 230]]);
  await tool('F'); await drag([[90, 300], [150, 360], [210, 310], [270, 380]]);
  if (withText) { await tool('T'); await page.mouse.click(...at(60, 470)); }
  await tool('V');
  await page.keyboard.press('Escape');
  // Deselect: a click on an empty part of the page with the select tool.
  await page.mouse.click(...at(cb.width - 20, cb.height - 20));
  await page.waitForTimeout(300);
  const preview = await page.screenshot({ clip: { x: cb.x, y: cb.y, width: cb.width, height: cb.height } });
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator('button', { hasText: /Pobierz/ }).last().click()]);
  return { preview, pdf: new Uint8Array(readFileSync((await dl.path())!)) };
}

async function rgba(png: Buffer): Promise<{ w: number; h: number; d: Uint8ClampedArray }> {
  const img = await canvasMod.loadImage(png);
  const c = canvasMod.createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return { w: img.width, h: img.height, d: ctx.getImageData(0, 0, img.width, img.height).data as unknown as Uint8ClampedArray };
}
async function renderPdf(bytes: Uint8Array, w: number): Promise<{ w: number; h: number; d: Uint8ClampedArray }> {
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
  const pg = await (await task.promise).getPage(1);
  const base = pg.getViewport({ scale: 1 });
  const vp = pg.getViewport({ scale: w / base.width });
  const c = canvasMod.createCanvas(Math.round(vp.width), Math.round(vp.height));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await pg.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport: vp, canvas: c as unknown as HTMLCanvasElement }).promise;
  const out = { w: c.width, h: c.height, d: ctx.getImageData(0, 0, c.width, c.height).data as unknown as Uint8ClampedArray };
  await task.destroy();
  return out;
}

const browser = await chromium.launch();
try {
  // The last case: a phone-sized window, where the page is shown at ~40 % of its canvas and text
  // and line widths must shrink with it (they were drawn at full size: 2.5 times too big).
  for (const [rot, vw, withText] of [[0, 1400, false], [90, 1400, false], [0, 1400, true], [0, 390, true]] as [number, number, boolean][]) {
    console.log(`\n=== ${rot ? `page turned ${rot}°` : 'page as it is'}, window ${vw} px${withText ? ', with a text' : ''} ===`);
    const page = await browser.newPage({ viewport: { width: vw, height: 1200 }, deviceScaleFactor: 1, acceptDownloads: true });
    const { preview, pdf } = await draw(page, rot, withText);
    const a = await rgba(preview);
    const b = await renderPdf(pdf, a.w);
    check(Math.abs(b.h - a.h) <= 1, `the saved page has the preview's shape (${a.w}×${a.h} vs ${b.w}×${b.h})`);
    // "Ink": a pixel clearly not white. Compare where either image has ink.
    const ink = (d: Uint8ClampedArray, i: number) => d[i]! + d[i + 1]! + d[i + 2]! < 3 * 235;
    let both = 0, either = 0, colourOk = 0;
    for (let y = 0; y < Math.min(a.h, b.h); y++) for (let x = 0; x < a.w; x++) {
      const i = (y * a.w + x) * 4, j = (y * b.w + x) * 4;
      const ia = ink(a.d, i), ib = ink(b.d, j);
      if (ia || ib) either++;
      if (ia && ib) {
        both++;
        if (Math.abs(a.d[i]! - b.d[j]!) + Math.abs(a.d[i + 1]! - b.d[j + 1]!) + Math.abs(a.d[i + 2]! - b.d[j + 2]!) < 90) colourOk++;
      }
    }
    const overlap = both / Math.max(1, either);
    if (process.env.E2E_DUMP) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(`test-output/_work/fillflat/prev-${rot}-${vw}-${withText}.png`, preview);
      const c = canvasMod.createCanvas(b.w, b.h); const id = c.getContext('2d').createImageData(b.w, b.h); id.data.set(b.d); c.getContext('2d').putImageData(id, 0, 0);
      writeFileSync(`test-output/_work/fillflat/pdf-${rot}-${vw}-${withText}.png`, c.toBuffer('image/png'));
    }
    check(either > (vw < 600 ? 800 : 5000), `the preview shows the drawn elements (${either} px of ink)`);
    check(overlap > 0.9, `the saved page covers the same pixels as the preview (${(overlap * 100).toFixed(1)} % overlap)`);
    check(colourOk / Math.max(1, both) > 0.9, `in the same colours (${((colourOk / Math.max(1, both)) * 100).toFixed(1)} % of shared pixels)`);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
