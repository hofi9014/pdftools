// Markdown to PDF (plan 2.4, 2026-11-24): the pure parts of the tool, without a browser.
//  - lib/markdown-to-html.ts: Markdown and plain text → the HTML document the tagged-PDF writer
//    reads (title, language, images that cannot be drawn, text encodings);
//  - lib/pdf/fontCoverage.ts: the characters the PDF text font can draw, checked against the font
//    file itself (all four styles), and the example text of every language drawable with it;
//  - the registration of the tool (page, both routes, steps, translations).
// The PDF itself (structure, monospace code, strikethrough, nested lists) is checked in a real
// browser by e2e/markdown-to-pdf.mts, because the writer needs the browser's DOMParser.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import { markdownToDocument, plainTextToDocument, decodeTextFile, modeForFileName, baseName } from '../lib/markdown-to-html';
import { fontHasChar, missingGlyphs } from '../lib/pdf/fontCoverage';
import { locales, t } from '../lib/i18n';
import { tools, RELATED_TOOLS } from '../lib/tools';
import { toolHowToSteps } from '../content/tool-howto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const body = (html: string) => /<body>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';

console.log('=== the font coverage list is the font ===');
{
  type Kit = { characterSet: number[] };
  const sets = ['Regular', 'Bold', 'Italic', 'BoldItalic'].map((s) =>
    new Set((fontkit as unknown as { create(b: Buffer): Kit }).create(readFileSync(join(ROOT, `public/pdfjs-dist/standard_fonts/LiberationSans-${s}.ttf`))).characterSet));
  let wrong = 0;
  for (let cp = 0; cp <= 0xFFFF; cp++) if (fontHasChar(cp) !== sets[0]!.has(cp)) wrong++;
  check(wrong === 0, `fontHasChar agrees with LiberationSans-Regular.ttf for every code point up to U+FFFF (${wrong} differ)`);
  check(sets.every((s) => [...sets[0]!].every((cp) => s.has(cp))), 'bold, italic and bold italic have every character the list says is drawable');
  check(missingGlyphs('Zażółć gęślą jaźń — Привет, Ελλάδα «€»').length === 0, 'Polish, Russian, Greek and typographic marks are drawable');
  check(JSON.stringify(missingGlyphs('ok ✓ 😀 中文 中 ✓')) === JSON.stringify(['✓', '😀', '中', '文']), `missing characters are listed once each, in order (${missingGlyphs('ok ✓ 😀 中文 中 ✓').join(' ')})`);
  check(missingGlyphs('a\n\tb\r\n').length === 0, 'line breaks and tabs are not reported');
  for (const loc of locales) {
    const miss = missingGlyphs(t('page.md.sample', loc));
    check(miss.length === 0, `[${loc}] the example text can be drawn by the PDF font${miss.length ? ` (missing: ${miss.join(' ')})` : ''}`);
  }
}

console.log('\n=== Markdown → document ===');
{
  const src = [
    '# Raport **kwartalny** `Q3`',
    '',
    'Akapit z *kursywą*, ~~przekreśleniem~~ i [linkiem](https://example.com).',
    '',
    '- pierwszy',
    '  - zagnieżdżony',
    '- [x] zrobione',
    '- [ ] do zrobienia',
    '',
    '| A | B |',
    '|---|---|',
    '| 1 | 2 |',
    '',
    '```js',
    'const x = 1; // <b>nie pogrubione</b>',
    '```',
    '',
    '![wykres sprzedaży](https://example.com/chart.png)',
    '![](./lokalny.png)',
    '![kropka](data:image/png;base64,iVBORw0KGgo=)',
    '<img src="http://tracker.example/x.gif"> <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="ok">',
    '',
    '<script>alert(1)</script>',
  ].join('\n');
  const doc = markdownToDocument(src, { lang: 'pl', fallbackTitle: 'plik' });
  const b = body(doc.html);
  check(doc.title === 'Raport kwartalny Q3', `the title is the first heading without its formatting ("${doc.title}")`);
  check(/<html lang="pl">/.test(doc.html) && /<title>Raport kwartalny Q3<\/title>/.test(doc.html), 'the document carries the language and the title');
  check(/<h1>/.test(b) && /<em>kursywą<\/em>/.test(b) && /<del>przekreśleniem<\/del>/.test(b), 'heading, italic and strikethrough');
  check(/<a href="https:\/\/example\.com">linkiem<\/a>/.test(b), 'links keep their address');
  check(/<li>pierwszy\s*<ul>\s*<li>zagnieżdżony<\/li>/.test(b), 'a nested list is inside its item');
  check(/<input checked="" disabled="" type="checkbox"> ?zrobione/.test(b) && /<input disabled="" type="checkbox"> ?do zrobienia/.test(b), 'task list items carry their checkboxes');
  check(/<table>[\s\S]*<th>A<\/th>[\s\S]*<td>1<\/td>/.test(b), 'tables (GitHub style)');
  check(/<pre><code class="language-js">const x = 1; \/\/ &lt;b&gt;nie pogrubione&lt;\/b&gt;/.test(b), 'code blocks keep HTML inside them as text');
  check(!/https?:\/\/(example\.com\/chart|tracker)/.test(b) && !/lokalny\.png/.test(b), 'images by web address or file path are not in the document (nothing is fetched)');
  check(/<em>\[wykres sprzedaży\]<\/em>/.test(b), 'their alt text stays in their place');
  check(/<img src="data:image\/png;base64,iVBORw0KGgo=" alt="kropka">/.test(b) && /data:image\/gif/.test(b), 'embedded (data:) images are kept, also as raw HTML');
  check(doc.skippedImages === 3, `three images are reported as skipped: two Markdown, one raw HTML (${doc.skippedImages})`);
  check(/<script>/.test(b), 'raw HTML is passed on (the writer parses it without running scripts and keeps known tags only)');

  const noHeading = markdownToDocument('Tylko tekst.', { lang: 'en', fallbackTitle: 'notatki' });
  check(noHeading.title === 'notatki' && noHeading.skippedImages === 0, 'without a heading the title is the file name');
  const evil = markdownToDocument('# a</title><script>', { lang: 'x"><b', fallbackTitle: '' });
  check(!/<\/title><script>/.test(evil.html.split('<body>')[0]!) && /lang="x&quot;&gt;&lt;b"/.test(evil.html), 'the title and the language are escaped in the head');
}

