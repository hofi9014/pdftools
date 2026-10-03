import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
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

// traineddata - download gzipped from jsdelivr (smaller, reliable extension).
// EVERY language the OCR page offers (lib/ocr-languages.json) — only pol and eng used to be
// fetched, so the other 31 choices in the language list had no data on the server (404) and
// the tool spun forever on them. About 65 MB in total; a file already present is kept, so only
// the first install/build downloads.
async function downloadLangData() {
  const langs = JSON.parse(readFileSync(join(root, 'lib', 'ocr-languages.json'), 'utf8'));
  const failed = [];
  let downloaded = 0;
  for (const lang of langs) {
    const url = `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`;
    const outPath = join(langDest, `${lang}.traineddata.gz`);
    if (existsSync(outPath) && statSync(outPath).size > 100_000) continue;
    let lastError = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = Buffer.from(await resp.arrayBuffer());
        // gzip magic — never save an error page under a data file's name
        if (buf.length < 100_000 || buf[0] !== 0x1f || buf[1] !== 0x8b) throw new Error(`not a gzip file (${buf.length} bytes)`);
        writeFileSync(outPath, buf);
        downloaded++;
        lastError = '';
        break;
      } catch (e) {
        lastError = e.message;
      }
    }
    if (lastError) failed.push(`${lang} (${lastError})`);
  }
  console.log(`  OCR language data: ${langs.length - failed.length}/${langs.length} present (${downloaded} downloaded now)`);
  // Not fatal: the page reports a language without data instead of hanging, and a CDN outage
  // must not block a deployment.
  if (failed.length) console.error(`  MISSING OCR language data: ${failed.join(', ')}`);
}

await downloadLangData();
console.log('Tesseract assets copied to public/tesseract/');
