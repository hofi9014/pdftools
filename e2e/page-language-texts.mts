// Texts that were Polish on every language version (plan 1.1d, 2026-11-08), seen through the real
// pages of the built site: an engine error, a downloaded file name, the redaction panel, the
// default watermark, the HTML sample and the cloud menu.
//
//   E2E_BASE_URL=http://localhost:3100 npx tsx e2e/page-language-texts.mts
import { chromium } from 'playwright';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const PL = /[ąćęłńśźż]|Wczytywanie|Zaznacz|POUFNE|Witaj|urządzenie|zabezpieczony/;

async function pdf(text: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  page.drawText(text, { x: 40, y: 200, size: 18, font: await doc.embedFont(StandardFonts.Helvetica) });
  return Buffer.from(await doc.save());
}
const plain = await pdf('Hello');
const locked = Buffer.from(await encryptPDF(new Uint8Array(await pdf('Secret')), 'pass1234'));

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* none */ } });

console.log('=== German: a password-protected file on /de/compress ===');
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/de/compress`, { waitUntil: 'networkidle' });
  await page.setInputFiles('#fileInput', [{ name: 'gesperrt.pdf', mimeType: 'application/pdf', buffer: locked }]);
  await page.locator('main button', { hasText: /komprim/i }).last().click();
  const err = page.locator('main .bg-red-50').first();
  await err.waitFor({ timeout: 60000 });
  const text = (await err.innerText()).trim();
  check(/passwortgeschützt/.test(text) && !PL.test(text), `the error is in German: "${text}"`);
  await page.close();
}

console.log('\n=== German: the merged file gets a German name ===');
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/de/merge`, { waitUntil: 'networkidle' });
  await page.setInputFiles('#fileInput', [
    { name: 'a.pdf', mimeType: 'application/pdf', buffer: plain },
    { name: 'b.pdf', mimeType: 'application/pdf', buffer: plain },
  ]);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.locator('main button', { hasText: /zusammenführen/i }).last().click(),
  ]);
  check(download.suggestedFilename() === 'zusammengefügt.pdf', `the download is "${download.suggestedFilename()}"`);
  await page.close();
}

console.log('\n=== Japanese: the redaction panel ===');
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/ja/redact-pdf`, { waitUntil: 'networkidle' });
  await page.setInputFiles('#fileInput', [{ name: 'a.pdf', mimeType: 'application/pdf', buffer: plain }]);
  const panel = page.locator('main', { hasText: '黒塗りする範囲を選択' });
  await panel.waitFor({ timeout: 30000 });
  const text = await page.locator('main').innerText();
  check(/次へ/.test(text) && /Delete キー/.test(text) && !PL.test(text), 'the region panel is in Japanese (title, buttons, instructions)');
  await page.close();
}

console.log('\n=== Default watermark and HTML sample ===');
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/de/watermark-pdf`, { waitUntil: 'networkidle' });
  const value = await page.locator('main input[type="text"]').first().inputValue();
  check(value === 'VERTRAULICH', `the default watermark on /de is "${value}"`);
  const presets = await page.locator('main button', { hasText: /^(VERTRAULICH|KOPIE|ENTWURF|MUSTER)$/ }).count();
  check(presets === 4, `the four presets are German (${presets})`);
  await page.goto(`${BASE}/fr/html-to-pdf`, { waitUntil: 'networkidle' });
  await page.locator('main button', { hasText: /exemple/i }).first().click();
  const html = await page.locator('main textarea').first().inputValue();
  check(/Bonjour le monde/.test(html) && !PL.test(html), 'the HTML sample on /fr is French');
  await page.close();
}

console.log('\n=== Cloud menu ===');
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/it/merge`, { waitUntil: 'networkidle' });
  await page.locator('main button', { hasText: /cloud/i }).first().click();
  const device = await page.locator('main button', { hasText: 'Questo dispositivo' }).count();
  check(device === 1, 'the cloud menu offers "Questo dispositivo" on /it');
  await page.close();
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
