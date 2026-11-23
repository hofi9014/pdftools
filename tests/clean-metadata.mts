// "Remove metadata" (lib/pdf/cleanMetadata.ts, plan 2.1, 2026-11-20).
// 1. A file built to carry every kind of metadata found in real PDFs: Info (author), an XMP
//    packet with a file path, edit history, thumbnail and document IDs, a photo with EXIF/GPS,
//    a page thumbnail, application private data, a comment with its author's name, an
//    attachment, and an earlier version of the page left in the file by an incremental save.
//    After cleaning none of it is left in the bytes, the content is unchanged and a form
//    field's name (also /T) survives.
// 2. Every real PDF in test-real-pdfs/: after cleaning the report is clean and every page
//    renders pixel for pixel as before, with the same text.
// Run: npm run test:clean-metadata
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PDFDocument, PDFName, PDFRawStream, StandardFonts, PDFHexString, PDFString, PDFArray, PDFDict } from 'pdf-lib';
import pako from 'pako';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
const { analyzePdfMetadata, cleanPdfMetadata, reportIsClean, stripJpegMetadata } = await import('../lib/pdf/cleanMetadata.ts');

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

/** Every byte of the file, with Flate streams inflated, as text: what a curious reader can see. */
async function allText(bytes: Uint8Array): Promise<string> {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  let out = Buffer.from(bytes).toString('latin1');
  // Strings written as hex (<FEFF...>) or escaped literals, decoded as a reader would.
  const strings = (v: unknown): void => {
    if (v instanceof PDFString || v instanceof PDFHexString) out += '\n' + v.decodeText();
    else if (v instanceof PDFArray) v.asArray().forEach(strings);
    else if (v instanceof PDFDict) for (const [, x] of v.entries()) strings(x);
  };
  strings(pdf.context.trailerInfo.Info ? pdf.context.lookup(pdf.context.trailerInfo.Info as never) : undefined);
  for (const [, o] of pdf.context.enumerateIndirectObjects()) {
    strings(o instanceof PDFRawStream ? o.dict : o);
    if (o instanceof PDFRawStream && String(o.dict.get(PDFName.of('Filter'))) === '/FlateDecode') {
      try { out += Buffer.from(pako.inflate(o.contents)).toString('latin1'); } catch {}
    }
  }
  return out;
}

async function pages(bytes: Uint8Array, render: boolean) {
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/', verbosity: 0 });
  const doc = await task.promise;
  const out: { text: string; pixels?: Buffer }[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    const entry: { text: string; pixels?: Buffer } = { text: tc.items.map((i) => ('str' in i ? i.str : '')).join('') };
    if (render) {
      const vp = page.getViewport({ scale: 0.6 });
      const canvas = canvasMod.createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
      await page.render({ canvasContext: canvas.getContext('2d') as never, viewport: vp, canvas: canvas as never }).promise;
      entry.pixels = canvas.toBuffer('image/png');
    }
    out.push(entry);
  }
  await task.destroy();
  return out;
}

// ---------- 1. a file with every kind of metadata ----------
console.log('=== a file that carries every kind of metadata ===');
const SECRETS = ['Jan Kowalski', 'Anna Nowak', 'GPS-SECRET-52.2297', '/Users/jan/Tajne', 'OLDSECRET', 'xmp.did:1234-abcd', 'MyCompany Sp. z o.o.'];

