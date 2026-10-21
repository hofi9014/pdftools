// The built site runs without 'unsafe-eval' in its Content-Security-Policy (only 'wasm-unsafe-eval',
// for the OCR engine), and it sends Cross-Origin-Opener-Policy: same-origin-allow-popups — except on
// the four pages a sign-in popup returns to. This drives the real pages and checks that nothing
// the site does needs eval, and that a sign-in popup still hands its token back.
//
// 1. The tools do their real work under the strict policy — every conversion, OCR (WebAssembly),
//    the PDF editor, password protection, and the Dropbox and OneDrive pickers loading their own
//    scripts — and each result is checked. Every CSP violation is recorded (the
//    securitypolicyviolation event); a blocked eval is allowed only from a file whose sole
//    string-to-code call is the known feature test of Node's `util` polyfill
//    (`Function("return function*() {}")` inside try/catch: it fails, is caught, and the code
//    carries on — measured: the tools' files come out right). Anything else that tries eval fails
//    the test. A control proves the recorder sees a blocked eval at all.
// 2. A sign-in popup leaves for another origin and comes back to /dropbox-oauth.html, which posts
//    the token to window.opener — the exact flow of the Dropbox, OneDrive and SharePoint sign-ins.
//    A control serves that return page WITH the site's COOP and shows the token is then lost, so
//    the exemption is what keeps the flow working.
//
// Needs the BUILT site (next start): `next dev` keeps 'unsafe-eval' for its hot reload.
import { chromium, type Page, type BrowserContext } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
// Another origin for the "provider" in the sign-in flow: the same server under its other name.
const OTHER_ORIGIN = BASE_URL.includes('localhost') ? BASE_URL.replace('localhost', '127.0.0.1') : 'https://example.test';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

interface Violation { page: string; directive: string; blocked: string; source: string }
const violations: Violation[] = [];

const browser = await chromium.launch({ headless: true });

async function recordingContext(): Promise<BrowserContext> {
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.exposeBinding('__cspViolation', (src, v: Omit<Violation, 'page'>) => {
    violations.push({ page: src.page.url(), ...v });
  });
  await ctx.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __cspViolation: (v: unknown) => void }).__cspViolation({
        directive: e.effectiveDirective || e.violatedDirective, blocked: e.blockedURI, source: e.sourceFile || '',
      });
    });
  });
  return ctx;
}

const fixture = (...p: string[]) => readFileSync(join(ROOT, ...p));
const report = fixture('test-real-pdfs', 'chrome-report.pdf');
const invoice = fixture('test-real-pdfs', 'chrome-invoice.pdf');
const workbook = fixture('test-fixtures', 'EPZ_SIERPIEN_2026.xlsx');
const isEval = (v: Violation) => /eval/i.test(v.blocked) || /eval/i.test(v.directive);
const PDF = (b: Uint8Array) => Buffer.from(b.subarray(0, 5)).toString('latin1') === '%PDF-';
const ZIP = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b;

