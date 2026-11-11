// "When this tool helps" / "Good to know" under the most searched tools (2026-11-10).
//
// The sentences describe what each tool really does, so this test checks the code they describe,
// not just that the text exists: page order changes by drag or arrows, bookmarks are not copied
// to new documents, cropping only moves the page box, SVG pages are images, EPUB has no images…
// It also checks that every sentence exists in every language, is not English copied into another
// language, names options exactly as the page does, and is rendered under the tool.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement as h, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PDFDocument, PDFName } from 'pdf-lib';

const root = process.cwd();
const { locales, t } = await import('../lib/i18n.ts');
const { all } = await import('../lib/translations/all.ts');
const { tools } = await import('../lib/tools.ts');
const { toolUseCases, toolUseCasesFor } = await import('../content/tool-usecases/index.ts');
const { default: ToolGuide } = await import('../components/ToolGuide.tsx');
const lib = await import('../lib/client-pdf.ts');
const ocrLanguages = JSON.parse(readFileSync(join(root, 'lib', 'ocr-languages.json'), 'utf8')) as unknown[];

let fails = 0;
const check = (ok: boolean, msg: string) => { if (!ok) { console.log(`FAIL: ${msg}`); fails++; } };
const pass = (msg: string) => console.log(`PASS: ${msg}`);
const src = (p: string) => readFileSync(join(root, p), 'utf8');
const fnBody = (file: string, name: string) => {
  const s = src(file);
  const start = s.indexOf(`export async function ${name}(`);
  const next = s.indexOf('\nexport ', start + 10);
  return s.slice(start, next < 0 ? undefined : next);
};

// --- 1. Every sentence in every language ---------------------------------------------------------------
const keys = Object.keys(toolUseCases);
check(keys.length === 12, `12 tools have use cases (${keys.join(', ')})`);
for (const key of keys) {
  check(tools.some((tl) => tl.key === key), `${key}: is a real tool key`);
  const c = toolUseCases[key]!;
  check(c.uses.length >= 2 && c.notes.length >= 2, `${key}: at least two uses and two notes`);
  for (const s of [...c.uses, ...c.notes]) {
    for (const l of locales) {
      const v = s[l];
      check(typeof v === 'string' && v.trim().length > 10, `${key}/${l}: sentence present`);
      if (l !== 'en') check(v !== s.en, `${key}/${l}: not the English sentence copied ("${v?.slice(0, 40)}")`);
      check(!/'/.test(v ?? ''), `${key}/${l}: typographic apostrophes only`);
      for (const m of (v ?? '').matchAll(/\{t:([\w.]+)\}/g)) check(typeof all[l]![m[1]!] === 'string', `${key}/${l}: {t:${m[1]}} exists in this language`);
      // Every language mentions the same placeholders as English.
      const ph = (x: string) => [...x.matchAll(/\{[^}]+\}/g)].map((m) => m[0]).sort().join();
      check(ph(v ?? '') === ph(s.en), `${key}/${l}: same placeholders as English`);
    }
  }
  for (const l of locales) {
    const r = toolUseCasesFor(key, l)!;
    check([...r.uses, ...r.notes].every((x) => !/[{}]/.test(x)), `${key}/${l}: every placeholder resolved`);
  }
}
check(toolUseCasesFor('merge', 'pl') === undefined, 'a tool without use cases gets none');
pass('sentences complete in 16 languages');

// --- 2. The facts the sentences state --------------------------------------------------------------------
const preview = src('components/PagePreview.tsx');
check(/draggable=\{mode === 'reorder'\}/.test(preview) && /moveThumbnail\(displayPos, -1\)/.test(preview) && /moveThumbnail\(displayPos, 1\)/.test(preview), 'reorder: thumbnails are draggable and have up/down buttons');

