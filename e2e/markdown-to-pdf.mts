// Markdown to PDF (plan 2.4, 2026-11-24) and the tagged-PDF writer it shares with HTML to PDF,
// through the real pages, with the downloaded PDF read back by pdf.js and pdf-lib.
//  1. The writer (via /pl/html-to-pdf): inline code and code blocks are set in the monospace font
//     (before: the text font), box-drawing characters the monospace font lacks fall back to the
//     text font, <del> is drawn with a line through it, a nested list is an /L in its item's /LBody
//     (before: flattened into one item), and a code block is tagged /Code.
//  2. The new tool: the example, a .md file with web images and an emoji, a Windows-1250 .txt file,
//     a file that is not text; no request carries the text; axe in both themes; the English
//     example on the Arabic page (the PDF font has no Arabic letters, and says so for Arabic text).
// Run against a built site: E2E_BASE_URL=http://localhost:3100 npx tsx e2e/markdown-to-pdf.mts
import { chromium, type Page } from 'playwright';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream, PDFName, PDFRef, PDFString } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const origin = new URL(BASE_URL).origin;
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

interface Item { str: string; x: number; y: number; w: number; h: number; font: string }
interface Node { role?: string; type?: string; children?: Node[] }
interface Read { items: Item[]; tree: Node; text: string; lines: { x1: number; y1: number; x2: number; y2: number }[]; title?: string; lang?: string; name: string }

async function readPdf(bytes: Uint8Array, name: string): Promise<Read> {
  const task = pdfjs.getDocument({ data: bytes.slice(), fontExtraProperties: true, verbosity: 0 });
  const doc = await task.promise;
  const items: Item[] = [];
  let tree: Node = {};
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p);
    await pg.getOperatorList();
    const tc = await pg.getTextContent();
    for (const it of tc.items as { str: string; transform: number[]; width: number; height: number; fontName: string }[]) {
      if (!it.str) continue;
      let font = it.fontName;
      try { font = (pg.commonObjs.get(it.fontName) as { name?: string }).name ?? it.fontName; } catch { /* keep the id */ }
      items.push({ str: it.str, x: it.transform[4]!, y: it.transform[5]!, w: it.width, h: it.height, font });
    }
    if (p === 1) tree = (await pg.getStructTree()) as Node;
  }
  await task.destroy();
  const lib = await PDFDocument.load(bytes);
  const lines: Read['lines'] = [];
  const contents = lib.getPage(0).node.Contents();
  const streams = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
  for (const s of streams) {
    const raw = s instanceof PDFRef ? lib.context.lookup(s) : s;
    if (!(raw instanceof PDFRawStream)) continue;
    const src = new TextDecoder('latin1').decode(decodePDFRawStream(raw).decode());
    for (const m of src.matchAll(/(-?[\d.]+) (-?[\d.]+) m\s+(-?[\d.]+) (-?[\d.]+) l\s+S/g)) lines.push({ x1: +m[1]!, y1: +m[2]!, x2: +m[3]!, y2: +m[4]! });
  }
  const lang = lib.catalog.get(PDFName.of('Lang'));
  return { items, tree, text: items.map((i) => i.str).join(' '), lines, title: lib.getTitle(), lang: lang instanceof PDFString ? lang.decodeText() : undefined, name };
}

const roles = (n: Node, out: string[] = []): string[] => { if (n.role) out.push(n.role); (n.children ?? []).forEach((c) => roles(c, out)); return out; };
const find = (n: Node, role: string): Node[] => [...(n.role === role ? [n] : []), ...(n.children ?? []).flatMap((c) => find(c, role))];
const itemWith = (r: Read, s: string) => r.items.find((i) => i.str.includes(s));

async function download(page: Page, button: string): Promise<{ bytes: Uint8Array; name: string }> {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator(button).click()]);
  return { bytes: new Uint8Array(readFileSync((await dl.path())!)), name: dl.suggestedFilename() };
}

