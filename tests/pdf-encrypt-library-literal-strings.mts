// @pdfsmaller/pdf-encrypt 1.0.x wrote encrypted bytes into PDF literal strings "(...)" without
// escaping them; ciphertext contains "(", ")" and "\" often enough that a document with a few dozen
// literal strings (link annotations, Info fields) was corrupted almost every time. protectPdfClient
// works around it (hexifyStrings, see tests/protect-literal-strings.mts); the library itself fixed
// it in 1.1.0 and the app now uses 1.2.0. This checks the LIBRARY ALONE, without the workaround,
// so a downgrade (or a regression upstream) is caught: 1.0.2 gives 0/8 here, 1.2.0 gives 8/8.
import { PDFDocument, PDFName, PDFString, StandardFonts } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
let ok = 0;
for (let run = 0; run < 8; run++) {
  const d = await PDFDocument.create(); const f = await d.embedFont(StandardFonts.Helvetica);
  const page = d.addPage([400, 400]); page.drawText('Links', { x: 20, y: 350, size: 14, font: f });
  const annots = [];
  for (let i = 0; i < 30; i++) {
    const uri = `https://example.com/page-${run}-${i}`;
    annots.push(d.context.register(d.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [10, i * 10, 100, i * 10 + 8], A: { S: 'URI', URI: PDFString.of(uri) } })));
  }
  page.node.set(PDFName.of('Annots'), d.context.obj(annots));
  d.setTitle(`Title (with) parens ${run}`);
  const plain = await d.save({ useObjectStreams: false });
  const enc = await encryptPDF(plain, 'pw');
  try {
    const doc = await pdfjs.getDocument({ data: enc, password: 'pw' }).promise;
    const a = await (await doc.getPage(1)).getAnnotations();
    if (a.length === 30 && a.every((x, i) => typeof (x.unsafeUrl ?? x.url) === 'string' && (x.unsafeUrl ?? x.url) === `https://example.com/page-${run}-${i}`)) ok++;
  } catch { /* unreadable */ }
}
console.log(`  ${ok === 8 ? 'PASS' : 'FAIL'} library alone: ${ok}/8 encrypted files open with all 30 links intact`);
console.log(ok === 8 ? '\nALL PASS' : '\n1 FAIL');
process.exit(ok === 8 ? 0 : 1);
