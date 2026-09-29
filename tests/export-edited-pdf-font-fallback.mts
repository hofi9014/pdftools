// edit-pdf: when the chosen web font cannot be loaded (offline, blocked request), the text edit
// fell back to StandardFonts.Helvetica — a WinAnsi font that THROWS on Polish letters ("ż", "ą"),
// so saving any Polish edit then failed the whole export. The same catch block also wrapped the
// drawing, so an error half-way through drew the first lines twice. The fallback is now the
// site's own LiberationSans (Polish-capable); Helvetica only if even that request fails, with
// the characters it cannot encode replaced by "?".
import { register } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));

// Web fonts (the edit's chosen family) always fail; the site's own LiberationSans can be
// switched on and off.
let serveLiberation = true;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (serveLiberation && url.startsWith('/pdfjs-dist/')) {
    const f = join(ROOT, 'public', url);
    if (existsSync(f)) return new Response(new Uint8Array(readFileSync(f)), { status: 200 });
  }
  return new Response('blocked', { status: 404 });
}) as typeof fetch;

const { exportEditedPdf, drawableText } = await import('../lib/pdf/exportEditedPdf');
import type { TextEdit } from '../lib/pdf/exportEditedPdf';
const pdfjs = await import('pdfjs-dist');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

async function source(): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([595, 842]).drawText('Original text', { x: 100, y: 700, size: 14, font });
  return Object.assign(new Blob([await doc.save() as BlobPart]), { name: 'a.pdf' }) as unknown as File;
}
const POLISH = 'Zażółć gęślą jaźń';
const edit: TextEdit = { id: 'e1', page: 1, x: 100, y: 128, width: 300, height: 18, originalText: 'Original text', newText: `${POLISH}\nDruga linia`, fontSize: 14, fontFamily: 'Noto Sans', bold: false, italic: false, color: '#000000' };

async function textOf(blob: Blob): Promise<string[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  return (await (await doc.getPage(1)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).filter((s) => s.trim());
}

console.log('=== chosen web font unavailable, site font available ===');
{
  let out: Blob | null = null;
  let err = '';
  try { out = await exportEditedPdf(await source(), [edit]); } catch (e) { err = String(e); }
  check(out !== null, `the export succeeds (${err || 'ok'})`);
  const t = out ? await textOf(out) : [];
  check(t.some((s) => s.includes(POLISH)), `the Polish edit is written with its letters (${JSON.stringify(t)})`);
  check(t.filter((s) => s.includes('Druga linia')).length === 1, 'each line is drawn exactly once');
}

console.log('\n=== no font can be fetched at all ===');
{
  serveLiberation = false;
  let out: Blob | null = null;
  let err = '';
  try { out = await exportEditedPdf(await source(), [edit]); } catch (e) { err = String(e); }
  check(out !== null, `the export still succeeds with the last-resort font (${err || 'ok'})`);
  const t = out ? await textOf(out) : [];
  check(t.some((s) => s.includes('Druga linia')), 'plain text is written');
  serveLiberation = true;
}

console.log('\n=== drawableText ===');
{
  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  check(drawableText(helv, 'abc') === 'abc', 'encodable text is unchanged');
  check(drawableText(helv, 'Zażółć') === 'Za?ó??', `unencodable letters become "?" (${drawableText(helv, 'Zażółć')})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