const browser = await chromium.launch();
try {
  console.log('=== the tagged-PDF writer: code, strikethrough, nested lists (via HTML to PDF) ===');
  {
    const page = await browser.newPage({ acceptDownloads: true });
    await page.goto(`${BASE_URL}/pl/html-to-pdf`, { waitUntil: 'load' });
    await page.locator('textarea').fill([
      '<html lang="pl"><head><title>Test</title></head><body>',
      '<p>Wywołaj <code>zapisz()</code> zamiast <del>usunięte słowo</del> teraz.</p>',
      '<ul><li>Owoce<ul><li>jabłko</li><li>gruszka</li></ul></li><li>Warzywa</li></ul>',
      '<pre>src\n├── app.ts\n└── lib.ts</pre>',
      '</body></html>'].join(''));
    const { bytes } = await download(page, '[data-testid="html-to-pdf-submit"]');
    const r = await readPdf(bytes, 'html');
    const code = itemWith(r, 'zapisz()');
    const body = itemWith(r, 'Wywołaj');
    check(!!code && /Cousine/i.test(code.font) && !!body && !/Cousine/i.test(body.font), `inline code is in the monospace font (${code?.font}), the paragraph in the text font (${body?.font})`);
    const tree = itemWith(r, 'app.ts');
    check(!!tree && /Cousine/i.test(tree.font), `a code block is in the monospace font (${tree?.font})`);
    const box = r.items.find((i) => i.str.includes('├'));
    check(!!box && !/Cousine/i.test(box.font), `box-drawing characters fall back to the text font, which has them (${box?.font})`);
    const del = itemWith(r, 'usunięte');
    const strike = del && r.lines.find((l) => Math.abs(l.y1 - l.y2) < 0.01 && l.y1 > del.y + del.h * 0.15 && l.y1 < del.y + del.h * 0.55 && l.x1 >= del.x - 1 && l.x1 < del.x + del.w);
    check(!!strike, `<del> has a line through it (${strike ? `y ${strike.y1.toFixed(1)} over text at ${del!.y.toFixed(1)}` : 'no line found'})`);
    const lis = find(r.tree, 'LI');
    // The nested list is in the item's body: /LI > /LBody > (/P, /L) — an /LI holds only /Lbl and /LBody.
    const nested = lis.find((li) => (li.children ?? []).some((c) => c.role === 'LBody' && (c.children ?? []).some((d) => d.role === 'L')));
    check(!!nested && find(nested, 'LI').length === 3, `the nested list is an /L in the /LBody of its item, with its own items (${lis.length} LI)`);
    check(lis.every((li) => (li.children ?? []).every((c) => c.role === 'Lbl' || c.role === 'LBody' || c.type === 'content')), 'every /LI holds only /Lbl and /LBody');
    check(find(r.tree, 'Code').length >= 1, 'the code block is tagged /Code');
    const owoce = itemWith(r, 'Owoce'), jablko = itemWith(r, 'jabłko');
    check(!!owoce && !!jablko && jablko.x > owoce.x + 10, `nested items are indented (${owoce?.x.toFixed(0)} → ${jablko?.x.toFixed(0)})`);
    // The bullet sits on the item's baseline (it was drawn 3.5 pt higher than the text beside it).
    const bullet = r.items.find((i) => i.str.trim() === '•' && owoce && Math.abs(i.y - owoce.y) < 8);
    check(!!bullet && !!owoce && Math.abs(bullet.y - owoce.y) < 0.2, `list bullets sit on the text's baseline (${bullet?.y.toFixed(2)} vs ${owoce?.y.toFixed(2)})`);
    await page.close();
  }

  console.log('\n=== Markdown to PDF: the example ===');
  {
    const ctx = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/pl/markdown-to-pdf`, { waitUntil: 'networkidle' });
    const seen: { method: string; url: string; bytes: number }[] = [];
    page.on('request', (q) => seen.push({ method: q.method(), url: q.url(), bytes: q.postDataBuffer()?.length ?? 0 }));
    await page.getByRole('button', { name: 'Wczytaj przykład' }).click();
    const preview = page.locator('[data-testid="md-preview"]');
    check(await preview.locator('h1').innerText() === 'Notatki ze spotkania', 'the preview shows the example as a document');
    check(await preview.locator('table').count() === 1 && await preview.locator('li ul').count() === 1, 'with a table and a nested list');
    const { bytes, name } = await download(page, '[data-testid="md-to-pdf-submit"]');
    const r = await readPdf(bytes, name);
    check(name === 'dokument.pdf', `the file is named in the page's language (${name})`);
    check(r.title === 'Notatki ze spotkania' && r.lang === 'pl', `title from the first heading, language of the page (${r.title}, ${r.lang})`);
    const rs = roles(r.tree);
    check(['H1', 'H2', 'L', 'LI', 'Table', 'TH', 'TD', 'BlockQuote', 'P'].every((x) => rs.includes(x)), `tagged: ${[...new Set(rs)].join(' ')}`);
    // pdf.js splits monospace text at spaces, so compare with the spaces collapsed.
    const flat = r.text.replace(/\s+/g, '');
    check(flat.includes('[x]Wysłaćplanspotkania') && flat.includes('[]Zarezerwowaćsalę'), 'task list items keep their checkboxes as [x] / [ ]');
    const cmd = itemWith(r, 'npm');
    check(!!cmd && /Cousine/i.test(cmd.font), `inline code in the monospace font (${cmd?.font})`);
    check(await page.locator('[data-testid="md-missing-glyphs"]').count() === 0 && await page.locator('[data-testid="md-skipped-images"]').count() === 0, 'no warnings for the example');
    await page.waitForTimeout(800);
    const bad = seen.filter((q) => (q.method !== 'GET' && q.method !== 'HEAD') || q.bytes > 0 || !(q.url.startsWith(origin) || q.url.startsWith('blob:') || q.url.startsWith('data:')));
    check(bad.length === 0, `the text never leaves the browser: ${seen.length} requests, all GET to this site${bad.length ? ` (${bad.map((q) => `${q.method} ${q.url}`).join('; ')})` : ''}`);
    await ctx.close();
  }

  console.log('\n=== a .md file with web images and an emoji; a Windows-1250 .txt; a PDF ===');
  {
    const page = await browser.newPage({ acceptDownloads: true });
    await page.goto(`${BASE_URL}/pl/markdown-to-pdf`, { waitUntil: 'load' });
    const md = '# Plan\n\nGotowe ✅ dziś.\n\n![logo firmy](https://example.com/logo.png)\n\n![](images/a.png)\n';
    await page.setInputFiles('#fileInput', { name: 'plan.md', mimeType: 'text/markdown', buffer: Buffer.from(md) });
    await page.locator('[data-testid="md-preview"] h1').waitFor();
    check(/: 2\./.test(await page.locator('[data-testid="md-skipped-images"]').innerText()), 'two images by address/path are reported as left out');
    check((await page.locator('[data-testid="md-missing-glyphs"]').innerText()).includes('✅'), 'the emoji is listed as a character the PDF font cannot draw');
    const { bytes, name } = await download(page, '[data-testid="md-to-pdf-submit"]');
    const r = await readPdf(bytes, name);
    check(name === 'plan.pdf' && r.title === 'Plan' && /\[logo firmy\]/.test(r.text), `named after the file, the image's description in its place (${name}, "${r.title}")`);

    // "Zażółć gęślą jaźń" saved by Polish Windows Notepad (ANSI = Windows-1250).
    const cp1250 = Buffer.from([0x5A, 0x61, 0xBF, 0xF3, 0xB3, 0xE6, 0x20, 0x67, 0xEA, 0x9C, 0x6C, 0xB9, 0x20, 0x6A, 0x61, 0x9F, 0xF1, 0x0D, 0x0A, 0x0D, 0x0A, 0x41, 0x20, 0x20, 0x20, 0x42]);
    await page.setInputFiles('#fileInput', { name: 'notatka.txt', mimeType: 'text/plain', buffer: cp1250 });
    await page.locator('[data-testid="md-encoding"]').waitFor();
    check((await page.locator('[data-testid="md-encoding"]').innerText()).includes('Windows-1250'), 'the page says the file was read as Windows-1250');
    check(await page.locator('input[name="md-mode"][value="text"]').isChecked(), '.txt switches to plain text');
    await page.getByLabel(/Zachowaj spacje/).check();
    const t2 = await download(page, '[data-testid="md-to-pdf-submit"]');
    const r2 = await readPdf(t2.bytes, t2.name);
    check(r2.text.replace(/\s+/g, ' ').startsWith('Zażółć gęślą jaźń'), `Polish letters come out right (${r2.text.slice(0, 30)})`);
    const a = itemWith(r2, 'A'), b = r2.items.find((i) => i.str.trim() === 'B' || /A {3}B/.test(i.str));
    check(!!a && /Cousine/i.test(a.font) && (!!b && (b === a ? /A {3}B/.test(a.str) : b.x - a.x > 15)), `"keep layout" keeps the spaces in the monospace font (${a?.str} / ${a?.font})`);

    await page.setInputFiles('#fileInput', { name: 'skan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
    check((await page.locator('main [role="alert"]').innerText()).includes('.md lub .txt'), 'a PDF is refused with a message naming the right files');
    await page.close();
  }

  console.log('\n=== the Arabic page: example in English, Arabic text warned about ===');
  {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/ar/markdown-to-pdf`, { waitUntil: 'load' });
    await page.locator('main button').filter({ hasText: 'تحميل مثال' }).click();
    check(await page.locator('[data-testid="md-preview"] h1').innerText() === 'Meeting notes' && await page.locator('[data-testid="md-missing-glyphs"]').count() === 0, 'the example can be drawn (English), no warning');
    await page.locator('#md-text').fill('# مرحبا\n\nنص');
    check((await page.locator('[data-testid="md-missing-glyphs"]').innerText()).includes('م'), 'Arabic letters are listed as not drawable by the PDF font');
    await page.close();
  }

  console.log('\n=== legible in both themes (axe), with the preview and a warning on screen ===');
  const axeSource = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
  for (const theme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ colorScheme: theme, serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
    const pg = await ctx.newPage();
    await pg.goto(`${BASE_URL}/pl/markdown-to-pdf`, { waitUntil: 'load' });
    if (theme === 'dark') await pg.evaluate(() => document.documentElement.classList.add('dark'));
    await pg.locator('#md-text').fill('# Tytuł\n\nTekst ✓ i ![x](https://example.com/x.png)\n\n> cytat\n\n`kod`');
    await pg.locator('[data-testid="md-skipped-images"]').waitFor();
    await pg.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity), undefined, { timeout: 10000 });
    await pg.addScriptTag({ content: axeSource });
    const res = await pg.evaluate(async () => (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } })
      .axe.run('main', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
    const v = res.violations.map((x) => `${x.id}×${x.nodes.length} (${x.nodes[0]?.target.join(' ').slice(0, 50)})`).join(', ');
    check(!v, `${theme}: axe (WCAG 2.2 AA): ${v || 'clean'}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
