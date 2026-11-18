// KSeF XML to PDF (lib/ksef): every official Ministry of Finance sample and the invoices built from
// the Ministry's FA(3) brochure (correction, advance in EUR, several VAT rates) are read, and:
//   - every value in the file is shown in the preview (nothing dropped, nothing left over),
//   - amounts are shown digit for digit as in the file (VAT summary and the total),
//   - the KSeF number is taken from the file name only when its checksum is right,
//   - other files (UPO, FA(1), any XML, not XML) get their own message,
//   - nothing from the file is inserted as markup,
//   - the sample files are valid against the official schema (when Java is installed).
// Run: npm run test:ksef-xml-to-pdf
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { DOMParser } from '@xmldom/xmldom';

(globalThis as unknown as { DOMParser: unknown }).DOMParser = DOMParser;
const { readKsefXml, ksefChecksum, ksefNumberFromFileName } = await import('../lib/ksef/parse.ts');
const { buildInvoiceView, KSEF_NOTICE } = await import('../lib/ksef/view.ts');
const { invoicePreviewHtml, invoicesPdfHtml } = await import('../lib/ksef/html.ts');
const { formatValue, formatDecimal, formatDate, formatDateTime, formatAccount } = await import('../lib/ksef/format.ts');
const { readInvoiceText } = await import('../lib/ksef/client.ts');
const { FA3_SCHEMA } = await import('../lib/ksef/schema-fa3.ts');
const { FA2_SCHEMA } = await import('../lib/ksef/schema-fa2.ts');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const DIR = 'test-fixtures/ksef';
const invoices = ['mf', 'brochure'].flatMap((d) => readdirSync(join(DIR, d)).filter((f) => f.endsWith('.xml')).map((f) => join(DIR, d, f)));
const NB = (s: string) => s.replace(/ /g, ' ');
const unescape = (s: string) => s.replace(/<br>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

console.log('=== formatting ===');
check(formatDecimal('27292.28') === '27 292,28', 'amount with thousands: 27 292,28');
check(formatDecimal('-405.90') === '-405,90' && formatDecimal('0.5') === '0,5' && formatDecimal('17') === '17', 'negative, fraction, integer kept as written');
check(formatDecimal('4.4512') === '4,4512', 'every decimal digit kept (no rounding)');
check(formatDate('2026-09-10') === '10.09.2026', 'date dd.mm.yyyy');
check(formatDateTime('2026-03-22T03:27:54.0792168Z') === '22.03.2026, 03:27:54 UTC', 'date-time as written, zone named');
check(formatAccount('61109010140000071219812874') === '61 1090 1014 0000 0712 1981 2874', 'Polish account number in groups');
check(formatValue(FA3_SCHEMA, 'Fa/Platnosc/FormaPlatnosci', '6') === 'Przelew', 'payment form code → the schema meaning');
check(formatValue(FA3_SCHEMA, 'Fa/FaWiersz/P_12', 'zw') === 'zw – zwolnione od podatku' && formatValue(FA3_SCHEMA, 'Fa/FaWiersz/P_12', '23') === '23%', 'VAT rate codes');
check(formatValue(FA3_SCHEMA, 'Fa/Adnotacje/P_16', '2') === 'nie' && formatValue(FA3_SCHEMA, 'Fa/Adnotacje/P_18', '1') === 'tak', 'annotations 1/2 → tak/nie');
check(Object.keys(FA3_SCHEMA.fields).length > 400 && FA2_SCHEMA.namespace.endsWith('12648/'), 'schema descriptions generated for FA(3) and FA(2)');

console.log('\n=== KSeF number from the file name ===');
// The number from the Ministry's brochure (example 14) and the algorithm of its Java client.
const brochureNumber = '9999999999-20260714-D5FB0C9ED490';
const valid = `${brochureNumber}-${ksefChecksum(brochureNumber)}`;
check(ksefNumberFromFileName(`${valid}.xml`) === valid, `a valid number is shown (${valid})`);
check(ksefNumberFromFileName(`faktura_${valid.toLowerCase()}.xml`) === valid, 'lower-case in the name is accepted and shown upper-case');
const wrong = `${brochureNumber}-${ksefChecksum(brochureNumber) === '00' ? '01' : '00'}`;
check(ksefNumberFromFileName(`${wrong}.xml`) === undefined, 'a number with a wrong checksum is not shown');
check(ksefNumberFromFileName('FV-2026-09.xml') === undefined, 'no number in the name → none shown');

console.log('\n=== every sample: every value shown, amounts exact ===');
check(invoices.length >= 13, `${invoices.length} invoice samples`);
for (const path of invoices) {
  const name = path.split(/[\\/]/).pop()!;
  const read = readKsefXml(readFileSync(path, 'utf8'), name);
  if ('error' in read) { check(false, `${name}: read (${read.error.code})`); continue; }
  const inv = read.invoice;
  const schema = inv.version === 'FA(3)' ? FA3_SCHEMA : FA2_SCHEMA;
  const view = buildInvoiceView(inv);
  const text = unescape(invoicePreviewHtml(view));
  // A value counts as shown when the preview has it formatted or as written in the file (a country
  // code inside an address, a role as the party's title, P_19N as "Zwolnienie od podatku: nie").
  const missing = inv.leaves.filter((l) => ![formatValue(schema, l.path, l.value), l.value, formatDecimal(l.value)].some((v) => text.includes(v)));
  const leftover = view.blocks.some((b) => b.t === 'heading' && b.text === 'Pozostałe dane z pliku');
  check(view.shown.size === inv.leaves.length && missing.length === 0, `${name} (${inv.version}): all ${inv.leaves.length} values in the preview${missing.length ? ` — missing ${missing.slice(0, 3).map((m) => m.path).join(', ')}` : ''}${leftover ? ' (some under "Pozostałe dane")' : ''}`);

  const fa = inv.root.children.find((c) => c.name === 'Fa')!;
  const total = fa.children.find((c) => c.name === 'P_15')?.value;
  const totalBlock = view.blocks.find((b) => b.t === 'total');
  const currency = fa.children.find((c) => c.name === 'KodWaluty')?.value ?? '';
  check(totalBlock?.t === 'total' && totalBlock.value === `${formatDecimal(total!)} ${currency}`, `${name}: total = P_15 from the file (${total} ${currency})`);
  const sums = fa.children.filter((c) => /^P_1[34]_/.test(c.name) && c.value !== undefined);
  const table = view.blocks.find((b) => b.t === 'table' && b.columns[0]?.label === 'Stawka');
  const cells = table?.t === 'table' ? table.rows.flat() : [];
  check(sums.every((s) => cells.includes(formatDecimal(s.value!))), `${name}: VAT summary shows ${sums.length} sums from the file digit for digit`);
}

console.log('\n=== corrections, advances, several rates ===');
{
  const v = (f: string) => buildInvoiceView((readKsefXml(readFileSync(join(DIR, 'brochure', f), 'utf8'), f) as { invoice: Parameters<typeof buildInvoiceView>[0] }).invoice);
  const kor = v('korekta-roznicowa.xml');
  check(kor.title === 'Faktura korygująca', 'correction: title');
  const korText = unescape(invoicePreviewHtml(kor));
  check(korText.includes('Numer KSeF faktury korygowanej') && korText.includes('9999999999-20260714-D5FB0C9ED490-9A') && korText.includes('-405,90 PLN'), 'correction: corrected invoice data and negative total');
  const before = unescape(invoicePreviewHtml(v('korekta-przed-po.xml')));
  check((before.match(/Stan przed korektą: tak/g) ?? []).length === 2, 'correction before/after: the two "state before" lines are marked');
  const zal = unescape(invoicePreviewHtml(v('zaliczka-eur.xml')));
  check(zal.includes('Faktura zaliczkowa') && zal.includes('4,4724') && zal.includes(NB('3 351,16')) && zal.includes(`${NB('4 000,00')} EUR`), 'advance in EUR: payments with rates, VAT in PLN, total in EUR');
  const multi = v('wiele-stawek.xml');
  const rates = multi.blocks.find((b) => b.t === 'table' && b.columns[0]?.label === 'Stawka');
  check(rates?.t === 'table' && rates.rows.length === 5, 'several rates: 23%, 8%, 5%, exempt and reverse charge in the summary');
  const multiText = unescape(invoicePreviewHtml(multi));
  check(multiText.includes('Odbiorca') && multiText.includes('Oddział Magazynowy w Kutnie'), 'third party with its role');
  check(multiText.includes(NB('2 068,00')) && multiText.includes('61 1090 1014 0000 0712 1981 2874'), 'settlement and bank account');
}

console.log('\n=== other files ===');
for (const [f, expected] of [['mf-upo.xml', 'Urzędowe Poświadczenie Odbioru'], ['fa1-stub.xml', 'FA(1)'], ['inny-xml.xml', '„zamowienie”'], ['notatka.xml', 'nie jest plik XML']] as const) {
  const r = readInvoiceText(readFileSync(join(DIR, 'other', f), 'utf8'), f);
  check(!r.ok && r.message.includes(expected), `${f}: "${r.ok ? '' : r.message}"`);
}
check(!readInvoiceText('', 'pusty.xml').ok, 'empty file: message');

console.log('\n=== nothing from the file becomes markup ===');
{
  const base = readFileSync(join(DIR, 'mf', 'cs-invoice-template-fa-3.xml'), 'utf8');
  const evil = base.replace(/<Nazwa>[^<]*<\/Nazwa>/, '<Nazwa>&lt;img src=x onerror=alert(1)&gt;&lt;script&gt;alert(2)&lt;/script&gt;</Nazwa>');
  const r = readInvoiceText(evil, 'evil.xml');
  check(r.ok && !/<img|<script/i.test(r.previewHtml) && r.previewHtml.includes('&lt;script&gt;'), 'HTML in a field is shown as text in the preview');
  check(r.ok && !/<img|<script/i.test(invoicesPdfHtml([{ view: r.view, fileName: '<b>x</b>.xml' }]).replace(/^<!doctype html>/, '')), 'and in the PDF document, file name included');
  check(r.ok && invoicesPdfHtml([{ view: r.view, fileName: 'a.xml' }]).includes(KSEF_NOTICE), 'the PDF carries the notice that it is a visualization');
}

console.log('\n=== samples valid against the official schema (Java) ===');
if (spawnSync('java', ['-version']).status !== 0) {
  console.log('  SKIP java not installed');
} else {
  // The official XSD files import each other by URL: copy them side by side and point the imports
  // at the copies. Java refuses maxOccurs above its limit; "unbounded" checks the same structure.
  const tmp = mkdtempSync(join(tmpdir(), 'ksef-xsd-'));
  for (const f of readdirSync('scripts/ksef-xsd').filter((x) => x.endsWith('.xsd'))) {
    const src = readFileSync(join('scripts/ksef-xsd', f), 'utf8')
      .replace(/schemaLocation="http:\/\/crd\.gov\.pl\/xml\/schematy\/dziedzinowe\/mf\/2022\/01\/05\/eD\/DefinicjeTypy\//g, 'schemaLocation="')
      .replace(/maxOccurs="\d{3,}"/g, 'maxOccurs="unbounded"');
    writeFileSync(join(tmp, f), src);
  }
  copyFileSync('tests/helpers/XsdValidate.java', join(tmp, 'XsdValidate.java'));
  const run = (xsd: string, files: string[]) => {
    try {
      return execFileSync('java', [join(tmp, 'XsdValidate.java'), join(tmp, xsd), ...files], { encoding: 'utf8' });
    } catch (e) {
      return (e as { stdout?: string }).stdout ?? String(e);
    }
  };
  const brochure = readdirSync(join(DIR, 'brochure')).map((f) => join(DIR, 'brochure', f));
  const out3 = run('FA3-schemat.xsd', brochure);
  check(brochure.every((f) => out3.includes(`VALID ${f}`)), `the ${brochure.length} invoices built from the brochure are valid FA(3)`);
  const out2 = run('FA2-schemat.xsd', [join(DIR, 'mf', 'cs-faktura-online-fa2.xml')]);
  check(out2.includes('VALID '), 'the FA(2) sample is valid FA(2)');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