// The one string-to-code call the built site is allowed to attempt: the generator feature test
// of the `util` polyfill Next bundles for libraries that import Node's `stream` (JSZip, used by
// the Word, ODT, Excel and ZIP writers). A file qualifies only if every eval / Function /
// new Function call in it is that probe or the `function-bind` fallback, which runs only in a
// browser without a native Function.prototype.bind (none today) — so the blocked call was the probe.
const KNOWN_PROBE = 'Function("return function*() {}")';
const ALLOWED_CALLS = [KNOWN_PROBE, 'Function("binder"'];
const sourceVerdict = new Map<string, string | null>();
async function evalAllowed(source: string): Promise<string | null> {
  if (sourceVerdict.has(source)) return sourceVerdict.get(source)!;
  let verdict: string | null;
  try {
    const js = await (await fetch(source)).text();
    const calls = [...js.matchAll(/(?<![\w$.])(?:new\s+)?Function\s*\(|(?<![\w$.])eval\s*\(/g)];
    const unknown = calls.filter((m) => !ALLOWED_CALLS.some((a) => js.startsWith(a, m.index!)));
    verdict = js.includes(KNOWN_PROBE) && unknown.length === 0 ? null : `${unknown.length} unknown string-to-code call(s): ${unknown.slice(0, 2).map((m) => JSON.stringify(js.slice(m.index!, m.index! + 60))).join(', ')}`;
  } catch (e) {
    verdict = `could not read the file (${(e as Error).message})`;
  }
  sourceVerdict.set(source, verdict);
  return verdict;
}

async function upload(p: Page, slug: string, files: Array<{ name: string; mimeType: string; buffer: Buffer }>) {
  await p.goto(`${BASE_URL}/pl/${slug}`, { waitUntil: 'load' });
  await p.setInputFiles('#fileInput', files);
}
async function downloadOf(p: Page, click: () => Promise<void>): Promise<Uint8Array> {
  const [d] = await Promise.all([p.waitForEvent('download', { timeout: 240000 }), click()]);
  return new Uint8Array(readFileSync((await d.path())!));
}
const button = (p: Page, text: RegExp | string) => () => p.locator('button', { hasText: text }).last().click();
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ODT = 'application/vnd.oasis.opendocument.text';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

console.log('=== the tools work under the strict policy, and nothing needs eval ===');
{
  const ctx = await recordingContext();
  const page = await ctx.newPage();

  // Control: a page script cannot turn a string into code, and the recorder sees that. The attempt
  // is written into the page's own HTML, served with its own headers — a script added through
  // Playwright (addScriptTag, evaluate) runs with the tool's rights and is not held to the CSP.
  await ctx.route(`${BASE_URL}/pl/faq`, async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace('</body>', '<script>window.__evalRan = (function () { try { return new Function("return 1")() === 1; } catch (e) { return false; } })();</script></body>');
    await route.fulfill({ response: res, body });
  });
  await page.goto(`${BASE_URL}/pl/faq`, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const evalRan = await page.evaluate(() => (window as unknown as { __evalRan: boolean }).__evalRan);
  await ctx.unroute(`${BASE_URL}/pl/faq`);
  check(evalRan === false && violations.filter(isEval).length === 1, `control: a script cannot turn a string into code, and the recorder sees it (${violations.filter(isEval).length} eval violation)`);
  violations.length = 0;

  const step = async (name: string, run: (p: Page) => Promise<string>) => {
    const before = violations.length;
    let result: string;
    try { result = await run(page); } catch (e) { check(false, `${name}: ${(e as Error).message.split('\n')[0]}`); return; }
    await page.waitForTimeout(500);
    const mine = violations.slice(before);
    const bad: string[] = [];
    for (const v of mine) {
      if (!isEval(v)) { bad.push(`${v.directive} ← ${v.blocked}`); continue; }
      const why = await evalAllowed(v.source);
      if (why) bad.push(`eval in ${v.source}: ${why}`);
    }
    const probes = mine.length - bad.length;
    check(bad.length === 0, `${name}: ${result}${probes ? ` (the util polyfill's feature test was blocked ${probes}× and caught)` : ''}${bad.length ? ` — ${bad.slice(0, 3).join('; ')}` : ''}`);
  };

  let docx: Uint8Array = new Uint8Array();
  let odt: Uint8Array = new Uint8Array();
  await step('PDF → Word', async (p) => {
    await upload(p, 'pdf-to-word', [{ name: 'report.pdf', mimeType: 'application/pdf', buffer: report }]);
    docx = await downloadOf(p, button(p, /Konwertuj do formatu Word/));
    if (!ZIP(docx)) throw new Error('the download is not a .docx');
    return `a ${Math.round(docx.length / 1024)} kB .docx`;
  });
  await step('Word → PDF', async (p) => {
    await upload(p, 'word-to-pdf', [{ name: 'report.docx', mimeType: DOCX, buffer: Buffer.from(docx) }]);
    const out = await downloadOf(p, button(p, /Konwertuj do formatu PDF/));
    if (!PDF(out)) throw new Error('the download is not a PDF');
    return 'a PDF';
  });
  await step('PDF → ODT', async (p) => {
    await upload(p, 'pdf-to-openoffice', [{ name: 'report.pdf', mimeType: 'application/pdf', buffer: report }]);
    odt = await downloadOf(p, button(p, /Konwertuj do ODT/));
    if (!ZIP(odt)) throw new Error('the download is not an .odt');
    return 'an .odt';
  });
  await step('ODT → PDF', async (p) => {
    await upload(p, 'openoffice-to-pdf', [{ name: 'report.odt', mimeType: ODT, buffer: Buffer.from(odt) }]);
    const out = await downloadOf(p, button(p, /Konwertuj do PDF/));
    if (!PDF(out)) throw new Error('the download is not a PDF');
    return 'a PDF';
  });
  await step('PDF → Excel', async (p) => {
    await upload(p, 'pdf-to-excel', [{ name: 'invoice.pdf', mimeType: 'application/pdf', buffer: invoice }]);
    const out = await downloadOf(p, button(p, /Konwertuj do formatu Excel/));
    if (!ZIP(out)) throw new Error('the download is not an .xlsx');
    return 'an .xlsx';
  });
  await step('Excel → PDF', async (p) => {
    await upload(p, 'excel-to-pdf', [{ name: 'epz.xlsx', mimeType: XLSX, buffer: workbook }]);
    const out = await downloadOf(p, button(p, /Konwertuj do formatu PDF/));
    if (!PDF(out)) throw new Error('the download is not a PDF');
    return 'a PDF';
  });
  await step('PDF → PowerPoint', async (p) => {
    await upload(p, 'pdf-to-powerpoint', [{ name: 'report.pdf', mimeType: 'application/pdf', buffer: report }]);
    const out = await downloadOf(p, button(p, /Konwertuj do PowerPoint/));
    if (!ZIP(out)) throw new Error('the download is not a .pptx');
    return 'a .pptx';
  });
  await step('PDF → EPUB', async (p) => {
    await upload(p, 'pdf-to-epub', [{ name: 'report.pdf', mimeType: 'application/pdf', buffer: report }]);
    const out = await downloadOf(p, button(p, /Konwertuj do formatu EPUB/));
    if (!ZIP(out)) throw new Error('the download is not an .epub');
    return 'an .epub';
  });
  await step('compression', async (p) => {
    await upload(p, 'compress', [{ name: 'report.pdf', mimeType: 'application/pdf', buffer: report }]);
    const out = await downloadOf(p, button(p, /Kompresja plików PDF/i));
    if (!PDF(out)) throw new Error('the download is not a PDF');
    return 'a PDF';
  });
  let locked: Uint8Array = new Uint8Array();
  await step('password protection', async (p) => {
    await upload(p, 'protect-pdf', [{ name: 'report.pdf', mimeType: 'application/pdf', buffer: report }]);
    const pw = p.locator('input[type="password"]');
    await pw.nth(0).fill('sekret123');
    await pw.nth(1).fill('sekret123');
    locked = await downloadOf(p, button(p, /Zabezpiecz PDF/));
    if (!PDF(locked) || !(await PDFDocument.load(locked, { ignoreEncryption: true })).isEncrypted) throw new Error('the download is not an encrypted PDF');
    return 'an encrypted PDF';
  });
  await step('unlocking', async (p) => {
    await upload(p, 'unlock-pdf', [{ name: 'locked.pdf', mimeType: 'application/pdf', buffer: Buffer.from(locked) }]);
    await p.locator('input[type="password"]').first().fill('sekret123');
    const out = await downloadOf(p, button(p, /Odblokuj plik PDF/));
    if (!PDF(out) || (await PDFDocument.load(out, { ignoreEncryption: true })).isEncrypted) throw new Error('the download is still encrypted');
    return 'an unlocked PDF';
  });
  await step('OCR (WebAssembly engine)', async (p) => {
    // An image-only page with a known text.
    const canvasMod = await import('@napi-rs/canvas');
    // A named font: "sans-serif" resolves to whatever the machine has (here: a script face).
    canvasMod.GlobalFonts.registerFromPath(join(ROOT, 'public', 'pdfjs-dist', 'standard_fonts', 'LiberationSans-Regular.ttf'), 'OcrTestSans');
    const c = canvasMod.createCanvas(1240, 600);
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 1240, 600);
    g.fillStyle = '#000'; g.font = '56px OcrTestSans';
    g.fillText('Raport kwartalny 2026', 60, 200);
    g.fillText('Sprzedaz i koszty', 60, 340);
    const doc = await PDFDocument.create();
    const img = await doc.embedPng(c.toBuffer('image/png'));
    doc.addPage([595, 288]).drawImage(img, { x: 0, y: 0, width: 595, height: 288 });
    await upload(p, 'ocr-pdf', [{ name: 'scan.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await doc.save()) }]);
    await p.selectOption('#ocr-language', 'pol');
    await p.locator('button', { hasText: 'Uruchom OCR' }).click();
    await p.waitForSelector('#ocr-result', { timeout: 300000 });
    const text = await p.inputValue('#ocr-result');
    if (!/kwartalny/.test(text) || !/koszty/.test(text)) throw new Error(`OCR did not read the page (${JSON.stringify(text)})`);
    return 'the text read back';
  });
  await step('PDF editor (render, fonts, text blocks)', async (p) => {
    await upload(p, 'edit-pdf', [{ name: 'report.pdf', mimeType: 'application/pdf', buffer: report }]);
    await p.waitForSelector('.text-block-hit', { timeout: 60000 });
    return 'pages and text blocks shown';
  });
  // The cloud pickers load the providers' own scripts into this page; each opens a popup on the
  // provider's site, which is closed right away (nothing is typed there).
  // Without the provider's app key in the build (CI), there is no such button: reported as SKIP.
  for (const provider of ['Dropbox', 'OneDrive'] as const) {
    await page.goto(`${BASE_URL}/pl/merge`, { waitUntil: 'load' });
    // No provider configured: the button opens the local file chooser instead of the menu.
    const chooser = page.waitForEvent('filechooser', { timeout: 1500 }).then(() => true).catch(() => false);
    await page.locator('button', { hasText: 'Dodaj z chmury' }).first().click();
    const configured = !(await chooser) && (await page.locator('button', { hasText: provider }).count()) > 0;
    if (!configured) { console.log(`  SKIP ${provider} picker script: not configured in this build`); continue; }
    await step(`${provider} picker script`, async (p) => {
      await p.goto(`${BASE_URL}/pl/merge`, { waitUntil: 'load' });
      await p.locator('button', { hasText: 'Dodaj z chmury' }).first().click();
      const popup = ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null);
      await p.locator('button', { hasText: provider }).first().click();
      const id = provider === 'Dropbox' ? 'dropboxjs' : 'onedrive-js';
      await p.waitForFunction((i) => !!document.getElementById(i), id, { timeout: 30000 });
      const opened = await popup;
      await p.waitForTimeout(1500);
      const popupUrl = opened ? new URL(opened.url()).host : 'none';
      await opened?.close().catch(() => {});
      return `script loaded, sign-in popup opened (${popupUrl})`;
    });
  }
  await ctx.close();
}

console.log('\n=== a sign-in popup still returns its token (Cross-Origin-Opener-Policy) ===');
async function signIn(returnPageCoop: 'as served' | 'same-origin-allow-popups'): Promise<string | null> {
  const ctx = await browser.newContext();
  // The provider: a page on another origin that sends the browser back with a token, as Dropbox does.
  await ctx.route(`${OTHER_ORIGIN}/__provider`, (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: `<!doctype html><script>location.replace(${JSON.stringify(`${BASE_URL}/dropbox-oauth.html#access_token=TEST-TOKEN&token_type=bearer`)})</script>`,
  }));
  if (returnPageCoop !== 'as served') {
    await ctx.route(`${BASE_URL}/dropbox-oauth.html*`, async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, headers: { ...res.headers(), 'cross-origin-opener-policy': returnPageCoop } });
    });
  }
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/pl/merge`, { waitUntil: 'load' });
  const coop = await page.evaluate(async () => (await fetch(location.href)).headers.get('cross-origin-opener-policy'));
  if (coop !== 'same-origin-allow-popups') check(false, `the opening page sends COOP same-origin-allow-popups (${coop})`);
  const token = await page.evaluate(async (url) => new Promise<string | null>((resolve) => {
    window.addEventListener('message', (e) => {
      if (e.origin === location.origin && e.data?.type === 'dropbox-token') resolve(e.data.accessToken);
    });
    window.open(url, 'dropbox-login', 'width=600,height=700');
    setTimeout(() => resolve(null), 10000);
  }), `${OTHER_ORIGIN}/__provider`);
  await ctx.close();
  return token;
}
{
  const token = await signIn('as served');
  check(token === 'TEST-TOKEN', `the token reaches the page that opened the sign-in popup (${token})`);
  const cut = await signIn('same-origin-allow-popups');
  check(cut === null, `control: the same return page sent with the site's COOP loses the token (${cut}) — the exemption is needed`);
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
