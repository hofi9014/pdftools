import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const dest = join(root, 'public', 'tesseract');
const langDest = join(dest, 'lang-data');

mkdirSync(dest, { recursive: true });
mkdirSync(langDest, { recursive: true });

// worker
copyFileSync(join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'), join(dest, 'worker.min.js'));

// core WASM files
const coreDir = join(root, 'node_modules', 'tesseract.js-core');
for (const f of readdirSync(coreDir)) {
  if (f.endsWith('.wasm') || f.endsWith('.wasm.js') || (f.endsWith('.js') && f.startsWith('tesseract-core'))) {
    copyFileSync(join(coreDir, f), join(dest, f));
  }
}

// traineddata
for (const lang of ['pol', 'eng']) {
  const src = join(root, `${lang}.traineddata`);
  if (existsSync(src)) {
    copyFileSync(src, join(langDest, `${lang}.traineddata`));
  }
}

console.log('Tesseract assets copied to public/tesseract/');
