// FINDING batch (engine, basic page-manipulation tools, 2026-09-21) — two real bugs found
// scanning lib/client-pdf.ts's mergePDFs/splitPDF/rotatePDF/addPageNumbers/addWatermark/
// cropPages/deletePages/extractPages/reorderPages family for further engine issues.
//
// 1. cropPages — page.getSize() only returns width/height, dropping the MediaBox's own x/y
//    origin; setMediaBox(x,y,w,h) then anchored the new box at the ABSOLUTE page origin (0,0)
//    instead of the box's actual lower-left corner. A PDF whose MediaBox doesn't start at (0,0)
//    got cropped from the wrong region. Fixed by reading getMediaBox() (which returns
//    {x,y,width,height}) and adding x/y back into the new box's coordinates — the exact pattern
//    pdf-lib's own source comments show as correct usage.
//
// 2. splitByRanges — a user-typed range with page "0" (e.g. "0" or "0-3", a plausible
//    0-vs-1-indexed slip; the range input is free text with zero validation) gave start=-1,
//    which pdf-lib's copyPages treats as srcPages[-1] = undefined (JS arrays don't wrap
//    negative indices), crashing with "Cannot read properties of undefined (reading 'node')"
//    partway through processing the comma-separated range list — losing results for any
//    earlier, valid ranges in the same request too. Fixed by clamping start to 0.

import { PDFDocument } from 'pdf-lib';

const { cropPages, splitByRanges } = await import('../lib/client-pdf');

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

console.log('=== cropPages: crops relative to the MediaBox\'s own origin, not always (0,0) ===');
{
  // A page whose MediaBox does NOT start at (0,0) — e.g. x0=100,y0=50 to x1=700,y1=850
  // (600x800 wide/tall, same as a normal page, just offset).
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  page.setMediaBox(100, 50, 600, 800); // pdf-lib signature: setMediaBox(x, y, width, height)
  const bytes = await pdf.save();
  const file = toFile(bytes, 'offset.pdf');

  const margin = { top: 10, right: 10, bottom: 10, left: 10 };
  const croppedBytes = await cropPages(file, margin);
  const croppedDoc = await PDFDocument.load(croppedBytes);
  const box = croppedDoc.getPage(0).getMediaBox();
  // Original box: x=100,y=50,width=600,height=800 (setMediaBox(x,y,w,h) signature per pdf-lib).
  // Expected after crop: x=110, y=60, width=580, height=780.
  check(Math.abs(box.x - 110) < 0.01, `cropped box x origin ≈ 110 (source origin + left margin), got ${box.x}`);
  check(Math.abs(box.y - 60) < 0.01, `cropped box y origin ≈ 60 (source origin + bottom margin), got ${box.y}`);
  check(Math.abs(box.width - 580) < 0.01, `cropped box width ≈ 580, got ${box.width}`);
  check(Math.abs(box.height - 780) < 0.01, `cropped box height ≈ 780, got ${box.height}`);
}

console.log('=== splitByRanges: a "0" page reference does not crash the whole request ===');
{
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 5; i++) pdf.addPage();
  const bytes = await pdf.save();
  const file = toFile(bytes, 'five-pages.pdf');

  let threw = false;
  let results: { data: Uint8Array; name: string }[] = [];
  try {
    results = await splitByRanges(file, '0,2-3');
  } catch {
    threw = true;
  }
  check(!threw, 'splitByRanges("0,2-3") does not throw');
  check(results.length === 2, `both range parts produced a result (got ${results.length})`);
  if (results.length === 2) {
    const first = await PDFDocument.load(results[0]!.data);
    check(first.getPageCount() === 1, `the "0" part clamps to page 1 (1-page output), got ${first.getPageCount()}`);
    const second = await PDFDocument.load(results[1]!.data);
    check(second.getPageCount() === 2, `the "2-3" part is unaffected (2-page output), got ${second.getPageCount()}`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
