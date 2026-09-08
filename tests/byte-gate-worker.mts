// Byte-gate worker for tests/pdf-writer-c3.mts — does EXACTLY ONE
// extractFormattedTextFromPDF + renderIRToDocx per process so the docx-lib
// module-global font counter is fresh every run (see AGENTS.md FINDING
// "docx-lib nondeterminism", 2026-09-08). Spawned in a fresh subprocess by the
// parent test so PRZED and PO are measured in the same time window.
//
// Usage: tsx tests/byte-gate-worker.mts <przed|po> <fixture.pdf>
// Prints one line: `<fixture>\t<mode>\t<sha256 of word/document.xml>`.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { extractFormattedTextFromPDF } from '../lib/client-pdf';
import { renderIRToDocx } from '../lib/client-pdf-docx';
import JSZip from 'jszip';

const [, , mode, fixture] = process.argv;
if (!mode || (mode !== 'przed' && mode !== 'po') || !fixture) {
  console.error('usage: tsx tests/byte-gate-worker.mts <przed|po> <fixture.pdf>');
  process.exit(2);
}

function toFile(buf: Buffer, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

const file = toFile(readFileSync(resolve(`test-real-pdfs/${fixture}`)), fixture);
const pages = await extractFormattedTextFromPDF(file);

// PRZED = old contract: no image map. PO = C3 contract: empty image map is
// passed (still no images for these fixtures → image branch never entered).
const blob = await (mode === 'przed'
  ? renderIRToDocx(pages)
  : renderIRToDocx(pages, new Map()));
const buf = Buffer.from(await blob.arrayBuffer());
const docx = await JSZip.loadAsync(buf);
const xml = await docx.file('word/document.xml')!.async('nodebuffer');
const sha = createHash('sha256').update(xml).digest('hex');
console.log(`${fixture}\t${mode}\t${sha}`);