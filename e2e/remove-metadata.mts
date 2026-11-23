// End-to-end through the real /remove-metadata page (plan 2.1, 2026-11-20).
// A PDF built to carry an author, an XMP packet with a file path and a photo with EXIF is
// picked on the page: the page lists what it found (the author's name, the path, the photo),
// the downloaded file is checked in Node with the same analysis (nothing left) and renders the
// same text; no request carries the file. Also: a file with nothing to remove, an encrypted
// file (message in the page's language), and the English page.
// Run: npm run test:e2e-remove-metadata (needs a running server, E2E_BASE_URL).
import { chromium, type Page, type Request } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFDocument, PDFName, StandardFonts } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
const { analyzePdfMetadata, reportIsClean } = await import('../lib/pdf/cleanMetadata.ts');
const { t } = await import('../lib/i18n.ts');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

async function text(bytes: Uint8Array): Promise<string> {
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/', verbosity: 0 });
  const doc = await task.promise;
  let out = '';
  for (let n = 1; n <= doc.numPages; n++) out += (await (await doc.getPage(n)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join('');
  await task.destroy();
  return out;
}

// ---------- the test file ----------
const doc = await PDFDocument.create();
doc.setAuthor('Jan Kowalski');
doc.setCreator('Microsoft Word');
const page = doc.addPage([595, 842]);
page.drawText('Umowa najmu', { x: 50, y: 760, size: 24, font: await doc.embedFont(StandardFonts.Helvetica) });
const photo = canvasMod.createCanvas(120, 90);
const g = photo.getContext('2d');
g.fillStyle = '#c84'; g.fillRect(0, 0, 120, 90);
const jpeg = new Uint8Array(photo.toBuffer('image/jpeg', 90));
const exif = new TextEncoder().encode('Exif\0\0GPS 52.2297 Pixel 8');
const withExif = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, ((exif.length + 2) >> 8) & 255, (exif.length + 2) & 255, ...exif, ...jpeg.subarray(2)]);
page.drawImage(await doc.embedJpg(withExif), { x: 50, y: 500, width: 120, height: 90 });
const xmp = '<?xpacket begin=""?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:stRef="http://ns.adobe.com/xap/1.0/sType/ResourceRef#" xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"><xmpMM:DerivedFrom stRef:filePath="C:\\Users\\jan\\Umowy\\najem.docx"/><xmpMM:DocumentID>uuid:1234</xmpMM:DocumentID></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>';
doc.catalog.set(PDFName.of('Metadata'), doc.context.register(doc.context.stream(xmp, { Type: 'Metadata', Subtype: 'XML' })));
const dirty = Buffer.from(await doc.save());
const plainDoc = await PDFDocument.create({ updateMetadata: false });
plainDoc.addPage().drawText('Nothing here', { x: 50, y: 700, size: 20, font: await plainDoc.embedFont(StandardFonts.Helvetica) });
const plain = Buffer.from(await plainDoc.save());
const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
const encrypted = Buffer.from(await encryptPDF(new Uint8Array(dirty), 'test1234'));

const browser = await chromium.launch();
async function open(locale: string): Promise<{ page: Page; sent: Request[] }> {
  const ctx = await browser.newContext({ locale: locale === 'pl' ? 'pl-PL' : 'en-US', serviceWorkers: 'block', acceptDownloads: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/${locale}/remove-metadata`, { waitUntil: 'networkidle' });
  const sent: Request[] = [];
  p.on('request', (r) => sent.push(r));
  return { page: p, sent };
}

console.log('=== /pl/remove-metadata: a file with metadata ===');
{
  const { page: p, sent } = await open('pl');
  check((await p.locator('h1').innerText()).trim() === t('tool.cleanmeta', 'pl'), 'the page has the tool name as its heading');
  await p.setInputFiles('#fileInput', { name: 'umowa.pdf', mimeType: 'application/pdf', buffer: dirty });
  const report = p.locator('[data-testid="cleanmeta-report"]');
  await report.waitFor({ timeout: 30_000 });
  const listed = await report.innerText();
  check(listed.includes('Jan Kowalski') && listed.includes('Microsoft Word'), 'the report shows the author and the program');
  check(listed.includes('C:\\Users\\jan\\Umowy\\najem.docx'), 'the report shows the file path from the XMP packet');
  check(listed.includes(t('page.cleanmeta.r_jpeg', 'pl', { n: 1 })), 'the report counts the photo with EXIF');
  const [download] = await Promise.all([p.waitForEvent('download'), p.locator('main button', { hasText: t('page.cleanmeta.btn', 'pl') }).click()]);
  check(download.suggestedFilename() === `umowa${t('file.cleaned_suffix', 'pl')}.pdf`, `the file is named ${download.suggestedFilename()}`);
  const out = new Uint8Array(readFileSync(await download.path()));
  const after = await analyzePdfMetadata(out);
  check(reportIsClean(after), 'the downloaded file is clean when analysed in Node');
  const raw = Buffer.from(out).toString('latin1');
  check(!raw.includes('Kowalski') && !raw.includes('najem.docx') && !raw.includes('GPS 52.2297'), 'no author, path or EXIF bytes are left in the file');
  check((await text(out)) === (await text(dirty)), 'the page text is unchanged');
  await p.locator('[data-testid="cleanmeta-verdict"]').waitFor();
  check((await p.locator('[data-testid="cleanmeta-verdict"]').innerText()).trim() === t('page.cleanmeta.verified', 'pl'), 'the page says the downloaded file was checked and is clean');
  const uploads = sent.filter((r) => (r.method() !== 'GET' && r.method() !== 'HEAD') || (r.postDataBuffer()?.length ?? 0) > 0);
  check(uploads.length === 0, `no request carries the file (${sent.length} requests, all GET/HEAD without a body)`);
  await p.context().close();
}

console.log('\n=== a file with nothing to remove, and an encrypted file ===');
{
  const { page: p } = await open('pl');
  await p.setInputFiles('#fileInput', { name: 'pusty.pdf', mimeType: 'application/pdf', buffer: plain });
  await p.getByText(t('page.cleanmeta.r_none', 'pl')).waitFor({ timeout: 30_000 });
  check(true, 'a file without metadata says so');
  await p.setInputFiles('#fileInput', { name: 'tajny.pdf', mimeType: 'application/pdf', buffer: encrypted });
  const alert = p.locator('main [role="alert"]');
  await alert.waitFor({ timeout: 30_000 });
  check(/zabezpieczony hasłem/.test(await alert.innerText()), `an encrypted file gets a Polish message (${(await alert.innerText()).trim().slice(0, 60)})`);
  await p.context().close();
}

console.log('\n=== /en/remove-metadata ===');
{
  const { page: p } = await open('en');
  check((await p.locator('h1').innerText()).trim() === 'Remove Metadata', 'English heading');
  await p.setInputFiles('#fileInput', { name: 'contract.pdf', mimeType: 'application/pdf', buffer: dirty });
  await p.locator('[data-testid="cleanmeta-report"]').waitFor({ timeout: 30_000 });
  check((await p.locator('#cleanmeta-found').innerText()).trim() === t('page.cleanmeta.found_title', 'en'), 'the report heading is in English');
  await p.context().close();
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
