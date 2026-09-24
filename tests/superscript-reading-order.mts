// A raised/lowered inline run (footnote superscript, chemical subscript) sits more than the sort
// tie-tolerance away from its line in Y, so it used to sort ahead of the whole line
// ("Tekst z przypisem² dalej." extracted as "² Tekst z przypisem dalej."). reseatScriptRuns()
// puts short, clearly-smaller, offset runs back at their X position. Builds a real PDF with
// pdf-lib and reads the order back through the real extractFormattedTextFromPDF. Guard against a
// broader fix: a small-type run that is NOT short (a slide footer) must keep its place.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { extractFormattedTextFromPDF } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

async function extract(draw: (p: import('pdf-lib').PDFPage, f: import('pdf-lib').PDFFont) => void): Promise<string[]> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([500, 400]);
  draw(page, font);
  const bytes = await pdf.save();
  const file = Object.assign(new Blob([bytes as BlobPart]), { name: 't.pdf' }) as unknown as File;
  const pages = await extractFormattedTextFromPDF(file);
  return pages[0]!.blocks.map((b) => ((b as { runs?: { text: string }[] }).runs ?? []).map((r) => r.text).join('|'));
}

console.log('=== footnote superscript keeps its X position ===');
{
  const blocks = await extract((p, f) => {
    const w1 = f.widthOfTextAtSize('Tekst z przypisem', 12);
    p.drawText('Tekst z przypisem', { x: 50, y: 300, size: 12, font: f });
    p.drawText('2', { x: 50 + w1, y: 305, size: 7, font: f });
    p.drawText('dalej.', { x: 50 + w1 + 12, y: 300, size: 12, font: f });
  });
  const line = blocks.join(' / ');
  console.log(`    (${line})`);
  const iText = line.indexOf('Tekst'), iSup = line.indexOf('2'), iRest = line.indexOf('dalej');
  check(iText !== -1 && iSup !== -1 && iRest !== -1, 'all three fragments extracted');
  check(iText < iSup && iSup < iRest, 'order is text → superscript → rest (not superscript first)');
}

console.log('\n=== chemical subscript keeps its X position ===');
{
  const blocks = await extract((p, f) => {
    const w1 = f.widthOfTextAtSize('H', 12);
    p.drawText('H', { x: 50, y: 300, size: 12, font: f });
    p.drawText('2', { x: 50 + w1, y: 296, size: 7, font: f });
    p.drawText('O jest woda', { x: 50 + w1 + 5, y: 300, size: 12, font: f });
  });
  const line = blocks.join(' / ');
  console.log(`    (${line})`);
  check(line.indexOf('H') < line.indexOf('2') && line.indexOf('2') < line.indexOf('O jest'), 'order is H → 2 → "O jest woda"');
}

console.log('\n=== long small-type element is NOT reseated (slide footer guard) ===');
{
  const blocks = await extract((p, f) => {
    p.drawText('Footer text small', { x: 50, y: 303, size: 7, font: f });
    p.drawText('Main body line', { x: 50, y: 300, size: 12, font: f });
  });
  const line = blocks.join(' / ');
  console.log(`    (${line})`);
  check(line.indexOf('Footer') < line.indexOf('Main'), 'raised long small run stays ahead (original Y order preserved)');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
