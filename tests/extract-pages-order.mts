// Audit finding (Medium, engine area) — extractPages() (lib/client-pdf.ts) iterated
// pageIndices verbatim, with no sort. app/extract-pages builds this array via
// PagePreview.tsx's togglePage(), which APPENDS a newly-selected page to the END of the array
// (`[...selectedPages, pageIdx]`) — so a user who clicks page 5 before page 2 (e.g. skimming a
// thumbnail grid visually, or deselecting/reselecting a page, which moves it to the end of the
// array) got an output PDF with pages in CLICK order ([5, 2, ...]) instead of DOCUMENT order
// ([2, 5, ...]), with no UI indication that click order determines output order. deletePages
// already sorts (descending, for its own removal semantics) — extractPages never did.
//
// Fixed by sorting ascending (+ deduping) before extracting, so "extract pages 2 and 5" always
// produces the same result regardless of the order the user happened to click them in.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { extractPages } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(bytes: Uint8Array, name: string): File {
  return Object.assign(new Blob([bytes as BlobPart]), { name }) as unknown as File;
}

async function buildLabeledPdf(labels: string[]): Promise<File> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const label of labels) {
    const page = pdf.addPage([200, 200]);
    page.drawText(label, { x: 50, y: 100, size: 20, font, color: rgb(0, 0, 0) });
  }
  const bytes = await pdf.save();
  return toFile(bytes, 'labeled.pdf');
}

async function extractedLabels(bytes: Uint8Array): Promise<string[]> {
  const pako = (await import('pako')).default;
  const pdf = await PDFDocument.load(bytes);
  const labels: string[] = [];
  for (const page of pdf.getPages()) {
    // Each page has exactly one text-drawing operator with a literal string operand
    // ("(PAGE-N) Tj") — reading it back via the page's own content stream avoids needing a
    // full text-extraction library just to identify which original page ended up where.
    // Contents() is a PDFArray of stream refs (size 1 here); pdf-lib's default save()
    // FlateDecode-compresses content streams, so they must be inflated before searching.
    const contentsArr = page.node.Contents();
    const ref = contentsArr.get(0);
    const stream = page.node.context.lookup(ref) as unknown as { contents: Uint8Array; dict: { get(k: unknown): unknown } };
    const raw = stream.contents;
    const inflated = pako.inflate(raw);
    const text = new TextDecoder('latin1').decode(inflated);
    // pdf-lib's drawText() encodes the Tj operand as a hex string ("<504147452D31> Tj"), not a
    // literal parenthesized string — confirmed by inspecting the actual decompressed content
    // stream directly (see this fix's commit for the raw dump).
    const hexMatch = text.match(/<([0-9A-Fa-f]+)>\s*Tj/);
    const litMatch = text.match(/\(([^)]+)\)\s*Tj/);
    if (hexMatch) {
      const hex = hexMatch[1]!;
      let decoded = '';
      for (let i = 0; i < hex.length; i += 2) decoded += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
      labels.push(decoded);
    } else {
      labels.push(litMatch ? litMatch[1]! : '?');
    }
  }
  return labels;
}

console.log('=== extractPages: output is always in DOCUMENT order, regardless of click/selection order ===');
{
  // 5 labeled pages: PAGE-0 .. PAGE-4 (document order).
  const file = await buildLabeledPdf(['PAGE-0', 'PAGE-1', 'PAGE-2', 'PAGE-3', 'PAGE-4']);

  // Simulates a user clicking page 4 first, then page 1 — exactly PagePreview.tsx's
  // togglePage() append-to-end behavior, e.g. skimming a thumbnail grid out of order.
  const clickOrder = [4, 1];
  const outBytes = await extractPages(file, clickOrder);
  const labels = await extractedLabels(outBytes);

  check(labels.length === 2, `extracted exactly 2 pages (got ${labels.length})`);
  check(labels[0] === 'PAGE-1', `first extracted page is PAGE-1 (document order), not PAGE-4 (click order) — got ${labels[0]}`);
  check(labels[1] === 'PAGE-4', `second extracted page is PAGE-4 — got ${labels[1]}`);
}

console.log('\n=== regression guard: pages already in document order still extract correctly ===');
{
  const file = await buildLabeledPdf(['A', 'B', 'C', 'D']);
  const outBytes = await extractPages(file, [1, 3]);
  const labels = await extractedLabels(outBytes);
  check(labels.length === 2 && labels[0] === 'B' && labels[1] === 'D', `already-ordered selection [1,3] still gives [B, D] (got ${JSON.stringify(labels)})`);
}

console.log('\n=== regression guard: duplicate indices don\'t produce duplicate pages ===');
{
  const file = await buildLabeledPdf(['X', 'Y', 'Z']);
  const outBytes = await extractPages(file, [2, 0, 2]);
  const labels = await extractedLabels(outBytes);
  check(labels.length === 2 && labels[0] === 'X' && labels[1] === 'Z', `duplicate index 2 is deduped, result is [X, Z] in document order (got ${JSON.stringify(labels)})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
