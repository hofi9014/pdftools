// Table-of-contents lines ("Wstęp ........ 5") are drawn as title + a run of dots + a page number
// pinned to the right edge. They were written to Word as plain text (the dots wrap, the numbers
// drift). They are now a right tab stop with a dot leader, and numbered list markers use a real
// <w:tab/> instead of a tab character inside <w:t> (which Word does not treat as a tab).
// Pure detection is unit tested; then the real pipeline runs on gpw-ebook.pdf (52 TOC lines) and a
// synthetic numbered list. NOTE: the output is verified as XML against the OOXML spec — the only
// renderer available here (docx-preview) ignores right tabs with leaders, so it is not a visual proof.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { splitDotLeader } from '../lib/pdf/docxLayout.ts';
import { pdfToWordIR } from '../lib/client-pdf.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const r = (text: string) => ({ text });
const docxOf = async (file: File) => (await JSZip.loadAsync(await (await pdfToWordIR(file)).arrayBuffer())).file('word/document.xml')!.async('string');
const pdfFile = (name: string) => Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', name))]), { name }) as unknown as File;

console.log('=== splitDotLeader (pure) ===');
{
  const ok = splitDotLeader([r('Wstęp'), r('.'.repeat(60)), r('5')]);
  check(!!ok && ok.before.length === 1 && ok.after.length === 1, 'title + dots + number splits into before/after');
  check(!!splitDotLeader([r('Rozdział'), r(' '), r('. . . . . . . .'), r('12')]), 'dots separated by spaces still count');
  check(!!splitDotLeader([r('Przedmowa'), r('.'.repeat(30)), r('iv')]), 'a roman page number is accepted');
  check(splitDotLeader([r('Koniec zdania'), r('...')]) === null, 'an ellipsis at the end of a sentence is not a leader');
  check(splitDotLeader([r('Wstęp'), r('.'.repeat(40)), r('bardzo długi tekst')]) === null, 'dots followed by prose (not a page number) are left alone');
  check(splitDotLeader([r('.'.repeat(40)), r('5')]) === null, 'dots with nothing before them are left alone');
  check(splitDotLeader([r('Zwykły'), r('akapit'), r('tekstu')]) === null, 'ordinary runs are left alone');
}

console.log('\n=== real pipeline: gpw-ebook.pdf (table of contents) ===');
{
  const xml = await docxOf(pdfFile('gpw-ebook.pdf'));
  const stops = [...xml.matchAll(/<w:tab w:val="right" w:pos="(\d+)" w:leader="dot"\/>/g)].map((m) => Number(m[1]));
  check(stops.length >= 50, `TOC lines carry a right tab stop with a dot leader (got ${stops.length})`);
  check(stops.every((p) => p > 0 && p <= 419 * 20), 'every tab position is inside the page width (419pt = 8380 twips)');
  check(!/\.{6,}/.test(xml), 'no long runs of literal dots remain in the text');
  const wstep = (xml.match(/<w:p>(?:(?!<\/w:p>)[\s\S])*Wstęp(?:(?!<\/w:p>)[\s\S])*<\/w:p>/) ?? [''])[0];
  check(/<w:tabs><w:tab w:val="right"[^>]*leader="dot"\/><\/w:tabs>/.test(wstep) && /<w:r><w:tab\/><\/w:r>/.test(wstep), '"Wstęp" line: tab stop in pPr and a real <w:tab/> before the number');
  check(/<w:t xml:space="preserve">5<\/w:t>/.test(wstep), 'the page number stays as text after the tab');
}

console.log('\n=== ordinary documents are not touched ===');
{
  const xml = await docxOf(pdfFile('chrome-report.pdf'));
  check(!/leader="dot"/.test(xml), 'chrome-report has no dot-leader tab stops');
}

console.log('\n=== numbered marker uses a real tab ===');
{
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  page.drawText('1. Pierwszy punkt listy', { x: 72, y: 700, size: 12, font });
  page.drawText('2. Drugi punkt listy', { x: 72, y: 680, size: 12, font });
  const file = Object.assign(new Blob([(await pdf.save()) as BlobPart]), { name: 'num.pdf' }) as unknown as File;
  const xml = await docxOf(file);
  check(!/<w:t[^>]*>[^<]*\t[^<]*<\/w:t>/.test(xml), 'no tab character is embedded inside <w:t> text');
  check((xml.match(/<w:tab\/>/g) ?? []).length === 2, `each numbered item has a real <w:tab/> (got ${(xml.match(/<w:tab\/>/g) ?? []).length})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
