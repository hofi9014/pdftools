import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
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

// traineddata - download gzipped from jsdelivr (smaller, reliable extension)
async function downloadLangData() {
  const langs = ['pol', 'eng'];
  for (const lang of langs) {
    const url = `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`;
    const outPath = join(langDest, `${lang}.traineddata.gz`);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buf = Buffer.from(await resp.arrayBuffer());
      writeFileSync(outPath, buf);
      console.log(`  ${lang}.traineddata.gz downloaded (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
    } catch (e) {
      console.error(`  Failed to download ${lang} traineddata: ${e.message}`);
    }
  }
}

await downloadLangData();
console.log('Tesseract assets copied to public/tesseract/');
