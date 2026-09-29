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
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream } from 'pdf-lib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';

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
// Sample for an external PDF/UA validator (veraPDF). Written now: pdf.js below takes over (detaches)
// the buffer it is given.
mkdirSync('test-output', { recursive: true });
writeFileSync('test-output/html-to-pdf-tagged.pdf', bytes);

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

// --- PDF/UA-1 gaps found by veraPDF (2026-09-28) and fixed 2026-09-29 — read from the file
// the real UI produced, not from the writer's own state. ---
{
  const page1 = doc.getPage(0).node;
  check(page1.get(PDFName.of('Tabs'))?.toString() === '/S', `7.18.3#1: a page with annotations has /Tabs /S (got: ${page1.get(PDFName.of('Tabs'))?.toString()})`);
  const annotRefs = page1.lookupMaybe(PDFName.of('Annots'), PDFArray);
  const annot = annotRefs ? doc.context.lookup(annotRefs.get(0), PDFDict) : undefined;
  check(annot?.get(PDFName.of('Contents'))?.toString() === '(linkiem)', `7.18.5#2/7.18.1#2: the link annotation's /Contents is the link text (got: ${annot?.get(PDFName.of('Contents'))?.toString()})`);
  const key = Number(annot?.get(PDFName.of('StructParent'))?.toString());
  const nums = doc.context.lookup(structTreeRoot!.get(PDFName.of('ParentTree')), PDFDict).lookup(PDFName.of('Nums'), PDFArray);
  let owner: PDFDict | undefined;
  for (let i = 0; i < nums.size(); i += 2) if (Number(nums.get(i).toString()) === key) owner = doc.context.lookup(nums.get(i + 1), PDFDict);
  check(owner?.get(PDFName.of('S'))?.toString() === '/Link', `7.18.5#1: the annotation's /StructParent resolves to a /Link StructElem (got: ${owner?.get(PDFName.of('S'))?.toString()})`);
  const objr = owner?.lookupMaybe(PDFName.of('K'), PDFArray);
  const objrDict = objr ? doc.context.lookup(objr.get(0), PDFDict) : undefined;
  check(objrDict?.get(PDFName.of('Type'))?.toString() === '/OBJR' && objrDict.get(PDFName.of('Obj')) === annotRefs?.get(0), 'the /Link StructElem points back at the annotation through an /OBJR');
  const linkParent = owner ? doc.context.lookup(owner.get(PDFName.of('P')), PDFDict) : undefined;
  check(linkParent?.get(PDFName.of('S'))?.toString() === '/P', `the /Link element sits in the paragraph that holds the link text (got: ${linkParent?.get(PDFName.of('S'))?.toString()})`);
  const pNode = tree.children?.find((c: { role?: string }) => c.role === 'P') as { children?: { role?: string }[] } | undefined;
  check(!!pNode?.children?.some((c) => c.role === 'Link'), 'pdf.js independently sees the /Link element inside the paragraph');
  const tableEl = doc.context.lookup(topKids!.get(topRoles.indexOf('Table')), PDFDict);
  const headerRow = doc.context.lookup(tableEl.lookup(PDFName.of('K'), PDFArray).get(0), PDFDict);
  const thKids = headerRow.lookupMaybe(PDFName.of('K'), PDFArray);
  const scopes: string[] = [];
  for (let i = 0; i < (thKids?.size() ?? 0); i++) {
    const th = doc.context.lookup(thKids!.get(i), PDFDict);
    scopes.push(th.lookupMaybe(PDFName.of('A'), PDFDict)?.get(PDFName.of('Scope'))?.toString() ?? '-');
  }
  check(scopes.length === 2 && scopes.every((s) => s === '/Column'), `7.5#1: every /TH carries /Scope /Column (got: ${JSON.stringify(scopes)})`);
  const meta = catalog.lookupMaybe(PDFName.of('Metadata'), PDFRawStream);
  const xmp = meta ? Buffer.from(meta.getContents()).toString('utf8') : '';
  check(meta?.dict.get(PDFName.of('Type'))?.toString() === '/Metadata' && meta.dict.get(PDFName.of('Subtype'))?.toString() === '/XML', '7.1#8: the catalog has an XMP /Metadata stream (Type /Metadata, Subtype /XML)');
  check(xmp.includes('Testowy dokument') && /<pdfuaid:part>1<\/pdfuaid:part>/.test(xmp), 'the XMP carries dc:title and the PDF/UA identification (pdfuaid:part 1)');
}

