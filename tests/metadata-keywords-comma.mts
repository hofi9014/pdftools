// Audit finding (Medium, engine area) — editMetadata() (lib/client-pdf.ts) split the user's
// comma-separated Keywords field into an array, then called pdf-lib's setKeywords(array) — but
// pdf-lib's setKeywords ALWAYS re-joins the array with a SPACE (confirmed directly in its
// source: `keywords.join(' ')`), with no way to override that separator. Typing
// "Umowa najmu, Warszawa, 2026" saved as the literal /Keywords string "Umowa najmu Warszawa
// 2026" — and since pdf-lib's getKeywords() returns that raw string verbatim with no
// re-parsing, and app/metadata/page.tsx displays it directly in the same text field, re-opening
// the same file in this tool showed "Umowa najmu Warszawa 2026" with no way to tell where one
// original keyword ends and the next begins (worse for multi-word keywords like "Umowa najmu",
// now indistinguishable from two separate ones "Umowa" and "najmu"). Every re-edit compounded
// the loss. The sibling XMP pdf:Keywords field already wrote meta.keywords directly, unsplit —
// creating an inconsistency between the two copies of keyword metadata in the same file.
//
// Fixed by writing the Info dict's /Keywords entry directly (bypassing pdf-lib's array-based
// setKeywords API entirely) with the user's exact, unmodified string — matching what the
// sibling XMP field already correctly did.

import { PDFDocument } from 'pdf-lib';
import { editMetadata } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(bytes: Uint8Array, name: string): File {
  return Object.assign(new Blob([bytes as BlobPart]), { name }) as unknown as File;
}

console.log('=== editMetadata: Keywords round-trips with commas intact, not collapsed to spaces ===');
{
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 200]);
  const bytes = await pdf.save();
  const file = toFile(bytes, 'blank.pdf');

  const original = 'Umowa najmu, Warszawa, 2026';
  const outBytes = await editMetadata(file, { title: 'x', author: 'x', subject: 'x', keywords: original });

  const outPdf = await PDFDocument.load(outBytes);
  const readBack = outPdf.getKeywords();

  check(readBack === original, `Keywords round-trips EXACTLY, commas preserved (expected ${JSON.stringify(original)}, got ${JSON.stringify(readBack)})`);
  check((readBack ?? '').includes(','), 'the saved value still contains comma delimiters');
  check((readBack ?? '').includes('Umowa najmu'), 'the multi-word keyword "Umowa najmu" survives as one distinguishable unit, not merged with the next keyword');
}

console.log('\n=== regression guard: empty keywords still saves as empty, not "undefined" or a crash ===');
{
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 200]);
  const bytes = await pdf.save();
  const file = toFile(bytes, 'blank2.pdf');
  const outBytes = await editMetadata(file, { keywords: '' });
  const outPdf = await PDFDocument.load(outBytes);
  check(outPdf.getKeywords() === '', `empty keywords string round-trips as empty (got ${JSON.stringify(outPdf.getKeywords())})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
