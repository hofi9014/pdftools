import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
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

console.log('pdfjs-dist assets copied to public/pdfjs-dist/');
