// Every sentence the site says about how it works has to match the code. Two halves:
//
// 1. The facts, read from the code the sentences describe, so a later code change that makes a
//    corrected sentence untrue fails here.
// 2. The false sentences stay gone, in all 16 languages. tests/fixtures/false-site-texts.json
//    holds a short hash of each sentence that was found untrue; it is written once, before the
//    fix, so nothing here depends on being able to read 16 languages.
//
// Found by checking the FAQ, Help and page texts against the code (PLAN-DZIALANIA.md, 1.1b).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { faqData } from '../content/pages/faq';
import { helpData } from '../content/pages/help';
import { content as rules } from '../content/pages/nasze-zasady';
import { DAILY_LIMIT } from '../lib/ai-limit';
import { locales, t } from '../lib/i18n';
import { legalFor } from '../lib/legal';
import { FONT_OPTIONS } from '../lib/pdf/fonts';
import { all } from '../lib/translations/all';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
export const shortHash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);

console.log('=== the facts behind the corrected sentences ===');
{
  const picker = read('components/CloudFilePicker.tsx');
  const saver = read('components/CloudFileSaver.tsx');
  const sharepoint = read('components/SharePointPickerDialog.tsx');
  check(picker.includes('auth/drive.file') && saver.includes('auth/drive.file'), 'Google Drive asks only for files opened or created by the app (drive.file)');
  check(saver.includes("'Files.ReadWrite.All offline_access'"), 'OneDrive asks for all of the user\'s files (Files.ReadWrite.All)');
  check(sharepoint.includes("'Sites.Read.All offline_access'") && sharepoint.includes("'Sites.ReadWrite.All offline_access'"), 'SharePoint asks for all sites the user can open');
  check(read('lib/dropbox-upload.ts').includes("encodeURIComponent('files.content.write')"), 'Dropbox saving asks only for writing files');
  check(/saveRecentSite/.test(sharepoint) && sharepoint.includes("'sharepoint-recent-sites'"), 'SharePoint sites are remembered in the browser');
  check(!/recent|localStorage\.setItem/i.test(saver), 'no OneDrive or Google Drive folder list is remembered by the save dialog');

  const sw = read('public/sw.js');
  check(!/addAll\(\s*\[[^\]]*\/pl\//.test(sw), 'the service worker does not store every tool in advance: a tool works offline after it was opened once');

  const editPage = read('app/(unprefixed)/edit-pdf/page.tsx');
  check(/f\.size > 100 \* 1024 \* 1024/.test(editPage), 'the PDF editor has a 100 MB limit, so "no size limit" cannot be promised');

  const watermark = read('app/(unprefixed)/watermark-pdf/page.tsx');
  check(!/type="file"[^>]*accept="[^"]*image|embedPng|embedJpg/.test(watermark), 'the watermark tool has no image option');

  const addPage = read('app/(unprefixed)/add-page/page.tsx');
  check(addPage.includes("'page.addpage.custom'") && addPage.includes("'page.addpage.start'"), 'a page can be added anywhere, not only at the end');

  // The support page promised a "Supporter" badge and a list of supporters on the site. There is
  // no such list, and the donation link is still in test mode.
  check(!/supporter|badgeLabel|badgeDesc/i.test(read('components/pages/SupportView.tsx') + read('content/pages/wsparcie.ts')), 'the support page promises no badge and no list of supporters');

  const jpg = read('app/(unprefixed)/jpg-to-pdf/page.tsx');
  check(!/tiff/i.test(jpg), 'the image tool does not offer TIFF, which Chrome and Edge cannot decode');

  // Batch 2: the facts the FAQ and Help answers now state.
  const P = (tool: string) => read(`app/(unprefixed)/${tool}/page.tsx`);
  const engine = read('lib/client-pdf.ts');
  const states = (src: string) => [...src.matchAll(/useState(?:<[^>]*>)?\(([^)]*)\)/g)].map((m) => m[1]);
  const split = P('split');
  check(['mode_fixed', 'mode_ranges', 'mode_select'].every((m) => split.includes(`'page.split.${m}'`)) && !/every_n|everyN|perN/i.test(split), 'split has three modes (page by page, ranges, selection) and no "every N pages" mode');
  check(/export async function rotatePDF\(file: File, angle: 90 \| 180 \| 270\)/.test(engine), 'rotation turns every page: rotatePDF takes no page list');
  const crop = P('crop-pdf');
  check(states(crop).includes("'0'") && crop.includes("'page.crop.unit_mm'") && crop.includes("'page.crop.unit_in'") && !/preview_effect|cropPreview/i.test(crop), 'crop: margins default to 0, units pt/mm/in, no preview of the cut');
  check(addPage.includes("'page.addpage.start'") && addPage.includes("'page.addpage.end'") && !/orientation|landscape|PageSizes/.test(addPage), 'add page: start, end or a chosen number; no size or orientation choice');
  const toolbar = read('components/edit-pdf/Toolbar.tsx');
  check(['text', 'rect', 'circle', 'line', 'arrow', 'highlight', 'freehand', 'image'].every((x) => toolbar.includes(`'${x}'`)), 'the editor offers text, rectangles, circles, lines, arrows, highlights, freehand and images');
  check(FONT_OPTIONS.length === 12, 'the editor has 12 fonts');
  const editorFiles = ['components/edit-pdf/PdfEditor.tsx', 'components/edit-pdf/EditLayer.tsx', 'app/(unprefixed)/edit-pdf/page.tsx'].map(read).join('\n');
  check(!/localStorage|sessionStorage|indexedDB/.test(editorFiles), 'the editor stores nothing: changes exist only in the open tab');
  const watermarkPage = P('watermark-pdf');
  check(states(watermarkPage).includes("'50'") && /const WATERMARK_ROTATION = 45;/.test(watermarkPage) && !/rotation_label|angle_label/.test(watermarkPage), 'watermark: default opacity 50%, always diagonal, no angle setting');
  check(/opacity: parseInt\(opacity/.test(watermarkPage), 'the watermark slider sets opacity (higher = more visible), not transparency');
  check(!/style_label|numbering_style|roman/i.test(P('page-numbers')), 'page numbers have no numbering style option');
  check(/page\.node\.delete\(PDFName\.Annots\)/.test(engine), 'flatten removes all annotations, links included');
  check(/export async function fillFormFields[\s\S]{0,1600}form\.flatten\(\);/.test(engine), 'filling a form flattens the result (the FAQ answer saying so is true)');
  check(jpg.includes('accept=".jpg,.jpeg,.png,.gif,.bmp,.webp"') && !/orientation|landscape/i.test(jpg), 'images to PDF: JPG, PNG, WebP, GIF, BMP; margin only, no orientation');
  check(/export async function pdfToSvgPages[\s\S]{0,1200}<image /.test(engine), 'PDF to SVG embeds an image of each page, not vectors');
  check(!/type="url"|url_label/.test(P('html-to-pdf')), 'HTML to PDF takes pasted code only, no web address');
  check(/const text = htmlToPlainText\(html\);/.test(read('app/api/url-to-pdf/route.ts')), 'URL to PDF keeps only the page text');
  check(P('openoffice-to-pdf').includes('accept=".odt"'), 'the OpenOffice to PDF page accepts ODT only');
  const protect = P('protect-pdf');
  check(!/permission|owner/i.test(protect) && /encryptPDF\(await pdf\.save\(\{ useObjectStreams: false \}\), password\)/.test(engine), 'protect sets only an open password, with the library default');
  check(/options\.algorithm \|\| 'AES-256'/.test(read('node_modules/@pdfsmaller/pdf-encrypt/dist/pdf-encrypt.js')), 'the library default is AES-256');
  const sign = P('sign-pdf');
  check(!/date/i.test(sign) && sign.includes('penColor="blue"') && read('components/sign-pdf/PadesSignForm.tsx').includes('accept=".p12,.pfx"'), 'sign: no date option, the drawn signature is blue, PAdES takes .p12/.pfx');
  check(states(P('pdf-to-images')).includes("'2'"), 'PDF to images: default scale 2 (144 DPI)');
  check((JSON.parse(read('lib/ocr-languages.json')) as unknown[]).length === 33, 'OCR offers 33 languages');
}

console.log('\n=== the corrected sentences say it, in every language ===');
{
  const access = faqData.flatMap((c) => c.items).find((i) => i.key === 'cloud-access');
  for (const l of locales) {
    const a = access?.a[l] ?? '';
    check(['Google Drive', 'Dropbox', 'OneDrive', 'SharePoint'].every((w) => a.includes(w)), `${l}: the cloud answer treats each service separately`);
    const policy = JSON.stringify(legalFor(l));
    check(policy.includes('OneDrive') && policy.includes('SharePoint') && policy.includes('Dropbox'), `${l}: the privacy policy names them too`);
  }
  // Answers that name a mode or another tool must use the name the page shows in that language.
  const faqItems = faqData.flatMap((c) => c.items);
  const helpItems = helpData.flatMap((c) => c.items);
  const quotes: [typeof faqItems, string, string[]][] = [
    [faqItems, 'split', ['page.split.mode_fixed', 'page.split.mode_ranges', 'page.split.mode_select']],
    [faqItems, 'edit', ['tool.redact']],
    [faqItems, 'sign', ['page.sign.mode_digital']],
    [faqItems, 'html', ['tool.url']],
    [faqItems, 'openoffice', ['tool.wordtopdf']],
    [helpItems, 'split-wrong', ['page.split.mode_fixed', 'page.split.mode_select']],
    [helpItems, 'edit-addtext', ['tool.redact']],
    [helpItems, 'html-noresponse', ['tool.html']],
  ];
  for (const [items, key, labels] of quotes) {
    const item = items.find((i) => i.key === key);
    const wrong = locales.filter((l) => !labels.every((k) => (item?.a[l] ?? '').includes(t(k, l))));
    check(wrong.length === 0, `${key}: quotes the page’s own labels in every language${wrong.length ? ` (missing: ${wrong.join(', ')})` : ''}`);
  }
}

console.log('\n=== none of the false sentences is left ===');
{
  type Fixture = { faq: Record<string, string[]>; help: Record<string, string[]>; keys: Record<string, string[] | Record<string, string[]>>; legal: string[] };
  const fixture = JSON.parse(read('tests/fixtures/false-site-texts.json')) as Fixture;
  const faq = faqData.flatMap((c) => c.items);
  const help = helpData.flatMap((c) => c.items);
  const leftovers = (hashes: string[], texts: string[]) => texts.filter((x) => hashes.includes(shortHash(x))).length;
  for (const [key, hashes] of Object.entries(fixture.faq)) {
    const item = faq.find((i) => i.key === key);
    check(!!item && leftovers(hashes, Object.values(item.a)) === 0, `FAQ ${key}: corrected in all languages`);
  }
  for (const [key, hashes] of Object.entries(fixture.help)) {
    const item = help.find((i) => i.key === key);
    check(!!item && leftovers(hashes, Object.values(item.a)) === 0, `Help ${key}: corrected in all languages`);
  }
  // A key wrong in every language holds a list of hashes; a key wrong only in some languages holds
  // them per language (the old Turkish "PDF to EPUB" is the correct English name).
  for (const [key, hashes] of Object.entries(fixture.keys)) {
    const left = Array.isArray(hashes)
      ? leftovers(hashes, locales.map((l) => t(key, l)))
      : Object.entries(hashes).reduce((n, [l, hs]) => n + leftovers(hs, [t(key, l as (typeof locales)[number])]), 0);
    check(left === 0, `${key}: corrected in ${Array.isArray(hashes) ? 'all languages' : Object.keys(hashes).join(', ')}`);
  }
  const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
  const cloudParagraphs = locales.flatMap((l) => strings(legalFor(l)).filter((s) => s.includes('OneDrive') && s.includes('SharePoint')));
  check(cloudParagraphs.length === locales.length && leftovers(fixture.legal, cloudParagraphs) === 0, 'privacy policy: the vague OneDrive/SharePoint paragraph is gone in all languages');
}

console.log('\n=== Our rules page ===');
{
  // Section 2 explains the AI limit: its number is the one the server enforces. It used to set
  // AI against "PDF tools, which work 100% locally in your browser" (URL to PDF has our server
  // fetch the page), and section 6 promised the PDF tools stay "free and unlimited" (URL to PDF
  // allows 30 requests per 10 minutes, the editor takes files up to 100 MB).
  const wrong: string[] = [];
  for (const l of locales) {
    const page = rules[l]!;
    const ai = page.sections[1]!;
    if (!ai.h.includes(String(DAILY_LIMIT)) || !ai.p!.includes(String(DAILY_LIMIT))) wrong.push(`${l}: limit ≠ ${DAILY_LIMIT}`);
    const text = page.sections.map((s) => [s.h, s.p, s.pStart, s.pEnd].join(' ')).join(' ');
    if (/100\s?[%٪％]|%100/.test(ai.p!)) wrong.push(`${l}: “100%”`);
    if (/unlimited|bez limitu|unbegrenzt|sin límite|illimités|senza limiti|sem limites|obegränsade|ubegrensede|بلا حدود|بدون محدودیت|असीमित|無制限|不限次数|sınırsız|án takmarkana/.test(text)) wrong.push(`${l}: “unlimited”`);
  }
  check(wrong.length === 0, `the AI limit is ${DAILY_LIMIT}, no “100% local” and no “unlimited” in any language (${wrong.join(', ') || 'ok'})`);
}

console.log('\n=== Install section ===');
{
  // The home page's install box said "works offline — use the tools without internet"; the
  // service worker keeps only what was opened. It now says what the corrected hero line says.
  const wrong: string[] = [];
  for (const l of locales) {
    const dict = all[l] as Record<string, string>;
    const pitch = dict['hero.offline_pitch']!.split(/\s?[:：]\s?/).slice(1).join(': ').trim().toLowerCase();
    if (dict['installSection.point1']!.toLowerCase() !== pitch) wrong.push(l);
    if (dict['install.desc'] !== undefined) wrong.push(`${l}: unused install.desc`);
  }
  check(wrong.length === 0, `the install box says tools work offline once opened, like the hero line (${wrong.join(', ') || 'ok'})`);
}

console.log('\n=== no English left in other languages ===');
{
  // A key missing in a language falls back to English, and a key copied from English without
  // translation looks the same: both show English text on a translated page. Names that are the
  // same in every language are listed here.
  const SAME_EVERYWHERE = new Set(['tool.ocr']);
  const en = all.en as Record<string, string>;
  for (const l of locales) {
    if (l === 'en') continue;
    const dict = all[l] as Record<string, string>;
    const missing = Object.keys(en).filter((k) => dict[k] === undefined);
    const copied = Object.keys(en).filter((k) => !SAME_EVERYWHERE.has(k) && dict[k] === en[k] && /[a-z]{3,}\s+[a-z]{3,}/i.test(en[k]!));
    check(missing.length === 0, `${l}: every key translated${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
    check(copied.length === 0, `${l}: no English sentence copied as the translation${copied.length ? ` (${copied.join(', ')})` : ''}`);
  }
}

console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);
