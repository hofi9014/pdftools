// Polish tool names: several conversion tools were named with the direction garbled (a machine
// translation artifact): "PDF to EPUB" was "PDF lub EPUB" ("PDF or EPUB"), "PDF to Excel" was
// "PDF z Excela" ("PDF from Excel" — the opposite direction), "Excel to PDF" was "Excel z pliku
// PDF" ("Excel from a PDF file"), and PDF to HTML/SVG/TXT were "Plik PDF z treścią HTML" / "…z
// plikiem SVG/TXT" ("a PDF file with …"). A user reported "pdf lub epub nie działa", reading the
// name literally. Every Polish name of an "A to B" tool now names A before B, joined by "do".
//
// Also: the html-to-pdf page warned that the result is "plain text only — tables, bold, images
// are not preserved", which stopped being true when the tagged renderer replaced the old one.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { t } from '../lib/i18n';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

console.log('=== Polish conversion tool names keep the English direction ===');
const src = readFileSync(join(ROOT, 'lib/i18n.ts'), 'utf8');
const keys = [...new Set([...src.matchAll(/'(tool\.[a-z0-9_]+)':/g)].map((m) => m[1]!))];
// Format/product names stay as they are in Polish (inflected: "Excela", "Worda", "PowerPointa");
// the few ordinary words are translated.
const PL_WORD: Record<string, string> = { images: 'obraz' };
const stem = (w: string) => PL_WORD[w.toLowerCase()] ?? w.toLowerCase().slice(0, 4);
let conversions = 0;
for (const key of keys) {
  const en = t(key, 'en');
  const m = /^(.+?) to (.+)$/.exec(en);
  if (!m) continue;
  conversions++;
  const [from, to] = [m[1]!.replace(/\s*\(.*\)$/, ''), m[2]!.replace(/\s*\(.*\)$/, '')];
  const pl = t(key, 'pl');
  const lower = pl.toLowerCase();
  const iFrom = lower.indexOf(stem(from));
  const iTo = lower.indexOf(stem(to), iFrom + 1);
  check(iFrom >= 0 && iTo > iFrom && /\bdo\b/.test(lower) && !/\blub\b/.test(lower),
    `${key}: "${en}" → "${pl}"`);
}
check(conversions >= 15, `all conversion tools were checked (${conversions})`);

console.log('\n=== html-to-pdf notice matches what the renderer keeps ===');
const renderer = readFileSync(join(ROOT, 'lib/pdf/htmlToTaggedPdf.ts'), 'utf8');
check(/tag === 'table'/.test(renderer) && /tag === 'img'/.test(renderer) && /addLinkAnnotation/.test(renderer), 'the renderer does keep tables, images and links');
for (const loc of ['pl', 'en', 'de'] as const) {
  const w = t('page.html.warning', loc);
  check(!/tylko tekst|plain text only|nur .*Text/i.test(w), `[${loc}] the notice no longer claims "text only" (${w.slice(0, 60)}…)`);
}
check((src.match(/'page\.html\.warning': '[^']*data:[^']*'/g) ?? []).length === 16, 'the notice names data: images (the only kind kept) in all 16 locales');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