const doc = await PDFDocument.create();
doc.setAuthor('Jan Kowalski');
doc.setTitle('Umowa');
doc.setCreator('Microsoft Word');
const page = doc.addPage([595, 842]);
const font = await doc.embedFont(StandardFonts.Helvetica);
const ctx = doc.context;
// The page text is written by hand (uncompressed) so the old version can be found in the bytes.
page.node.setFontDictionary(PDFName.of('F1'), font.ref);
const oldContent = ctx.register(ctx.stream('BT /F1 24 Tf 50 760 Td (OLDSECRET) Tj ET'));
page.node.set(PDFName.of('Contents'), ctx.obj([oldContent]));
// A photo whose JPEG carries an EXIF segment with a location.
const photo = canvasMod.createCanvas(200, 150);
const g = photo.getContext('2d');
g.fillStyle = '#c84'; g.fillRect(0, 0, 200, 150); g.fillStyle = '#048'; g.fillRect(40, 30, 120, 90);
const clean = new Uint8Array(photo.toBuffer('image/jpeg', 90));
const exif = new TextEncoder().encode('Exif\0\0GPS-SECRET-52.2297 camera Pixel');
const app1 = new Uint8Array([0xff, 0xe1, ((exif.length + 2) >> 8) & 255, (exif.length + 2) & 255, ...exif]);
const withExif = new Uint8Array([...clean.subarray(0, 2), ...app1, ...clean.subarray(2)]);
const img = await doc.embedJpg(withExif);
// XMP packet as Adobe tools write it.
const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/" xmlns:stEvt="http://ns.adobe.com/xap/1.0/sType/ResourceEvent#" xmlns:stRef="http://ns.adobe.com/xap/1.0/sType/ResourceRef#" xmlns:xmpGImg="http://ns.adobe.com/xap/1.0/g/img/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:creator><rdf:Seq><rdf:li>Jan Kowalski</rdf:li></rdf:Seq></dc:creator><xmpMM:DocumentID>xmp.did:1234-abcd</xmpMM:DocumentID>
<xmpMM:History><rdf:Seq><rdf:li stEvt:action="saved" stEvt:softwareAgent="Adobe InDesign"/></rdf:Seq></xmpMM:History>
<xmpMM:DerivedFrom stRef:filePath="/Users/jan/Tajne/umowa.indd"/><xmpGImg:image>/9j/AAAA</xmpGImg:image></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
const xmpStream = ctx.stream(xmp, { Type: 'Metadata', Subtype: 'XML' });
doc.catalog.set(PDFName.of('Metadata'), ctx.register(xmpStream));
// A page thumbnail, an application's private data, a "last changed" date.
page.node.set(PDFName.of('Thumb'), ctx.register(ctx.stream('thumbnail', { Width: 1, Height: 1 })));
page.node.set(PDFName.of('PieceInfo'), ctx.obj({ Illustrator: { Private: PDFHexString.fromText('MyCompany Sp. z o.o.') } }));
page.node.set(PDFName.of('LastModified'), PDFHexString.fromText('D:20261120'));
// A comment with its author's name, and a form field (its /T is the field name and must stay).
const comment = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Text', Rect: [300, 700, 320, 720], T: PDFHexString.fromText('Anna Nowak'), Contents: PDFHexString.fromText('Sprawdzić termin'), M: PDFHexString.fromText('D:20261119') }));
page.node.set(PDFName.of('Annots'), ctx.obj([comment]));
const field = doc.getForm().createTextField('imie_klienta');
field.addToPage(page, { x: 50, y: 400, width: 200, height: 24 });
await doc.attach(new TextEncoder().encode('tajne dane'), 'notatka.txt', { mimeType: 'text/plain' });
page.drawImage(img, { x: 50, y: 500, width: 200, height: 150 });

// An incremental save (as Acrobat writes it): the page now shows other text; the old content
// stream stays in the file, unreferenced.
const base = await doc.save({ useObjectStreams: false, updateFieldAppearances: true });
const reloaded = await PDFDocument.load(base, { updateMetadata: false });
const pref = reloaded.getPage(0).ref;
const pnode = reloaded.getPage(0).node;
const prevXref = Number(/startxref\s+(\d+)\s+%%EOF\s*$/.exec(Buffer.from(base).toString('latin1'))![1]);
const size = reloaded.context.largestObjectNumber + 1;
const newContent = 'BT /F1 24 Tf 50 760 Td (PUBLIC TEXT) Tj ET';
// The new page: the new text plus the image drawing that was already there.
const oldRefs = String(pnode.get(PDFName.of('Contents'))).replace(/^\[\s*|\s*\]$/g, '').split(/\s+(?=\d+ \d+ R)/);
const keptRefs = oldRefs.slice(1).join(' ');
const trailerRoot = String((reloaded.context.trailerInfo as Record<string, unknown>).Root);
const trailerInfo = String((reloaded.context.trailerInfo as Record<string, unknown>).Info);
let tail = '\n';
const offContent = base.length + tail.length;
tail += `${size} 0 obj\n<< /Length ${newContent.length} >>\nstream\n${newContent}\nendstream\nendobj\n`;
const offPage = base.length + tail.length;
tail += `${pref.objectNumber} 0 obj\n${pnode.toString().replace(/\/Contents \[[^\]]*\]/, `/Contents [ ${size} 0 R ${keptRefs} ]`)}\nendobj\n`;
const offXref = base.length + tail.length;
const pad = (n: number) => String(n).padStart(10, '0');
tail += `xref\n0 1\n0000000000 65535 f \n${pref.objectNumber} 1\n${pad(offPage)} 00000 n \n${size} 1\n${pad(offContent)} 00000 n \n`;
tail += `trailer\n<< /Size ${size + 1} /Root ${trailerRoot} /Info ${trailerInfo} /Prev ${prevXref} >>\nstartxref\n${offXref}\n%%EOF\n`;
const dirty = new Uint8Array([...base, ...new TextEncoder().encode(tail)]);

const before = await pages(dirty, true);
check(before[0]!.text.includes('PUBLIC TEXT') && !before[0]!.text.includes('OLDSECRET'), 'the file shows the newer page (the old one is only hidden in the bytes)');
const rawBefore = await allText(dirty);
check(SECRETS.every((s) => rawBefore.includes(s)), 'every planted secret is in the original bytes');

