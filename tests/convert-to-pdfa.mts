// Audit finding E1 — convertToPdfA mutated `(pdfDoc as any).context.trailerInfo.Root` with
// raw JS property assignment/delete (`catalog.JS = ...`, `delete catalog.AA`,
// `catalog2.Metadata = ref`, `catalog3.OutputIntents = [...]`). That value is a PDFRef, not
// a PDFDict — and even a real PDFDict's internal Map is only mutable via
// .set()/.get()/.delete(PDFName), never raw property access. Every one of these writes was
// therefore a silent no-op: JS actions were never actually removed, and MarkInfo/Metadata/
// OutputIntents were never actually attached to the saved PDF, despite the function
// returning normally with no error. The XMP-embedding step (`context.obj(uint8Array)`) had
// the same class of bug — obj() has no Uint8Array overload; the correct primitive is
// context.stream().
//
// Follow-up finding (WCAG 2.2 / PDF-UA audit) — the fix above made convertToPdfA
// unconditionally set MarkInfo/Marked=true on every conversion. MarkInfo/Marked is a formal
// declaration that the document is a Tagged PDF (has a real /StructTreeRoot describing
// reading order, headings, alt-text — the thing screen readers and PDF/UA validators rely
// on). convertToPdfA builds no structure tree of its own, so claiming Marked:true
// unconditionally was a false claim on every untagged input (the overwhelming majority of
// real-world PDFs) — worse than not claiming it, since it tells assistive tech to expect
// structure that isn't there. Fixed: MarkInfo is only set (Marked:true) when the source PDF
// already had a real /StructTreeRoot of its own (which pdf-lib's load/save preserves
// untouched, since nothing in this function reads or writes it) — otherwise MarkInfo is
// deleted/omitted, matching the PDF spec's convention that its absence means "not tagged".
//
// This test builds a synthetic PDF that already has real /JS and /AA catalog entries (the
// exact kind of PDF/A-invalidating content this function exists to strip), runs it through
// convertToPdfA(), then reloads the OUTPUT with a fresh pdf-lib load and inspects
// pdfDoc.catalog directly — proving the mutations actually land in the saved bytes, not just
// that the function didn't throw.

