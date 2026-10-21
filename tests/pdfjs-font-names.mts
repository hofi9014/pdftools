// Every converter knows bold, italic and the font family from each font's real /BaseFont name,
// read from page.commonObjs (buildFontNameMap, buildFontClassMap, extractTextBlocks). pdf.js 6.4
// stopped handing that name to the page unless the document is opened with
// `fontExtraProperties: true` (6.3 always did). With 6.4 installed and the option missing, every
// conversion lost bold and italic: Word, ODT, PowerPoint, Excel, EPUB (CI on the Dependabot update
// to 6.4.299 failed pptx-formatting-preserved, pdf-to-epub-bold-italic, pdf-to-excel-bold-italic
// and the paragraph-grouping hashes).
//
// The behaviour tests catch the loss only once 6.4 is installed; this one also holds on 6.3: the
// shared options and the editor's own getDocument must ask for the names, and with them the
// installed pdf.js must give the real name of a bold and an italic font.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

const { PDFDocument, StandardFonts } = await import('pdf-lib');
const { pdfjsDocOptions } = await import('../lib/client-pdf.ts');
const pdfjs = await import('pdfjs-dist');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const opts = pdfjsDocOptions(new Uint8Array());
check(opts.fontExtraProperties === true, 'pdfjsDocOptions asks pdf.js for the fonts\' real names (fontExtraProperties: true)');

const editor = readFileSync(join(ROOT, 'components/edit-pdf/PdfEditor.tsx'), 'utf8');
check(/getDocument\(\{[^}]*fontExtraProperties: true[^}]*\}\)/.test(editor), 'the PDF editor opens its document with fontExtraProperties (it runs extractTextBlocks on it)');

const doc = await PDFDocument.create();
const page = doc.addPage();
page.drawText('Bold here', { x: 50, y: 700, size: 12, font: await doc.embedFont(StandardFonts.HelveticaBold) });
page.drawText('Italic here', { x: 50, y: 680, size: 12, font: await doc.embedFont(StandardFonts.HelveticaOblique) });
const bytes = await doc.save();

const pd = await pdfjs.getDocument({ data: bytes, fontExtraProperties: true }).promise;
const pg = await pd.getPage(1);
const ops = await pg.getOperatorList();
const names: string[] = [];
ops.fnArray.forEach((fn, i) => {
  if (fn !== pdfjs.OPS.setFont) return;
  const font = pg.commonObjs.get((ops.argsArray[i] as unknown[])[0] as string) as { name?: string } | undefined;
  if (font?.name) names.push(font.name);
});
check(names.includes('Helvetica-Bold') && names.includes('Helvetica-Oblique'), `pdf.js ${pdfjs.version} gives the real font names with the option (${names.join(', ') || 'none'})`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
