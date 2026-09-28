// flatten-pdf: a PDF with no AcroForm fields and no annotations has nothing to flatten, so the
// output is byte-for-byte identical to the input — flattenPDF() correctly does nothing in that
// case, but silently returning the same bytes with only a generic "PDF flattened successfully!"
// message reads as "did this even run?" to a user comparing the files. Reported directly by a
// user: "spłaszcz pdf - czy narzędzie zadziałało poprawnie, bo nie widzę różnicy? Sprawdź plik"
// (did the tool work correctly, because I see no difference? Check the file).
//
// flattenPDF() now returns { bytes, flattenedFields, removedAnnotations } instead of a bare
// Uint8Array, so the page can tell a genuine no-op apart from a real flatten and show a plain
// explanation ("this file had nothing to flatten") instead of leaving the user to guess.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { flattenPDF } from '../lib/client-pdf.ts';
import { all as i18nAll, locales } from '../lib/i18n.ts';

// flattenPDF's form-flattening path embeds LiberationSans via a browser-relative
// fetch('/pdfjs-dist/...'), meaningless in Node — serve the real, already-built font from disk.
const here = dirname(fileURLToPath(import.meta.url));
const fontBytes = readFileSync(join(here, '..', 'public', 'pdfjs-dist', 'standard_fonts', 'LiberationSans-Regular.ttf'));
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.includes('/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf')) {
    return new Response(new Uint8Array(fontBytes), { status: 200 });
  }
  return realFetch(input, init);
}) as typeof fetch;

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

console.log('=== flatten-pdf: a real no-op is reported as such, a real flatten still works ===');

// 1. Plain PDF, no form, no annotations: nothing flattened/removed, bytes decode to the same content.
{
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([300, 300]).drawText('Plain text, no form fields.', { x: 30, y: 250, size: 12, font });
  const bytes = await pdf.save();
  const file = new File([bytes as unknown as BlobPart], 'plain.pdf', { type: 'application/pdf' });

  const result = await flattenPDF(file);
  check(result.flattenedFields === 0, `no form fields reported (got ${result.flattenedFields})`);
  check(result.removedAnnotations === 0, `no annotations reported (got ${result.removedAnnotations})`);
  const out = await PDFDocument.load(result.bytes);
  check(out.getPageCount() === 1, 'output still has the same page count');
}

// 2. A PDF with a real AcroForm text field: flattenedFields must be > 0, and the field is gone.
{
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([300, 300]);
  const form = pdf.getForm();
  const field = form.createTextField('name');
  field.setText('Alice');
  field.addToPage(page, { x: 50, y: 50, width: 150, height: 20 });
  const bytes = await pdf.save();
  const file = new File([bytes as unknown as BlobPart], 'form.pdf', { type: 'application/pdf' });

  const result = await flattenPDF(file);
  check(result.flattenedFields === 1, `exactly 1 field reported as flattened (got ${result.flattenedFields})`);
  const out = await PDFDocument.load(result.bytes);
  check(out.getForm().getFields().length === 0, 'the flattened document has zero remaining form fields');
}

// 3. A PDF with a plain (non-form) annotation: removedAnnotations must be > 0.
{
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([300, 300]);
  const { PDFName, PDFArray, PDFString } = await import('pdf-lib');
  const annotDict = pdf.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Text'),
    Rect: [10, 10, 30, 30],
    Contents: PDFString.of('a comment'),
  });
  const annotRef = pdf.context.register(annotDict);
  page.node.set(PDFName.of('Annots'), PDFArray.withContext(pdf.context));
  (page.node.Annots() as InstanceType<typeof PDFArray>).push(annotRef);
  const bytes = await pdf.save();
  const file = new File([bytes as unknown as BlobPart], 'annotated.pdf', { type: 'application/pdf' });

  const result = await flattenPDF(file);
  check(result.removedAnnotations === 1, `exactly 1 annotation reported as removed (got ${result.removedAnnotations})`);
  const out = await PDFDocument.load(result.bytes);
  check(!out.getPages()[0]!.node.Annots(), 'the flattened page has no remaining /Annots');
}

// 4. Every locale has the new "nothing to flatten" notice, distinct from the generic success text.
check(locales.length === 16, `expected 16 locales (got ${locales.length})`);
for (const loc of locales) {
  const notice = i18nAll[loc]?.['page.flatten.success_nochange'];
  const success = i18nAll[loc]?.['page.flatten.success'];
  check(typeof notice === 'string' && notice.length > 0, `${loc}: page.flatten.success_nochange is present and non-empty`);
  check(notice !== success, `${loc}: no-op notice text is distinct from the generic success text`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exitCode = fails === 0 ? 0 : 1;