import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream } from 'pdf-lib';
import { convertToPdfA } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(buf: Uint8Array, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

console.log('=== E1: convertToPdfA actually mutates the saved catalog, not a detached PDFRef ===');

const srcDoc = await PDFDocument.create();
const page = srcDoc.addPage([200, 200]);
page.drawText('hello', { x: 20, y: 100 });

// Inject real /JS and /AA catalog entries — the kind of live content a PDF/A converter must
// strip. A JavaScript action dict per the PDF spec (Type /Action, S /JavaScript, JS <code>).
const jsAction = srcDoc.context.obj({ Type: 'Action', S: 'JavaScript', JS: 'app.alert("hi");' });
const jsActionRef = srcDoc.context.register(jsAction);
srcDoc.catalog.set(PDFName.of('JS'), jsActionRef);
const aaDict = srcDoc.context.obj({ WC: jsActionRef });
srcDoc.catalog.set(PDFName.of('AA'), srcDoc.context.register(aaDict));

const srcBytes = await srcDoc.save();
check(!!(await PDFDocument.load(srcBytes)).catalog.get(PDFName.of('JS')), 'sanity: the synthetic input PDF really has a /JS catalog entry before conversion');

const outBytes = await convertToPdfA(toFile(srcBytes, 'synthetic.pdf'));
check(outBytes.length > 0, `convertToPdfA produced output (${outBytes.length} bytes)`);

const outDoc = await PDFDocument.load(outBytes, { ignoreEncryption: true });
const catalog = outDoc.catalog;

check(catalog.get(PDFName.of('JS')) === undefined, '/JS actually removed from the saved catalog');
check(catalog.get(PDFName.of('AA')) === undefined, '/AA actually removed from the saved catalog');

// This synthetic input has no /StructTreeRoot (just a page with drawText) — it is not a
// Tagged PDF, so convertToPdfA must NOT claim MarkInfo/Marked=true on the output.
const markInfo = catalog.lookupMaybe(PDFName.of('MarkInfo'), PDFDict);
check(!markInfo, `/MarkInfo absent on an untagged input — no false "tagged" claim (got: ${markInfo ? 'present' : 'absent'})`);

const metadataStream = catalog.lookupMaybe(PDFName.of('Metadata'), PDFRawStream);
check(!!metadataStream, '/Metadata actually present and resolves to a real stream object (not a dangling/absent ref)');
if (metadataStream) {
  const xmpText = Buffer.from(metadataStream.contents).toString('utf-8');
  check(xmpText.includes('pdfaid:part>1<'), 'embedded XMP stream contains pdfaid:part = 1');
  check(xmpText.includes('pdfaid:conformance>B<'), 'embedded XMP stream contains pdfaid:conformance = B');
  check(xmpText.includes('OptimaPDF'), 'embedded XMP stream contains the producer name');
}

const outputIntents = catalog.lookupMaybe(PDFName.of('OutputIntents'), PDFArray);
check(!!outputIntents && outputIntents.size() === 1, `/OutputIntents actually present with exactly 1 entry (got: ${outputIntents?.size() ?? 'missing'})`);
if (outputIntents && outputIntents.size() === 1) {
  const intentDict = outDoc.context.lookup(outputIntents.get(0), PDFDict);
  check(intentDict.get(PDFName.of('S'))?.toString() === '/GTS_PDFA1', 'OutputIntent dict has S = GTS_PDFA1');
  const destProfile = intentDict.lookupMaybe(PDFName.of('DestOutputProfile'), PDFRawStream);
  check(!!destProfile, 'OutputIntent DestOutputProfile resolves to a real ICC stream, not a dangling ref');
}

// Regression guard: the flatten/title/author/creator side of the function (never buggy, uses
// pdf-lib's public Info-dict API rather than the raw trailerInfo hack) still works after this
// rewrite. Not Producer: pdf-lib's own save() unconditionally stamps Producer on ANY pdf-lib-
// authored PDF (updateInfoDict()), so the synthetic input already carries one before
// convertToPdfA even runs — that's expected pdf-lib behavior, not something this fix touches.
check(outDoc.getAuthor() === 'OptimaPDF', `getAuthor() still set correctly (got: ${outDoc.getAuthor()})`);
check(outDoc.getCreator() === 'OptimaPDF PDF/A Converter', `getCreator() still set correctly (got: ${outDoc.getCreator()})`);

console.log('\n=== E2: convertToPdfA preserves a genuine MarkInfo/Marked=true claim on an already-tagged input ===');

const taggedSrcDoc = await PDFDocument.create();
taggedSrcDoc.addPage([200, 200]).drawText('hello', { x: 20, y: 100 });
// Minimal but real /StructTreeRoot — a single StructElem child, per the PDF spec's structure-
// tree shape (Type /StructTreeRoot, K = kids). Not a full PDF/UA-conformant tree (no
// ParentTree, no role map) — this test only proves convertToPdfA correctly detects and
// preserves *some* genuine existing structure, not that it builds or validates one itself.
const structElem = taggedSrcDoc.context.obj({ Type: 'StructElem', S: 'P' });
const structElemRef = taggedSrcDoc.context.register(structElem);
const structTreeRoot = taggedSrcDoc.context.obj({ Type: 'StructTreeRoot', K: [structElemRef] });
const structTreeRootRef = taggedSrcDoc.context.register(structTreeRoot);
taggedSrcDoc.catalog.set(PDFName.of('StructTreeRoot'), structTreeRootRef);

const taggedSrcBytes = await taggedSrcDoc.save();
const taggedOutBytes = await convertToPdfA(toFile(taggedSrcBytes, 'tagged.pdf'));
const taggedOutDoc = await PDFDocument.load(taggedOutBytes, { ignoreEncryption: true });
const taggedCatalog = taggedOutDoc.catalog;

const taggedMarkInfo = taggedCatalog.lookupMaybe(PDFName.of('MarkInfo'), PDFDict);
check(!!taggedMarkInfo, '/MarkInfo present on an already-tagged input');
if (taggedMarkInfo) {
  const marked = taggedMarkInfo.get(PDFName.of('Marked'));
  check(marked?.toString() === 'true', `/MarkInfo/Marked is true for a genuinely tagged input (got: ${marked?.toString()})`);
}
const outStructTreeRoot = taggedCatalog.lookupMaybe(PDFName.of('StructTreeRoot'), PDFDict);
check(!!outStructTreeRoot, '/StructTreeRoot itself survives the round-trip untouched');
if (outStructTreeRoot) {
  const kids = outStructTreeRoot.lookupMaybe(PDFName.of('K'), PDFArray);
  check(!!kids && kids.size() === 1, `/StructTreeRoot/K still has its 1 StructElem child (got: ${kids?.size() ?? 'missing'})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
