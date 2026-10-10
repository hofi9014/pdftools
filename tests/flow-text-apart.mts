// PDF → Word / OpenOffice ("Tekst ciągły"): two texts standing apart on one line were written
// with nothing between them. A PDF has no space there, only distance: two address blocks side by
// side came out as "SprzedawcaNabywca", a total as "Razem netto:26 183,95 zł", two fields of one
// line as "Termin płatności: 14 dniSposób płatności: przelew". Found on an invoice printed from a
// browser (test-real-pdfs/chrome-invoice.pdf).
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
import { pdfToWordIR, extractFormattedTextFromPDF } from '../lib/client-pdf.ts';
import { renderIRToOdt } from '../lib/client-pdf-docx.ts';
import { separateLines } from '../lib/pdf/docxLayout.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

console.log('=== the rule ===');
{
  const run = (text: string, x: number, y: number, width: number) => ({ text, fontSize: 10, width, position: { x, y } });
  const text = (runs: ReturnType<typeof run>[]) => separateLines(runs).map((r) => r.text).join('');
  check(text([run('Sprzedawca', 50, 700, 55), run('Nabywca', 300, 700, 42)]) === 'Sprzedawca Nabywca', 'two texts far apart on one line get a space');
  check(text([run('P', 50, 700, 6), run('O', 56, 700, 7), run('Z', 63.4, 700, 6)]) === 'POZ', 'glyphs drawn one by one stay one word');
  check(text([run('kerned', 50, 700, 30), run('pair', 84, 700, 18)]) === 'kernedpair', 'a gap smaller than the font size is left alone (word spaces are drawn as characters)');
  check(text([run('Razem: ', 50, 700, 34), run('12', 300, 700, 11)]) === 'Razem: 12', 'no second space where one is already there');
  check(text([run('koniec', 50, 700, 30), run('linii', 50, 688, 22)]) === 'koniec linii' && text([run('prze-', 50, 700, 24), run('nos', 50, 688, 16)]) === 'prze-nos', 'line ends as before: a space, none after a hyphen');
  const noGeometry = separateLines([{ text: 'a', fontSize: 10, position: { y: 5 } }, { text: 'b', fontSize: 10, position: { y: 5 } }]).map((r) => r.text).join('');
  check(noGeometry === 'ab', 'runs without x and width are untouched');
}

console.log('\n=== an invoice printed from a browser ===');
{
  const file = (): File => Object.assign(new Blob([new Uint8Array(readFileSync(join(ROOT, 'test-real-pdfs', 'chrome-invoice.pdf')))]), { name: 'f.pdf' }) as unknown as File;
  const paragraphs = (xml: string, tag: string): string[] => (xml.match(new RegExp(`<${tag}[ >][\\s\\S]*?</${tag}>`, 'g')) ?? []).map((p) => p.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()).filter((t) => t !== '');
  const docx = paragraphs(await (await JSZip.loadAsync(await (await pdfToWordIR(file())).arrayBuffer())).file('word/document.xml')!.async('string'), 'w:p');
  const odt = paragraphs(await (await JSZip.loadAsync(await (await renderIRToOdt(await extractFormattedTextFromPDF(file()), new Map())).arrayBuffer())).file('content.xml')!.async('string'), 'text:p');
  for (const [name, paras] of [['Word', docx], ['OpenOffice', odt]] as const) {
    check(paras.includes('Sprzedawca Nabywca') && !paras.some((p) => /SprzedawcaNabywca/.test(p)), `${name}: "Sprzedawca Nabywca" ("SprzedawcaNabywca" before)`);
    check(paras.some((p) => /^Razem netto: \d/.test(p)) && paras.includes('Termin płatności: 14 dni Sposób płatności: przelew'), `${name}: a label and its amount, and two fields of one line, are separate words`);
    check(!paras.some((p) => /o\.o\.Pracownia|Gdańskul\.|22NIP|dniSposób|netto:\d|zapłaty:\d/.test(p)), `${name}: no two blocks glued together anywhere`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