// --- Image DPI fix (2026-09-23): the embedded 10x10px PNG must be drawn at 10*(72/96)=7.5pt,
// not 10pt (the old code's 1px=1pt bug) — read the actual drawn size back from the operator
// list by properly simulating the CTM stack (a plain "nearest preceding save" backward scan,
// used elsewhere in this suite for simpler cases, breaks here: pdf-lib's drawImage() now wraps
// the paint op in its own inner save/setGState/restore for the image's default graphics state,
// with no transform of its own — a backward scan stops at that inner save and misses the real
// position/scale transforms just outside it). A full forward pass with an explicit CTM stack,
// exactly mirroring how a real PDF interpreter processes `q`/`cm`/`Q`, gets this right
// unconditionally regardless of how many (transform-less) nested save/restore pairs pdf-lib
// wraps around the paint op. ---
{
  const opList = await pjsPage.getOperatorList();
  type Mat = [number, number, number, number, number, number];
  const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];
  const mul = (m: Mat, n: Mat): Mat => [
    m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
  ];
  let ctm: Mat = IDENTITY;
  const stack: Mat[] = [];
  let drawnWidth: number | null = null;
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    if (fn === pdfjsLib.OPS.save) stack.push(ctm);
    else if (fn === pdfjsLib.OPS.restore) ctm = stack.pop() ?? IDENTITY;
    else if (fn === pdfjsLib.OPS.transform) ctm = mul(opList.argsArray[i] as Mat, ctm);
    else if (fn === pdfjsLib.OPS.paintImageXObject) drawnWidth = Math.sqrt(ctm[0] * ctm[0] + ctm[1] * ctm[1]);
  }
  check(drawnWidth !== null && Math.abs(drawnWidth - 7.5) < 0.01, `the 10px-wide image is drawn at 7.5pt (96 DPI), not 10pt — the pre-fix 1px=1pt bug (got: ${drawnWidth})`);
}

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

