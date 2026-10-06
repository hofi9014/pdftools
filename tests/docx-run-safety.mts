// Apache OpenOffice 4 drops a Word (.docx) run that is ONE character whose UTF-16 low byte is
// 0x07 or 0x0D, and ends the paragraph there: its importer mistakes that low byte for Word's old
// binary control codes (cell mark, paragraph mark). Measured on every code point U+0101…U+041F
// with OpenOffice 4.1: exactly the x07 and x0D columns are lost. The Polish "ć" is U+0107, the
// Czech/Croatian "č" U+010D, the Ukrainian "Ї" U+0407 — and a PDF drawn glyph by glyph (Chrome)
// becomes runs of one or two characters. In OpenOffice every lone "ć" was a missing letter and a
// broken line.
//
// lib/pdf/docxRunSafety.ts keeps such a character from standing alone; both Word writers use it.
// The real-renderer proof (the file opened in OpenOffice) is in e2e/pdf-to-word-fixed-layout.mts.

import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { isAooUnsafeSingleChar, protectSingleCharRuns } from '../lib/pdf/docxRunSafety.ts';
import { renderIRToDocx, type IRTextRun } from '../lib/client-pdf-docx.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

console.log('=== which runs are unsafe ===');
{
  check(['ć', 'č', 'Ї', String.fromCharCode(0x200d), 'ȇ'].every(isAooUnsafeSingleChar), 'a lone ć (U+0107), č (U+010D), Ї (U+0407), ZWJ (U+200D), ȇ (U+0207)');
  check(!['ą', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż', 'Ć', 'a', '\u0007', '\r'].some(isAooUnsafeSingleChar), 'not the other Polish letters, not Ć (U+0106), not ASCII');
  check(!isAooUnsafeSingleChar('ść') && !isAooUnsafeSingleChar('ć ') && !isAooUnsafeSingleChar(''), 'not the same letter inside a longer run');
}

const texts = (runs: Array<{ text: string }>): string[] => runs.map((r) => r.text);
const r = (text: string, bold = false) => ({ text, bold });

console.log('\n=== a lone unsafe character is given company ===');
{
  const a = protectSingleCharRuns([r('zrobi'), r('ć'), r(' dzisiaj')]);
  check(JSON.stringify(texts(a)) === '["zrobi","ć ","dzisiaj"]', `it takes the next run's first character (${JSON.stringify(texts(a))})`);
  const b = protectSingleCharRuns([r('odkłada'), r('ć')]);
  check(JSON.stringify(texts(b)) === '["odkład","ać"]', `at the end, the previous run's last one (${JSON.stringify(texts(b))})`);
  const c = protectSingleCharRuns([r('ć')]);
  check(JSON.stringify(texts(c)) === '["ć "]', 'alone in its group: a trailing space');
  const d = protectSingleCharRuns([r('ć'), r('.')]);
  check(JSON.stringify(texts(d)) === '["ć."]', `a one-character neighbour is absorbed whole (${JSON.stringify(texts(d))})`);
  const e = protectSingleCharRuns([r('a'), r('ć')]);
  check(JSON.stringify(texts(e)) === '["ać"]', `also when it is the previous one (${JSON.stringify(texts(e))})`);
  const f = protectSingleCharRuns([r('by'), r('ć', true), r('!')]);
  check(f.find((x) => x.text.includes('ć'))!.bold === true, 'the run keeps its own formatting');
  const g = protectSingleCharRuns([r('ć'), r('č'), r('Ї')]);
  check(texts(g).join('') === 'ćčЇ' && texts(g).every((t) => !isAooUnsafeSingleChar(t)), `several in a row (${JSON.stringify(texts(g))})`);
}

console.log('\n=== text is never changed (apart from that one trailing space) ===');
{
  const samples = [['Trzeba to zrobi', 'ć', ' dzisiaj, a nie odkłada', 'ć', '.'], ['ć', 'ma'], ['za', 'č', 'a', 'ć'], ['abc', 'def'], ['𝒜', 'ć', '𝒷𝒸'], ['x', 'ć', '😀y']];
  const bad = samples.filter((s) => {
    const out = protectSingleCharRuns(s.map((t) => r(t)));
    return texts(out).join('') !== s.join('') || texts(out).some(isAooUnsafeSingleChar) || texts(out).some((t) => /^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(t));
  });
  check(bad.length === 0, `same text, no lone unsafe run, no split surrogate pair (${bad.length} of ${samples.length} wrong)`);
  const input = [r('abc'), r('ć'), r('def')];
  protectSingleCharRuns(input);
  check(texts(input).join('|') === 'abc|ć|def', 'the input runs are not modified');
}

console.log('\n=== the flow Word writer uses it ===');
{
  const run = (text: string, x: number): IRTextRun => ({ text, fontName: 'Arial', fontSize: 12, width: text.length * 6, height: 12, position: { x, y: 700 }, color: '#000000', bold: false, italic: false, rotation: 0 });
  const runs = [run('Trzeba to zrobi', 72), run('ć', 162), run(' dzisiaj, a nie odkłada', 168), run('ć', 306), run('.', 312)];
  const blob = await renderIRToDocx([{ width: 595, height: 842, blocks: [{ kind: 'paragraph', runs, bounds: { x: 72, y: 690, width: 250, height: 14 } }] }]);
  const xml = await (await JSZip.loadAsync(await blob.arrayBuffer())).file('word/document.xml')!.async('string');
  const written = [...xml.matchAll(/<w:t xml:space="preserve">([^<]*)<\/w:t>/g)].map((m) => m[1]!);
  check(written.join('') === 'Trzeba to zrobić dzisiaj, a nie odkładać.', `the paragraph's text is intact ("${written.join('')}")`);
  check(!written.some(isAooUnsafeSingleChar), `no <w:t> holds a lone "ć" (${JSON.stringify(written)})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
