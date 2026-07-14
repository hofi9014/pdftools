import { chromium } from 'playwright';

const locales = ['ar', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'is', 'it', 'ja', 'no', 'pl', 'pt', 'sv', 'tr', 'zh'];
const OLD_PORT = 3013;

async function run() {
  const port = OLD_PORT;
  const browser = await chromium.launch({ headless: true });

  console.log('Locale  Title (h1)                                      §1 header                                      §6 header                                     Voluntary header');
  console.log('──────  ──────────────────────────────────────────────  ─────────────────────────────────────────────  ─────────────────────────────────────────────  ─────────────────────────────────────');

  for (const loc of locales) {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });

    // Use addInitScript to set localStorage BEFORE any page JS runs
    await ctx.addInitScript((l) => {
      localStorage.setItem('locale', l);
    }, loc);

    const page = await ctx.newPage();

    await page.route('https://www.googletagmanager.com/**', r => r.abort());
    await page.route('https://accounts.google.com/**', r => r.abort());

    await page.goto(`http://localhost:${port}/nasze-zasady`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    const title = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1?.textContent?.trim() || 'NO H1';
    });

    const headers = await page.evaluate(() => {
      const h2s = document.querySelectorAll('h2');
      return Array.from(h2s).map(h2 => h2.textContent?.trim() || '');
    });

    const sec1 = headers[0] || 'MISSING';
    const sec6 = headers[5] || 'MISSING';
    const vol = headers[6] || 'MISSING';

    console.log(` ${loc.padEnd(5)}  ${(title || '').padEnd(48)}  ${sec1.padEnd(45)}  ${sec6.padEnd(45)}  ${vol}`);

    await page.screenshot({ path: `screenshots/rules-${loc}.png` });

    await ctx.close();
  }

  await browser.close();
}

run().catch(err => { console.error(err); process.exit(1); });