// --- Tall-image overflow fix (2026-09-23): a very tall image (e.g. a portrait screenshot
// scaled to content width) whose scaled height would exceed a full page's usable height must be
// scaled down further (preserving aspect ratio) so it always fits within a single page, instead
// of silently overflowing past the bottom margin and being clipped by the page boundary. ---
console.log('\n=== Tall image: a very tall image is scaled down to fit within a single page, not clipped ===');
{
  // 200x2000px, solid color — real pixel dimensions matter here (not content), so a flat fill
  // is enough. At 96 DPI this is 150x1500pt raw, far taller than a full page's ~741.89pt usable
  // height, so BOTH the width cap (150pt is already under the ~495pt content width) and the new
  // height cap must combine correctly: old code (no height cap) would only apply the width cap
  // (a no-op here) and draw at the full, unclipped-by-code 1500pt height.
  const canvas = createCanvas(200, 2000);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3366cc';
  ctx.fillRect(0, 0, 200, 2000);
  const tallImageDataUrl = canvas.toDataURL('image/png');

  const tallHtml = `<html lang="pl"><head><title>Wysoki obraz</title></head><body><img src="${tallImageDataUrl}" alt="Wysoki obraz testowy"></body></html>`;
  const tallBytes = await generateViaRealUi(tallHtml);
  const tallPdfjsDoc = await pdfjsLib.getDocument({ data: tallBytes, standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/' }).promise;

  type Mat2 = [number, number, number, number, number, number];
  const IDENTITY2: Mat2 = [1, 0, 0, 1, 0, 0];
  const mul2 = (m: Mat2, n: Mat2): Mat2 => [
    m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
  ];
  // ensureSpace() only calls newPage() ONCE when the current page lacks room, without
  // re-checking afterward — pre-fix, a still-too-tall image doesn't stay on page 1, it moves
  // to page 2 (and would still overflow there too, invisibly). Searching every page (not just
  // page 1) makes this check honestly characterize BOTH possible pre-fix outcomes rather than
  // assuming the image landed on the first page.
  let drawnHeight: number | null = null;
  let foundOnPage = -1;
  for (let p = 1; p <= tallPdfjsDoc.numPages; p++) {
    const tallPage = await tallPdfjsDoc.getPage(p);
    const tallOpList = await tallPage.getOperatorList();
    let ctm2: Mat2 = IDENTITY2;
    const stack2: Mat2[] = [];
    for (let i = 0; i < tallOpList.fnArray.length; i++) {
      const fn = tallOpList.fnArray[i];
      if (fn === pdfjsLib.OPS.save) stack2.push(ctm2);
      else if (fn === pdfjsLib.OPS.restore) ctm2 = stack2.pop() ?? IDENTITY2;
      else if (fn === pdfjsLib.OPS.transform) ctm2 = mul2(tallOpList.argsArray[i] as Mat2, ctm2);
      else if (fn === pdfjsLib.OPS.paintImageXObject) { drawnHeight = Math.sqrt(ctm2[2] * ctm2[2] + ctm2[3] * ctm2[3]); foundOnPage = p; }
    }
    if (drawnHeight !== null) break;
  }
  const PAGE_HEIGHT_USABLE = 841.89 - 50 * 2; // mirrors PAGE_HEIGHT/MARGIN in lib/pdf/htmlToTaggedPdf.ts
  check(drawnHeight !== null, `a drawn image was found somewhere across all ${tallPdfjsDoc.numPages} page(s) of the tall-image output PDF (found on page: ${foundOnPage})`);
  check(drawnHeight !== null && drawnHeight <= PAGE_HEIGHT_USABLE + 0.5, `the tall image's drawn height fits within a single page's usable height (${PAGE_HEIGHT_USABLE.toFixed(2)}pt) — got ${drawnHeight?.toFixed(2)}pt on page ${foundOnPage}, NOT the old unclipped-by-code 1500pt`);
  check(drawnHeight !== null && drawnHeight > 700, `the tall image is still scaled as large as it can be while fitting (not over-shrunk) — got ${drawnHeight?.toFixed(2)}pt`);
  check(tallPdfjsDoc.numPages === 1, `the single tall image fits on one page — no unnecessary extra page (got: ${tallPdfjsDoc.numPages})`);
}

// --- Oversized table row (2026-09-24): a row whose wrapped cell content is taller than a whole
// page used to be drawn once, running off the bottom margin (text at negative y, clipped by the
// page boundary). It must now be split across pages: every word still present, no text drawn
// below the bottom margin, and more than one page produced. pdf.js getTextContent() reports text
// even when it lies outside the page box, so the assertion is on each item's baseline position,
// not just its presence. ---
console.log('\n=== Oversized table row is split across pages, nothing drawn below the margin ===');
{
  const words = Array.from({ length: 700 }, (_, i) => `w${i}x`);
  const tableHtml = `<html lang="pl"><head><title>Wysoki wiersz</title></head><body><table><tr><th>Kolumna A</th><th>Kolumna B</th></tr><tr><td>${words.join(' ')}</td><td>krótka komórka</td></tr><tr><td>po</td><td>tabeli</td></tr></table></body></html>`;
  const bytes = await generateViaRealUi(tableHtml);
  const doc = await pdfjsLib.getDocument({ data: bytes, standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/' }).promise;
  check(doc.numPages >= 2, `the oversized row spills onto more than one page (got ${doc.numPages})`);
  const seen = new Set<string>();
  let lowest = Infinity;
  for (let pg = 1; pg <= doc.numPages; pg++) {
    const tc = await (await doc.getPage(pg)).getTextContent();
    for (const it of tc.items as Array<{ str: string; transform: number[] }>) {
      if (!it.str.trim()) continue;
      for (const w of it.str.split(/\s+/)) seen.add(w);
      lowest = Math.min(lowest, it.transform[5]!);
    }
  }
  const missing = words.filter((w) => !seen.has(w));
  check(missing.length === 0, `all 700 words of the oversized cell are present (missing: ${missing.length})`);
  check(lowest >= 50 - 1, `no text baseline lies below the 50pt bottom margin (lowest baseline: ${lowest.toFixed(2)}pt)`);
  check(seen.has('tabeli') && seen.has('po'), 'the row AFTER the oversized one is still rendered');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
