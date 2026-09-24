// End-to-end through the REAL /unlock-pdf page: an AES-128 (V=4) password-protected PDF used to
// fail with the raw English library error "Failed to decrypt PDF: Unsupported encryption: V=4".
// Checks (Polish UI): wrong password → localized "Nieprawidłowe hasło" message (not raw English),
// right password → a real download whose bytes open in pdf.js with the original text.
import { chromium } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { buildEncrypted, TEXT } from '../tests/helpers/aes128-fixture.mts';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const pdf = await buildEncrypted('sekret1', 'owner1');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`${BASE_URL}/pl/unlock-pdf`, { waitUntil: 'load' });
await page.setInputFiles('#fileInput', { name: 'aes128.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) });
const pw = page.locator('input[type="password"]');
const unlock = page.locator('button', { hasText: /odblokuj/i }).last();

await pw.fill('zle-haslo');
await unlock.click();
await page.waitForFunction(() => /Nieprawidłowe hasło/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => undefined);
const body1 = await page.evaluate(() => document.body.innerText);
check(/Nieprawidłowe hasło/.test(body1), 'wrong password shows the localized Polish message');
check(!/Failed to decrypt|Unsupported encryption|Incorrect password\. The provided/.test(body1), 'no raw English library error leaks into the UI');

await pw.fill('sekret1');
const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), unlock.click()]);
const path = await download.path();
const out = new Uint8Array(readFileSync(path!));
const doc = await pdfjsLib.getDocument({ data: out, useSystemFonts: false }).promise;
const tc = await (await doc.getPage(1)).getTextContent();
check((tc.items as Array<{ str: string }>).map((i) => i.str).join('') === TEXT, 'right password downloads a PDF that opens in pdf.js without a password, with the original text');

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
