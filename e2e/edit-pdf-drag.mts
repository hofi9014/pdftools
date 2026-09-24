// Real /edit-pdf: draw a line and a freehand stroke, switch to Select, drag each, and measure the
// rendered element boxes. Before the fix dragging a line moved only its start point (its box
// changed SIZE) and dragging a freehand stroke did nothing (its box never moved).
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const doc = await PDFDocument.create();
doc.addPage([400, 500]);
const pdfBytes = await doc.save();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${BASE_URL}/edit-pdf`, { waitUntil: 'load' });
await page.setInputFiles('#fileInput', { name: 'blank.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdfBytes) });
const canvas = page.locator('canvas').first();
await canvas.waitFor({ state: 'visible', timeout: 20000 });
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  return !!c && c.width > 0 && c.getBoundingClientRect().width > 100;
}, null, { timeout: 20000 });
// The edit layer mounts only after the canvas finished rendering (canvasWidth > 0).
await page.waitForSelector('div.absolute.inset-0.select-none', { timeout: 20000 });
const cb = (await canvas.boundingBox())!;

async function tool(shortcutLetter: string): Promise<void> {
  await page.locator(`button[title$="(${shortcutLetter})"]`).first().click();
}
async function boxOfLastEl(): Promise<{ x: number; y: number; width: number; height: number }> {
  const els = page.locator('.edit-el');
  return (await els.last().boundingBox())!;
}

console.log('=== line ===');
await tool('L');
await page.mouse.move(cb.x + 60, cb.y + 80);
await page.mouse.down();
await page.mouse.move(cb.x + 140, cb.y + 130, { steps: 8 });
await page.mouse.up();
await tool('V');
const l0 = await boxOfLastEl();
await page.mouse.move(l0.x + l0.width / 2, l0.y + l0.height / 2);
await page.mouse.down();
await page.mouse.move(l0.x + l0.width / 2 + 70, l0.y + l0.height / 2 + 50, { steps: 8 });
await page.mouse.up();
const l1 = await boxOfLastEl();
check(Math.abs(l1.width - l0.width) < 1.5 && Math.abs(l1.height - l0.height) < 1.5, `line keeps its size when dragged (${l0.width.toFixed(1)}x${l0.height.toFixed(1)} → ${l1.width.toFixed(1)}x${l1.height.toFixed(1)})`);
check(Math.abs(l1.x - l0.x - 70) < 2 && Math.abs(l1.y - l0.y - 50) < 2, `line moved by the drag (dx=${(l1.x - l0.x).toFixed(1)}, dy=${(l1.y - l0.y).toFixed(1)}; expected 70,50)`);

console.log('\n=== undo: one drag = one step; Delete = one step ===');
{
  await page.keyboard.press('Control+z');
  const u = await boxOfLastEl();
  check(Math.abs(u.x - l0.x) < 2 && Math.abs(u.y - l0.y) < 2, `a single Ctrl+Z undoes the whole drag (back to ${u.x.toFixed(1)},${u.y.toFixed(1)}; original ${l0.x.toFixed(1)},${l0.y.toFixed(1)})`);
  await page.keyboard.press('Control+Shift+z');
  const r = await boxOfLastEl();
  check(Math.abs(r.x - l1.x) < 2 && Math.abs(r.y - l1.y) < 2, 'Ctrl+Shift+Z redoes the drag');
  await page.keyboard.press('Delete');
  check((await page.locator('.edit-el').count()) === 0, 'Delete removes the selected line');
  await page.keyboard.press('Control+z');
  check((await page.locator('.edit-el').count()) === 1, 'ONE Ctrl+Z brings it back');
  const back = await boxOfLastEl();
  check(Math.abs(back.x - l1.x) < 2 && Math.abs(back.y - l1.y) < 2, 'restored at its moved position');
}

console.log('\n=== freehand ===');
await tool('F');
await page.mouse.move(cb.x + 200, cb.y + 250);
await page.mouse.down();
for (const [dx, dy] of [[20, 10], [40, 40], [70, 30], [90, 60]]) await page.mouse.move(cb.x + 200 + dx, cb.y + 250 + dy, { steps: 4 });
await page.mouse.up();
await tool('V');
const f0 = await boxOfLastEl();
await page.mouse.move(f0.x + f0.width / 2, f0.y + f0.height / 2);
await page.mouse.down();
await page.mouse.move(f0.x + f0.width / 2 - 40, f0.y + f0.height / 2 + 30, { steps: 8 });
await page.mouse.up();
const f1 = await boxOfLastEl();
check(Math.abs(f1.x - f0.x + 40) < 2 && Math.abs(f1.y - f0.y - 30) < 2, `freehand stroke moved by the drag (dx=${(f1.x - f0.x).toFixed(1)}, dy=${(f1.y - f0.y).toFixed(1)}; expected -40,30)`);
check(Math.abs(f1.width - f0.width) < 1.5 && Math.abs(f1.height - f0.height) < 1.5, 'freehand stroke keeps its size');

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
