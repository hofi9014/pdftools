// add-page: the new blank page used to always come out A4-sized, regardless of the document's
// actual page size. Reported directly by a user with a screenshot: on a real A5 document, the
// newly added page was visibly, dramatically larger than every other page.
//
// Root cause: addBlankPage() called pdf.insertPage(position)/pdf.addPage() with no size argument
// — pdf-lib's own default for an omitted size is unconditionally PageSizes.A4 (595x842pt),
// completely ignoring the document's real page size. For an A5 document (419x595pt, confirmed on
// the user's own file) the new page came out nearly DOUBLE the area.
import { PDFDocument, PageSizes, degrees } from 'pdf-lib';
import { addBlankPage } from '../lib/client-pdf.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

async function buildPdf(size: [number, number], rotateFirst = false): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const p1 = pdf.addPage(size);
  if (rotateFirst) p1.setRotation(degrees(90));
  pdf.addPage(size);
  pdf.addPage(size);
  return pdf.save();
}
function file(bytes: Uint8Array): File {
  return new File([bytes as unknown as BlobPart], 'x.pdf', { type: 'application/pdf' });
}

console.log('=== add-page: new page matches the document\'s own size, not a hardcoded A4 ===');

for (const [label, size] of [['A5', [419, 595]], ['Letter', [612, 792]]] as const) {
  const src = await buildPdf([...size] as [number, number]);
  for (const [posLabel, position] of [['start', 0], ['middle', 1], ['end', undefined]] as const) {
    const out = await addBlankPage(file(src), position);
    const pdf = await PDFDocument.load(out);
    check(pdf.getPageCount() === 4, `${label}/${posLabel}: page count is 4 (got ${pdf.getPageCount()})`);
    const newPageIdx = position ?? 3;
    const p = pdf.getPage(newPageIdx);
    const okSize = Math.abs(p.getWidth() - size[0]) < 0.5 && Math.abs(p.getHeight() - size[1]) < 0.5;
    check(okSize, `${label}/${posLabel}: new page is ${size[0]}x${size[1]}pt (got ${p.getWidth().toFixed(1)}x${p.getHeight().toFixed(1)})`);
    if (label !== 'A4') {
      const isA4 = Math.abs(p.getWidth() - PageSizes.A4[0]) < 0.5 && Math.abs(p.getHeight() - PageSizes.A4[1]) < 0.5;
      check(!isA4, `${label}/${posLabel}: new page is not silently defaulting to A4`);
    }
  }
}

// A page with /Rotate 90 has swapped raw MediaBox dims; the new (unrotated) page must match what
// a viewer actually SHOWS for that page (visual size), not its raw MediaBox.
{
  const src = await buildPdf([400, 600], true);
  const out = await addBlankPage(file(src), 1); // insert right after the rotated first page
  const pdf = await PDFDocument.load(out);
  const p = pdf.getPage(1);
  check(Math.abs(p.getWidth() - 600) < 0.5 && Math.abs(p.getHeight() - 400) < 0.5,
    `rotated reference page: new page matches its VISUAL 600x400 size (got ${p.getWidth().toFixed(1)}x${p.getHeight().toFixed(1)})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exitCode = fails === 0 ? 0 : 1;
