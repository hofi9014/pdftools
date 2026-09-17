// Audit finding (Medium, tooling area) — mergePDFs, splitPDF, rotatePDF, deletePages,
// extractPages, reorderPages, cropPages, flattenPDF, addWatermark, addPageNumbers and friends
// (lib/client-pdf.ts) — probably the most-used tools in the whole service — had zero tests.
// This adds smoke/round-trip coverage for the core page-manipulation tools: real pdf-lib
// documents in, real functions called exactly as exported, structural assertions out (page
// counts, dimensions, rotation, validity) — not full pixel rendering, which is out of scope for
// a smoke test and would need a canvas/OCR harness.
//
// Each source page is given a DISTINCT size (100+i*10 x 150+i*10) so that after an operation
// (delete/extract/reorder/crop) the surviving pages can be matched back to their original index
// purely from their dimensions — a cheap, reliable "which page is this" signal without needing
// to read page content.

import { PDFDocument, PDFName, PDFDict } from 'pdf-lib';
import {
  mergePDFs, splitPDF, splitByRanges, rotatePDF, addPageNumbers, addWatermark,
  deletePages, extractPages, reorderPages, cropPages, addBlankPage, flattenPDF,
} from '../lib/client-pdf';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

// addWatermark embeds LiberationSans via `fetch('/pdfjs-dist/standard_fonts/...')`, a
// browser-relative URL with no meaning in Node. Serve the real, already-built font file from
// disk instead of mocking away the behavior being tested.
const here = dirname(fileURLToPath(import.meta.url));
const fontPath = join(here, '..', 'public', 'pdfjs-dist', 'standard_fonts', 'LiberationSans-Regular.ttf');
const fontBytes = readFileSync(fontPath);
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.includes('/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf')) {
    return new Response(new Uint8Array(fontBytes), { status: 200 });
  }
  return realFetch(input, init);
}) as typeof fetch;

async function makePdf(sizes: number[]): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < sizes.length; i++) {
    doc.addPage([100 + sizes[i] * 10, 150 + sizes[i] * 10]);
  }
  const bytes = await doc.save();
  return new File([bytes as BlobPart], `test-${sizes.length}p.pdf`, { type: 'application/pdf' });
}

async function pageSizes(bytes: Uint8Array): Promise<[number, number][]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map(p => { const s = p.getSize(); return [Math.round(s.width), Math.round(s.height)]; });
}

console.log('=== basic PDF tools: smoke / round-trip coverage ===');

console.log('--- mergePDFs ---');
{
  const a = await makePdf([0, 1]);
  const b = await makePdf([2, 3, 4]);
  const merged = await mergePDFs([a, b]);
  const sizes = await pageSizes(merged);
  check(sizes.length === 5, `merged 2-page + 3-page PDFs into 5 pages — got ${sizes.length}`);
  check(JSON.stringify(sizes) === JSON.stringify([[100, 150], [110, 160], [120, 170], [130, 180], [140, 190]]), `page order and sizes preserved across the merge — got ${JSON.stringify(sizes)}`);
}

console.log('\n--- splitPDF ---');
{
  const file = await makePdf([0, 1, 2]);
  const parts = await splitPDF(file);
  check(parts.length === 3, `split a 3-page PDF into 3 single-page PDFs — got ${parts.length}`);
  for (let i = 0; i < parts.length; i++) {
    const sizes = await pageSizes(parts[i]);
    check(sizes.length === 1 && sizes[0][0] === 100 + i * 10, `part ${i} contains exactly the correct original page — got ${JSON.stringify(sizes)}`);
  }
}

console.log('\n--- splitByRanges ---');
{
  const file = await makePdf([0, 1, 2, 3, 4]);
  const results = await splitByRanges(file, '1-2,3,4-5');
  check(results.length === 3, `range string "1-2,3,4-5" produces 3 output files — got ${results.length}`);
  const counts = await Promise.all(results.map(r => pageSizes(r.data).then(s => s.length)));
  check(JSON.stringify(counts) === JSON.stringify([2, 1, 2]), `each range has the correct page count — got ${JSON.stringify(counts)}`);
}

console.log('\n--- rotatePDF ---');
{
  const file = await makePdf([0, 1]);
  const rotated = await rotatePDF(file, 90);
  const doc = await PDFDocument.load(rotated);
  const angles = doc.getPages().map(p => p.getRotation().angle);
  check(angles.every(a => a === 90), `every page rotated by 90 degrees — got ${JSON.stringify(angles)}`);

  const rotatedAgain = await rotatePDF(new File([rotated as BlobPart], 'r.pdf', { type: 'application/pdf' }), 270);
  const doc2 = await PDFDocument.load(rotatedAgain);
  const angles2 = doc2.getPages().map(p => p.getRotation().angle);
  check(angles2.every(a => a === 0), `90 + 270 wraps back to 0 degrees (mod 360) — got ${JSON.stringify(angles2)}`);
}

