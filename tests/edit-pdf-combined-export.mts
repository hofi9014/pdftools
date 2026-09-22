// Audit finding (High, UI/engine area) — components/edit-pdf/PdfEditor.tsx's handleExport used
// a plain `if (textEdits.length > 0) {...} else if (elements.length > 0) {...}` — so a user who
// both fixed a typo (a text edit) AND drew a shape/stamp/redaction rectangle/freehand mark (an
// element) in the same editing session — a completely natural combined workflow — silently lost
// every single drawn element with zero warning. The success toast still claimed the save worked
// ("PDF z edycjami tekstu pobrany!").
//
// Fixed by chaining the two underlying operations instead of choosing only one: apply text edits
// first (via exportEditedPdf) if any exist, producing an intermediate PDF Blob; then apply
// elements (via editPdfClient) on TOP of that intermediate result — wrapped as a File — instead
// of the original file, so both survive together in the final download.
//
// This test proves the underlying chaining works correctly at the lib level (the same two
// functions PdfEditor.tsx's handleExport calls, in the same order, wrapping the intermediate
// Blob as a File exactly as the fixed component now does): build a real PDF with known text,
// apply a text edit, THEN apply a drawn rectangle element to the result, and confirm the FINAL
// PDF contains BOTH the edited text and the rectangle — proving neither step discards the
// other's work.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as PdfJsModule;
pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

// applyTextEdits embeds a font via getFontBytes(), which fetch()es a browser-relative path.
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('/')) {
    const filePath = join(ROOT, 'public', url);
    if (existsSync(filePath)) {
      return new Response(new Uint8Array(readFileSync(filePath)), { status: 200 });
    }
  }
  return originalFetch(input, init);
}) as typeof fetch;

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { exportEditedPdf, type TextEdit } from '../lib/pdf/exportEditedPdf';
import { editPdfClient, type PdfEditElement } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(bytes: Uint8Array | Blob, name: string): File {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart]);
  return Object.assign(blob, { name }) as unknown as File;
}

async function inspectPdf(bytes: Uint8Array): Promise<{ text: string; hasRedRect: boolean }> {
  const doc = await pdfjsLib.getDocument({ data: bytes, useSystemFonts: false, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const text = content.items.map((it) => ('str' in it ? it.str : '')).join(' ');

  const opList = await page.getOperatorList();
  let hasRedRect = false;
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] === pdfjsLib.OPS.setFillRGBColor) {
      // pdf.js reports this operator's argument as a single CSS-style hex color string
      // (confirmed empirically: setFillRGBColor(["#ff0000"]) for pdf-lib's rgb(1,0,0)),
      // not three separate numeric components.
      const args = opList.argsArray[i] as string[];
      if (args && args[0] && args[0].toLowerCase() === '#ff0000') hasRedRect = true;
    }
  }
  return { text, hasRedRect };
}

console.log('=== edit-pdf: a text edit AND a drawn element both survive the combined export ===');
{
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([400, 400]);
  page.drawText('Original Text', { x: 50, y: 300, size: 20, font, color: rgb(0, 0, 0) });
  const bytes = await pdf.save();
  const originalFile = toFile(bytes, 'combined-test.pdf');

  // Step 1: a text edit at the exact known position (point-space, renderScale=1 — same
  // convention as tests/export-edited-pdf-text-scale.mts).
  const textEdit: TextEdit = {
    id: 'e1', page: 1, x: 50, y: 400 - 300 - 20, width: 180, height: 24,
    originalText: 'Original Text', newText: 'Edited Text', fontSize: 20,
    fontFamily: 'Noto Sans', color: '#000000', bold: false, italic: false,
  };
  const afterTextEditBlob = await exportEditedPdf(originalFile, [textEdit], undefined, 1);
  const intermediateFile = toFile(afterTextEditBlob, 'combined-test.pdf');

  // Step 2: a drawn rectangle element (red), applied to the INTERMEDIATE file from step 1 —
  // exactly the chaining PdfEditor.tsx's fixed handleExport now performs.
  const rectElement: PdfEditElement = { type: 'rect', x: 50, y: 100, width: 80, height: 30, color: '#ff0000', opacity: 1 };
  const finalBlob = await editPdfClient(intermediateFile, 0, [rectElement], 400, 400);
  const finalBytes = new Uint8Array(await finalBlob.arrayBuffer());

  const { text, hasRedRect } = await inspectPdf(finalBytes);
  // Note: applyTextEdits draws a covering white rectangle + new text ON TOP of the original
  // glyphs — it does not remove the original text objects from the content stream (a visual
  // whiteout, same as the tool has always done; pdf.js's getTextContent extracts all text
  // objects regardless of z-order/occlusion). The bug under test is whether the DRAWN ELEMENT
  // survives being chained after the text edit, not whether the whiteout is a true redaction.
  check(text.includes('Edited Text'), `final PDF contains the EDITED text (got: ${JSON.stringify(text)})`);
  check(hasRedRect, 'final PDF also contains the drawn red rectangle element — NOT silently discarded');
}

console.log('\n=== PdfEditor.tsx source: handleExport chains both operations, not if/else-if ===');
{
  const src = readFileSync(join(ROOT, 'components', 'edit-pdf', 'PdfEditor.tsx'), 'utf-8');
  const startIdx = src.indexOf('const handleExport = useCallback');
  const endIdx = src.indexOf('// Keyboard shortcuts', startIdx);
  const fnSrc = src.slice(startIdx, endIdx);
  check(startIdx !== -1, 'handleExport function found in source');
  check(!/\}\s*else if \(elements\.length > 0\)/.test(fnSrc), 'the old "} else if (elements.length > 0)" branching pattern is gone');
  check(/if \(textEdits\.length > 0\)[\s\S]*?if \(elements\.length > 0\)/.test(fnSrc), 'both an "if (textEdits...)" AND a separate "if (elements...)" now run sequentially, not exclusively');
  check(/sourceFile = Object\.assign\(blob, \{ name: file\.name \}\)/.test(fnSrc), 'the intermediate text-edit Blob is wrapped as a File and fed into the elements step (real chaining, not two independent exports)');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
