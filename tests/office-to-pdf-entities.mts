// Audit finding E4 — officeToPdf (docx/odt/xlsx/pptx → PDF) pulled text out of the
// underlying XML with regex but never unescaped XML entities (&amp;, &lt;, &gt;, &quot;,
// &apos;, numeric refs) before drawing it into the PDF. A literal "&" typed in the
// source document is stored in the XML as "&amp;"; without unescaping, the generated
// PDF showed the literal 5 characters "&amp;" instead of just "&". htmlToPdf already had
// a (slightly buggy — wrong decode order, missing &apos;/numeric refs) version of this
// fix; both now share lib/client-pdf.ts's unescapeXmlEntities().
//
// Proves it three ways:
//   1. unit — unescapeXmlEntities() directly, including the amp-decoded-last ordering
//      that avoids double-decoding a literal "&lt;" in the source into "<".
//   2. integration — a synthetic minimal .docx built with JSZip (so the entity is
//      guaranteed present, not hoped-for), run through the real officeToPdf(), then the
//      generated PDF is re-parsed with pdfjs and its actual text content checked.
//   3. regression — the real .docx the user provided still converts to a non-empty,
//      readable PDF (this specific file has no entities to unescape, confirmed by a
//      separate check, so it's a "did we break the common case" guard, not an entity test).

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
import { officeToPdf, unescapeXmlEntities, pdfjsDocOptions } from '../lib/client-pdf';

// officeToPdf embeds a font via embedLiberationSans(), which fetch()es a browser-relative
// path ("/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf") — resolvable against the
// page origin in a real browser, but Node's fetch has no base URL for a bare "/..." path.
// Serve that one asset from the same public/ directory Next.js would serve it from at
// runtime; forward every other request to the real fetch unchanged.
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

async function pdfBlobToText(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(buf)).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => ('str' in it ? it.str : '')).join('');
  }
  return text;
}

function toFile(buf: Buffer, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

console.log('=== unit: unescapeXmlEntities ===');
check(unescapeXmlEntities('Tom &amp; Jerry') === 'Tom & Jerry', 'single-escaped ampersand decodes to "&"');
check(unescapeXmlEntities('&lt;div&gt;') === '<div>', 'tag-like entities decode to literal angle brackets');
check(unescapeXmlEntities('&quot;quoted&quot; and it&apos;s') === '"quoted" and it\'s', 'quote and apostrophe entities decode');
check(unescapeXmlEntities('a&nbsp;b') === 'a b', 'non-breaking space entity becomes a regular space');
check(unescapeXmlEntities('&#8217;') === '\u2019', 'decimal numeric character reference decodes (curly apostrophe U+2019)');
check(unescapeXmlEntities('&#x2019;') === '\u2019', 'hex numeric character reference decodes to the same character');
check(
  unescapeXmlEntities('literal text: &amp;lt;') === 'literal text: &lt;',
  `decoding &amp; LAST avoids double-decoding a source document that literally contained the text "&lt;" into "<" (got ${JSON.stringify(unescapeXmlEntities('literal text: &amp;lt;'))})`,
);

console.log('\n=== integration: synthetic .docx with a literal "&" round-trips through officeToPdf ===');
{
  const zip = new JSZip();
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Tom &amp; Jerry - kontrakt B2B &lt;draft&gt;</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  const file = toFile(buf, 'synthetic.docx');

  const pdfBlob = await officeToPdf(file);
  check(pdfBlob.size > 0, `officeToPdf produced a non-empty PDF (${pdfBlob.size} bytes)`);

  const text = await pdfBlobToText(pdfBlob);
  check(text.includes('Tom & Jerry'), `PDF text contains the decoded ampersand "Tom & Jerry" (got: ${JSON.stringify(text.slice(0, 60))})`);
  check(!text.includes('&amp;'), 'PDF text does NOT contain the raw escape sequence "&amp;" (the bug this fixes)');
  check(text.includes('<draft>'), `PDF text contains decoded angle brackets "<draft>" (got: ${JSON.stringify(text.slice(0, 80))})`);
  check(!text.includes('&lt;') && !text.includes('&gt;'), 'PDF text does NOT contain raw "&lt;"/"&gt;" escape sequences');
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
    const text = await pdfBlobToText(pdfBlob);
    check(text.includes('Allegro'), `converted PDF text contains a recognizable word from the source ("Allegro") — got ${text.length} chars total`);
    check(!/&amp;|&lt;|&gt;|&quot;|&apos;/.test(text), 'no leftover raw XML entities anywhere in the converted output');
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
