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

  // ─── Test 4: exhaustive per-page-page sweep — dir=rtl set AND no horizontal
  //             overflow at 375px, for EVERY tool page in the app (not just the
  //             representative sample Test 2 covers). Closes the previously-documented
  //             caveat in AGENTS.md's RTL FINDING ("NOT verified page-by-page for all
  //             ~40 tool pages") — this is that page-by-page verification.
  //             List taken directly from `app/*/page.tsx` (excluding the 8 informational
  //             pages that already set dir manually before the global fix, and non-tool
  //             routes: api, guides, guide, [locale]).
  {
    const TOOL_SLUGS = [
      'add-page', 'ai-chat', 'ai-summary', 'ai-translate', 'compare-pdf', 'compress',
      'crop-pdf', 'delete-pages', 'edit-pdf', 'excel-to-pdf', 'extract-pages', 'fill-form',
      'flatten-pdf', 'html-to-pdf', 'jpg-to-pdf', 'merge', 'metadata', 'ocr-pdf',
      'openoffice-to-pdf', 'page-numbers', 'pdf-to-epub', 'pdf-to-excel', 'pdf-to-html',
      'pdf-to-images', 'pdf-to-jpg', 'pdf-to-openoffice', 'pdf-to-powerpoint', 'pdf-to-svg',
      'pdf-to-txt', 'pdf-to-word', 'protect-pdf', 'redact-pdf', 'reorder-pages', 'rotate-pdf',
      'sign-pdf', 'split', 'to-pdfa', 'unlock-pdf', 'url-to-pdf', 'watermark-pdf', 'word-to-pdf',
    ];
    // Sanity floor, not an exact match — AGENTS.md's "~40 tool pages" is approximate (the
    // real count from `app/*/page.tsx`, excluding informational/non-tool routes, is 41).
    // This just catches the list silently shrinking to near-empty due to a copy-paste slip.
    if (TOOL_SLUGS.length < 35) {
      throw new Error(`expected at least 35 tool slugs (AGENTS.md's "~40 tool pages"), got ${TOOL_SLUGS.length} — list drifted from app/*/page.tsx, update it`);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const sweepFailures: string[] = [];

    for (const slug of TOOL_SLUGS) {
      const path = `/ar/${slug}`;
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on('pageerror', err => pageErrors.push(err.message));
      try {
        const response = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'load', timeout: 15000 });
        if (!response || response.status() >= 400) {
          sweepFailures.push(`${path}: HTTP ${response?.status() ?? 'no response'}`);
          await page.close();
          continue;
        }
        await page.waitForFunction(() => document.documentElement.dir === 'rtl', { timeout: 5000 });
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        if (scrollWidth > clientWidth) {
          sweepFailures.push(`${path}: horizontal overflow — scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`);
        }
        if (pageErrors.length > 0) {
          sweepFailures.push(`${path}: page errors — ${pageErrors.join('; ')}`);
        }
        console.log(`✓ ${path} @ 375px: dir=rtl, no overflow (scrollWidth=${scrollWidth}<=${clientWidth})`);
      } catch (e) {
        sweepFailures.push(`${path}: ${e instanceof Error ? e.message : String(e)}`);
      }
      await page.close();
    }
    await browser.close();

    if (sweepFailures.length > 0) {
      console.error(`\n❌ ${sweepFailures.length}/${TOOL_SLUGS.length} tool pages failed the RTL sweep:`);
      for (const f of sweepFailures) console.error(`  - ${f}`);
      throw new Error(`RTL page-by-page sweep found ${sweepFailures.length} failing page(s)`);
    }
    console.log(`\n✓ All ${TOOL_SLUGS.length}/${TOOL_SLUGS.length} tool pages pass the RTL sweep (dir=rtl, no horizontal overflow @ 375px)`);
  }

  // ─── Test 5: bullet-list indentation follows the reading direction. Tailwind's preflight
  //             zeroes native <ul> padding, so a hardcoded `pl-5` stays on the LEFT in RTL
  //             (bullets hung on the wrong side). sign-pdf/ai-summary/pdf-to-excel had this;
  //             informational pages already used the isRtl ? 'pr-5' : 'pl-5' pattern.
  {
    const browser = await chromium.launch({ headless: true });
    const bad: string[] = [];
    for (const [locale, slug] of [['ar', 'sign-pdf'], ['ar', 'ai-summary'], ['ar', 'pdf-to-excel'], ['fa', 'sign-pdf'], ['pl', 'sign-pdf'], ['pl', 'ai-summary'], ['pl', 'pdf-to-excel']] as const) {
      const page = await browser.newPage();
      await page.goto(`${BASE_URL}/${locale}/${slug}`, { waitUntil: 'load' });
      const pad = await page.evaluate(() => {
        const ul = document.querySelector('ul.list-disc');
        if (!ul) return null;
        const cs = getComputedStyle(ul);
        return { l: parseFloat(cs.paddingLeft), r: parseFloat(cs.paddingRight) };
      });
      const rtl = locale === 'ar' || locale === 'fa';
      if (!pad) bad.push(`/${locale}/${slug}: no ul.list-disc found`);
      else if (rtl ? !(pad.r > 0 && pad.l === 0) : !(pad.l > 0 && pad.r === 0)) {
        bad.push(`/${locale}/${slug}: padding-left=${pad.l} padding-right=${pad.r} (wrong side for ${rtl ? 'RTL' : 'LTR'})`);
      } else console.log(`✓ /${locale}/${slug}: list indent on the ${rtl ? 'right' : 'left'} (${pad.l}/${pad.r})`);
      await page.close();
    }
    await browser.close();
    if (bad.length) throw new Error('list indentation on wrong side:\n  ' + bad.join('\n  '));
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
