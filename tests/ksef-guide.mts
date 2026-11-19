// The Polish KSeF guide (/pl/ksef-xml-na-pdf/jak-otworzyc-fakture-xml, content/pages/ksef-guide.ts):
// every statement that can be checked against the code is checked here, so the text cannot drift
// away from what the tool does. Statements about KSeF itself cite the Ministry of Finance pages
// in KSEF_GUIDE_SOURCES. Run: npm run test:ksef-guide
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';

const G = await import('../content/pages/ksef-guide.ts');
const { KSEF_FAQ } = await import('../content/pages/ksef.ts');
const { ksefNumberFromFileName } = await import('../lib/ksef/parse.ts');
const { KSEF_NOTICE } = await import('../lib/ksef/view.ts');
const { FA3_SCHEMA } = await import('../lib/ksef/schema-fa3.ts');
const { default: KsefArticle } = await import('../components/ksef/KsefArticle.tsx');

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

type Block = (typeof G.KSEF_GUIDE_BODY)[number];
const inl = (x: string | { text: string }) => (typeof x === 'string' ? x : x.text);
const words = (b: Block): string => {
  switch (b.t) {
    case 'h2': case 'cta': return b.text;
    case 'p': return b.parts.map(inl).join('');
    case 'ul': return b.items.map((it) => it.map(inl).join('')).join(' ');
    case 'steps': return b.items.map((s) => `${s.title} ${s.text}`).join(' ');
    case 'figure': return `${b.alt} ${b.caption}`;
    case 'table': return [...b.head, ...b.rows.flat()].join(' ');
  }
};
const text = [G.KSEF_GUIDE_LEAD, ...G.KSEF_GUIDE_BODY.map(words), ...G.KSEF_GUIDE_FAQ.flatMap((f) => [f.q, f.a])].join(' ');

console.log('=== page basics ===');
check(G.KSEF_GUIDE_PATH === '/pl/ksef-xml-na-pdf/jak-otworzyc-fakture-xml', `under the tool: ${G.KSEF_GUIDE_PATH}`);
check(G.KSEF_GUIDE_DESCRIPTION.length >= 110 && G.KSEF_GUIDE_DESCRIPTION.length <= 160, `description ${G.KSEF_GUIDE_DESCRIPTION.length} chars (110-160)`);
check((G.KSEF_GUIDE_TITLE + ' | OptimaPDF').length <= 70, 'title fits a search result');
check(/^\d{4}-\d{2}-\d{2}$/.test(G.KSEF_GUIDE_PUBLISHED) && G.KSEF_GUIDE_UPDATED >= G.KSEF_GUIDE_PUBLISHED, 'publication and update dates');
check(G.KSEF_GUIDE_SOURCES.length >= 3 && G.KSEF_GUIDE_SOURCES.every((s) => s.href.startsWith('https://ksef.podatki.gov.pl/')), 'every source is a Ministry of Finance KSeF page');
const links = G.KSEF_GUIDE_BODY.flatMap((b) => (b.t === 'p' ? b.parts : b.t === 'ul' ? b.items.flat() : [])).flatMap((x) => (typeof x === 'string' ? [] : [x.href]));
check(links.length >= 3 && links.every((l) => G.KSEF_GUIDE_SOURCES.some((s) => s.href === l)), 'every link in the text is one of the listed sources');
check(!/przechowywan|10 lat|dziesięć lat/i.test(text), 'no claim about how long KSeF keeps invoices (the MF pages do not say)');

