// "Search in many PDFs" (plan 2.8): the normalisation and matching rules, the page texts read from
// real PDFs, and the CSV export.
// Run: npm run test:search-pdfs
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const { hitsToCsv, normalise, searchPages } = await import('../lib/pdf/searchText.ts');
const { pdfPageTexts } = await import('../lib/pdf/pdfPageTexts.ts');

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

console.log('=== matching rules ===');
{
  const pages = ['Zażółć gęślą JAŹŃ.\nDrugi wiersz', 'Nic tu nie ma', 'Wyszu-\nkiwanie działa, a kot i kotek śpią. Łódź, ŁÓDŹ, łódź.'];
  check(searchPages(pages, 'zolc gesla jazn').length === 1, 'case and diacritics are ignored by default ("zolc gesla jazn" finds "Zażółć gęślą JAŹŃ")');
  check(searchPages(pages, 'jaźń. drugi').length === 1, 'a phrase across a line end is found');
  check(searchPages(pages, 'wyszukiwanie')[0]?.page === 3, 'a word split by a hyphen at a line end is found');
  check(searchPages(pages, 'jaźń', { matchDiacritics: true }).length === 1 && searchPages(pages, 'jazn', { matchDiacritics: true }).length === 0, 'with "match diacritics", "jazn" no longer finds "JAŹŃ"');
  check(searchPages(pages, 'łódź', { matchCase: true }).length === 1 && searchPages(pages, 'lodz').length === 3, '"ł" counts as "l"; with "match case" only the lowercase one matches');
  check(searchPages(pages, 'kot').length === 2 && searchPages(pages, 'kot', { wholeWord: true }).length === 1, 'whole words: "kot" matches "kot" but not "kotek"');
  const hit = searchPages(pages, 'GESLA')[0]!;
  check(hit.match === 'gęślą' && hit.before === 'Zażółć ' && hit.after.startsWith(' JAŹŃ. Drugi'), `the snippet is the original text ("${hit.before}[${hit.match}]${hit.after}")`);
  check(searchPages(['Straße'], 'strasse')[0]?.match === 'Straße', '"ß" matches "ss" and the snippet keeps "ß"');
  check(searchPages(pages, '   ').length === 0, 'an empty query finds nothing');
  check(normalise('a­b  \n c').text === 'ab c', 'soft hyphens are dropped and whitespace runs become one space');
  check(searchPages(['Polsko-\nNiemiecka'], 'polsko-niemiecka').length === 1 && searchPages(['Polsko-\nNiemiecka'], 'polskoniemiecka').length === 0, 'a hyphen before a capital letter at a line end is kept (a real compound)');
  const long = searchPages(['x'.repeat(200) + ' cel ' + 'y'.repeat(200)], 'cel')[0]!;
  check(long.before.startsWith('…') && long.after.endsWith('…') && long.before.length <= 52 && long.after.length <= 52, 'long context is cut and marked with "…"');
}

console.log('\n=== CSV ===');
{
  const csv = hitsToCsv([{ file: 'a;b.pdf', hit: { page: 2, before: 'Pan "X" ', match: 'Nowak', after: ', list' } }], ['Plik', 'Strona', 'Fragment']);
  check(csv.startsWith('﻿Plik,Strona,Fragment\r\n'), 'a BOM and the header');
  check(csv.includes('"a;b.pdf",2,"Pan ""X"" Nowak, list"'), 'cells with quotes, commas or semicolons are quoted');
}

console.log('\n=== page texts from PDF files ===');
{
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  d.addPage([595, 842]).drawText('Umowa najmu lokalu\nNajemca: Jan Kowalski', { x: 50, y: 760, size: 14, font, lineHeight: 18 });
  d.addPage([595, 842]);
  d.addPage([595, 842]).drawText('Aneks do umowy. Najemca podpisuje.', { x: 50, y: 760, size: 14, font });
  const res = await pdfPageTexts(await d.save());
  check(res.pages.length === 3 && res.chars > 0, `3 pages read (${res.pages.length}, ${res.chars} characters)`);
  const hits = searchPages(res.pages, 'najemca');
  check(JSON.stringify(hits.map((h) => h.page)) === '[1,3]', `"najemca" on pages 1 and 3 (${hits.map((h) => h.page).join(',')})`);
  check(searchPages(res.pages, 'lokalu najemca').length === 1, 'a phrase across two drawn lines is found');

  const scan = await PDFDocument.create();
  const png = await scan.embedPng(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64'));
  scan.addPage([595, 842]).drawImage(png, { x: 0, y: 0, width: 595, height: 842 });
  check((await pdfPageTexts(await scan.save())).chars === 0, 'a page with only an image has no text (the page then suggests OCR)');

  const real = readFileSync(join(ROOT, 'test-real-pdfs/allegro-raport.pdf'));
  const rt = await pdfPageTexts(new Uint8Array(real));
  check(rt.pages.length === 27, `the 27-page report is read (${rt.pages.length})`);
  // Independent count: a plain case-insensitive regex over each page's text with whitespace collapsed.
  const plain = rt.pages.reduce((n, t) => n + (t.replace(/\s+/g, ' ').match(/allegro/gi)?.length ?? 0), 0);
  const ours = searchPages(rt.pages, 'Allegro');
  check(ours.length === plain && plain > 10, `"Allegro" found ${ours.length} times, as many as a plain regex counts (${plain})`);
  check(ours.every((h) => h.match.toLowerCase() === 'allegro'), 'every snippet shows the word itself');

  const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
  let msg = '';
  try { await pdfPageTexts(await encryptPDF(await d.save(), 'tajne')); } catch (e) { msg = (e as Error).message; }
  check(/zabezpieczony hasłem/.test(msg), `a password-protected file gets the usual message (${msg.slice(0, 40)})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
