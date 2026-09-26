// "Zabezpiecz PDF" produced UNREADABLE files for any PDF that contains literal strings "(...)":
// @pdfsmaller/pdf-encrypt writes the encrypted bytes of such a string back as raw characters and
// pdf-lib prints them between parentheses without escaping, and random ciphertext contains "(",
// ")", "\" or CR often enough that a document with a few dozen strings (link annotations — allegro-raport.pdf
// has many —, an Info dictionary written by another producer) was corrupted every time: pdf.js read 1-6 of 27
// pages, or none, WITH the right password. Our own tests only used pdf-lib-made PDFs, whose strings are
// hex strings, so unlock-after-protect looked fine (the same library reads its own output).
// The output is opened with pdf.js — an independent implementation — and the strings are compared.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PDFDocument, PDFName, PDFString, StandardFonts } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { protectPdfClient, unlockPdfClient, hexifyStrings } from '../lib/client-pdf.ts';
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
process.on('unhandledRejection', () => undefined); // pdf.js rejects a corrupt file on a worker promise

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const PASSWORD = 'sekret123';
const URLS = Array.from({ length: 30 }, (_, i) => `https://example.com/strona-${i}?token=(${i})\\x`);

async function build(): Promise<File> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  page.drawText('Dokument z linkami', { x: 72, y: 780, size: 18, font });
  const annots = pdf.context.obj([]) as unknown as { push: (v: unknown) => void };
  URLS.forEach((url, i) => {
    const action = pdf.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(url) });
    const annot = pdf.context.obj({
      Type: 'Annot', Subtype: 'Link', Rect: [72, 700 - i * 12, 300, 710 - i * 12], Border: [0, 0, 0],
      A: action, Contents: PDFString.of(`Link numer ${i}`),
    });
    annots.push(pdf.context.register(annot));
  });
  page.node.set(PDFName.of('Annots'), annots as never);
  pdf.setTitle('Tytuł (z nawiasami) i \\ ukośnikiem');
  return Object.assign(new Blob([(await pdf.save()) as BlobPart]), { name: 'links.pdf' }) as unknown as File;
}

async function read(bytes: Uint8Array, expectedPages: number) {
  try {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), password: PASSWORD, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise;
    if (doc.numPages !== expectedPages) return null;
    const page = await doc.getPage(1);
    const text = (await page.getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join('');
    await page.getOperatorList();
    const links = (await page.getAnnotations()).map((a) => (a as { url?: string }).url ?? '');
    return { text, links };
  } catch {
    return null;
  }
}

console.log('=== hexifyStrings (pure) ===');
{
  const doc = await PDFDocument.create();
  const holder = doc.context.register(doc.context.obj({ A: PDFString.of('abc'), B: [PDFString.of('x)'), 1], C: { D: PDFString.of('(') } }));
  const n = hexifyStrings(doc);
  const dict = doc.context.lookup(holder) as unknown as { toString(): string };
  check(n >= 4, `all the literal strings are converted (${n})`);
  check(!/\((abc|x\)|\()\)/.test(dict.toString()) && /<616263>/.test(dict.toString()) && /<78 ?29>|<7829>/.test(dict.toString().replace(/\s/g, '')), `they are hex strings now: ${dict.toString().replace(/\s+/g, ' ')}`);
}

console.log('\n=== protect a PDF with 30 link annotations, several times ===');
{
  const file = await build();
  const original = new Uint8Array(await file.arrayBuffer());
  const plain = await read(original, 1);
  check(!!plain && plain.links.length === URLS.length, `source: pdf.js sees ${plain?.links.length} links`);
  let ok = 0;
  let sameLinks = 0;
  const RUNS = 8;
  for (let i = 0; i < RUNS; i++) {
    const protectedBytes = new Uint8Array(await (await protectPdfClient(file, PASSWORD)).arrayBuffer());
    const r = await read(protectedBytes, 1);
    if (r) ok++;
    if (r && plain && r.links.join('|') === plain.links.join('|') && r.text === plain.text) sameLinks++;
  }
  check(ok === RUNS, `${ok}/${RUNS} protected files open in pdf.js with the password`);
  check(sameLinks === RUNS, `${sameLinks}/${RUNS} keep the text and every one of the ${URLS.length} link URLs (incl. "(", ")" and "\\")`);
  const unlocked = new Uint8Array(await (await unlockPdfClient(new File([(await protectPdfClient(file, PASSWORD)) as BlobPart], 'p.pdf'), PASSWORD)).arrayBuffer());
  const back = await read(unlocked, 1);
  check(!!back && back.links.join('|') === plain?.links.join('|'), 'protect → our unlock → the links are intact');
}

console.log('\n=== a real PDF: allegro-raport.pdf (27 pages, link annotations) ===');
{
  const file = Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', 'allegro-raport.pdf'))]), { name: 'a.pdf' }) as unknown as File;
  let ok = 0;
  for (let i = 0; i < 3; i++) {
    const bytes = new Uint8Array(await (await protectPdfClient(file, PASSWORD)).arrayBuffer());
    const doc = await pdfjs.getDocument({ data: bytes, password: PASSWORD, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise.catch(() => null);
    if (doc && doc.numPages === 27) {
      let items = 0;
      try { for (let p = 1; p <= 27; p++) { const pg = await doc.getPage(p); items += (await pg.getTextContent()).items.length; await pg.getOperatorList(); } } catch { items = -1; }
      if (items === 458) ok++;
    }
  }
  check(ok === 3, `${ok}/3 protected copies open with all 27 pages and all 458 text items`);
}

console.log('\n=== an already protected PDF is refused ===');
{
  const file = await build();
  const once = await protectPdfClient(file, PASSWORD);
  let refused = false;
  try { await protectPdfClient(new File([once as BlobPart], 'p.pdf'), PASSWORD); } catch (e) { refused = /zabezpieczony/.test((e as Error).message); }
  check(refused, 'protecting twice throws instead of double-encrypting into garbage');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
