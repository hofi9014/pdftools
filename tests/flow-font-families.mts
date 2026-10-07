// Fonts in the flow engine's documents (PDF -> Word / OpenDocument, "running text" mode).
//
// A PDF names its fonts by resource ("PSWIZS+Gotham-Black", "SourceSans3-Regular"); the writers
// used to put the cleaned name into the document as it was. A reader who does not have that
// family gets a substitute, and measured in Apache OpenOffice 4 that substitute is Times New
// Roman for every unknown family of a .docx, whatever the font table says: a sans-serif offer
// came out in a serif face (and its list markers and placeholders, which have no font of their
// own, in Times as well).
//
// Now (lib/pdf/fontFamilies.ts):
//   - a .docx names a family every system has: the PDF's own if it is one, else the standard
//     face of its class (Arial / Times New Roman / Courier New);
//   - an .odt keeps the PDF's family and declares what to use without it — the next family of
//     the font-face list and the generic class, both of which OpenOffice follows;
//   - the class comes from the font's name, else from the PDF's own font descriptor;
//   - the document's default font is the family most of its text is set in.
// Opened in OpenOffice and read back as fonts: e2e/pdf-to-word-fixed-layout.mts.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { PDFDict, PDFDocument, PDFName, PDFNumber } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
(globalThis as Record<string, unknown>).document = { createElement: (t: string) => (t === 'canvas' ? canvasMod.createCanvas(1, 1) : {}) };
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith('/')) return new Response(new Uint8Array(readFileSync(join(ROOT, 'public', url))));
  return realFetch(input, init);
}) as typeof fetch;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

const { odfFontFace, isSystemFamily, fixedFontFamily, classifyFont, docxFontFamily } = await import('../lib/pdf/fontFamilies.ts');
const { pdfToDocxDocument, pdfToOdtDocument } = await import('../lib/pdf/pdfDocumentExport.ts');
const { extractFormattedTextFromPDF } = await import('../lib/client-pdf.ts');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const SYSTEM = new Set(['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Calibri', 'Cambria', 'Symbol', 'Wingdings']);

/** Families named by the runs of a .docx, with how many runs name each, and its default font. */
async function docxFonts(blob: Blob): Promise<{ runs: Record<string, number>; fallback: string | null }> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('word/document.xml')!.async('string');
  const runs: Record<string, number> = {};
  for (const m of xml.matchAll(/<w:rFonts [^>]*w:ascii="([^"]+)"/g)) runs[m[1]!] = (runs[m[1]!] ?? 0) + 1;
  const styles = await zip.file('word/styles.xml')!.async('string');
  const fallback = /<w:rPrDefault>.*?<w:rFonts [^>]*w:ascii="([^"]+)"/s.exec(styles)?.[1] ?? null;
  return { runs, fallback };
}
/** Font-face declarations of an .odt by family name (content.xml), and its default font (styles.xml). */
async function odtFonts(blob: Blob): Promise<{ decls: Map<string, string>; used: Set<string>; fallback: string | null; fallbackDecl: string }> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const content = await zip.file('content.xml')!.async('string');
  const styles = await zip.file('styles.xml')!.async('string');
  const decls = new Map<string, string>();
  for (const m of content.matchAll(/<style:font-face style:name="([^"]+)"[^>]*\/>/g)) decls.set(m[1]!.replace(/&apos;/g, "'"), m[0]);
  const used = new Set([...content.matchAll(/style:font-name="([^"]+)"/g)].map((m) => m[1]!));
  const fallback = /<style:default-style style:family="paragraph">.*?style:font-name="([^"]+)"/s.exec(styles)?.[1] ?? null;
  return { decls, used, fallback, fallbackDecl: /<style:font-face [^>]*\/>/.exec(styles)?.[0] ?? '' };
}

