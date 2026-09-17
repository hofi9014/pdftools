// WCAG 2.2 / PDF accessibility audit, step 3 — htmlToTaggedPdf() (lib/pdf/htmlToTaggedPdf.ts)
// replaced the old htmlToPdf(), which discarded all HTML structure before rendering
// (`html.replace(/<[^>]*>/g, '')`) and so could never produce a Tagged PDF. This drives the
// real /html-to-pdf tool exactly as a user would (real DOMParser, real font fetches against the
// dev server, real atob for the embedded image), captures the generated PDF's bytes via a
// URL.createObjectURL patch (the app's own download path, not a special test hook), and
// verifies the result two ways: with pdf-lib (this module's own writer library) AND
// independently with pdf.js's getStructTree()/getTextContent()/getAnnotations() — a completely
// separate implementation (Mozilla's), the same "don't just trust your own code" standard used
// for the PAdES signature feature (cross-checked with pyhanko) and the redaction structure-tree
// fix (cross-checked the same way).
//
// Two real bugs were caught this way during development, not found by inspection:
// (1) decorative Artifact-tagged content (blockquote rule, table grid lines, <hr>) used the BDC
//     operator (which requires a tag + a property list — 2 operands) with only 1 operand; pdf.js
//     logged "Skipping command BDC: expected 2 args" and silently dropped it. Fixed by using BMC
//     (Begin Marked Content — the 1-operand form with no property list) for Artifact content.
// (2) punctuation immediately after a styled run (e.g. `<b>word</b>,`) got an incorrect extra
//     leading space, because every run boundary was treated as a word boundary regardless of
//     whether the source actually had whitespace there.
//
// A separate, pdf-lib-only check (not requiring a live server) also pins the multi-page
// StructParents/ParentTree bug found and fixed during development: pdf.removePage-style page
// indexing off-by-one that would have made every page after the first point at the wrong
// /ParentTree entry.

import { chromium } from 'playwright';
import { PDFDocument, PDFName, PDFDict, PDFArray } from 'pdf-lib';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else { console.log(`  FAIL ${msg}`); fails++; }
}

const TEST_HTML = `<html lang="pl"><head><title>Testowy dokument</title></head><body>
<h1>Nagłówek główny</h1>
<p>To jest akapit z <b>pogrubieniem</b>, <i>kursywą</i> i <a href="https://example.com">linkiem</a>.</p>
<h2>Lista</h2>
<ul><li>Pierwszy punkt</li><li>Drugi punkt</li></ul>
<h2>Tabela</h2>
<table><tr><th>Kolumna A</th><th>Kolumna B</th></tr><tr><td>1</td><td>2</td></tr></table>
<blockquote>To jest cytat.</blockquote>
<hr>
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QzwAGjKMYRjUAJwEHAB9GYW7bAAAAAElFTkSuQmCC" alt="Testowy obrazek">
</body></html>`;

async function generateViaRealUi(html: string): Promise<Uint8Array> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('_next/webpack-hmr')) consoleErrors.push(msg.text()); });

  await page.goto(`${BASE_URL}/html-to-pdf`, { waitUntil: 'load' });

  // Patch the exact call the app itself makes on success (URL.createObjectURL(blob)) to stash
  // the blob for inspection — the real download path, not a bypass of it.
  await page.evaluate(() => {
    (window as unknown as { __capturedBlob: Blob | null }).__capturedBlob = null;
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = ((obj: Blob) => {
      if (obj instanceof Blob) (window as unknown as { __capturedBlob: Blob }).__capturedBlob = obj;
      return orig(obj);
    }) as typeof URL.createObjectURL;
  });

  const textarea = page.locator('textarea');
  await textarea.fill(html);

  // Dismiss the cookie-consent banner if it's showing (fresh browser context = fresh consent
  // state) — it can otherwise overlay the submit button and block the click.
  const declineButton = page.locator('button:has-text("Odrzucam"), button:has-text("Decline"), button:has-text("Reject")').first();
  if (await declineButton.isVisible().catch(() => false)) await declineButton.click();

  await page.locator('[data-testid="html-to-pdf-submit"]').click();

  await page.waitForFunction(() => !!(window as unknown as { __capturedBlob: Blob | null }).__capturedBlob, { timeout: 15000 });

  const base64 = await page.evaluate(async () => {
    const blob = (window as unknown as { __capturedBlob: Blob }).__capturedBlob;
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return btoa(binary);
  });

  check(consoleErrors.length === 0, `no console/page errors during generation (got: ${JSON.stringify(consoleErrors.slice(0, 3))})`);
  await browser.close();
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