// Bookmarks: a PDF with an outline loses it in reorder, extract and split (new documents).
async function outlinedPdf(): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 3; i++) doc.addPage([200, 200]);
  const outlines = doc.context.obj({ Type: 'Outlines', Count: 0 });
  doc.catalog.set(PDFName.of('Outlines'), doc.context.register(outlines));
  const bytes = await doc.save();
  return new File([bytes], 'o.pdf', { type: 'application/pdf' });
}
const hasOutline = async (b: Uint8Array) => (await PDFDocument.load(b)).catalog.get(PDFName.of('Outlines')) !== undefined;
const f = await outlinedPdf();
check(await hasOutline(new Uint8Array(await f.arrayBuffer())), 'control: the test PDF has an outline');
check(!(await hasOutline(await lib.reorderPages(f, [2, 1, 0]))), 'reorder: outline not copied');
const ex = await lib.extractPages(f, [2, 0]);
check(!(await hasOutline(ex)), 'extract: outline not copied');
const split = await lib.splitByRanges(f, '1-2');
check(split.length === 1 && !(await hasOutline(split[0]!.data)), 'split: outline not copied');
check(/\.sort\(/.test(fnBody('lib/client-pdf.ts', 'extractPages')), 'extract: pages sorted into document order');
check(/downloadZip/.test(src('app/(unprefixed)/split/page.tsx')) && /splitPDF|splitByRanges|splitBySelection/.test(src('app/(unprefixed)/split/page.tsx')), 'split: three modes, downloaded as ZIP');
check(/dropRemovedPagesObjects/.test(fnBody('lib/client-pdf.ts', 'deletePages')), 'delete: content of deleted pages dropped from the file');

const rotatePage = src('app/(unprefixed)/rotate-pdf/page.tsx');
check(/value: '90'/.test(rotatePage) || /'90' \| '180' \| '270'/.test(rotatePage), 'rotate: 90/180/270 offered');
check(/setRotation/.test(fnBody('lib/client-pdf.ts', 'rotatePDF')) && /getPages\(\)/.test(fnBody('lib/client-pdf.ts', 'rotatePDF')), 'rotate: every page, setRotation (no redraw)');
check(/downloadZip|zip/i.test(rotatePage), 'rotate: several files as ZIP');

const cropPage = src('app/(unprefixed)/crop-pdf/page.tsx');
check(["'mm'", "'in'", 'unit_pt'].every((x) => cropPage.includes(x)) && /PagePreview/.test(cropPage), 'crop: pt/mm/in and page selection');
const cropBody = fnBody('lib/client-pdf.ts', 'cropPages');
check(/setMediaBox/.test(cropBody) && !/drawRectangle|removePage|setContent/.test(cropBody), 'crop: only the page box changes, content stays in the file');

check(ocrLanguages.length > 30, `ocr: ${ocrLanguages.length} languages`);
const ocrPage = src('app/(unprefixed)/ocr-pdf/page.tsx');
check(/download_txt/.test(ocrPage) && /download_docx/.test(ocrPage) && /download_pdf/.test(ocrPage), 'ocr: PDF, TXT and DOCX downloads');
check(/\/tesseract\//.test(src('lib/client-ocr.ts')), 'ocr: language data from this site');

const flatBody = fnBody('lib/client-pdf.ts', 'flattenPDF');
check(/drawObject\(/.test(flatBody) && /removeField\(/.test(flatBody) && /delete\(PDFName\.(of\('Annots'\)|Annots)\)/.test(flatBody), 'flatten: field appearances drawn on the page, fields and annotations removed');
check(/success_nochange/.test(src('app/(unprefixed)/flatten-pdf/page.tsx')), 'flatten: nothing-to-flatten message');

check(/accept="\.odt"/.test(src('app/(unprefixed)/openoffice-to-pdf/page.tsx')), 'openoffice: .odt accepted');
check(/LiberationSans/.test(src('lib/client-pdf-docx.ts')), 'openoffice: text set in Liberation Sans');

check(/cutOutPictures/.test(src('lib/pdf/fixedLayoutPdf.ts')), 'pdf2openoffice: photos as separate images');
check(/textBoxes/.test(src('lib/pdf/fixedLayoutOdt.ts')), 'pdf2openoffice: text frames in ODT');
check(['layout.auto', 'layout.fixed', 'layout.flow'].every((k) => locales.every((l) => typeof all[l]![k] === 'string')), 'pdf2openoffice: mode names exist in every language');

const svgBody = fnBody('lib/client-pdf.ts', 'pdfToSvgPages');
check(/scale: 2/.test(svgBody) && /<image /.test(svgBody) && !/<path/.test(svgBody), 'svg: page image at 2×, no vector paths');
check(/downloadZip/.test(src('app/(unprefixed)/pdf-to-svg/page.tsx')), 'svg: ZIP download');

const epubBody = fnBody('lib/client-pdf.ts', 'pdfToEpub');
check(!/image|<img/i.test(epubBody) && /page-\$\{i \+ 1\}\.xhtml/.test(epubBody), 'epub: one section per page, no images');
check(/<strong>|<em>/.test(src('lib/client-pdf.ts')), 'epub: bold and italic carried over');
pass('facts checked in the code');

// --- 3. Fixed-layout hint no longer says photos are the background -----------------------------------
for (const l of locales) {
  for (const k of ['layout.fixed_hint', 'layout.used_fixed']) check(all[l]![k] !== undefined, `${l}/${k}: present`);
}
check(!/grafika i zdjęcia są tłem/.test(all.pl!['layout.fixed_hint']!) && /zdjęcia są osobnymi obrazami/.test(all.pl!['layout.fixed_hint']!), 'pl: hint says photos are separate images');
check(!/graphics and photos are the page background/.test(all.en!['layout.fixed_hint']!), 'en: old hint gone');

// --- 4. Rendered under the tool ------------------------------------------------------------------------
const slugOf = (key: string) => tools.find((tl) => tl.key === key)!.slug;
for (const key of keys) {
  for (const l of locales) {
    const html = renderToStaticMarkup(h(ToolGuide as ComponentType<{ slug: string; locale: string }>, { slug: slugOf(key), locale: l }));
    const text = html.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const r = toolUseCasesFor(key, l)!;
    check(text.includes(t('toolpage.uses_heading', l)) && text.includes(t('toolpage.notes_heading', l)), `${key}/${l}: both headings shown`);
    check([...r.uses, ...r.notes].every((s) => text.includes(s)), `${key}/${l}: every sentence shown`);
  }
}
const mergeHtml = renderToStaticMarkup(h(ToolGuide as ComponentType<{ slug: string; locale: string }>, { slug: 'merge', locale: 'pl' }));
check(!mergeHtml.includes(t('toolpage.uses_heading', 'pl')), 'a tool without use cases shows no empty section');
pass(`rendered for ${keys.length} tools × ${locales.length} languages`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