console.log('=== which family a PDF font is written in ===');
{
  check(fixedFontFamily('PSWIZS+Gotham-Black') === 'Arial' && fixedFontFamily('SourceSans3-Regular') === 'Arial', 'an unknown sans-serif family -> Arial');
  check(fixedFontFamily('ABCDEF+Merriweather-Bold') === 'Times New Roman' && fixedFontFamily('Consolas') === 'Courier New', 'an unknown serif -> Times New Roman, a monospace -> Courier New');
  check(fixedFontFamily('Georgia-Italic') === 'Georgia' && fixedFontFamily('Calibri-Bold') === 'Calibri' && fixedFontFamily('ArialMT') === 'Arial', 'a family every system has keeps its name');
  check(fixedFontFamily('Xyzzy', 'serif') === 'Times New Roman' && fixedFontFamily('Xyzzy', 'mono') === 'Courier New' && fixedFontFamily('Xyzzy') === 'Arial', 'a name that says nothing follows the PDF\'s own descriptor');
  check(isSystemFamily('Georgia') && isSystemFamily(' times new roman ') && !isSystemFamily('Gotham') && !isSystemFamily('Consolas'), 'isSystemFamily');
}

console.log('\n=== the font-face declaration of an .odt ===');
{
  check(odfFontFace('Georgia', 'serif') === '<style:font-face style:name="Georgia" svg:font-family="Georgia"/>', 'a system family is declared as it is');
  check(odfFontFace('Times New Roman', 'serif') === `<style:font-face style:name="Times New Roman" svg:font-family="'Times New Roman'"/>`, 'with quotes around a name of several words');
  const gotham = odfFontFace('Gotham', 'sans');
  check(/style:name="Gotham"/.test(gotham) && /svg:font-family="Gotham, Arial"/.test(gotham) && /style:font-family-generic="swiss"/.test(gotham) && /style:font-pitch="variable"/.test(gotham), `an unknown sans keeps its name and lists Arial after it (${gotham})`);
  const serif = odfFontFace('Source Serif 4', 'serif');
  check(/svg:font-family="'Source Serif 4', 'Times New Roman'"/.test(serif) && /style:font-family-generic="roman"/.test(serif), 'an unknown serif lists Times New Roman, generic "roman"');
  const mono = odfFontFace('Consolas', 'mono');
  check(/svg:font-family="Consolas, 'Courier New'"/.test(mono) && /style:font-family-generic="modern"/.test(mono) && /style:font-pitch="fixed"/.test(mono), 'a monospace lists Courier New, generic "modern", fixed pitch');
  check(odfFontFace('A&B "x"', 'sans').includes('style:name="A&amp;B &quot;x&quot;"'), 'names are escaped');
}

console.log('\n=== allegro-raport.pdf (Gotham, not installed anywhere) ===');
{
  const file = new File([readFileSync(join(ROOT, 'test-real-pdfs', 'allegro-raport.pdf'))], 'allegro-raport.pdf');
  const docx = await docxFonts((await pdfToDocxDocument(file, 'flow')).blob);
  const names = Object.keys(docx.runs);
  check(names.length > 0 && names.every((n) => SYSTEM.has(n)), `every run of the .docx names a family every system has (${JSON.stringify(docx.runs)}; "Gotham" before)`);
  check(docx.fallback === 'Arial', `the .docx default font is the family of most of its text (${docx.fallback}) — markers and placeholders follow it`);
  const odt = await odtFonts((await pdfToOdtDocument(file, 'flow')).blob);
  const decl = odt.decls.get('Gotham') ?? '';
  check(odt.used.has('Gotham') && /svg:font-family="Gotham, Arial"/.test(decl) && /style:font-family-generic="swiss"/.test(decl), `the .odt keeps "Gotham" and declares Arial as its stand-in (${decl})`);
  check([...odt.used].every((n) => odt.decls.has(n) || n === 'Arial'), 'every family used in the .odt is declared');
  check(odt.fallback === 'Gotham' && /svg:font-family="Gotham, Arial"/.test(odt.fallbackDecl), `the .odt default font is that family too, declared with its stand-in (${odt.fallback})`);
}

