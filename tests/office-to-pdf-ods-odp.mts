// FINDING (officeToPdf, .ods/.odp advertised but never supported, 2026-09-21) —
// app/word-to-pdf/page.tsx's "openoffice" format tab explicitly advertises and accepts .odt,
// .ods, and .odp, but officeToPdf's extension switch only ever matched 'odt' — uploading a real
// .ods or .odp always threw "Format .ods/.odp nie jest obsługiwany" despite the UI's own claim.
// Verified against hand-built minimal ODF fixtures that .ods (table-cell paragraphs) and .odp
// (text-box paragraphs) carry their text in the exact same <text:p> elements as .odt, so the
// existing odt extraction logic was extended to also match these two extensions rather than
// needing new parsing logic.
//
// Separately, this session's scan also found that .doc/.xls/.ppt (the legacy OLE Compound File
// Binary Format, not a ZIP archive at all) can never be opened by this JSZip-based function —
// real support would need a dedicated binary-format parser, out of scope here. Rather than leave
// a UI button that always fails, those three extensions were removed from the advertised/
// accepted formats in app/word-to-pdf/page.tsx and app/excel-to-pdf/page.tsx instead.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

const canvasMod = await import('@napi-rs/canvas');
if (!(globalThis as Record<string, unknown>).DOMMatrix) {
  (globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
}
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

// officeToPdf embeds a font via embedLiberationSans(), which fetch()es a browser-relative path
// resolvable against the page origin in a real browser, but not in Node — same established
// mock pattern as tests/office-to-pdf-entities.mts: serve that one asset from public/, forward
// everything else to the real fetch.
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

const { officeToPdf } = await import('../lib/client-pdf');
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

async function makeOdf(contentXml: string, name: string): Promise<File> {
  const zip = new JSZip();
  zip.file('content.xml', contentXml);
  const buf = await zip.generateAsync({ type: 'uint8array' });
  return Object.assign(new Blob([buf as unknown as BlobPart]), { name }) as unknown as File;
}

async function extractText(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: { str?: string }) => it.str || '').join(' ');
  }
  return text;
}

console.log('=== officeToPdf: .ods and .odp are genuinely supported, not just claimed by the UI ===');

const ODS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
<office:body><office:spreadsheet><table:table table:name="Sheet1"><table:table-row>
<table:table-cell office:value-type="string"><text:p>HelloFromODS</text:p></table:table-cell>
</table:table-row></table:table></office:spreadsheet></office:body>
</office:document-content>`;

const ODP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
<office:body><office:presentation><draw:page draw:name="page1">
<draw:frame><draw:text-box><text:p>HelloFromODP</text:p></draw:text-box></draw:frame>
</draw:page></office:presentation></office:body>
</office:document-content>`;

{
  const file = await makeOdf(ODS_XML, 'test.ods');
  let threw = false;
  let blob: Blob | null = null;
  try {
    blob = await officeToPdf(file);
  } catch (e) {
    threw = true;
    console.log('  (threw:', e instanceof Error ? e.message : e, ')');
  }
  check(!threw, '.ods upload does not throw "Format not supported"');
  if (blob) {
    const text = await extractText(blob);
    check(text.includes('HelloFromODS'), `.ods real cell text made it into the output PDF (got: ${JSON.stringify(text)})`);
  }
}

{
  const file = await makeOdf(ODP_XML, 'test.odp');
  let threw = false;
  let blob: Blob | null = null;
  try {
    blob = await officeToPdf(file);
  } catch (e) {
    threw = true;
    console.log('  (threw:', e instanceof Error ? e.message : e, ')');
  }
  check(!threw, '.odp upload does not throw "Format not supported"');
  if (blob) {
    const text = await extractText(blob);
    check(text.includes('HelloFromODP'), `.odp real slide text made it into the output PDF (got: ${JSON.stringify(text)})`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
