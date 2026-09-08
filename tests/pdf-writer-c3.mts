// Component C3 — writer image integration test.
// 1. Evidence: allegro-raport.pdf → docx + odt with real images embedded (4 images,
//    sizes from bounds, not naturalWidth). Independent verification: JSZip inspection
//    of both output formats.
// 2. Byte-gate: word/document.xml SHA-256 before/after C3 for Plik_D/test_d/test_e.
//    These PDFs have 0 images → IR has no image blocks → output must be byte-identical.
// Repo-relative paths, no `any`.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

import { buildPdfImageMap } from '../lib/pdf/extractPdfImages';
import { extractFormattedTextFromPDF } from '../lib/client-pdf';
import { renderIRToDocx, renderIRToOdt, writerImageToDocxImage, type DocxImage } from '../lib/client-pdf-docx';
import JSZip from 'jszip';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else { console.log(`  FAIL ${msg}`); fails++; }
}

function toFile(buf: Buffer, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

const OUT = resolve('test-output/pdf-writer-c3');
mkdirSync(OUT, { recursive: true });

// ============================================================
// EVIDENCE: allegro-raport.pdf → docx + odt with 4 real images
// ============================================================
console.log('\n=== C3 evidence: allegro-raport.pdf (4 images) → docx + odt ===');
const allegro = toFile(readFileSync(resolve('test-real-pdfs/allegro-raport.pdf')), 'allegro-raport.pdf');

const pages = await extractFormattedTextFromPDF(allegro);
const imageMap = await buildPdfImageMap(allegro, []);
console.log(`  IR pages: ${pages.length}, imageMap entries: ${imageMap.images.size}`);

const totalImageBlocks = pages.reduce((n, p) => n + p.blocks.filter(b => b.kind === 'image').length, 0);
console.log(`  IR image blocks across all pages: ${totalImageBlocks}`);
check(imageMap.images.size === 4, `imageMap has 4 entries (${imageMap.images.size})`);
check(totalImageBlocks >= 4, `at least 4 IR image blocks (${totalImageBlocks})`);

// --- DOCX ---
console.log('\n--- docx generation ---');
const docxBlob = await renderIRToDocx(pages, imageMap.images);
const docxBuf = Buffer.from(await docxBlob.arrayBuffer());
writeFileSync(join(OUT, 'allegro-c3.docx'), docxBuf);
console.log(`  docx size: ${docxBuf.length} bytes`);
check(docxBuf.length > 1000, `docx is non-trivial (${docxBuf.length} > 1000)`);

const docxZip = await JSZip.loadAsync(docxBuf);
const docxMediaEntries = docxZip.file(/^word\/media\/.+\.(jpg|png)$/i);
console.log(`  word/media/ entries: ${docxMediaEntries.length}`);
check(docxMediaEntries.length === 4, `docx contains 4 embedded images (${docxMediaEntries.length})`);

// Verify each image is valid JPEG or PNG.
let docxJpegCount = 0;
let docxPngCount = 0;
for (const entry of docxMediaEntries) {
  const bytes = await entry.async('uint8array');
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) docxJpegCount++;
  else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) docxPngCount++;
}
console.log(`  docx images: ${docxJpegCount} JPEG, ${docxPngCount} PNG`);
check(docxJpegCount === 3, `3 JPEG images in docx (${docxJpegCount})`);
check(docxPngCount === 1, `1 PNG image in docx (${docxPngCount})`);

// Verify document.xml contains DrawingML image references, NOT [Image: ...] placeholders.
const docXml = await docxZip.file('word/document.xml')!.async('string');
const hasDrawingML = docXml.includes('w:drawing');
const hasPlaceholder = docXml.includes('[Image:');
console.log(`  document.xml: drawing elements present=${hasDrawingML}, placeholders present=${hasPlaceholder}`);
check(hasDrawingML, 'document.xml contains DrawingML drawings (real images)');
check(!hasPlaceholder, 'document.xml does NOT contain [Image: ...] placeholders');

// --- ODT ---
console.log('\n--- odt generation ---');
const odtImages = new Map<string, DocxImage>();
for (const [id, img] of imageMap.images) odtImages.set(id, writerImageToDocxImage(img));
const odtBlob = await renderIRToOdt(pages, odtImages);
const odtBuf = Buffer.from(await odtBlob.arrayBuffer());
writeFileSync(join(OUT, 'allegro-c3.odt'), odtBuf);
console.log(`  odt size: ${odtBuf.length} bytes`);
check(odtBuf.length > 1000, `odt is non-trivial (${odtBuf.length} > 1000)`);

const odtZip = await JSZip.loadAsync(odtBuf);
const odtPictures = odtZip.file(/^Pictures\//);
console.log(`  Pictures/ entries: ${odtPictures.length}`);
check(odtPictures.length === 4, `odt contains 4 Pictures/ entries (${odtPictures.length})`);

// Verify each picture in odt is valid JPEG or PNG.
let odtJpegCount = 0;
let odtPngCount = 0;
for (const entry of odtPictures) {
  const bytes = await entry.async('uint8array');
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) odtJpegCount++;
  else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) odtPngCount++;
}
console.log(`  odt pictures: ${odtJpegCount} JPEG, ${odtPngCount} PNG`);
check(odtJpegCount === 3, `3 JPEG pictures in odt (${odtJpegCount})`);
check(odtPngCount === 1, `1 PNG picture in odt (${odtPngCount})`);

