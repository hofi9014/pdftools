// PDF→Word layout fidelity. Before: default page/margins, every paragraph flush-left with no
// indent or spacing, one long flow with no page breaks, white text on a coloured band written with
// no band (invisible), lone decorative bullets, subset-tagged font names. Pure inference is unit
// tested, then the real pipeline (allegro-raport.pdf → pdfToWordIR) is opened as a zip and its
// word/document.xml asserted.
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

import { inferMargins, inferPageColumn, inferParagraphLayout, findBackgroundFill, separateLines } from '../lib/pdf/docxLayout.ts';
import { pdfToWordIR } from '../lib/client-pdf.ts';
import type { IRPageIR, IRBlock, IRTextRun } from '../lib/client-pdf-docx.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const run = (x: number, y: number, w: number): IRTextRun => ({ text: 't', fontName: 'F', fontSize: 12, width: w, height: 12, position: { x, y }, color: '#000000', bold: false, italic: false, rotation: 0 });
const para = (x: number, y: number, w: number, h = 12): IRBlock => ({ kind: 'paragraph', runs: [run(x, y, w)], bounds: { x, y, width: w, height: h } });
const asText = (b: IRBlock) => b as IRBlock & { bounds: { x: number; y: number; width: number; height: number } };

console.log('=== inference (pure) ===');
{
  const page: IRPageIR = { width: 600, height: 800, blocks: [para(100, 700, 400), para(100, 650, 380), para(100, 600, 300), para(250, 100, 100)] };
  const col = inferPageColumn(page)!;
  check(col.left === 100 && col.right === 500, `dominant column is x=100..500 (got ${col.left}..${col.right})`);
  const m = inferMargins([page]);
  check(m.left === 100 && m.right === 100, `margins follow the column (left ${m.left}, right ${m.right})`);
  const layout = (b: IRBlock, prev?: IRBlock) => inferParagraphLayout(asText(b), prev ? asText(prev) : undefined, col, m, 600);
  check(layout(para(100, 500, 300)).alignment === 'left' && layout(para(100, 500, 300)).leftIndentPt === 0, 'block on the column edge: left, no indent');
  check(layout(para(250, 500, 100)).alignment === 'center', 'block centred in the column: center');
  check(layout(para(400, 500, 100)).alignment === 'right', 'block flush with the right edge and far from the left: right');
  const indented = layout(para(140, 500, 300));
  check(indented.alignment === 'left' && indented.leftIndentPt === 40, `40pt inset: left indent 40 (got ${indented.leftIndentPt})`);
  check(layout(para(100, 500, 300), para(100, 560, 300, 12)).spacingBeforePt === 48, 'gap to the previous block becomes spacing-before (60-12=48)');
  check(layout(para(100, 500, 300), para(100, 512, 300, 12)).spacingBeforePt === 0, 'touching blocks: no spacing');
  const fills = [{ x: 0, y: 700, width: 600, height: 100, color: 'E94F1E' }, { x: 90, y: 720, width: 300, height: 40, color: '112233' }];
  check(findBackgroundFill(asText(para(100, 725, 200, 20)), fills) === '112233', 'smallest containing fill wins');
  check(findBackgroundFill(asText(para(100, 300, 200, 20)), fills) === undefined, 'no containing fill: none');
}

console.log('\n=== real pipeline: allegro-raport.pdf → docx ===');
{
  const f = 'allegro-raport.pdf';
  const file = Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', f))]), { name: f }) as unknown as File;
  const blob = await pdfToWordIR(file);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('word/document.xml')!.async('string');
  const pgSz = /<w:pgSz [^>]*w:w="(\d+)"[^>]*w:h="(\d+)"/.exec(xml) ?? /<w:pgSz [^>]*w:h="(\d+)"[^>]*w:w="(\d+)"/.exec(xml);
  check(!!pgSz, 'section declares the source page size');
  check((xml.match(/<w:pageBreakBefore/g) ?? []).length === 26, `26 page breaks for a 27-page source (got ${(xml.match(/<w:pageBreakBefore/g) ?? []).length})`);
  check(/<w:jc w:val="center"\/>/.test(xml), 'centred paragraphs are written as w:jc center');
  check(/<w:shd [^>]*w:fill="E94F1E"/i.test(xml), 'white-on-orange text sits on an orange paragraph shading (was invisible)');
  check(/<w:ind [^>]*w:left="\d+"/.test(xml), 'indented paragraphs carry w:ind');
  check(/<w:spacing [^>]*w:before="\d+"/.test(xml), 'vertical gaps are written as w:spacing before');
  check(!/w:ascii="[A-Z]{6}\+/.test(xml), 'no subset-tagged font names remain');
  check(/w:ascii="Gotham"/.test(xml), 'font family is the clean name "Gotham"');
  const bullets = (xml.match(/<w:numPr>/g) ?? []).length;
  check(bullets < 5, `no flood of decorative bullets (numbered paragraphs: ${bullets})`);
}

console.log('\n=== line changes get their space (separateLines) ===');
{
  const r = (t: string, y: number) => ({ text: t, fontSize: 10, position: { y } });
  const out = separateLines([r('uzupełnianie', 100), r('kontroli,', 88), r('raporty', 88), r('nad-', 76), r('zór', 64), r('a ', 52), r('b', 40)]);
  check(out[1]!.text === ' kontroli,', 'new line: a space is added');
  check(out[2]!.text === 'raporty', 'same line: unchanged');
  check(out[3]!.text === ' nad-', 'a run after a line change still gets its space');
  check(out[4]!.text === 'zór', 'no space after a trailing hyphen (hyphenated wrap)');
  check(out[6]!.text === 'b', 'no double space when the previous run already ends with one');
}

console.log('\n=== real pipeline: epz-report-variant2.pdf (scaled by cm, table) ===');
{
  const f = 'epz-report-variant2.pdf';
  const file = Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', f))]), { name: f }) as unknown as File;
  const zip = await JSZip.loadAsync(await (await pdfToWordIR(file)).arrayBuffer());
  const xml = await zip.file('word/document.xml')!.async('string');
  const text = (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? []).map((m) => m.replace(/<[^>]+>/g, '')).join('');
  check(/raporty, nadz.r nad parking/.test(text), 'multi-line cell text keeps its spaces ("raporty, nadzór nad parkingów")');
  check(!/w:val="(FFFFFF|D8D8D8|ffffff|d8d8d8)"/.test(xml.replace(/<w:shd[^>]*>/g, '')), 'no run is coloured white/grey from a cell background');
  check((xml.match(/<w:tbl>/g) ?? []).length >= 3, 'the schedule tables are present');
  check(/8\/1\/2026/.test(text) && /Speed, teams/.test(text.replace(/\s+/g, ' ')), 'dates and the "Speed, teams" column are in the output');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
