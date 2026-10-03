import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    if (statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      copyFileSync(s, d);
    }
  }
}

const pdfjsDir = join(root, 'node_modules', 'pdfjs-dist');

// cmaps (binary CMap files for text extraction with CID fonts)
copyDir(join(pdfjsDir, 'cmaps'), join(root, 'public', 'pdfjs-dist', 'cmaps'));
console.log('  cmaps copied');

// standard_fonts (fallback font files for text extraction)
copyDir(join(pdfjsDir, 'standard_fonts'), join(root, 'public', 'pdfjs-dist', 'standard_fonts'));
console.log('  standard_fonts copied');

// A local, gitignored copy of the worker (lib/pdfjs-dist/build/) is what the Node test scripts
// load: lib/client-pdf.ts resolves the worker with new URL('pdfjs-dist/build/…', import.meta.url),
// which under plain Node is a path relative to lib/. If that copy exists it must be the SAME
// version as the installed package, or every pdf.js call fails with "API version does not match
// the Worker version" after an upgrade. Only refreshed where it already exists — never created
// (a deployment has no such directory and bundles the worker from node_modules).
const localWorkerDir = join(root, 'lib', 'pdfjs-dist', 'build');
if (existsSync(localWorkerDir)) {
  copyFileSync(join(pdfjsDir, 'build', 'pdf.worker.min.mjs'), join(localWorkerDir, 'pdf.worker.min.mjs'));
  console.log('  local test worker copy refreshed');
}

console.log('pdfjs-dist assets copied to public/pdfjs-dist/');