console.log('\n--- deletePages ---');
{
  const file = await makePdf([0, 1, 2, 3]);
  const result = await deletePages(file, [1]);
  const sizes = await pageSizes(result);
  check(JSON.stringify(sizes) === JSON.stringify([[100, 150], [120, 170], [130, 180]]), `deleting index 1 leaves pages 0,2,3 in order — got ${JSON.stringify(sizes)}`);
}

console.log('\n--- extractPages ---');
{
  const file = await makePdf([0, 1, 2, 3]);
  const result = await extractPages(file, [3, 1]);
  const sizes = await pageSizes(result);
  check(JSON.stringify(sizes) === JSON.stringify([[130, 180], [110, 160]]), `extracting [3,1] preserves the REQUESTED order, not original order — got ${JSON.stringify(sizes)}`);
}

console.log('\n--- reorderPages ---');
{
  const file = await makePdf([0, 1, 2]);
  const result = await reorderPages(file, [2, 0, 1]);
  const sizes = await pageSizes(result);
  check(JSON.stringify(sizes) === JSON.stringify([[120, 170], [100, 150], [110, 160]]), `pages reordered to [2,0,1] — got ${JSON.stringify(sizes)}`);
}

console.log('\n--- cropPages ---');
{
  const file = await makePdf([0]); // 100x150
  const result = await cropPages(file, { top: 10, right: 5, bottom: 10, left: 5 });
  const sizes = await pageSizes(result);
  check(JSON.stringify(sizes[0]) === JSON.stringify([90, 130]), `cropping 5/10/5/10 margins off a 100x150 page gives 90x130 — got ${JSON.stringify(sizes[0])}`);
}

console.log('\n--- addBlankPage ---');
{
  const file = await makePdf([0, 1]);
  const result = await addBlankPage(file, 1);
  const doc = await PDFDocument.load(result);
  check(doc.getPageCount() === 3, `page count increased by 1 — got ${doc.getPageCount()}`);
  const sizes = await pageSizes(result);
  check(sizes[0][0] === 100 && sizes[2][0] === 110, `original pages 0 and 1 stay at their sizes around the inserted blank page — got ${JSON.stringify(sizes)}`);
}

console.log('\n--- addPageNumbers ---');
{
  const file = await makePdf([0, 0]);
  const before = new Uint8Array(await file.arrayBuffer());
  const result = await addPageNumbers(file, { startNumber: 1 });
  const doc = await PDFDocument.load(result);
  check(doc.getPageCount() === 2, 'page count unchanged after adding page numbers');
  check(result.length !== before.length, 'output bytes differ from input (text was actually drawn, not a pass-through)');
}

console.log('\n--- addWatermark ---');
{
  const file = await makePdf([0, 0]);
  const before = new Uint8Array(await file.arrayBuffer());
  const result = await addWatermark(file, 'CONFIDENTIAL');
  const doc = await PDFDocument.load(result);
  check(doc.getPageCount() === 2, 'page count unchanged after watermarking');
  check(result.length !== before.length, 'output bytes differ from input (watermark text was actually drawn)');
}

console.log('\n--- flattenPDF (plain PDF, no AcroForm) ---');
{
  const file = await makePdf([0, 1]);
  const result = await flattenPDF(file);
  const doc = await PDFDocument.load(result);
  check(doc.getPageCount() === 2, `flattening a form-less PDF leaves the page count unchanged — got ${doc.getPageCount()}`);
}

// --- WCAG/PDF-UA follow-up ---------------------------------------------------------------
// A /StructTreeRoot describes reading order/headings/alt-text for screen readers and PDF/UA
// validators, via structure elements that reference specific page objects (/Pg). Functions
// that build a brand-new PDFDocument via copyPages() (mergePDFs, splitPDF, extractPages,
// reorderPages) never copy the source's StructTreeRoot at all — pdf-lib's copyPages() only
// carries over page content, not structure — so the output correctly has none (safe by
// omission: no false "this is tagged" claim). Functions that mutate the SAME loaded document
// in place (rotatePDF, addWatermark, addPageNumbers, cropPages) leave an existing structure
// tree's page references valid, since no pages are added/removed. deletePages() is the one
// exception: pdf.removePage() detaches a page while leaving any StructTreeRoot pointing at
// it completely untouched, so without the fix in lib/client-pdf.ts the output would keep
// claiming MarkInfo/Marked=true while its structure tree dangles references to a page that no
// longer exists — this section pins both halves of that behavior as a permanent regression
// guard, since correctly rewriting the tree to prune the dangling entries is out of scope
// (real structure-tree surgery, not this fix's job) and silently doing nothing would put back
// the exact "claims tagged, isn't" bug fixed in convertToPdfA (see tests/convert-to-pdfa.mts).
console.log('\n--- StructTreeRoot / MarkInfo: preserved when safe, dropped when no longer valid ---');

