// FINDING (engine, pdf-to-powerpoint text formatting, 2026-09-18) — two real bugs found while
// scanning lib/client-pptx.ts and the pptx-specific parts of lib/client-pdf.ts for further
// engine issues, both confirmed on real fixtures:
//
// 1. segmentSlideElements's textbox mapping hardcoded `bold: false, italic: false` for every
//    textbox regardless of the underlying IRTextRuns' actual formatting (already correctly
//    populated by parseFontStyle since the font-name-alias fix earlier in this series) — the
//    data existed, it was just never read. groupRunsIntoTextboxes's line/paragraph summarizer
//    already derives a single dominant `color` per textbox from the first run (the pptx IR is
//    one bold/italic/color value per textbox, not per-run, unlike docx/odt's full per-run
//    formatting — see the file's own top comment); bold/italic are now derived the same way
//    and threaded through. Verified on allegro-raport.pdf: 9 real bold textboxes (headings,
//    emphasized warnings, a percentage callout) now correctly flow through to the written
//    pptx XML as `b="1"` runs — previously always plain.
//
// 2. renderIRToPptx's table-cell text builder joined a cell's inline runs with '\n', forcing a
//    hard line break at every run boundary — but cell.runs are inline spans of ONE flowing
//    line (the docx table writer treats the exact same array as a single Paragraph, no
//    separator between runs). Verified on epz_pptx_table_fixture.pdf: 232 real table cells
//    have multiple runs, e.g. one cell splits into 70+ single-word/space runs
//    (["Imię"," ","i"," ","nazwisko",...]) that would have rendered as 70+ separate lines in
//    the PPTX table instead of one paragraph. Fixed by joining with '' instead (the runs
//    already carry their own space characters as separate entries).

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

const canvasMod = await import('@napi-rs/canvas');
if (!(globalThis as Record<string, unknown>).DOMMatrix) {
  (globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
}
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

const { pdfToIRDeck } = await import('../lib/client-pdf');
const { renderIRToPptx } = await import('../lib/client-pptx');

function toFile(buf: Buffer, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== pdf-to-powerpoint: bold/italic and table-cell runs preserved, not flattened ===');

{
  const buf = readFileSync(join(ROOT, 'test-real-pdfs/allegro-raport.pdf'));
  const { deck } = await pdfToIRDeck(toFile(buf, 'allegro-raport.pdf'));

  let boldTextboxes = 0;
  for (const slide of deck.slides) {
    for (const el of slide.elements) {
      if (el.kind === 'textbox' && el.content.bold) boldTextboxes++;
    }
  }
  check(boldTextboxes >= 5, `at least 5 bold textboxes detected in IR (got ${boldTextboxes})`);

  const pptxBlob = await renderIRToPptx(deck);
  const arrBuf = await (pptxBlob as Blob).arrayBuffer();
  const zip = await JSZip.loadAsync(Buffer.from(arrBuf));
  let boldRuns = 0;
  for (const name of Object.keys(zip.files)) {
    if (!/ppt\/slides\/slide\d+\.xml$/.test(name)) continue;
    const xml = await zip.file(name)!.async('string');
    boldRuns += (xml.match(/b="1"/g) || []).length;
  }
  check(boldRuns >= 5, `written pptx XML contains at least 5 b="1" bold runs (got ${boldRuns})`);
}

{
  const buf = readFileSync(join(ROOT, 'test-real-pdfs/epz_pptx_table_fixture.pdf'));
  const { deck } = await pdfToIRDeck(toFile(buf, 'epz_pptx_table_fixture.pdf'));

  let multiRunCells = 0;
  for (const slide of deck.slides) {
    for (const el of slide.elements) {
      if (el.kind !== 'table') continue;
      for (const row of el.cells) {
        for (const cell of row) {
          if (cell.runs.length > 1) multiRunCells++;
        }
      }
    }
  }
  check(multiRunCells >= 50, `at least 50 real multi-run table cells found (got ${multiRunCells})`);

  const pptxBlob = await renderIRToPptx(deck);
  const arrBuf = await (pptxBlob as Blob).arrayBuffer();
  const zip = await JSZip.loadAsync(Buffer.from(arrBuf));
  let maxParagraphsInOneCell = 0;
  for (const name of Object.keys(zip.files)) {
    if (!/ppt\/slides\/slide\d+\.xml$/.test(name)) continue;
    const xml = await zip.file(name)!.async('string');
    // Each pptxgenjs table cell is a <a:tc>...</a:tc>. A '\n'-joined cell text makes
    // pptxgenjs emit ONE SEPARATE <a:p> paragraph per joined segment — the old bug split a
    // single flowing line into one paragraph PER RUN (a 70-run cell became 70 stacked
    // paragraphs), which is worse than a mere line break within one paragraph.
    const cellMatches = xml.match(/<a:tc>[\s\S]*?<\/a:tc>/g) || [];
    for (const cellXml of cellMatches) {
      const paragraphs = (cellXml.match(/<a:p>/g) || []).length;
      if (paragraphs > maxParagraphsInOneCell) maxParagraphsInOneCell = paragraphs;
    }
  }
  check(maxParagraphsInOneCell === 1, `every table cell renders as exactly one paragraph, not one per run (max found: ${maxParagraphsInOneCell})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