console.log('\n=== plain text → document ===');
{
  const src = 'Pierwsza linia\ndruga linia <b>\n\n\nNowy akapit &\n';
  const doc = plainTextToDocument(src, { lang: 'pl', fallbackTitle: '' });
  const b = body(doc.html);
  check(b === '<p>Pierwsza linia<br>druga linia &lt;b&gt;</p>\n<p>Nowy akapit &amp;</p>', `blank lines split paragraphs, line breaks stay, nothing is read as HTML (${JSON.stringify(b)})`);
  check(doc.title === 'Pierwsza linia', 'pasted text: the title is the first line');
  const layout = plainTextToDocument('Nazwa    Ilość\nJabłka      12\r\n', { lang: 'pl', fallbackTitle: 'tabela', keepLayout: true });
  check(body(layout.html) === '<pre>Nazwa    Ilość\nJabłka      12\n</pre>' && layout.title === 'tabela', 'keep layout: one preformatted block with every space, Windows line ends normalised');
}

console.log('\n=== reading files ===');
{
  const enc = (s: string) => new TextEncoder().encode(s);
  check(decodeTextFile(enc('zażółć'), 'pl').text === 'zażółć' && decodeTextFile(enc('zażółć'), 'pl').encoding === 'UTF-8', 'UTF-8');
  check(decodeTextFile(new Uint8Array([0xEF, 0xBB, 0xBF, ...enc('ą')]), 'pl').text === 'ą', 'UTF-8 with a byte order mark');
  // "zażółć" in Windows-1250 (the code page of Polish Windows): z a 0xBF 0xF3 0xB3 0xE6
  const cp1250 = new Uint8Array([0x7A, 0x61, 0xBF, 0xF3, 0xB3, 0xE6]);
  const r = decodeTextFile(cp1250, 'pl');
  check(r.text === 'zażółć' && r.encoding === 'Windows-1250', `a Polish Windows text file is read as Windows-1250 (${r.text}, ${r.encoding})`);
  check(decodeTextFile(new Uint8Array([0xE9]), 'fr').text === 'é' && decodeTextFile(new Uint8Array([0xE9]), 'fr').encoding === 'Windows-1252', 'other languages fall back to Windows-1252');
  check(decodeTextFile(new Uint8Array([0xFF, 0xFE, 0x05, 0x01]), 'pl').text === 'ą', 'UTF-16 with a byte order mark (Notepad "Unicode")');
  check(modeForFileName('README.md') === 'markdown' && modeForFileName('a.MARKDOWN') === 'markdown' && modeForFileName('notes.txt') === 'text' && modeForFileName('x.pdf') === null && modeForFileName('md') === null,
    'the file extension picks the mode; other files are refused');
  check(baseName('raport.v2.md') === 'raport.v2' && baseName('README') === 'README', 'the file name without its extension');
}

console.log('\n=== the tool is registered ===');
{
  check(tools.some((x) => x.key === 'markdown' && x.slug === 'markdown-to-pdf' && x.category === 'convert'), 'in the tool list (convert)');
  check(existsSync(join(ROOT, 'app/(unprefixed)/markdown-to-pdf/page.tsx')) && existsSync(join(ROOT, 'app/[locale]/markdown-to-pdf/page.tsx')), 'both route files exist');
  check(RELATED_TOOLS.markdown?.length === 3, 'has related tools');
  check(/'markdown-to-pdf'/.test(readFileSync(join(ROOT, 'proxy.ts'), 'utf8')), 'the address without a language redirects (proxy)');
  for (const loc of locales) {
    const steps = toolHowToSteps('markdown-to-pdf', loc);
    const keys = ['tool.markdown', 'desc.markdown', 'seo.tool_title.markdown', 'page.md.desc', 'page.md.missing_glyphs', 'page.md.skipped_images', 'page.md.kept'];
    const bad = keys.filter((k) => { const v = t(k, loc); return !v || v === k || (loc !== 'en' && k !== 'page.md.mode_markdown' && v === t(k, 'en')); });
    check(steps?.length === 4 && bad.length === 0, `[${loc}] steps and texts are there and translated${bad.length ? ` (${bad.join(', ')})` : ''}`);
    check(t('page.md.missing_glyphs', loc).includes('{chars}') && t('page.md.skipped_images', loc).includes('{n}') && t('page.md.too_big', loc).includes('{mb}') && t('page.md.legacy_encoding', loc).includes('{enc}'),
      `[${loc}] the messages keep their fields`);
  }
  const page = readFileSync(join(ROOT, 'app/(unprefixed)/markdown-to-pdf/page.tsx'), 'utf8');
  check(/missingGlyphs\(/.test(page) && /skippedImages/.test(page) && /DOMPurify\.sanitize/.test(page), 'the page warns about missing characters and skipped images and sanitises the preview');
  check(!/from '@\/lib\/pdf\/htmlToTaggedPdf'/.test(page) && /import\('@\/lib\/pdf\/htmlToTaggedPdf'\)/.test(page), 'the PDF writer is loaded on use, not in the page script');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
