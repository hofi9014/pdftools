import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const para = (tag: string, n: number) => Array.from({ length: n }, (_, i) =>
  `<p>${tag}${i + 1} Rynek kapitałowy jest miejscem, w którym spotyka się liczne grono inwestorów stosujących rozmaite techniki, poprzez które poszukują odpowiedzi na pytanie, kiedy kupić, a kiedy sprzedać akcje wybranej spółki ${tag}${i + 1}koniec.</p>`).join('\n');
const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 20mm; }
body { font-family: Georgia, serif; font-size: 10.5pt; line-height: 1.35; }
h1 { font-size: 20pt; margin: 0 0 6mm; }
.cols { column-count: 2; column-gap: 9mm; text-align: justify; }
p { margin: 0 0 3mm; }
h2 { font-size: 12pt; margin: 4mm 0 2mm; }
</style></head><body>
<h1>Tytuł artykułu na całą szerokość strony</h1>
<div class="cols">
<h2>Wstęp pierwszy</h2>
${para('ALFA', 7)}
<h2>Rozdział drugi</h2>
${para('BETA', 7)}
<h2>Rozdział trzeci</h2>
${para('GAMMA', 8)}
</div></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);
writeFileSync(process.argv[2]!, await page.pdf({ format: 'A4', printBackground: true }));
await browser.close();
