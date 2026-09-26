// PDF fonts draw "fi"/"fl"/"ffi"... as single ligature glyphs, and their Unicode is the
// compatibility character (U+FB01 …). The run extraction copied them as they were, so every Word,
// HTML, EPUB … output of a PDF set in such a font contained "ﬁrmami" (one character) instead of
// "firmami": not searchable, not copyable as text, and a box in any font without that glyph.
// pdf.js's own getTextContent normalises them; found by comparing word recall against it
// (allegro-raport.pdf: "firmami", "fiskalnej", "potrafi", "fitness" … missing from the .docx).
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { normalizeLigatures, extractFormattedTextFromPDF, pdfToWordIR } from '../lib/client-pdf.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const lig = (code: number) => String.fromCodePoint(code);
const hasLigature = (s: string) => [...s].some((ch) => { const c = ch.codePointAt(0) ?? 0; return c >= 0xfb00 && c <= 0xfb06; });

console.log('=== normalizeLigatures (pure) ===');
{
  const expected: Array<[number, string]> = [[0xfb00, 'ff'], [0xfb01, 'fi'], [0xfb02, 'fl'], [0xfb03, 'ffi'], [0xfb04, 'ffl'], [0xfb05, 'st'], [0xfb06, 'st']];
  for (const [code, plain] of expected) check(normalizeLigatures(`a${lig(code)}b`) === `a${plain}b`, `U+${code.toString(16).toUpperCase()} -> "${plain}"`);
  check(normalizeLigatures('Zażółć gęślą jaźń — fi') === 'Zażółć gęślą jaźń — fi', 'ordinary text (Polish letters, dash, real "fi") is untouched');
  check(normalizeLigatures('') === '', 'empty string');
}

console.log('\n=== real pipeline: allegro-raport.pdf ===');
{
  const f = 'allegro-raport.pdf';
  const file = () => Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', f))]), { name: f }) as unknown as File;
  const pages = await extractFormattedTextFromPDF(file());
  const texts = pages.flatMap((p) => p.blocks.flatMap((b) => ('runs' in b ? b.runs.map((r) => r.text) : [])));
  check(!texts.some(hasLigature), 'no ligature character is left in any extracted run');
  check(texts.some((t) => /firmami/.test(t)), 'page 2 reads "firmami" (was "ﬁrmami")');
  const zip = await JSZip.loadAsync(await (await pdfToWordIR(file())).arrayBuffer());
  const xml = await zip.file('word/document.xml')!.async('string');
  const docText = (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? []).map((m) => m.replace(/<[^>]+>/g, '')).join('|');
  check(!hasLigature(docText), 'no ligature character in the .docx text');
  check(/fiskalnej/.test(docText) && /potrafi/.test(docText) && /fitness/.test(docText), 'the words with "fi" are searchable in the .docx');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