console.log('=== html-to-pdf: real UI generates a genuinely Tagged PDF ===');
const bytes = await generateViaRealUi(TEST_HTML);
check(bytes.length > 1000, `generated a non-trivial PDF (${bytes.length} bytes)`);
check(Buffer.from(bytes.slice(0, 5)).toString() === '%PDF-', 'output starts with a real PDF header');

// --- pdf-lib: the writer's own view of what it wrote ---
const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
check(doc.getPageCount() === 1, `single page for this short input (got: ${doc.getPageCount()})`);
check(doc.getTitle() === 'Testowy dokument', `title pulled from <title> (got: ${doc.getTitle()})`);
const catalog = doc.catalog;
const structTreeRoot = catalog.lookupMaybe(PDFName.of('StructTreeRoot'), PDFDict);
const markInfo = catalog.lookupMaybe(PDFName.of('MarkInfo'), PDFDict);
check(!!structTreeRoot, '/StructTreeRoot present');
check(markInfo?.get(PDFName.of('Marked'))?.toString() === 'true', 'MarkInfo/Marked=true — and, unlike the earlier convertToPdfA bug, this time it is actually true: real structure exists');
check(catalog.get(PDFName.of('Lang'))?.toString() === '(pl)', `catalog /Lang set from <html lang> (got: ${catalog.get(PDFName.of('Lang'))?.toString()})`);
const topKids = structTreeRoot!.lookupMaybe(PDFName.of('K'), PDFArray);
const topRoles: string[] = [];
for (let i = 0; i < (topKids?.size() ?? 0); i++) {
  const el = doc.context.lookup(topKids!.get(i), PDFDict);
  topRoles.push(el.get(PDFName.of('S'))?.toString().replace('/', '') ?? '?');
}
check(JSON.stringify(topRoles) === JSON.stringify(['H1', 'P', 'H2', 'L', 'H2', 'Table', 'BlockQuote', 'Figure']), `top-level structure in correct reading order (got: ${JSON.stringify(topRoles)})`);