// Verify manifest.xml references the Pictures.
const manifestXml = await odtZip.file('META-INF/manifest.xml')!.async('string');
const manifestPictureRefs = (manifestXml.match(/Pictures\//g) || []).length;
console.log(`  manifest.xml Pictures/ references: ${manifestPictureRefs}`);
check(manifestPictureRefs === 4, `manifest.xml references all 4 Pictures/ (${manifestPictureRefs})`);

// Verify content.xml has draw:frame elements with bounds-based dimensions.
const contentXml = await odtZip.file('content.xml')!.async('string');
const drawFrameMatches = contentXml.match(/svg:width="\d+(\.\d+)?pt"/g) || [];
console.log(`  content.xml draw:frame svg:width entries: ${drawFrameMatches.length}`);
check(drawFrameMatches.length === 4, `content.xml has 4 draw:frame images (${drawFrameMatches.length})`);
// Verify dimensions are from bounds (PT, reasonable for the page), NOT from naturalWidth (2480/2000 etc.)
const hasLargeNaturalWidth = contentXml.includes('svg:width="2480pt"') || contentXml.includes('svg:width="2000pt"');
check(!hasLargeNaturalWidth, 'svg:width uses bounds (PT), NOT naturalWidth (2480/2000)');

// ============================================================
// BYTE-GATE: Plik_D/test_d/test_e → docx → SHA-256 of word/document.xml
// These PDFs have 0 images → 0 IR image blocks → the image branch in
// renderIRToDocx is never entered → C3 must not change their output.
//
// METHODOLOGY (see AGENTS.md FINDING "docx-lib nondeterminism", 2026-09-08):
// the docx library keeps a module-global font/relationship counter **not
// reset between Packer.toBuffer()** — two renders in ONE process yield
// different document.xml even for identical input, and even fresh processes
// drift between time windows. Therefore a hard-coded hash cannot be a
// long-term anchor. The gate below measures PRZED/PO **paired in the same
// time window**: each run spawns FRESH subprocesses (tests/byte-gate-worker.mts,
// one render per process) and asserts before==after for every fixture. This is
// the honest, self-contained regression proof for the writer change.
// ============================================================
console.log('\n=== byte-gate: Plik_D/test_d/test_e → word/document.xml (paired fresh-process PRZED vs PO) ===');

function runByteGate(mode: 'przed' | 'po', fixture: string): Promise<string> {
  return new Promise((resolveGate, rejectGate) => {
    const worker = join(ROOT, 'tests/byte-gate-worker.mts');
    // Spawn a shell command string (no individual args → no DEP0190). The ROOT
    // path and fixture names contain no spaces, so no quoting is needed and the
    // /d /s /c CMD fallback cannot mangle them.
    const cmd = `npx --yes tsx ${worker} ${mode} ${fixture}`;
    const child = spawn(
      process.platform === 'win32' ? 'cmd.exe' : 'sh',
      process.platform === 'win32' ? ['/d', '/c', cmd] : ['-c', cmd],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    let err = '';
    child.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { err += d.toString(); });
    child.on('close', (code) => {
      if (code !== 0) return rejectGate(new Error(`byte-gate worker failed (${code}) for ${fixture} [${mode}]: ${err}`));
      const line = out.trim().split('\n').pop();
      if (!line) return rejectGate(new Error(`byte-gate worker produced no output for ${fixture} [${mode}]`));
      const [, , sha] = line.split('\t');
      if (!sha) return rejectGate(new Error(`byte-gate worker malformed output '${line}'`));
      resolveGate(sha.trim());
    });
  });
}

const byteGateFixtures = ['Plik_D.pdf', 'test_d.pdf', 'test_e.pdf'];
let byteGateOk = true;
for (const fname of byteGateFixtures) {
  // In-process structural proof: every fixture must have ZERO image blocks and
  // an empty image map → the C3 image branch is provably never entered.
  const file = toFile(readFileSync(resolve(`test-real-pdfs/${fname}`)), fname);
  const pagesAfter = await extractFormattedTextFromPDF(file);
  const imageMapAfter = await buildPdfImageMap(file, []);
  const imgBlockCount = pagesAfter.reduce((n, p) => n + p.blocks.filter(b => b.kind === 'image').length, 0);
  console.log(`\n  ${fname}: IR image blocks=${imgBlockCount}, imageMap size=${imageMapAfter.images.size}`);
  check(imageMapAfter.images.size === 0, `${fname}: buildPdfImageMap yields 0 entries (0 images)`);
  check(imgBlockCount === 0, `${fname}: 0 IR image blocks → image branch never entered`);
  if (imageMapAfter.images.size !== 0 || imgBlockCount !== 0) byteGateOk = false;

  // Paired fresh-process measurement, PRZED then PO immediately after — same
  // time window, one render per process (docx-lib counter is fresh each time).
  const przed = await runByteGate('przed', fname);
  const po = await runByteGate('po', fname);
  console.log(`  ${fname}: PRZED=${przed}`);
  console.log(`  ${fname}: PO    =${po}`);
  check(przed === po, `${fname}: word/document.xml PRZED==PO (bit-identical, fresh processes)`);
  if (przed !== po) byteGateOk = false;
}
check(byteGateOk, 'all byte-gate fixtures are image-less AND PRZED==PO bit-identical');
console.log('  NOTE: absolute hash values drift between time windows (docx-lib counter,');
console.log('  see AGENTS.md FINDING 2026-09-08) — only PRZED==PO within the same');
console.log('  window is a valid regression proof. No hard-coded hash is trusted here.');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
