// pdf-to-epub: the generated OPF's <spine toc="ncx"> references a manifest item with id="ncx",
// but the manifest NEVER actually declared that item — only style.css and the page XHTML files
// were listed. Per the OPF 2.0.1 spec, every file referenced anywhere in the package (including
// the NCX table of contents) must have a corresponding <item> in <manifest>, and toc="ncx" must
// resolve to a real manifest id. Lenient EPUB readers (most browser-based viewers, this repo's
// own earlier tests) just read the spine's page order and never check this cross-reference, so
// the bug went unnoticed — but EPUBCheck-class validators reject it outright, which is exactly
// what a stricter ingestion pipeline like Kindle Previewer runs before converting a file.
// Reported directly by a user: "pdf lub epub nie działa" with a screenshot of a Kindle
// Previewer conversion failure.
//
// A second, independent spec violation found alongside it: the book's unique identifier used a
// raw timestamp ("20260929091500") under the "urn:uuid:" scheme, which requires an actual RFC
// 4122 UUID (8-4-4-4-12 hex groups) — not just any string.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));

import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { pdfToEpub } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

console.log('=== pdf-to-epub: OPF manifest declares the NCX, identifier is a real UUID ===');

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
pdf.addPage([300, 300]).drawText('Hello EPUB validity test.', { x: 30, y: 250, size: 14, font });
const bytes = await pdf.save();
const file = new File([bytes as unknown as BlobPart], 'test.pdf', { type: 'application/pdf' });

const blob = await pdfToEpub(file);
const zip = await JSZip.loadAsync(await blob.arrayBuffer());

const opf = await zip.file('OEBPS/content.opf')!.async('string');
const ncx = await zip.file('OEBPS/toc.ncx')!.async('string');

// 1. The manifest actually declares an item with id="ncx" pointing at toc.ncx — the exact
// cross-reference the spine's toc="ncx" attribute depends on.
const manifestSection = opf.match(/<manifest>([\s\S]*?)<\/manifest>/)?.[1] ?? '';
const ncxItemMatch = manifestSection.match(/<item\s+id="ncx"\s+href="toc\.ncx"\s+media-type="application\/x-dtbncx\+xml"\s*\/>/);
check(!!ncxItemMatch, 'manifest declares an <item id="ncx" href="toc.ncx" .../> entry');

// 2. spine's toc="ncx" now resolves to a real manifest id (not a dangling reference).
const spineToc = opf.match(/<spine\s+toc="([^"]+)"/)?.[1];
check(spineToc === 'ncx', `spine toc attribute is "ncx" (got ${JSON.stringify(spineToc)})`);
const manifestIds = [...manifestSection.matchAll(/<item\s+id="([^"]+)"/g)].map((m) => m[1]);
check(!!spineToc && manifestIds.includes(spineToc), `spine's toc="${spineToc}" resolves to a real manifest item id (manifest ids: ${manifestIds.join(', ')})`);

// 3. dc:identifier and dtb:uid are real, well-formed UUIDs (RFC 4122: 8-4-4-4-12 hex groups),
// not a raw timestamp — and both files agree on the same identifier.
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const opfIdentifier = opf.match(/<dc:identifier[^>]*>urn:uuid:([^<]+)<\/dc:identifier>/)?.[1];
check(!!opfIdentifier && uuidRe.test(opfIdentifier), `content.opf's dc:identifier is a well-formed UUID (got ${JSON.stringify(opfIdentifier)})`);
const ncxUid = ncx.match(/dtb:uid"\s+content="urn:uuid:([^"]+)"/)?.[1];
check(!!ncxUid && uuidRe.test(ncxUid), `toc.ncx's dtb:uid is a well-formed UUID (got ${JSON.stringify(ncxUid)})`);
check(opfIdentifier === ncxUid, `content.opf and toc.ncx agree on the same identifier (opf: ${opfIdentifier}, ncx: ${ncxUid})`);

// Regression guard: the actual page content is still there, untouched by this fix.
const page1 = await zip.file('OEBPS/page-1.xhtml')!.async('string');
check(page1.includes('Hello EPUB validity test.'), 'page content is still present and correct');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exitCode = fails === 0 ? 0 : 1;