const r1 = await analyzePdfMetadata(dirty);
check(r1.info.some((i) => i.key === 'Author' && i.value === 'Jan Kowalski'), 'report: author in Info');
check(r1.xmp && r1.xmpHistory >= 1 && r1.xmpThumbnail && r1.xmpIds && r1.xmpPaths.includes('/Users/jan/Tajne/umowa.indd'), 'report: XMP history, thumbnail, IDs and the file path');
check(r1.jpegWithMetadata === 1 && r1.pageThumbnails === 1 && r1.pieceInfo >= 1, 'report: photo EXIF, page thumbnail, private data');
check(JSON.stringify(r1.annotationAuthors) === '["Anna Nowak"]', `report: comment author only, not the form field name (${r1.annotationAuthors.join(', ')})`);
check(r1.attachments === 1 && r1.unreferenced >= 1, `report: one attachment, ${r1.unreferenced} leftover object(s) from the earlier save`);

console.log('\n=== cleaned with the default options ===');
const out = await cleanPdfMetadata(dirty);
const r2 = await analyzePdfMetadata(out);
check(reportIsClean(r2), 'the report of the downloaded file is clean');
const rawAfter = await allText(out);
const left = SECRETS.filter((s) => rawAfter.includes(s));
check(left.length === 0, `no secret left in the bytes${left.length ? ` (left: ${left.join(', ')})` : ''}`);
check(!/\/Producer|\/Creator|pdf-lib/.test(rawAfter), 'no Producer/Creator written by the cleaner itself');
const after = await pages(out, true);
check(after.length === before.length && after[0]!.text === before[0]!.text, 'same pages, same text');
check(after[0]!.pixels!.equals(before[0]!.pixels!), 'the page renders pixel for pixel as before');
const outDoc = await PDFDocument.load(out);
check(outDoc.getForm().getFields().map((f) => f.getName()).join() === 'imie_klienta', 'the form field keeps its name');
check(rawAfter.includes('Sprawdzić termin') || /FEFF0053/.test(rawAfter.toUpperCase()), 'the comment itself is kept');
check(r2.attachments === 1, 'attachments are kept unless asked');
const id = (outDoc.context.trailerInfo as Record<string, unknown>).ID;
check(!!id, 'a new document ID is written');
const out2 = await cleanPdfMetadata(dirty);
const id2 = String((await PDFDocument.load(out2)).context.trailerInfo.ID);
check(id2 !== String(id), 'the ID is random each time (it cannot link two cleaned copies)');

console.log('\n=== options ===');
const withAttach = await analyzePdfMetadata(await cleanPdfMetadata(dirty, { attachments: true }));
check(withAttach.attachments === 0, 'attachments removed when asked');
const keepAuthors = await analyzePdfMetadata(await cleanPdfMetadata(dirty, { annotationAuthors: false }));
check(keepAuthors.annotationAuthors.join() === 'Anna Nowak', 'comment authors kept when asked');

check(!r1.signed, 'report: a file without a signature is not marked as signed');
{
  const sdoc = await PDFDocument.create();
  sdoc.addPage();
  const sigV = sdoc.context.register(sdoc.context.obj({ Type: 'Sig', Filter: 'Adobe.PPKLite' }));
  const sig = sdoc.context.register(sdoc.context.obj({ FT: 'Sig', T: PDFHexString.fromText('Signature1'), V: sigV }));
  sdoc.catalog.set(PDFName.of('AcroForm'), sdoc.context.obj({ Fields: [sig] }));
  check((await analyzePdfMetadata(await sdoc.save())).signed, 'report: a filled signature field marks the file as signed (cleaning invalidates it)');
}

console.log('\n=== JPEG segments ===');
const s = stripJpegMetadata(withExif);
check(s.removed === 1 && Buffer.from(s.bytes).equals(Buffer.from(clean)), 'EXIF segment removed, the rest of the JPEG byte for byte the same');
check(stripJpegMetadata(clean).removed === 0, 'a JPEG without metadata is left as it is');

// ---------- 2. real files ----------
console.log('\n=== real PDFs: clean report, same pixels, same text ===');
const files = [...readdirSync('test-real-pdfs').filter((f) => f.endsWith('.pdf')).map((f) => `test-real-pdfs/${f}`), 'test-fixtures/xlsx_EPZ_SIERPIEN_2026.pdf'];
for (const f of files) {
  const src = new Uint8Array(readFileSync(f));
  const cleaned = await cleanPdfMetadata(src);
  const rep = await analyzePdfMetadata(cleaned);
  const a = await pages(src, true);
  const b = await pages(cleaned, true);
  const samePixels = a.length === b.length && a.every((p, i) => p.pixels!.equals(b[i]!.pixels!));
  const sameText = a.every((p, i) => p.text === b[i]!.text);
  check(reportIsClean(rep) && samePixels && sameText, `${f.split('/').pop()}: clean, ${a.length} pages identical (${(src.length / 1024).toFixed(0)} → ${(cleaned.length / 1024).toFixed(0)} KB)`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
