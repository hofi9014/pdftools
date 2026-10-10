// Generates test-real-pdfs/chrome-invoice.pdf: an invoice printed from a browser — the kind of
// PDF people put through "PDF → Excel". It has, on purpose:
//   - a title and two address blocks side by side above the table (text outside any table),
//   - an items table that runs over two pages with its header repeated by the browser,
//   - cells whose text wraps onto two or three lines,
//   - a category cell merged over three rows with its text centred vertically (the text does not
//     touch the first row of the merge),
//   - a row with a cell merged across five columns,
//   - right-aligned amounts with a space as the thousands separator,
//   - a totals block and a note under the table, and a line with two fields far apart.
// Every item carries a marker (POZ01…) and every merged category one (KAT1…), so tests can find
// their text again.
//
// usage: npx tsx e2e/fixtures/make-invoice-pdf.mts test-real-pdfs/chrome-invoice.pdf
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const NAMES = [
  'Papier ksero A4 80 g, ryza 500 arkuszy, biały, do drukarek laserowych i atramentowych',
  'Długopis żelowy niebieski',
  'Segregator A4 75 mm z mechanizmem dźwigniowym, oklejony folią, z wymienną etykietą na grzbiecie',
  'Zszywacz biurowy',
  'Toner do drukarki laserowej, czarny, wydajność 3000 stron przy pokryciu 5%',
  'Koperty C5 samoklejące',
  'Taśma klejąca przezroczysta 18 mm',
  'Notes kołowy w kratkę',
];
const money = (v: number): string => v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export interface InvoiceItem { lp: number; marker: string; name: string; qty: number; price: number; gross: number; category?: string }
export const invoiceItems: InvoiceItem[] = [];
for (let i = 1; i <= 34; i++) {
  const price = 3.4 + i * 7.35;
  const qty = 1 + (i * 3) % 11;
  invoiceItems.push({
    lp: i, marker: `POZ${String(i).padStart(2, '0')}`, name: NAMES[(i - 1) % NAMES.length]!, qty, price, gross: qty * price * 1.23,
    ...(i % 9 === 1 ? { category: `KAT${1 + Math.floor(i / 9)} Materiały biurowe` } : {}),
  });
}
export const invoiceTotals = {
  net: invoiceItems.reduce((s, it) => s + it.qty * it.price, 0),
  gross: invoiceItems.reduce((s, it) => s + it.gross, 0),
};
export const fmtMoney = money;

function rows(): string {
  const out: string[] = [];
  let covered = 0;
  for (const it of invoiceItems) {
    let cat = '';
    if (it.category) { cat = `<td rowspan="3" class="cat">${it.category}</td>`; covered = 2; }
    else if (covered > 0) covered--;
    else cat = '<td>Inne</td>';
    out.push(`<tr><td class="n">${it.lp}</td><td>${it.marker} ${it.name}</td>${cat}<td class="n">${it.qty}</td><td>szt.</td><td class="n">${money(it.price)}</td><td class="n">23%</td><td class="n">${money(it.gross)}</td></tr>`);
    if (it.lp === 12) out.push('<tr><td class="n"></td><td colspan="5">RABAT stałego klienta naliczony do pozycji od 1 do 12</td><td class="n">23%</td><td class="n">-150,00</td></tr>');
  }
  return out.join('\n');
}

const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 18mm 14mm; }
  body { font: 10pt Arial, Helvetica, sans-serif; color: #111; }
  h1 { font-size: 17pt; margin: 0 0 4mm; }
  .parties { display: flex; gap: 12mm; margin-bottom: 6mm; }
  .parties div { flex: 1; line-height: 1.45; }
  .parties b { display: block; margin-bottom: 1mm; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 0.6pt solid #444; padding: 1.2mm 1.6mm; vertical-align: top; }
  th { background: #dde3ea; text-align: left; }
  td.n { text-align: right; white-space: nowrap; }
  td.cat { vertical-align: middle; text-align: center; }
  tr { break-inside: avoid; }
  .totals { width: 76mm; margin: 5mm 0 0 auto; }
  .totals div { display: flex; justify-content: space-between; padding: 0.6mm 0; }
  .totals .sum { font-weight: bold; border-top: 0.8pt solid #111; }
  .pay { display: flex; justify-content: space-between; margin-top: 6mm; }
  p { margin: 4mm 0 0; line-height: 1.4; }
</style></head><body>
<h1>Faktura VAT nr FV/2026/10/0173</h1>
<div class="parties">
  <div><b>Sprzedawca</b>Hurtownia Biurowa Żółw sp. z o.o.<br>ul. Długa 14, 80-831 Gdańsk<br>NIP 583-000-11-22</div>
  <div><b>Nabywca</b>Pracownia Projektowa Źródło<br>ul. Ogrodowa 7/3, 61-820 Poznań<br>NIP 778-111-22-33</div>
</div>
<table>
  <thead><tr><th>Lp.</th><th>Nazwa towaru lub usługi</th><th>Kategoria</th><th>Ilość</th><th>J.m.</th><th>Cena netto</th><th>VAT</th><th>Wartość brutto</th></tr></thead>
  <tbody>
${rows()}
  </tbody>
</table>
<div class="totals">
  <div><span>Razem netto:</span><span>${money(invoiceTotals.net)} zł</span></div>
  <div><span>Podatek VAT 23%:</span><span>${money(invoiceTotals.gross - invoiceTotals.net)} zł</span></div>
  <div class="sum"><span>Do zapłaty:</span><span>${money(invoiceTotals.gross - 150)} zł</span></div>
</div>
<div class="pay"><span>Termin płatności: 14 dni</span><span>Sposób płatności: przelew</span></div>
<p>UWAGA Towar pozostaje własnością sprzedawcy do chwili zapłaty całej należności. Reklamacje ilościowe przyjmujemy w ciągu siedmiu dni od daty dostawy, a jakościowe zgodnie z warunkami gwarancji producenta.</p>
</body></html>`;

if (process.argv[2]) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  writeFileSync(process.argv[2], await page.pdf({ format: 'A4', printBackground: true }));
  await browser.close();
}
