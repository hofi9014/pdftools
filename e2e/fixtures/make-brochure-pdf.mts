// Generates test-real-pdfs/chrome-brochure.pdf: a designed, two-page travel offer — the kind of
// page the flow engine cannot rebuild (see lib/pdf/fixedLayout.ts). It has, on purpose:
//   - a two-colour headline set flush right, in a font no word processor will have,
//   - a dashed rule, dotted row separators and rounded, tinted cards (decoration that lines up
//     into a false "table" for a grid detector),
//   - label/value rows with right-aligned values, one value on two lines with its label centred
//     against it (baselines that do not line up),
//   - a price badge with white text on a coloured shape beside those rows,
//   - three pictures in a row,
//   - cards with five rows on the left and a large price centred on the right,
//   - a second page of running text, and a footer band with white text on both pages.
// Every row carries a marker (ROW1…, CARD1…) so tests can find its text again.
//
// usage: npx tsx e2e/fixtures/make-brochure-pdf.mts test-real-pdfs/chrome-brochure.pdf
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const photo = (hue: number): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,55%)"/><stop offset="1" stop-color="hsl(${hue + 60},70%,35%)"/></linearGradient></defs><rect width="320" height="200" fill="url(#g)"/><circle cx="240" cy="60" r="34" fill="hsl(${hue + 180},80%,80%)"/><path d="M0 200 L90 90 L150 150 L210 80 L320 200 Z" fill="hsl(${hue + 30},45%,25%)"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const card = (n: number, price: number): string => `
<div class="card">
  <div class="rows">
    <div>CARD${n} Długość: 1${n}.05.2027 / 4 dni</div>
    <div>Podróż tam: Bydgoszcz (BZG) 1${n}.05.2027 godz. 06:00 - 00:00</div>
    <div>Powrót: Wycieczka objazdowa 1${n + 2}.05.2027 godz. 00:00 - 14:00</div>
    <div>Zakwaterowanie: pokój 2-3 osobowy z łazienką</div>
    <div>Wyżywienie: Śniadania i obiadokolacje</div>
  </div>
  <div class="price">Cena za osobę: <b class="big">${price}</b> <b>PLN</b></div>
</div>`;

const body = Array.from({ length: 9 }, (_, i) =>
  `<p>TEKST${i + 1} Przyjazd do Szwajcarii. Zwiedzanie rozpoczniemy od wodospadów — największych pod względem przepływu w Europie, o szerokości 150 metrów i wysokości 23 metrów, nad którymi góruje zamek. Następnie przejazd do Zurychu, największego miasta kraju i centrum finansowego. Kolejnym punktem spaceru będzie gwarny plac położony nad jeziorem, a dalej świątynia z XIII wieku z witrażami KONIEC${i + 1}.</p>`).join('\n');

const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Segoe UI", "Trebuchet MS", sans-serif; font-size: 9pt; color: #111; }
.page { position: relative; width: 210mm; height: 297mm; padding: 9mm 9mm 0; page-break-after: always; overflow: hidden; }
h1 { margin: 0; text-align: right; font-weight: 400; font-size: 34pt; line-height: 1.05; color: #259ea6; }
h1 b { display: block; color: #fab82e; }
.offer { display: flex; align-items: center; gap: 4mm; margin-top: 3mm; color: #259ea6; font-weight: 700; font-size: 11pt; }
.offer i { flex: 1; border-top: 1.5pt dashed #e9703a; }
h2 { margin: 2mm 0 0; font-weight: 400; font-size: 17pt; }
.sub { font-size: 11pt; margin-bottom: 3mm; }
.top { display: flex; gap: 6mm; align-items: center; }
.kv { flex: 1; }
.kv > div { display: flex; justify-content: space-between; align-items: center; gap: 12mm; padding: 1.2mm 0; border-bottom: 0.8pt dotted #259ea6; font-size: 8.5pt; }
.kv > div span:last-child { text-align: right; max-width: 92mm; }
.badge { width: 62mm; height: 30mm; margin-right: -9mm; border-radius: 15mm 0 0 15mm; background: #fab82e; color: #fff; text-align: center; padding-top: 6mm; }
.badge .n { font-size: 28pt; line-height: 1; }
.badge .n small { font-size: 18pt; }
.badge .p { font-size: 14pt; }
.photos { display: flex; gap: 4mm; margin: 5mm 0; }
.photos img { flex: 1; width: 0; height: 38mm; border-radius: 2mm; object-fit: cover; }
.card { display: flex; align-items: center; border: 0.8pt solid #259ea6; border-radius: 2.5mm; background: #e9f4f5; padding: 4mm 4mm; margin-bottom: 4mm; }
.card .rows { width: 104mm; }
.card .rows div { padding: 1.2mm 0; }
.card .price { font-size: 10pt; }
.card .big { font-size: 16pt; }
.foot { position: absolute; left: 0; right: 0; bottom: 0; height: 17mm; background: #259ea6; color: #fff; padding: 4.5mm 9mm 0; font-size: 9.5pt; }
h3 { margin: 4mm 0 1mm; font-size: 11pt; }
p { margin: 0 0 2mm; font-size: 8pt; line-height: 1.35; }
</style></head><body>
<div class="page">
  <h1>INFORMACJE O <b>IMPREZIE</b></h1>
  <div class="offer"><span>Oferta 1</span><i></i></div>
  <h2>Szwajcarski express i czerwony pociąg</h2>
  <div class="sub">Szwajcaria / Wycieczka objazdowa</div>
  <div class="top">
    <div class="kv">
      <div><span>ROW1 Wyżywienie:</span><span>Śniadania i obiadokolacje</span></div>
      <div><span>ROW2 Zakwaterowanie:</span><span>Zakwaterowanie w pokoju 2-3 osobowym</span></div>
      <div><span>ROW3 Podróż tam:</span><span>Bydgoszcz (BZG) do miejsca rozpoczęcia wycieczki objazdowej dnia 01.04.2027 godz. 06:00 - 00:00</span></div>
      <div><span>ROW4 Powrót:</span><span>Z miejsca zakończenia wycieczki objazdowej do Bydgoszczy dnia 03.04.2027 godz. 00:00 - 14:00</span></div>
      <div><span>ROW5 Długość:</span><span>01.04.2027 / 4 dni</span></div>
    </div>
    <div class="badge"><div class="n">1446 <small>PLN</small></div><div class="p">za osobę</div></div>
  </div>
  <div class="photos"><img src="${photo(200)}"><img src="${photo(140)}"><img src="${photo(20)}"></div>
  ${card(1, 1446)}
  ${card(2, 1446)}
  ${card(3, 1529)}
  <div class="foot">STOPKA1 Niniejsza oferta nie stanowi oferty w rozumieniu Kodeksu Cywilnego, a dane w niej zawarte mają jedynie charakter informacyjny.</div>
</div>
<div class="page">
  <h1>INFORMACJE O <b>IMPREZIE</b></h1>
  <div class="offer"><span>Opis oferty</span><i></i></div>
  <h3>Program:</h3>
  ${body}
  <h3>Zakwaterowanie:</h3>
  <p>OPIS1 Zakwaterowanie odbywa się w pokojach 2- lub 3-osobowych. Dla osób wybierających się w pojedynkę istnieją dwie opcje zakwaterowania: dokwaterowanie albo pokój 1-osobowy, do którego jest dopłata KONIECOPIS1.</p>
  <div class="foot">STOPKA2 Niniejsza oferta nie stanowi oferty w rozumieniu Kodeksu Cywilnego, a dane w niej zawarte mają jedynie charakter informacyjny.</div>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);
writeFileSync(process.argv[2]!, await page.pdf({ format: 'A4', printBackground: true }));
await browser.close();
