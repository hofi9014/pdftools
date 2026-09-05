// Component C3 — pdf-to-powerpoint orchestrator test.
// Runs pdfToIRDeck on the real A4-portrait fixture (27 pages), asserts deck
// geometry + warnings, then end-to-end: renderIRToPptx → write .pptx → non-empty
// file. Independent structural verification (slide count, dims, sample elements)
// is done afterwards with python-pptx.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
// Test-only: pdfjs browser build uses DOMMatrix (not available in Node); the
// legacy build is what the app ships for non-browser/worker contexts.
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

import { pdfToIRDeck } from '../lib/client-pdf.ts';
import { renderIRToPptx } from '../lib/client-pptx.ts';

function toFile(buf: Buffer, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
function check(name: string, ok: boolean, detail?: string): void {
  checks.push({ name, ok, detail });
}

async function main(): Promise<number> {
  const buf = readFileSync(join(ROOT, 'test-real-pdfs', 'allegro-raport.pdf'));
  const file = toFile(buf, 'allegro-raport.pdf');

  const { deck, warnings } = await pdfToIRDeck(file);

  console.log('=== C3: pdfToIRDeck on allegro-raport.pdf (A4 portrait, 27 pages) ===');
  check('expected 27 slides', deck.slides.length === 27, `${deck.slides.length}`);
  check('deck.widthPt ≈ 595.3', Math.abs(deck.widthPt - 595.3) < 1, `${deck.widthPt.toFixed(2)}`);
  check('deck.heightPt ≈ 841.9', Math.abs(deck.heightPt - 841.9) < 1, `${deck.heightPt.toFixed(2)}`);
  check('deck is portrait (height > width)', deck.heightPt > deck.widthPt, `${deck.widthPt.toFixed(1)}x${deck.heightPt.toFixed(1)}`);
  check('every slide matches deck dims', deck.slides.every(s => s.widthPt === deck.widthPt && s.heightPt === deck.heightPt));

  // Every slide must have at least a title/body — element count > 0.
  // EXCEPTION: page 1 is the image-only cover (the sole content is a full-page
  // image). Images are deferred in segmentSlideElements v1 and the invisible
  // placeholder rect is filtered, so page 1 is legitimately empty — this is the
  // documented "image-dominated pages appear nearly empty" limitation, not a
  // regression. All other pages must be non-empty.
  const emptySlides = deck.slides.map((s, i) => ({ i, n: s.elements.length })).filter(x => x.n === 0);
  const emptyExceptCover = emptySlides.filter(x => x.i !== 0);
  check('only page 1 (cover) is empty', emptyExceptCover.length === 0,
    emptyExceptCover.length ? `also empty: ${JSON.stringify(emptyExceptCover)}` : 'only cover (i=0) empty');
  check('cover page (i=0) is empty', deck.slides[0].elements.length === 0, `${deck.slides[0].elements.length} elements`);
  check('every page 2..27 non-empty', deck.slides.slice(1).every(s => s.elements.length > 0),
    `pages 2-27 element counts: ${deck.slides.slice(1).map(s => s.elements.length).join(',')}`);

  console.log('  warnings:');
  if (warnings.length === 0) console.log('    (none)');
  for (const w of warnings) {
    console.log(`    ${w.kind} page=${w.page} ${w.widthPt.toFixed(2)}x${w.heightPt.toFixed(2)}`);
  }
  // Expected: EXACTLY one warning — portrait-source (all pages share the same dims).
  const dimWarn = warnings.filter(w => w.kind === 'inconsistent-page-dimensions');
  const portWarn = warnings.filter(w => w.kind === 'portrait-source');
  check('exactly 1 portrait-source warning', portWarn.length === 1, `${portWarn.length}`);
  check('zero inconsistent-page-dimensions warnings', dimWarn.length === 0, `${dimWarn.length}`);
  check('total warnings == 1', warnings.length === 1, `${warnings.length}`);

  // End-to-end: renderIRToPptx → write file.
  const blob = await renderIRToPptx(deck);
  const pptxBytes = Buffer.from(await blob.arrayBuffer());
  check('pptx blob non-empty', pptxBytes.length > 0, `${pptxBytes.length} bytes`);

  const out = join(ROOT, 'test-output', 'allegro-C3.pptx');
  await writeFile(out, pptxBytes);
  check('wrote pptx to test-output/allegro-C3.pptx', true, out);

  const stat = (await import('node:fs')).statSync(out);
  check('written file > 0 bytes on disk', stat.size > 0, `${stat.size} bytes`);

  let allOk = true;
  for (const ck of checks) {
    if (!ck.ok) allOk = false;
    console.log(`  [${ck.ok ? 'PASS' : 'FAIL'}] ${ck.name}${ck.detail ? ` — ${ck.detail}` : ''}`);
  }
  console.log(`\n${allOk ? 'ALL PASS' : 'FAILURES PRESENT'}  (${checks.filter((c) => c.ok).length}/${checks.length} passed)`);
  return allOk ? 0 : 1;
}

process.exitCode = await main();
