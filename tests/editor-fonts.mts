// The fonts of the PDF editor (public/fonts/*.ttf, lib/pdf/fonts.ts) and what an export does
// with them.
//
// Why it exists: the editor shipped Google's "latin" WOFF2 subsets. Not one of the thirty files
// had a Polish letter except "ó", four "italic" files were 8-glyph stubs, there was no bold
// italic, and — because pdf-lib embeds the bytes it is given — every exported PDF carried a
// WOFF2 file where a TrueType font program belongs, which no PDF reader can use. An edit saying
// "Zażółć gęślą jaźń" came out in a substitute font with the Polish letters wrong.
//
// What is checked:
//   1. every family the editor offers, in all four styles: a real TrueType file with all Polish
//      letters (and the rest of Latin Extended-A), a static font, an open licence;
//   2. the four styles of a family are four different fonts (bold is wider, italic is slanted);
//   3. the EXPORT, read back from the saved PDF: the embedded font program is TrueType, pdf.js
//      can load it (no substitute), it has a glyph for every letter of the edit, and the text
//      reads back — for all twelve choices, regular and bold italic;
//   4. text the chosen font cannot write (Lato has no "č", Gelasio no Cyrillic) is written with
//      Liberation Sans instead of with holes;
//   5. ten edits in one font embed that font once;
//   6. the preview's @font-face rules point at the same files, as TrueType.

import { register } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, PDFName, PDFRawStream, StandardFonts, decodePDFRawStream } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('/')) {
    const f = join(ROOT, 'public', url);
    return existsSync(f) ? new Response(new Uint8Array(readFileSync(f)), { status: 200 }) : new Response('not found', { status: 404 });
  }
  return realFetch(input, init);
}) as typeof fetch;

const { FONT_OPTIONS, fontUrl, fontHasText, getFontFamily, loadGoogleFontsCSS } = await import('../lib/pdf/fonts');
const { exportEditedPdf } = await import('../lib/pdf/exportEditedPdf');
import type { TextEdit } from '../lib/pdf/exportEditedPdf';
const pdfjs = await import('pdfjs-dist');
const fontkitMod = await import('@pdf-lib/fontkit');
interface KitFont {
  postscriptName: string; numGlyphs: number; unitsPerEm: number; italicAngle: number;
  hasGlyphForCodePoint(cp: number): boolean;
  glyphForCodePoint(cp: number): { bbox: { minX: number; maxX: number } };
  layout(text: string): { advanceWidth: number };
  directory: { tables: Record<string, unknown> };
  name: { records: Record<string, Record<string, string> | undefined> };
}
const fontkit = ((fontkitMod as unknown as { default?: unknown }).default ?? fontkitMod) as { create(b: Uint8Array): KitFont };

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const POLISH = 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ';
/** Every letter of Latin Extended-A that is in everyday use across Central Europe would be too
 *  strict for Lato (a design without Czech); the Polish set plus Western European is the floor. */
const WESTERN = 'äöüßéèêçñåøæÄÖÜÉ€–—„”…';
const STYLES = [[400, false, 'regular'], [700, false, 'bold'], [400, true, 'italic'], [700, true, 'bolditalic']] as const;
const families = FONT_OPTIONS.map((o) => o.family);
const missing = (font: KitFont, text: string): string => [...text].filter((c) => !font.hasGlyphForCodePoint(c.codePointAt(0)!)).join('');
const load = (family: string, weight: number, italic: boolean): { bytes: Uint8Array; font: KitFont; file: string } => {
  const url = fontUrl(family, weight, italic)!;
  const bytes = new Uint8Array(readFileSync(join(ROOT, 'public', url)));
  return { bytes, font: fontkit.create(bytes), file: url.split('/').pop()! };
};

console.log('=== every family, every style: a real font with Polish letters ===');
{
  check(families.length === 12, `the editor offers twelve families (${families.join(', ')})`);
  const problems: string[] = [];
  let files = 0;
  for (const family of families) {
    for (const [weight, italic, style] of STYLES) {
      const url = fontUrl(family, weight, italic);
      if (!url || !existsSync(join(ROOT, 'public', url))) { problems.push(`${family} ${style}: no file`); continue; }
      files++;
      const { bytes, font, file } = load(family, weight, italic);
      if (Buffer.from(bytes.subarray(0, 4)).toString('hex') !== '00010000') problems.push(`${file}: not TrueType`);
      if (missing(font, POLISH)) problems.push(`${file}: no "${missing(font, POLISH)}"`);
      if (missing(font, WESTERN)) problems.push(`${file}: no "${missing(font, WESTERN)}"`);
      // (the old subsets had 220-360 glyphs but none of these letters; Lato is a small design)
      if (font.numGlyphs < 250) problems.push(`${file}: only ${font.numGlyphs} glyphs`);
      if ('fvar' in font.directory.tables) problems.push(`${file}: a variable font (would be embedded at its default weight)`);
      const names = Object.values(font.name.records).flatMap((r) => Object.values(r ?? {})).join(' ');
      if (/may not redistribute|Microsoft Corporation\. All Rights Reserved/i.test(names)) problems.push(`${file}: a licence that forbids redistribution`);
    }
  }
  check(files === 48, `a file for each of the 12 x 4 choices (${files})`);
  check(problems.length === 0, `TrueType, all of "${POLISH}", Western European letters, static, open licence — problems: ${problems.join('; ') || 'none'}`);
  check(fontUrl('Comic Sans', 400, false) === null, 'a family the editor does not have: no file');
}

