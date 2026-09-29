// watermark-pdf: the watermark colour could not be chosen, and the on-page preview lied about it.
// A user asked for a colour choice; their real output file showed why it matters: addWatermark
// always drew mid grey (rgb 0.5) — invisible on a dark cover page — while the preview on the page
// showed the text in red and level, although the file got it grey at 45°. addWatermark now takes
// a colour, and the page passes the chosen colour and the same angle to both the file and the
// preview.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('/')) {
    const filePath = join(ROOT, 'public', url);
    if (existsSync(filePath)) return new Response(new Uint8Array(readFileSync(filePath)), { status: 200 });
  }
  return originalFetch(input, init);
}) as typeof fetch;

import { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { addWatermark } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const src = await PDFDocument.create();
src.addPage([595, 842]);
const file = Object.assign(new Blob([await src.save() as BlobPart]), { name: 'a.pdf' }) as unknown as File;

/** The fill colour set right before the watermark text (the last content stream of page 1). */
async function watermarkFill(bytes: Uint8Array): Promise<number[] | null> {
  const doc = await PDFDocument.load(bytes);
  const contents = doc.getPage(0).node.Contents();
  const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
  const last = doc.context.lookup(refs[refs.length - 1]!);
  if (!(last instanceof PDFRawStream)) return null;
  const text = Buffer.from(decodePDFRawStream(last).decode()).toString('latin1');
  const m = /([\d.]+) ([\d.]+) ([\d.]+) rg[\s\S]*Tj/.exec(text);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
const near = (a: number[] | null, b: number[]) => !!a && a.every((v, i) => Math.abs(v - b[i]!) < 0.005);

console.log('=== addWatermark colour ===');
const red = await watermarkFill(await addWatermark(file, 'POUFNE', { color: '#E53935' }));
check(near(red, [0xe5 / 255, 0x39 / 255, 0x35 / 255]), `chosen colour #E53935 is used (${red?.map((v) => v.toFixed(3)).join(' ')})`);
const white = await watermarkFill(await addWatermark(file, 'POUFNE', { color: '#ffffff' }));
check(near(white, [1, 1, 1]), `white (for dark pages) is used (${white?.join(' ')})`);
const dflt = await watermarkFill(await addWatermark(file, 'POUFNE'));
check(near(dflt, [0.5, 0.5, 0.5]), `no colour → the previous mid grey (${dflt?.join(' ')})`);
const bad = await watermarkFill(await addWatermark(file, 'POUFNE', { color: 'red; x' }));
check(near(bad, [0.5, 0.5, 0.5]), `an invalid colour falls back to grey (${bad?.join(' ')})`);

console.log('\n=== watermark page: the file and the preview use the chosen colour and angle ===');
const page = readFileSync(join(ROOT, 'app/watermark-pdf/page.tsx'), 'utf8');
const call = /addWatermark\(file, text, \{([\s\S]*?)\}\)/.exec(page)?.[1] ?? '';
check(/\bcolor\b/.test(call), 'the chosen colour is passed to addWatermark');
check(/rotation: WATERMARK_ROTATION/.test(call), 'the angle passed to addWatermark is the one the preview shows');
check(!/#FF0000/i.test(page), 'the preview no longer hard-codes red');
check(/transform: `rotate\(-\$\{WATERMARK_ROTATION\}deg\)`/.test(page), 'the preview is rotated like the file');
check(/type="color"/.test(page) && /page\.watermark\.color_label/.test(page), 'the page has a labelled colour picker');
const i18n = readFileSync(join(ROOT, 'lib/i18n.ts'), 'utf8');
check((i18n.match(/'page\.watermark\.color_label': '[^']+'/g) ?? []).length === 16, 'the colour label is translated in all 16 locales');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