console.log('\n=== statements about the tool match the code ===');
for (const d of ['1 lutego 2026', '1 kwietnia 2026', '1 stycznia 2027', '10 tys. zł']) {
  check(text.includes(d) && KSEF_FAQ.some((f) => f.a.includes(d)), `"${d}" the same as on the tool page`);
}
const parse = src('lib/ksef/parse.ts');
check(parse.includes('2025/06/25/13775') && parse.includes('2023/06/29/12648') && parse.includes("'fa1'"), 'the tool reads FA(3) and FA(2) and turns FA(1) away');
check(text.includes('FA(3)') && text.includes('FA(2)') && /FA\(1\)[^.]*nie odczytuje/.test(text), 'the guide says FA(3)/FA(2) yes, FA(1) no');
const ksefCode = ['lib/ksef/view.ts', 'lib/ksef/html.ts', 'lib/ksef/client.ts', 'components/ksef/KsefTool.tsx'].map(src).join('\n');
check(!/qr/i.test(ksefCode), 'the tool draws no QR code...');
check(/PDF z naszego narzędzia nie zawiera kodu QR/.test(text), '...and the guide says so');
check(KSEF_NOTICE.includes('Dokumentem księgowym jest plik XML w KSeF') && text.includes('wizualizacją'), 'the PDF notice the guide describes exists');
const tool = src('components/ksef/KsefTool.tsx');
check(tool.includes('faktury-ksef.zip') && tool.includes('jako jeden PDF') && text.includes('ZIP') && text.includes('jeden wspólny PDF'), 'one PDF for all or a ZIP - in the tool and in the guide');
const example = /\d{10}-\d{8}-[0-9A-F]{12}-[0-9A-F]{2}/.exec(text)?.[0] ?? '';
check(!!example && ksefNumberFromFileName(`${example}.xml`) === example, `the example KSeF number ${example} passes the tool's checksum`);
// The tool page's FAQ gives an example too; it said "-9A" (wrong checksum) until 2026-11-19.
const faqExample = /\d{10}-\d{8}-[0-9A-F]{12}-[0-9A-F]{2}/.exec(KSEF_FAQ.map((f) => f.a).join(' '))?.[0] ?? '';
check(!!faqExample && ksefNumberFromFileName(`${faqExample}.xml`) === faqExample, `the tool page's example KSeF number ${faqExample} passes the checksum`);
const fields = FA3_SCHEMA.fields as Record<string, { doc: string }>;
check(/należności ogółem/.test(fields['Fa/P_15']?.doc ?? '') && text.includes('P_15 to kwota należności ogółem'), 'P_15 is what the guide says (MF schema)');
check(/sprzedaży netto objętej stawką podstawową/.test(fields['Fa/P_13_1']?.doc ?? '') && text.includes('P_13_1 to suma wartości sprzedaży netto w stawce podstawowej'), 'P_13_1 is what the guide says (MF schema)');
check(JSON.stringify(FA3_SCHEMA).includes('"KOR":"Faktura korygująca"'), 'KOR means a correcting invoice in the schema');

console.log('\n=== pictures ===');
for (const b of G.KSEF_GUIDE_BODY) {
  if (b.t !== 'figure') continue;
  const file = join(process.cwd(), 'public', b.src);
  const meta = existsSync(file) ? await sharp(file).metadata() : undefined;
  check(!!meta && meta.width === b.width && meta.height === b.height && meta.format === 'webp', `${b.src}: WebP ${b.width}x${b.height} as declared`);
  check(existsSync(file) && statSync(file).size < 150_000, `${b.src}: under 150 kB`);
  check(b.alt.length > 40 && /fikcyjn/.test(b.caption), `${b.src}: describes the picture and says the data are fictional`);
}

console.log('\n=== rendered page ===');
const html = renderToStaticMarkup(h(KsefArticle));
check((html.match(/<h1/g) ?? []).length === 1 && html.includes(G.KSEF_GUIDE_TITLE), 'one H1 with the title');
for (const b of G.KSEF_GUIDE_BODY) if (b.t === 'h2') check(html.includes(`id="${b.id}"`) && html.includes(`href="#${b.id}"`), `section "${b.text}" with a link in the contents`);
check(G.KSEF_GUIDE_FAQ.every((f) => html.includes(f.q)), 'every question visible');
check(html.includes('"@type":"Article"') && html.includes('"@type":"FAQPage"') && html.includes('"@type":"BreadcrumbList"'), 'Article, FAQPage and BreadcrumbList data');
check(html.includes('href="/pl/ksef-xml-na-pdf"'), 'links to the tool');
check(src('components/ksef/KsefGuide.tsx').includes('KSEF_GUIDE_PATH'), 'the tool page links back to the guide');
check(src('app/sitemap.ts').includes('KSEF_GUIDE_PATH') && src('lib/llms-text.ts').includes('KSEF_GUIDE_PATH'), 'in the sitemap and llms.txt');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
