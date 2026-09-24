// Rotated PDF text (a vertical side label, upside-down text) used to be written to Word as a grey
// italic annotation `[Obrócony tekst 90°: "..."]` — the content survived, but as a note with its
// own formatting thrown away. Word cannot rotate a run, so the text is now written as an ordinary,
// upright paragraph that keeps its size/bold/colour. Built from a real pdf-lib document and run
// through the real PDF→Word pipeline; the resulting word/document.xml is asserted.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { pdfToWordIR, extractFormattedTextFromPDF } from '../lib/client-pdf.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const page = pdf.addPage([595, 842]);
page.drawText('Zwykly akapit na gorze strony', { x: 72, y: 760, size: 12, font });
page.drawText('Etykieta pionowa', { x: 40, y: 300, size: 16, font: bold, color: rgb(0.8, 0.1, 0.1), rotate: degrees(90) });
page.drawText('Tekst do gory nogami', { x: 400, y: 200, size: 12, font, rotate: degrees(180) });
page.drawText('Drugi zwykly akapit', { x: 72, y: 700, size: 12, font });
const file = Object.assign(new Blob([(await pdf.save()) as BlobPart]), { name: 'rot.pdf' }) as unknown as File;

console.log('=== extraction still sees the rotation ===');
{
  const pages = await extractFormattedTextFromPDF(file);
  const runs = pages[0]!.blocks.flatMap((b) => (b as { runs?: Array<{ text: string; rotation: number }> }).runs ?? []);
  const vertical = runs.find((r) => r.text.includes('pionowa'));
  check(!!vertical && Math.abs(Math.abs(vertical.rotation) - 90) < 2, `the vertical label has rotation ±90° (got ${vertical?.rotation.toFixed(1)})`);
}

console.log('\n=== Word output ===');
{
  const zip = await JSZip.loadAsync(await (await pdfToWordIR(file)).arrayBuffer());
  const xml = await zip.file('word/document.xml')!.async('string');
  const text = (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? []).map((m) => m.replace(/<[^>]+>/g, '')).join('|');
  check(!/Obr.cony tekst/.test(text), 'no "[Obrócony tekst …]" annotation is written');
  check(/Etykieta pionowa/.test(text) && /Tekst do gory nogami/.test(text), 'both rotated texts are present as real text');
  check(/Zwykly akapit na gorze strony/.test(text) && /Drugi zwykly akapit/.test(text), 'ordinary paragraphs are untouched');
  const runOf = (needle: string) => (xml.match(/<w:r>[\s\S]*?<\/w:r>/g) ?? []).find((r) => r.includes(needle)) ?? '';
  const label = runOf('Etykieta pionowa');
  check(/<w:b\/>|<w:b /.test(label), 'the vertical label keeps its bold');
  check(/<w:sz w:val="32"\/>/.test(label), 'the vertical label keeps its 16pt size');
  check(/w:val="CC1919"|w:val="CC1A1A"/i.test(label), 'the vertical label keeps its red colour');
  check(!/<w:i\/>|<w:i /.test(label) && !/w:val="888888"/.test(label), 'no grey/italic "annotation" styling');
  const para = (xml.match(/<w:p>[\s\S]*?<\/w:p>/g) ?? []).find((p) => p.includes('Etykieta pionowa')) ?? '';
  check(!/<w:jc /.test(para) && !/<w:ind /.test(para), 'no alignment/indent inferred from the rotated box geometry');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