console.log('\n=== four styles are four fonts ===');
{
  const SAMPLE = 'AVWMil Hamburgefonstiv';
  const problems: string[] = [];
  for (const family of [...new Set(families.map(getFontFamily))].map((css) => families.find((f) => getFontFamily(f) === css)!)) {
    const [regular, bold, italic, boldItalic] = STYLES.map(([w, i]) => load(family, w, i).font) as [KitFont, KitFont, KitFont, KitFont];
    const width = (f: KitFont): number => f.layout(SAMPLE).advanceWidth / f.unitsPerEm;
    // Bold: its own name and its own widths (Cousine is monospaced, so only the name there).
    const mono = new Set([...'ilmW'].map((c) => regular.layout(c).advanceWidth)).size === 1;
    if (!mono && width(bold) === width(regular)) problems.push(`${family}: bold has the widths of regular`);
    if (!/bold/i.test(bold.postscriptName) || /bold/i.test(regular.postscriptName)) problems.push(`${family}: bold names (${regular.postscriptName}, ${bold.postscriptName})`);
    // Italic: measured on the outline, not read from the font's own italicAngle field (Roboto
    // Italic says 0 there) — a slanted "H" leans further right (0.04 em in Lato, 0.1 and more elsewhere).
    const stem = (f: KitFont): number => { const b = f.glyphForCodePoint(0x48).bbox; return (b.maxX - b.minX) / f.unitsPerEm; };
    if (!/italic|oblique/i.test(italic.postscriptName) || !(stem(italic) > stem(regular) + 0.03)) problems.push(`${family}: italic is ${italic.postscriptName}, "H" ${stem(regular).toFixed(3)} -> ${stem(italic).toFixed(3)} em`);
    if (!/bold/i.test(boldItalic.postscriptName) || !(stem(boldItalic) > stem(bold) + 0.03)) problems.push(`${family}: bold italic is ${boldItalic.postscriptName}, "H" ${stem(bold).toFixed(3)} -> ${stem(boldItalic).toFixed(3)} em`);
  }
  check(problems.length === 0, `ten sets of files: bold is bold, italic is slanted, bold italic is both — problems: ${problems.join('; ') || 'none'}`);
}

// ---------------------------------------------------------------- the export
async function source(): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([595, 842]).drawText('Original text', { x: 100, y: 700, size: 14, font });
  return Object.assign(new Blob([await doc.save() as BlobPart]), { name: 'a.pdf' }) as unknown as File;
}
const TEXT = 'Zażółć gęślą jaźń, ŁÓDŹ';
const editOf = (fontFamily: string, bold: boolean, italic: boolean, newText = TEXT, n = 0): TextEdit => ({
  id: `e${n}`, page: 1, x: 60, y: 128 + n * 24, width: 480, height: 18, originalText: 'Original text', newText, fontSize: 14, fontFamily, bold, italic, color: '#000000',
});

/** What the saved PDF itself says: its embedded font programs, its text, and whether pdf.js could load the fonts. */
async function inspect(blob: Blob): Promise<{ programs: Array<{ header: string; font: KitFont | null }>; text: string; substituted: string[] }> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const doc = await PDFDocument.load(bytes);
  const programs: Array<{ header: string; font: KitFont | null }> = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    // Font programs are referenced from a font descriptor as FontFile2 (TrueType) / FontFile3.
    const isProgram = doc.context.enumerateIndirectObjects().some(([, d]) => {
      const dict = d as { get?: (n: PDFName) => unknown };
      if (typeof dict.get !== 'function') return false;
      const ref = dict.get(PDFName.of('FontFile2')) ?? dict.get(PDFName.of('FontFile3'));
      return !!ref && doc.context.lookup(ref as never) === obj;
    });
    if (!isProgram) continue;
    const data = decodePDFRawStream(obj).decode();
    const header = Buffer.from(data.subarray(0, 4)).toString('latin1');
    let font: KitFont | null = null;
    try { font = fontkit.create(data); } catch { /* not a font program */ }
    programs.push({ header: header === '\u0000\u0001\u0000\u0000' ? 'TrueType' : header, font });
  }
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const page = await pdf.getPage(1);
  const text = (await page.getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
  // pdf.js marks a font it could not load from the file and had to replace.
  await page.getOperatorList();
  const substituted: string[] = [];
  const objs = page.commonObjs as unknown as { _objs?: Record<string, { data?: { name?: string; missingFile?: boolean } }> };
  for (const [id, o] of Object.entries(objs._objs ?? {})) {
    if (id.startsWith('g_') && o.data?.missingFile) substituted.push(o.data.name ?? id);
  }
  return { programs, text, substituted };
}

