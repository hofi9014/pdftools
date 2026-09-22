// Audit finding (High, engine area) — pdfToEpub's bold/italic detection (isBoldFont/
// isItalicFont in lib/client-pdf.ts, fed by extractTextBlocks.ts's TextBlock.fontName) NEVER
// worked, on any document, ever. pdf.js's TextItem.fontName — despite its name — is not the
// PDF's real font name at all: it's an internal, sequentially-assigned object id ("g_d0_f1",
// "g_d0_f2", ...) that pdf.js hands out while parsing, unrelated to the file's actual /BaseFont
// value. isBoldFont()/isItalicFont() substring-match for "bold"/"italic" etc. in that string —
// which never contains those words, since it's always just "g_d0_fN" — so classifyBlocks()
// always produced bold:false/italic:false for every single text block in every PDF, regardless
// of what font was actually used in the source document. Confirmed directly against pdf.js:
// drawing text with StandardFonts.HelveticaBold still reports item.fontName as "g_d0_f1", not
// "Helvetica-Bold".
//
// Fixed by resolving the alias to the real font via page.commonObjs (populated once the
// operator list has been walked, page.getOperatorList()) — commonObjs.get(alias).name gives the
// true BaseFont name ("Helvetica-Bold", "Helvetica-Oblique") that isBoldFont/isItalicFont can
// actually match against.
//
// Proven end-to-end: builds a real PDF with pdf-lib mixing bold/italic/regular text, runs it
// through the real pdfToEpub(), unzips the actual generated .epub, and confirms <strong>/<em>
// tags are present in the XHTML — not just that the underlying classification objects report
// bold:true internally.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
// lib/client-pdf.ts's pdfToEpub does `await import('pdfjs-dist')`, which resolves to the
// browser build — needs DOM globals (DOMMatrix etc.) that don't exist under Node/tsx. Same
// remap-to-legacy-build loader already used by other tests exercising real pdfjs-dependent
// app code (see tests/office-to-pdf-entities.mts).
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));

import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { pdfToEpub } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(bytes: Uint8Array, name: string): File {
  const blob = new Blob([bytes as BlobPart]);
  return Object.assign(blob, { name }) as unknown as File;
}

console.log('=== pdfToEpub: bold/italic text produces <strong>/<em> in the output XHTML ===');
{
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const page = pdf.addPage([400, 500]);
  // A real paragraph mixing regular, bold and italic runs, plus a clearly larger "heading" line
  // to exercise heading detection too (independent of the bold/italic bug, but keeps the doc
  // realistic).
  page.drawText('Document Title', { x: 40, y: 450, size: 24, font: bold });
  page.drawText('This is regular text.', { x: 40, y: 400, size: 12, font: regular });
  page.drawText('This word is bold.', { x: 40, y: 380, size: 12, font: bold });
  page.drawText('This word is italic.', { x: 40, y: 360, size: 12, font: italic });

  const bytes = await pdf.save();
  const file = toFile(bytes, 'bold-italic-test.pdf');

  const epubBlob = await pdfToEpub(file);
  check(epubBlob.size > 0, `pdfToEpub produced a non-empty file (${epubBlob.size} bytes)`);

  const zip = await JSZip.loadAsync(await epubBlob.arrayBuffer());
  const pageFile = zip.file('OEBPS/page-1.xhtml');
  check(pageFile !== null, 'OEBPS/page-1.xhtml exists in the generated epub');

  if (pageFile) {
    const xhtml = await pageFile.async('string');
    check(xhtml.includes('<strong>'), `generated XHTML contains a <strong> tag for bold text (got a snippet: ${JSON.stringify(xhtml.slice(0, 400))})`);
    check(xhtml.includes('<em>'), `generated XHTML contains an <em> tag for italic text (got a snippet: ${JSON.stringify(xhtml.slice(0, 400))})`);
    check(xhtml.includes('bold'), 'the actual bold word text is present');
    check(xhtml.includes('italic'), 'the actual italic word text is present');
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