// --- Independent verification: pdf.js, a completely separate implementation ---
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
const pdfjsDoc = await pdfjsLib.getDocument({ data: bytes, standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/' }).promise;
const pjsPage = await pdfjsDoc.getPage(1);
const tree = await pjsPage.getStructTree();
check(tree.role === 'Root' && Array.isArray(tree.children) && tree.children.length === 8, `pdf.js independently parses the same 8-element structure tree (got role=${tree.role}, children=${tree.children?.length})`);
const listNode = tree.children?.find((c: { role?: string }) => c.role === 'L');
const liNodes = (listNode?.children ?? []) as { role?: string; children?: { role?: string }[] }[];
check(liNodes.length === 2 && liNodes.every((li) => li.role === 'LI'), `list has 2 /LI children (got: ${JSON.stringify(liNodes.map((l) => l.role))})`);
check(!!liNodes[0]?.children?.some((c) => c.role === 'Lbl') && !!liNodes[0]?.children?.some((c) => c.role === 'LBody'), 'each list item has both /Lbl (bullet) and /LBody (text) children');
const tableNode = tree.children?.find((c: { role?: string }) => c.role === 'Table');
const trNodes = (tableNode?.children ?? []) as { role?: string; children?: { role?: string }[] }[];
check(trNodes.length === 2 && trNodes[0]?.children?.every((c) => c.role === 'TH') && trNodes[1]?.children?.every((c) => c.role === 'TD'), `table has a /TH header row and a /TD data row (got: ${JSON.stringify(trNodes.map((r) => r.children?.map((c) => c.role)))})`);
const figureNode = tree.children?.find((c: { role?: string }) => c.role === 'Figure') as { alt?: string } | undefined;
check(figureNode?.alt === 'Testowy obrazek', `Figure carries the real <img alt> text via pdf.js's own alt-text extraction (got: ${JSON.stringify(figureNode?.alt)})`);

const textContent = await pjsPage.getTextContent();
const text = textContent.items.map((i: { str: string }) => i.str).join('');
check(text.includes('Nagłówek główny'), 'heading text present');
check(text.includes('pogrubieniem') && text.includes('kursywą') && text.includes('linkiem'), 'paragraph text (incl. bold/italic/link runs) present');
check(!text.includes('pogrubieniem ,'), 'no stray space before punctuation after a styled run (regression guard for the fix)');
check(!text.includes('linkiem .'), 'no stray space before the trailing period after a link run (regression guard for the fix)');
check(text.includes('Pierwszy punkt') && text.includes('Drugi punkt'), 'list item text present');
check(text.includes('Kolumna A') && text.includes('Kolumna B') && text.includes('1') && text.includes('2'), 'table cell text present');
check(text.includes('To jest cytat'), 'blockquote text present');

const annots = await pjsPage.getAnnotations();
const linkAnnot = annots.find((a: { subtype: string }) => a.subtype === 'Link');
check(!!linkAnnot && (linkAnnot as { url?: string }).url?.startsWith('https://example.com'), `real clickable /Link annotation with the href from <a> (got: ${JSON.stringify((linkAnnot as { url?: string } | undefined)?.url)})`);

// --- Multi-page StructParents/ParentTree correctness — through the same real UI/browser path
// (Node has no built-in DOMParser, so this goes through the live page like everything above,
// rather than importing htmlToTaggedPdf directly and hitting a ReferenceError). ---
console.log('\n=== Multi-page: /StructParents and /ParentTree stay in sync across pages ===');
{
  let longHtml = '<html lang="pl"><head><title>Wielostronicowy</title></head><body>';
  for (let i = 1; i <= 60; i++) {
    longHtml += `<h2>Sekcja ${i}</h2><p>To jest akapit numer ${i} z przykładowym tekstem, który powtarza się wielokrotnie, aby wymusić przepełnienie strony i utworzenie kolejnej strony w dokumencie PDF. Tekst musi być dostatecznie długi.</p>`;
  }
  longHtml += '</body></html>';
  const mpBytes = await generateViaRealUi(longHtml);
  const mpDoc = await PDFDocument.load(mpBytes, { ignoreEncryption: true });
  check(mpDoc.getPageCount() > 1, `long input actually spans multiple pages (got: ${mpDoc.getPageCount()})`);
  const mpStructTreeRoot = mpDoc.catalog.lookupMaybe(PDFName.of('StructTreeRoot'), PDFDict)!;
  const parentTree = mpStructTreeRoot.lookupMaybe(PDFName.of('ParentTree'), PDFDict)!;
  const nums = parentTree.lookupMaybe(PDFName.of('Nums'), PDFArray)!;
  const numsKeys: number[] = [];
  for (let i = 0; i < nums.size(); i += 2) numsKeys.push(Number(nums.get(i).toString()));
  const pageStructParents = Array.from({ length: mpDoc.getPageCount() }, (_, i) => {
    const sp = mpDoc.getPage(i).node.get(PDFName.of('StructParents'));
    return sp ? Number(sp.toString()) : null;
  });
  const expected = Array.from({ length: mpDoc.getPageCount() }, (_, i) => i);
  check(JSON.stringify(pageStructParents) === JSON.stringify(expected), `every page's /StructParents is sequential 0..N-1, no off-by-one (got: ${JSON.stringify(pageStructParents)})`);
  check(JSON.stringify(numsKeys) === JSON.stringify(expected), `/ParentTree/Nums keys match the same 0..N-1 sequence (got: ${JSON.stringify(numsKeys)})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
