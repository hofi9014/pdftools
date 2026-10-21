// PDF→Word ("flowing text"): where a bulleted list item stands. Opened in Microsoft Word, the
// bulleted list on page 26 of allegro-raport.pdf started 108 pt in from the margin with square
// bullets — the extraction's list level is the item's distance from the page edge (2 there), and
// Word's numbering definition indents level 2 by 2160 twips. The source has the text 18 pt in
// from the paragraphs above. Lines came out narrower, and page 26 spilled onto a 28th page (in
// Word and in OpenOffice alike). Now the paragraph carries its own indent, taken from the page,
// and the shallowest list level of a page is the first one.
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

import { listItemIndent, LIST_HANGING_PT } from '../lib/pdf/docxLayout.ts';
import { pdfToWordIR } from '../lib/client-pdf.ts';
import { renderIRToDocx, type IRBlock, type IRTextRun } from '../lib/client-pdf-docx.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

console.log('=== the indent (pure) ===');
{
  const m = { left: 100, right: 100, top: 72, bottom: 72 };
  const at = (x: number) => listItemIndent({ kind: 'list-item', marker: '•', level: 0, runs: [], bounds: { x, y: 0, width: 100, height: 12 } } as IRBlock & { bounds: { x: number; y: number; width: number; height: number } }, m);
  check(at(118.5).leftPt === 18.5 && at(118.5).hangingPt === LIST_HANGING_PT, `text 18.5 pt in from the margin: left indent 18.5 pt, bullet 18 pt before it (${JSON.stringify(at(118.5))})`);
  check(at(250).leftPt === 150, `text 150 pt in: left indent 150 pt (${at(250).leftPt})`);
  check(at(100).leftPt === LIST_HANGING_PT, `text on the margin: room for the bullet is kept (${at(100).leftPt})`);
}

const paragraphsOf = (xml: string): string[] => xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
const textOf = (p: string): string => (p.match(/<w:t(?: [^>]*)?>[^<]*<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join('');
const twipsAttr = (p: string, attr: string): number | null => {
  const ind = /<w:ind [^>]*>/.exec(p)?.[0];
  const v = ind ? new RegExp(`w:${attr}="(-?\\d+)"`).exec(ind)?.[1] : undefined;
  return v === undefined ? null : Number(v);
};
const levelOf = (p: string): number | null => {
  const v = /<w:ilvl w:val="(\d+)"/.exec(p)?.[1];
  return v === undefined ? null : Number(v);
};

console.log('\n=== allegro-raport.pdf, page 26 (list of shape bullets) ===');
{
  const f = 'allegro-raport.pdf';
  const file = Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', f))]), { name: f }) as unknown as File;
  const zip = await JSZip.loadAsync(await (await pdfToWordIR(file)).arrayBuffer());
  const xml = await zip.file('word/document.xml')!.async('string');
  const paras = paragraphsOf(xml);
  const lead = paras.find((p) => textOf(p).startsWith('Jest wiele powodów'));
  const items = paras.filter((p) => /<w:numPr>/.test(p) && /^(możesz|nigdy nie wiesz|zawsze jest tak|kiedy już okaże)/.test(textOf(p)));
  check(!!lead && items.length >= 5, `the list and the paragraph above it are found (${items.length} items)`);
  // The paragraph above starts on the margin; the items' text stands 18-19 pt further right in the
  // source (measured on the page: 100 pt and 118.5 pt from the page edge).
  const lefts = items.map((p) => twipsAttr(p, 'left'));
  check(lefts.every((l) => l !== null && l >= 18 * 20 && l <= 20 * 20), `every item's text is 18-20 pt in from the margin, as in the PDF (${lefts.map((l) => (l === null ? 'none' : `${l / 20} pt`)).join(', ')})`);
  check(items.every((p) => twipsAttr(p, 'hanging') === 18 * 20), 'with an 18 pt hanging indent for the bullet');
  check(items.every((p) => levelOf(p) === 0), `the first list level, a round bullet (levels ${items.map(levelOf).join(', ')})`);
}

console.log('\n=== nested lists keep their nesting ===');
{
  const r = (text: string, x: number, y: number): IRTextRun => ({ text, fontName: 'Arial', fontSize: 11, width: 120, height: 11, position: { x, y }, color: '#000000', bold: false, italic: false, rotation: 0 });
  const item = (text: string, x: number, y: number, level: number): IRBlock => ({ kind: 'list-item', marker: '•', level, runs: [r(text, x, y)], bounds: { x, y, width: 120, height: 11 } });
  const prose = (text: string, y: number): IRBlock => ({ kind: 'paragraph', runs: [{ ...r(text, 72, y), width: 450 }], bounds: { x: 72, y: y - 22, width: 450, height: 33 } });
  const blocks: IRBlock[] = [
    prose('Pierwszy akapit tekstu na marginesie', 760),
    prose('Drugi akapit tekstu na marginesie', 720),
    item('Pierwszy punkt', 90, 680, 2),
    item('Punkt zagniezdzony', 110, 665, 3),
    item('Drugi punkt', 90, 650, 2),
  ];
  const zip = await JSZip.loadAsync(await (await renderIRToDocx([{ width: 595, height: 842, blocks }])).arrayBuffer());
  const paras = paragraphsOf(await zip.file('word/document.xml')!.async('string'));
  const get = (t: string) => paras.find((p) => textOf(p) === t)!;
  check([levelOf(get('Pierwszy punkt')), levelOf(get('Punkt zagniezdzony')), levelOf(get('Drugi punkt'))].join() === '0,1,0', 'levels 2,3,2 become 0,1,0');
  // The margin is inferred from the page; the nested item's text is 20 pt right of its parent's.
  const first = twipsAttr(get('Pierwszy punkt'), 'left')! / 20;
  const nested = twipsAttr(get('Punkt zagniezdzony'), 'left')! / 20;
  check(nested - first === 20, `indents follow the page: the nested item 20 pt further in (${first} pt, ${nested} pt)`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