console.log('\n=== the export: a font a PDF reader can use, with every letter ===');
{
  const problems: string[] = [];
  let exports = 0;
  for (const family of families) {
    for (const [bold, italic] of [[false, false], [true, true]] as const) {
      const out = await exportEditedPdf(await source(), [editOf(family, bold, italic)]);
      exports++;
      const { programs, text, substituted } = await inspect(out);
      const label = `${family}${bold ? ' bold italic' : ''}`;
      if (programs.length !== 1) { problems.push(`${label}: ${programs.length} embedded fonts`); continue; }
      const p = programs[0]!;
      if (p.header !== 'TrueType') problems.push(`${label}: embedded font program is "${p.header}"`);
      if (!p.font) problems.push(`${label}: the embedded program is not a readable font`);
      else if (missing(p.font, TEXT.replace(/[ ,]/g, ''))) problems.push(`${label}: no glyph for "${missing(p.font, TEXT)}"`);
      if (p.font && bold && !/bold/i.test(p.font.postscriptName)) problems.push(`${label}: embedded ${p.font.postscriptName}`);
      if (substituted.length > 0) problems.push(`${label}: pdf.js had to substitute ${substituted.join(', ')}`);
      // (a monospaced font's wide spaces come back from pdf.js as several)
      if (!text.normalize('NFC').replace(/ +/g, ' ').includes(TEXT)) problems.push(`${label}: text reads "${text}"`);
    }
  }
  check(exports === 24, `24 exports: twelve families, regular and bold italic`);
  check(problems.length === 0, `each embeds one TrueType program with all the letters, loads in pdf.js and reads back "${TEXT}" — problems: ${problems.join('; ') || 'none'}`);
}

console.log('\n=== text the chosen font cannot write ===');
{
  const czech = 'Příliš žluťoučký kůň';
  const lato = await inspect(await exportEditedPdf(await source(), [editOf('Lato', false, false, czech)]));
  check(lato.programs.length === 1 && /Liberation/i.test(lato.programs[0]!.font?.postscriptName ?? ''), `Lato has no "ř č ů": the edit is written with ${lato.programs[0]?.font?.postscriptName}`);
  check(lato.text.normalize('NFC').includes(czech), 'and reads back in full');
  const cyr = await inspect(await exportEditedPdf(await source(), [editOf('Georgia', false, false, 'Привет, мир')]));
  check(/Liberation/i.test(cyr.programs[0]?.font?.postscriptName ?? '') && cyr.text.includes('Привет, мир'), 'Cyrillic in "Georgia" (Gelasio has none): Liberation Sans, readable');
  const polish = await inspect(await exportEditedPdf(await source(), [editOf('Lato', false, false)]));
  check(/Lato/i.test(polish.programs[0]?.font?.postscriptName ?? ''), `Polish in Lato stays Lato (${polish.programs[0]?.font?.postscriptName})`);
  check(await fontHasText('Lato', 400, false, ['Zażółć', 'gęślą'].join(String.fromCharCode(10))) && !(await fontHasText('Lato', 400, false, 'kůň')), 'fontHasText: line breaks do not count, a missing letter does');
}

console.log('\n=== ten edits in one font: one embedded copy ===');
{
  const edits = Array.from({ length: 10 }, (_, n) => editOf('Arial', false, false, `Linia ${n + 1} żółta`, n));
  const out = await exportEditedPdf(await source(), edits);
  const { programs, text } = await inspect(out);
  check(programs.length === 1, `one font program for ten edits (${programs.length})`);
  check(/Linia 10 żółta/.test(text.normalize('NFC')), 'all ten are written');
  const single = await exportEditedPdf(await source(), [edits[0]!]);
  check(out.size < single.size + 20000, `ten edits add ${(out.size - single.size)} bytes to one edit's ${single.size} (not nine more fonts)`);
}

console.log('\n=== the preview uses the same files ===');
{
  let css = '';
  (globalThis as Record<string, unknown>).document = {
    getElementById: () => null,
    createElement: () => ({ set textContent(v: string) { css = v; }, id: '' }),
    head: { appendChild: () => undefined },
  };
  loadGoogleFontsCSS();
  const rules = css.split('\n').filter(Boolean);
  const urls = rules.map((r) => /url\('([^']+)'\) format\('truetype'\)/.exec(r)?.[1]);
  check(rules.length === 40 && urls.every((u) => !!u && existsSync(join(ROOT, 'public', u))), `40 @font-face rules (ten families x four styles), every file exists (${rules.length})`);
  check(rules.some((r) => /font-weight: 700; font-style: italic/.test(r) && /-bolditalic\.ttf/.test(r)), 'bold italic has its own rule and file');
  check(getFontFamily('Arial') === 'arimo' && getFontFamily('Georgia') === 'gelasio' && getFontFamily('Verdana') === 'dejavusans', 'the stand-ins are named for what they are (arimo, gelasio, dejavusans)');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
