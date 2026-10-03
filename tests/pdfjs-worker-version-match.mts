// After pdfjs-dist was upgraded (6.0.227 → 6.3.289, npm audit: "arbitrary JavaScript execution
// upon opening a malicious PDF"), every Node test that touches pdf.js failed with
//   The API version "6.3.289" does not match the Worker version "6.0.227".
// lib/client-pdf.ts resolves the worker with new URL('pdfjs-dist/build/pdf.worker.min.mjs',
// import.meta.url); under plain Node that is a path relative to lib/, i.e. a local, gitignored
// copy at lib/pdfjs-dist/build/ that nothing kept in sync with the installed package. (A
// deployment has no such copy and bundles the worker from node_modules, so production was never
// affected — but locally the bundler prefers the relative file too, so a stale copy would also
// end up in a local build.) scripts/copy-pdfjs-assets.mjs (postinstall + build) now refreshes
// the copy whenever it exists.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const installed = JSON.parse(readFileSync(join(ROOT, 'node_modules/pdfjs-dist/package.json'), 'utf8')).version as string;
const workerVersion = (path: string): string | undefined =>
  readFileSync(path, 'utf8').match(/"(\d+\.\d+\.\d{2,})"/)?.[1];

console.log(`=== pdf.js worker matches the installed package (${installed}) ===`);
const pkgWorker = join(ROOT, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
check(readFileSync(pkgWorker, 'utf8').includes(`"${installed}"`), 'sanity: the packaged worker carries the package version');

const local = join(ROOT, 'lib/pdfjs-dist/build/pdf.worker.min.mjs');
if (existsSync(local)) {
  check(readFileSync(local, 'utf8').includes(`"${installed}"`),
    `the local worker copy used by the Node tests is version ${installed} (found ${workerVersion(local)})`);
} else {
  console.log('  (no local worker copy — nothing to keep in sync)');
}

const script = readFileSync(join(ROOT, 'scripts/copy-pdfjs-assets.mjs'), 'utf8');
check(/existsSync\(localWorkerDir\)/.test(script) && /pdf\.worker\.min\.mjs/.test(script),
  'the asset copy script refreshes the local worker copy when it exists');
check(/"postinstall":\s*"[^"]*copy-pdfjs-assets\.mjs/.test(readFileSync(join(ROOT, 'package.json'), 'utf8')),
  'the copy script runs on postinstall, i.e. on every dependency change');

// The real thing: pdf.js opens a document through the worker without a version error.
const { PDFDocument } = await import('pdf-lib');
const d = await PDFDocument.create();
d.addPage([200, 200]);
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = existsSync(local)
  ? new URL('../lib/pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
  : new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;
let opened = '';
try {
  const doc = await pdfjs.getDocument({ data: await d.save() }).promise;
  opened = `${doc.numPages} page`;
} catch (e) {
  opened = String(e);
}
check(opened === '1 page', `pdf.js opens a PDF through that worker (${opened})`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
