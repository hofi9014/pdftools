// Audit finding (High, backend area) — app/api/url-to-pdf/route.ts's POST() handler had two
// independent bugs in the same few lines, found together while scanning this route for the
// already-suspected "<script>/<style> content leaks into extracted text" issue.
//
// Bug 1 (the one being scanned for, confirmed real): the old text extraction only stripped HTML
// TAGS (`html.replace(/<[^>]*>/g, '')`), which does nothing to remove the TEXT CONTENT of
// <script> and <style> elements — raw JavaScript source and raw CSS rules ended up rendered as
// plain, garbled body text in the output PDF for any converted page carrying inline scripts or
// stylesheets (i.e. virtually every real website).
//
// Bug 2 (found by inspection while fixing bug 1, more severe): the PDF was built with
// `StandardFonts.Helvetica`, a WinAnsi-encoded font that cannot encode Polish or other
// extended-Latin characters — the exact same class of bug already documented and fixed
// elsewhere in this codebase (AGENTS.md's WinAnsi/StandardFonts note, embedLiberationSans in
// lib/client-pdf.ts) via a self-hosted LiberationSans font. This server route was never covered
// by that earlier client-side-only fix, so it crashed with an uncaught exception (mapped to a
// generic 500) on ANY converted page containing so much as one Polish diacritic (ą/ć/ę/ł/ń/ó/
// ś/ź/ż) or other non-WinAnsi character — for a Polish-market PDF tool, that is the overwhelming
// majority of real pages, not an edge case.
//
// Both fixes extracted into small, directly-testable exports (htmlToPlainText, embedServerFont)
// — the same pattern this file already uses for isPrivateOrReservedAddress/
// fetchViaValidatedAddresses — rather than testing only via source-pattern matching.

import { PDFDocument } from 'pdf-lib';
import { htmlToPlainText, embedServerFont } from '../app/api/url-to-pdf/route';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== htmlToPlainText: <script>/<style> content is dropped, not leaked ===');
{
  const html = `
    <html><head>
      <style>body { color: red; font-family: 'Helvetica'; } .hero::before { content: "nope"; }</style>
      <script>function trackUser(id) { fetch('/beacon?id=' + id); console.log("tracked"); }</script>
    </head><body>
      <h1>Prawdziwy tytuł strony</h1>
      <p>To jest właściwa treść, którą użytkownik chce w PDF-ie.</p>
      <script>var secret = "should-not-appear-either";</script>
    </body></html>`;

  const text = htmlToPlainText(html);
  check(!text.includes('color: red'), 'CSS declaration from <style> does not leak into extracted text');
  check(!text.includes('trackUser'), 'JS function name from <script> does not leak into extracted text');
  check(!text.includes('fetch('), 'JS call from <script> does not leak into extracted text');
  check(!text.includes('secret'), 'JS variable name from a second, later <script> block does not leak either');
  check(!text.includes('should-not-appear-either'), 'JS string literal from <script> does not leak into extracted text');
  check(text.includes('Prawdziwy tytuł strony'), 'real heading text IS preserved');
  check(text.includes('właściwa treść'), 'real paragraph text IS preserved');
}

console.log('\n=== htmlToPlainText: regression guard — plain pages with no script/style are unaffected ===');
{
  const html = '<html><body><h1>Tytuł</h1> <p>Akapit z &amp; encją i &lt;nawiasem&gt;.</p></body></html>';
  const text = htmlToPlainText(html);
  check(text === 'Tytuł Akapit z & encją i <nawiasem>.', `plain page extraction unaffected (got: "${text}")`);
}

console.log('\n=== embedServerFont: Polish/extended-Latin text does not crash PDF generation ===');
{
  const pdf = await PDFDocument.create();
  let font;
  let threw: Error | null = null;
  try {
    font = await embedServerFont(pdf);
  } catch (e) {
    threw = e as Error;
  }
  check(threw === null, `embedServerFont() does not throw (${threw?.message ?? 'ok'})`);

  if (font) {
    const page = pdf.addPage([595.28, 841.89]);
    let drawThrew: Error | null = null;
    try {
      page.drawText('Zażółć gęślą jaźń — polskie znaki: ąćęłńóśźż', { x: 50, y: 700, size: 11, font });
    } catch (e) {
      drawThrew = e as Error;
    }
    check(drawThrew === null, `drawing full Polish diacritic set does not throw (${drawThrew?.message ?? 'ok'})`);

    let saveThrew: Error | null = null;
    try {
      await pdf.save();
    } catch (e) {
      saveThrew = e as Error;
    }
    check(saveThrew === null, `pdf.save() succeeds with Polish text embedded (${saveThrew?.message ?? 'ok'})`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
