// Builds public/og-image.jpg, the picture link previews show (og:image / twitter:image) for every
// page in every language — so it carries the brand and the formats, no words in one language.
// Run: node scripts/build-og-image.mjs (needs the playwright package's Chromium).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const logo = readFileSync('public/logo.png').toString('base64');
const chips = ['PDF', 'DOCX', 'XLSX', 'PPTX', 'ODT', 'JPG', 'EPUB', 'OCR'].map((c) => `<span class=chip>${c}</span>`).join('');
const html = `<!doctype html><html><head><meta charset=utf-8><style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:#FDFBF7;font-family:'Segoe UI',Arial,sans-serif;position:relative}
.band{position:absolute;inset:0;background:radial-gradient(circle at 82% 20%,rgba(194,143,91,.22),transparent 55%),radial-gradient(circle at 10% 95%,rgba(233,128,40,.12),transparent 50%)}
.wrap{position:absolute;left:96px;top:0;bottom:0;display:flex;align-items:center;gap:56px}
img{width:300px;height:300px}
.name{font-size:112px;font-weight:700;color:#2C1810;letter-spacing:-2px;line-height:1}
.name span{color:#B4652A}
.rule{width:120px;height:8px;border-radius:4px;background:#C28F5B;margin:36px 0 30px}
.chips{display:flex;gap:14px;flex-wrap:wrap;max-width:620px}
.chip{font-size:30px;font-weight:600;color:#835D3C;background:#F5EDE4;border:2px solid rgba(194,143,91,.45);border-radius:14px;padding:10px 20px}
</style></head><body><div class=band></div><div class=wrap><img src="data:image/png;base64,${logo}"><div>
<div class=name>Optima<span>PDF</span></div><div class=rule></div><div class=chips>${chips}</div></div></div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.screenshot({ path: 'public/og-image.jpg', type: 'jpeg', quality: 88 });
await browser.close();
console.log('public/og-image.jpg written (1200x630)');
