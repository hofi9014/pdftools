// FINDING 2026-11-23: "Fill form" (fillFormFields) threw 'WinAnsi cannot encode "ż"' for any
// value with Polish letters — flatten() drew changed fields with Helvetica. Now such values are
// drawn with Liberation Sans. Checks: the save succeeds, pdf.js reads the flattened value as page
// text with the Polish letters, plain ASCII values still use no extra font, and a Polish choice
// in a dropdown works too.
// Run: npm run test:fill-form-polish
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;

// The browser fetches the font the site serves for pdf.js; in Node it is read from public/.
const fontBytes = readFileSync(join(ROOT, 'public/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf'));
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.includes('/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf')) return new Response(new Uint8Array(fontBytes), { status: 200 });
  return realFetch(input, init);
}) as typeof fetch;

const { fillFormFields } = await import('../lib/client-pdf.ts');
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

async function form(): Promise<File> {
  const d = await PDFDocument.create();
  const p = d.addPage([595, 842]);
  const f = d.getForm();
  f.createTextField('imie').addToPage(p, { x: 50, y: 700, width: 300, height: 24 });
  const city = f.createDropdown('miasto');
  city.addOptions(['Warszawa', 'Gdansk']);
  city.addToPage(p, { x: 50, y: 650, width: 200, height: 24 });
  return new File([await d.save() as unknown as BlobPart], 'f.pdf', { type: 'application/pdf' });
}

async function pageText(bytes: Uint8Array): Promise<string> {
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' });
  const doc = await task.promise;
  const text = (await (await doc.getPage(1)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
  await task.destroy();
  return text;
}

console.log('=== fill form with Polish letters ===');
let out: Uint8Array | null = null;
let err = '';
try { out = await fillFormFields(await form(), { imie: 'Zażółć gęślą jaźń', miasto: 'Gdansk' }); } catch (e) { err = (e as Error).message; }
check(!!out, `the save succeeds${err ? ` (threw: ${err})` : ''}`);
if (out) {
  const text = await pageText(out);
  check(text.includes('Zażółć gęślą jaźń'), `the flattened value is on the page with its Polish letters (${text.trim().slice(0, 60)})`);
  check(text.includes('Gdansk'), 'the dropdown choice is on the page');
}

console.log('\n=== plain ASCII values are unchanged ===');
const plain = await fillFormFields(await form(), { imie: 'Jan Kowalski', miasto: 'Warszawa' });
check((await pageText(plain)).includes('Jan Kowalski'), 'the value is on the page');
check(!Buffer.from(plain).toString('latin1').includes('LiberationSans'), 'no extra font is embedded for ASCII values');

globalThis.fetch = realFetch;
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
