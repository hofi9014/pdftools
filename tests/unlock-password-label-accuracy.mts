// unlock-pdf: the password field's helper text said "(opcjonalnie)" / "(optional)" in every one of
// the 16 locales, unconditionally — but a PDF genuinely protected with an open (user) password
// cannot be unlocked with a blank password: unlockPdfClient(file, undefined) calls
// decryptPDF(bytes, '') under the hood, which rejects it as a wrong password. Reported directly by
// a user: "odblokuj pdf nie może mieć napisu przy haśle opcjonalnie - bo wpisanie hasła jest
// wymagane" (the password label can't say "optional" — entering the password IS required). Fixed
// by rewording the label in all 16 locales to state the real condition ("required if the file has
// an open password") instead of a blanket "(optional)".
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { unlockPdfClient, protectPdfClient } from '../lib/client-pdf.ts';
import { all as i18nAll, locales } from '../lib/i18n.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

console.log('=== unlock-pdf: password label no longer claims blank input always works ===');

// 1. Real behavior: a password-protected PDF genuinely rejects a blank password.
{
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([300, 300]).drawText('Secret content', { x: 40, y: 250, size: 14, font });
  const bytes = await pdf.save();
  const file = new File([bytes as unknown as BlobPart], 'secret.pdf', { type: 'application/pdf' });

  const protectedBlob = await protectPdfClient(file, 'realpass123');
  const protectedFile = new File([protectedBlob as unknown as BlobPart], 'secret.pdf', { type: 'application/pdf' });

  let blankPasswordCode = '';
  try {
    await unlockPdfClient(protectedFile, undefined);
  } catch (e) {
    blankPasswordCode = e instanceof Error && (e as Error & { code?: string }).code ? (e as Error & { code: string }).code : 'unknown';
  }
  check(blankPasswordCode === 'wrong-password', `blank password on a real password-protected PDF is rejected (got code: ${blankPasswordCode || 'no error thrown'})`);

  // Sanity: the actual password does work, proving the file really is protected (not some other failure).
  let realPasswordWorked = false;
  try {
    const out = await unlockPdfClient(protectedFile, 'realpass123');
    realPasswordWorked = out.size > 0;
  } catch { /* leave false */ }
  check(realPasswordWorked, 'the real password successfully unlocks the same file (control check)');
}

// 2. Every one of the 16 locales no longer displays a blanket "(optional)"-style label.
const oldValues = new Set([
  '(opcjonalnie)', '(optional)', '(opcional)', '(facultatif)', '(facoltativo)',
  '(valkvætt)', '(isteğe bağlı)', '(valfritt)', '(valgfritt)', '（任意）',
  '(वैकल्पिक)', '(اختياري)', '(اختیاری)', '（可选）',
]);
check(locales.length === 16, `expected 16 locales (got ${locales.length})`);
for (const loc of locales) {
  const value = i18nAll[loc]?.['page.unlock.optional'];
  check(typeof value === 'string' && value.length > 0, `${loc}: page.unlock.optional is present and non-empty`);
  check(!!value && !oldValues.has(value), `${loc}: no longer the old blanket "(optional)"-style text (got: ${JSON.stringify(value)})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exitCode = fails === 0 ? 0 : 1;