console.log('\n=== chrome-article.pdf (Georgia and Consolas) ===');
{
  const file = new File([readFileSync(join(ROOT, 'test-real-pdfs', 'chrome-article.pdf'))], 'chrome-article.pdf');
  const docx = await docxFonts((await pdfToDocxDocument(file, 'flow')).blob);
  check(docx.runs['Georgia']! > 0 && docx.runs['Courier New']! > 0 && !('Consolas' in docx.runs), `Georgia is kept, Consolas (Windows only) becomes Courier New (${JSON.stringify(docx.runs)})`);
  check(docx.fallback === 'Georgia', `the default font is Georgia here (${docx.fallback})`);
  const odt = await odtFonts((await pdfToOdtDocument(file, 'flow')).blob);
  check(odt.decls.get('Georgia') === '<style:font-face style:name="Georgia" svg:font-family="Georgia"/>' && /Consolas, 'Courier New'/.test(odt.decls.get('Consolas') ?? ''), 'the .odt declares Georgia plainly and Consolas with Courier New after it');
}

console.log('\n=== a font whose name says nothing: the PDF\'s own descriptor decides ===');
{
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = (file: string, name: string) => pdf.embedFont(readFileSync(join(ROOT, 'public', 'fonts', file)), { customName: name, subset: true });
  const serif = await font('tinos-regular.ttf', 'Xyzzy');
  const sans = await font('arimo-regular.ttf', 'Plugh');
  const page = pdf.addPage([500, 300]);
  page.drawText('Tekst szeryfowy w czcionce o nic niemowiacej nazwie', { x: 40, y: 240, size: 12, font: serif });
  page.drawText('Tekst bezszeryfowy, ktorego jest najwiecej w calym dokumencie, zeby byl domyslny', { x: 40, y: 160, size: 12, font: sans });
  // pdf-lib leaves the descriptor flags at "nonsymbolic"; a real producer sets Serif (bit 2) —
  // written here as it would. (Fixed pitch is not tried this way: pdf.js believes that flag only
  // when every glyph width it is given agrees, which a font embedded by pdf-lib never satisfies;
  // the monospace of a real file is checked above, on chrome-article.pdf.)
  const flagged = await PDFDocument.load(await pdf.save());
  for (const [, obj] of flagged.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict) || obj.get(PDFName.of('Type')) !== PDFName.of('FontDescriptor')) continue;
    if (String(obj.get(PDFName.of('FontName'))).includes('Xyzzy')) obj.set(PDFName.of('Flags'), PDFNumber.of(32 | 2));
  }
  const file = new File([(await flagged.save()) as BlobPart], 'classes.pdf');
  const pages = await extractFormattedTextFromPDF(file);
  const classes = pages[0]!.fontClasses ?? {};
  const names = Object.keys(classes);
  const of = (needle: string): string | undefined => classes[names.find((n) => n.includes(needle)) ?? ''];
  check(of('Xyzzy') === 'serif' && of('Plugh') === 'sans', `the page carries the classes of its fonts (${JSON.stringify(classes)})`);
  check(classifyFont('Xyzzy') === 'sans' && docxFontFamily('Xyzzy') === 'Xyzzy', '(by name alone "Xyzzy" would be taken for a sans-serif)');
  const docx = await docxFonts((await pdfToDocxDocument(file, 'flow')).blob);
  check(docx.runs['Times New Roman'] === 1 && docx.runs['Arial'] === 1, `the .docx writes them as Times New Roman and Arial (${JSON.stringify(docx.runs)}; both Arial while the class was read from a field pdf.js does not export)`);
  check(docx.fallback === 'Arial', 'and its default font is the one most text is set in');
  const odt = await odtFonts((await pdfToOdtDocument(file, 'flow')).blob);
  check(/Xyzzy, 'Times New Roman'/.test(odt.decls.get('Xyzzy') ?? '') && /generic="roman"/.test(odt.decls.get('Xyzzy') ?? '') && /Plugh, Arial/.test(odt.decls.get('Plugh') ?? ''),
    'the .odt declares each with the stand-in of its class');
}

console.log(fails === 0 ? '\nALL PASS' : `\nFAILURES PRESENT: ${fails}`);
process.exit(fails === 0 ? 0 : 1);
