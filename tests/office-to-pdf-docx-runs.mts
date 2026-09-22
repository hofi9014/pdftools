// Audit finding (High, engine area) — officeToPdf's .docx branch (lib/client-pdf.ts) joined
// EVERY <w:t> run in the whole document.xml with '\n', regardless of whether two runs belonged
// to the same paragraph or different ones. Word splits a single paragraph into multiple
// <w:r>/<w:t> runs at every formatting boundary — a bold/italic word, a hyperlink, a spell-check
// marker, a tracked change — which is nearly every real-world paragraph containing so much as
// one styled word or link. Each of those run boundaries became a hard line break in the
// downstream renderer (`text.split('\n')` starts a brand-new drawn line, see the loop right
// after this branch), so a sentence like "This is **bold** text." was rendered as three
// separate, stacked PDF lines ("This is", "bold", "text.") instead of flowing as one continuous
// sentence — breaking mid-sentence, and for single-character runs, sometimes mid-word.
//
// Fixed the same way the adjacent odt/ods/odp branch already does it: extract whole <w:p>
// paragraph blocks first, concatenate the <w:t> runs WITHIN each paragraph with '' (a run
// boundary carries no implied whitespace of its own — any real space is already inside one of
// the <w:t> texts), then join paragraphs themselves with '\n' (a real, intended line break).
//
// Proven by re-parsing the actual generated PDF with pdfjs and grouping text items by their Y
// position (transform[5]) — the old bug's signature is unmistakable: a single sentence spread
// across 3 different Y coordinates instead of 1.

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

import JSZip from 'jszip';
import { officeToPdf, pdfjsDocOptions } from '../lib/client-pdf';

// officeToPdf embeds a font via embedLiberationSans(), which fetch()es a browser-relative path
// — same mock as tests/office-to-pdf-entities.mts.
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

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(buf: Buffer, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

type Item = { str: string; y: number };

async function pdfBlobToItems(blob: Blob): Promise<Item[]> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(buf)).promise;
  const items: Item[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    for (const it of content.items) {
      if ('str' in it && 'transform' in it) {
        items.push({ str: it.str, y: Math.round((it.transform as number[])[5]!) });
      }
    }
  }
  return items;
}

console.log('=== officeToPdf .docx: a paragraph split across multiple runs stays on ONE line ===');
{
  const zip = new JSZip();
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t xml:space="preserve">This is </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>bold</w:t></w:r><w:r><w:t xml:space="preserve"> text in one paragraph.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Second, separate paragraph.</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  const file = toFile(buf, 'runs.docx');

  const pdfBlob = await officeToPdf(file);
  check(pdfBlob.size > 0, `officeToPdf produced a non-empty PDF (${pdfBlob.size} bytes)`);

  const items = await pdfBlobToItems(pdfBlob);
  const fullText = items.map(it => it.str).join('');
  check(fullText.includes('This is bold text in one paragraph.'), `full sentence reconstructs correctly across run boundaries (got: ${JSON.stringify(fullText)})`);
  check(fullText.includes('Second, separate paragraph.'), 'second paragraph text present');

  // The old bug's signature: "This is", "bold", "text in one paragraph." would each start
  // their own drawText() call at a DIFFERENT y — i.e. 3 distinct Y values for one sentence.
  const firstSentenceYs = new Set(
    items.filter(it => /This is|bold|text in one/.test(it.str)).map(it => it.y)
  );
  check(firstSentenceYs.size === 1, `the whole first sentence is drawn on a SINGLE line/Y position, not split across several (distinct Y values found: ${firstSentenceYs.size})`);

  const secondSentenceYs = new Set(items.filter(it => /Second, separate/.test(it.str)).map(it => it.y));
  const combined = new Set([...firstSentenceYs, ...secondSentenceYs]);
  check(combined.size === 2, `the two separate paragraphs land on two DIFFERENT lines (a real paragraph break IS preserved) — got ${combined.size} distinct Y groups`);
}

console.log('\n=== regression: the real user-provided .docx still converts cleanly ===');
{
  const realPath = 'C:/Users/Leszek/Documents/Ebook/Raport - 12 rzeczy, które robią skuteczni handlarze w Internecie_na Allegro.docx';
  if (!existsSync(realPath)) {
    console.log('  SKIP real fixture not found at', realPath);
  } else {
    const buf = readFileSync(realPath);
    const file = toFile(buf, 'raport.docx');
    const pdfBlob = await officeToPdf(file);
    check(pdfBlob.size > 1000, `real Allegro-raport.docx converts to a substantial PDF (${pdfBlob.size} bytes)`);
    const items = await pdfBlobToItems(pdfBlob);
    const text = items.map(it => it.str).join('');
    check(text.includes('Allegro'), `converted PDF text contains a recognizable word from the source ("Allegro") — got ${text.length} chars total`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
