// The header fits the window at every width and in every language (FINDING 2026-11-23).
// The full menu was shown from 768 px, but it needs up to ~1245 px (German): between those widths
// the header ran off the window on every page — in Polish at 1024 px (a common laptop) the theme
// switch was off-screen and the page scrolled sideways. e2e/narrow-screen-overflow.mts measures
// only 375 px, where the mobile menu is used. Now the full menu starts at 1280 px.
// Also checks the "Info" label in the "More" menu comes after its tools (it was after a fixed
// 7th entry; an 8th tool put it between two tools).
// Run against a built site: E2E_BASE_URL=http://localhost:3100 npx tsx e2e/header-fits.mts
import { chromium } from 'playwright';
import { locales, t } from '../lib/i18n';
import { toolsByCategory } from '../lib/tools';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const WIDTHS = [768, 900, 1024, 1180, 1279, 1280, 1440];

const browser = await chromium.launch();
try {
  for (const loc of locales) {
    const bad: string[] = [];
    for (const w of WIDTHS) {
      const page = await browser.newPage({ viewport: { width: w, height: 800 } });
      await page.goto(`${BASE_URL}/${loc}`, { waitUntil: 'load' });
      const r = await page.evaluate(() => {
        const els = [...document.querySelectorAll('header *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
        return { left: Math.min(...els.map((e) => e.getBoundingClientRect().left)), right: Math.max(...els.map((e) => e.getBoundingClientRect().right)), scroll: document.documentElement.scrollWidth };
      });
      if (r.left < -1 || r.right > w + 1 || r.scroll > w + 1) bad.push(`${w}px: ${Math.round(r.left)}..${Math.round(r.right)}, page ${r.scroll}`);
      await page.close();
    }
    check(bad.length === 0, `${loc}: the header stays inside the window at ${WIDTHS.join('/')} px${bad.length ? ` (${bad.join('; ')})` : ''}`);
  }

  console.log('\n=== below 1280 px the menu button opens the tools; from 1280 px the full menu ===');
  for (const w of [1024, 1279, 1280]) {
    const pg = await browser.newPage({ viewport: { width: w, height: 800 } });
    await pg.goto(`${BASE_URL}/pl`, { waitUntil: 'load' });
    const burger = pg.locator('header button[aria-expanded]').first();
    const navShown = await pg.locator('header nav').first().isVisible();
    if (w < 1280) {
      const shown = await burger.isVisible();
      if (shown) await burger.click();
      check(shown && !navShown && (await burger.getAttribute('aria-expanded')) === 'true' && await pg.getByRole('link', { name: t('tool.merge', 'pl') }).first().isVisible(),
        `${w} px: menu button shown, opens with the tools, reports itself open`);
    } else {
      check(navShown && !(await burger.isVisible()), `${w} px: full menu, no menu button`);
    }
    await pg.close();
  }

  console.log('\n=== "More" menu: the Info label after the tools ===');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE_URL}/pl`, { waitUntil: 'load' });
  const label = t('footer.info', 'pl');
  const before = await page.evaluate((lbl) => {
    const span = [...document.querySelectorAll('header nav span')].find((s) => s.textContent?.trim() === lbl);
    if (!span) return -1;
    const grid = span.closest('.grid')!;
    const links = [...grid.querySelectorAll('a')];
    return links.filter((a) => a.compareDocumentPosition(span) & Node.DOCUMENT_POSITION_FOLLOWING).length;
  }, label);
  check(before === toolsByCategory('more').length, `"${label}" comes after all ${toolsByCategory('more').length} tools (after ${before})`);
  await page.close();
} finally {
  await browser.close();
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