async function makeTaggedPdf(pageCount: number): Promise<File> {
  const doc = await PDFDocument.create();
  const structElems = [];
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([100, 150]);
    const structElem = doc.context.obj({ Type: 'StructElem', S: 'P', Pg: page.ref });
    structElems.push(doc.context.register(structElem));
  }
  const structTreeRootRef = doc.context.register(doc.context.obj({ Type: 'StructTreeRoot', K: structElems }));
  doc.catalog.set(PDFName.of('StructTreeRoot'), structTreeRootRef);
  doc.catalog.set(PDFName.of('MarkInfo'), doc.context.obj({ Marked: true }));
  const bytes = await doc.save();
  return new File([bytes as BlobPart], `tagged-${pageCount}p.pdf`, { type: 'application/pdf' });
}

async function structInfo(bytes: Uint8Array): Promise<{ structTreeRoot: boolean; markInfo: boolean }> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return {
    structTreeRoot: !!doc.catalog.lookupMaybe(PDFName.of('StructTreeRoot'), PDFDict),
    markInfo: !!doc.catalog.lookupMaybe(PDFName.of('MarkInfo'), PDFDict),
  };
}

{
  const tagged = await makeTaggedPdf(3);
  const before = await structInfo(new Uint8Array(await tagged.arrayBuffer()));
  check(before.structTreeRoot && before.markInfo, 'sanity: the synthetic tagged fixture really has /StructTreeRoot + /MarkInfo');
}

{
  const merged = await mergePDFs([await makeTaggedPdf(2), await makeTaggedPdf(2)]);
  const info = await structInfo(merged);
  check(!info.structTreeRoot && !info.markInfo, `mergePDFs on tagged inputs: no false claim carried into the new document (got: ${JSON.stringify(info)})`);
}
{
  const parts = await splitPDF(await makeTaggedPdf(2));
  const info = await structInfo(parts[0]!);
  check(!info.structTreeRoot && !info.markInfo, `splitPDF on a tagged input: no false claim in the split-out document (got: ${JSON.stringify(info)})`);
}
{
  const extracted = await extractPages(await makeTaggedPdf(3), [0, 2]);
  const info = await structInfo(extracted);
  check(!info.structTreeRoot && !info.markInfo, `extractPages on a tagged input: no false claim in the new document (got: ${JSON.stringify(info)})`);
}
{
  const reordered = await reorderPages(await makeTaggedPdf(3), [2, 0, 1]);
  const info = await structInfo(reordered);
  check(!info.structTreeRoot && !info.markInfo, `reorderPages on a tagged input: no false claim in the new document (got: ${JSON.stringify(info)})`);
}
{
  const rotated = await rotatePDF(await makeTaggedPdf(2), 90);
  const info = await structInfo(rotated);
  check(info.structTreeRoot && info.markInfo, `rotatePDF (page count unchanged): existing structure correctly preserved (got: ${JSON.stringify(info)})`);
}
{
  const cropped = await cropPages(await makeTaggedPdf(2), { top: 5, right: 5, bottom: 5, left: 5 });
  const info = await structInfo(cropped);
  check(info.structTreeRoot && info.markInfo, `cropPages (page count unchanged): existing structure correctly preserved (got: ${JSON.stringify(info)})`);
}
{
  const deleted = await deletePages(await makeTaggedPdf(3), [1]);
  const info = await structInfo(deleted);
  check(!info.structTreeRoot && !info.markInfo, `deletePages on a tagged input: dangling structure claim dropped, not carried forward (got: ${JSON.stringify(info)})`);
}
{
  // Negative control on deletePages' own guard: when no page index actually matches (all out
  // of range), nothing is removed, so an existing structure tree is still fully valid and must
  // be left alone — proves the strip is conditioned on an actual removal, not unconditional.
  const untouched = await deletePages(await makeTaggedPdf(2), [99]);
  const info = await structInfo(untouched);
  check(info.structTreeRoot && info.markInfo, `deletePages with an out-of-range index (nothing actually removed): structure left untouched (got: ${JSON.stringify(info)})`);
}

globalThis.fetch = realFetch;

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
