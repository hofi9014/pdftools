// Audit finding (Medium, engine area) — client-pdf-docx.ts's hexToColor() had zero input
// validation. Word legitimately emits <w:color w:val="auto"/> (meaning "automatic/theme color"
// — written for default body text, after "Clear Formatting", in many templates; a common real
// value, not an edge case) and this flowed unvalidated all the way from parseRPr() into
// IRTextRun.color. "auto".substring(0,2) parses as a lone valid hex digit, but the remaining
// substrings aren't valid hex at all, so two of three RGB channels came out NaN.
//
// Verified directly against pdf-lib: rgb(r, NaN, NaN) actually THROWS ("`green` must be of type
// `number`, but was actually of type `NaN`") rather than silently writing garbage into the PDF.
// app/word-to-pdf/page.tsx wraps docxToIR/renderIRToPdf in a try/catch that falls back to the
// legacy officeToPdf() plain-text converter on any error — so the real-world user impact wasn't
// a hard crash with no output, but every .docx containing so much as one run with the automatic/
// theme color unnecessarily lost ALL rich formatting (fonts, bold/italic, tables, images) and
// silently downgraded to plain extracted text, even though nothing about the document actually
// required that.
//
// Fixed by validating the hex string is exactly 6 hex digits before parsing, defaulting to black
// (the correct rendering for "automatic" body text in the overwhelming majority of real
// documents) otherwise.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// renderIRToPdf embeds fonts via embedLiberationSans()/getFontBytes(), which fetch()es a
// browser-relative path — same mock as tests/office-to-pdf-entities.mts.
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

import JSZip from 'jszip';
import { docxToIR, renderIRToPdf } from '../lib/client-pdf-docx';

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

console.log('=== docxToIR/renderIRToPdf: a run with w:color w:val="auto" does not throw or fall back ===');
{
  const zip = new JSZip();
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:color w:val="auto"/></w:rPr><w:t>Automatic color text</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:color w:val="FF0000"/></w:rPr><w:t>Explicit red text</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );
  // docxToIR unconditionally parses word/_rels/document.xml.rels with DOMParser even when
  // absent (falls back to an empty string) — the real browser DOMParser tolerates an empty
  // document leniently, but xmldom (this Node test's polyfill) throws a fatal parse error on
  // missing root element, so a minimal valid empty rels file is provided here to match real
  // browser behavior rather than exercising an unrelated environment-only discrepancy.
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
  );
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  const file = toFile(buf, 'auto-color.docx');

  const { pages, images } = await docxToIR(file);
  check(pages.length > 0, `docxToIR() produced at least one page (${pages.length})`);

  let renderThrew: Error | null = null;
  let blob: Blob | null = null;
  try {
    blob = await renderIRToPdf(pages, images);
  } catch (e) {
    renderThrew = e as Error;
  }
  check(renderThrew === null, `renderIRToPdf() does not throw on a run with w:val="auto" (${renderThrew?.message ?? 'ok'})`);
  check(!!blob && blob.size > 0, `renderIRToPdf() produced a non-empty PDF (${blob?.size ?? 0} bytes)`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
