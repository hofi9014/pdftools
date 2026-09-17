import { chromium } from 'playwright';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

// Regression guard for a real bug found while adding dir="rtl" support: the homepage's
// stats row (flex justify-center gap-12, no wrap) and full-bleed .mesh-bg/.grain-overlay
// layers (width:100% of a viewport that mobile browsers can balloon past the true device
// width once ANY element overflows) together produced a ~30-150px horizontal overflow.
// In LTR that overflow silently hangs off the right edge (scrollLeft anchors left, so it's
// invisible). In RTL, Chromium anchors scrollLeft at the right edge instead, so the exact
// same overflow clips real content (header logo, hero heading, stats) on the LEFT on load.
// Fixed by narrowing the mobile gap (app/page.tsx) and adding `overflow-x: hidden` on
// `html` (app/globals.css) as a safety net. This test pins both the dir attribute itself
// and the no-horizontal-overflow invariant at a real mobile viewport, so either fix
// regressing would be caught here instead of only being visible to an ar/fa mobile user.

async function run() {
  const errors: string[] = [];

  // ─── Test 1: ar/fa set dir=rtl on <html>; other locales stay ltr ──
  {
    const browser = await chromium.launch({ headless: true });
    for (const [locale, expectedDir] of [['ar', 'rtl'], ['fa', 'rtl'], ['pl', 'ltr'], ['de', 'ltr']] as const) {
      const page = await browser.newPage();
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(`${BASE_URL}/${locale}`, { waitUntil: 'load' });
      await page.waitForFunction((d) => document.documentElement.dir === d, expectedDir, { timeout: 5000 });
      console.log(`✓ /${locale} → dir=${expectedDir}`);
      await page.close();
    }
    await browser.close();
  }

  // ─── Test 2: no horizontal overflow at mobile width (375px), ar+pl,
  //             homepage and a representative tool page ────────────
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    for (const path of ['/ar', '/ar/compress', '/pl', '/pl/compress']) {
      const page = await context.newPage();
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'load' });
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      if (scrollWidth > clientWidth) {
        throw new Error(`${path}: horizontal overflow — scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`);
      }
      console.log(`✓ ${path} @ 375px: no horizontal overflow (scrollWidth=${scrollWidth} clientWidth=${clientWidth})`);
      await page.close();
    }
    await browser.close();
  }

  // ─── Test 3: negative control — the exact bug this guards against
  //             (verifies the test itself can actually fail) ────────
  {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/ar`, { waitUntil: 'load' });
    await page.setViewportSize({ width: 375, height: 812 });
    // A normal-flow element (not position:fixed, unlike .mesh-bg/.grain-overlay, which are
    // excluded from scrollWidth entirely since fixed elements don't scroll with the page).
    const overflowed = await page.evaluate(() => {
      const d = document.createElement('div');
      d.style.cssText = 'width:500px;height:1px;';
      document.body.appendChild(d);
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (!overflowed) throw new Error('negative control failed: forcing a 500px-wide in-flow element did not register as overflow — the assertion in Test 2 would never actually fail');
    console.log('✓ negative control: an artificially widened element IS detected as overflow (Test 2\'s assertion has teeth)');
    await browser.close();
  }

  if (errors.length > 0) {
    console.error('\n❌ Page errors:', errors);
    process.exit(1);
  }

  console.log('\n✅ All RTL layout tests passed');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
