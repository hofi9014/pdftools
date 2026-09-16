import { chromium } from 'playwright';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

async function run() {
  const errors: string[] = [];

  // ─── Test 1: de-DE → detects de ───────────────────────────────────
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.lang === 'de', { timeout: 5000 });
    console.log('✓ de-DE → lang=de');
    await browser.close();
  }

  // ─── Test 2: ja-JP → detects ja ───────────────────────────────────
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ locale: 'ja-JP' });
    const page = await context.newPage();
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.lang === 'ja', { timeout: 5000 });
    console.log('✓ ja-JP → lang=ja');
    await browser.close();
  }

  // ─── Test 3: ru-RU (unsupported) → en fallback ────────────────────
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ locale: 'ru-RU' });
    const page = await context.newPage();
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.lang === 'en', { timeout: 5000 });
    console.log('✓ ru-RU (unsupported) → lang=en (fallback)');
    await browser.close();
  }

  // ─── Test 4: Manual choice via LanguageSelector overrides detection,
  //             and persists (via cookie) across a fresh visit to '/' ──
  //
  // This used to set localStorage.setItem('locale','fr') then reload '/' and expect
  // document.documentElement.lang === 'fr'. That can never pass with today's routing:
  // '/' always 307-redirects (proxy.ts, LEGACY_PATHS includes '') to a locale-prefixed
  // route like '/de/', and that route's LayoutShell derives locale purely from the URL
  // path segment, forcing it into HtmlLang — which always wins over the locale-context
  // value read from localStorage. LocaleProvider's localStorage read only affects the
  // non-prefixed/context-driven fallback, which a locale-prefixed route never reaches.
  // This isn't a regression: the app's real manual-override mechanism (LanguageSelector,
  // components/LanguageSelector.tsx) never relies on localStorage+reload of the SAME URL
  // — it navigates directly to a new locale-prefixed URL (router.push) and additionally
  // sets localStorage + an x-detected-locale cookie so a LATER, fresh visit to '/' also
  // redirects to the chosen locale. This test now exercises that real, current flow.
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.lang === 'de', { timeout: 5000 });

    // Open the language switcher and pick French.
    await page.locator('button[aria-label="Sprache wechseln"]').click();
    await page.locator('button:has-text("Français")').click();
    await page.waitForFunction(() => document.documentElement.lang === 'fr', { timeout: 5000 });
    if (!/\/fr(\/|$)/.test(page.url())) throw new Error(`expected URL to move to /fr, got ${page.url()}`);
    console.log('✓ LanguageSelector: de → fr updates both the URL and lang immediately');

    const stored = await page.evaluate(() => ({
      locale: localStorage.getItem('locale'),
      cookie: document.cookie,
    }));
    if (stored.locale !== 'fr') throw new Error(`expected localStorage locale=fr, got ${stored.locale}`);
    if (!stored.cookie.includes('x-detected-locale=fr')) throw new Error(`expected x-detected-locale=fr cookie, got ${stored.cookie}`);
    console.log('✓ LanguageSelector: choice persisted to localStorage + x-detected-locale cookie');

    // A fresh visit to '/' (a real new navigation, not a reload of the already-prefixed
    // page) should now redirect straight to /fr/, proving the persisted choice is honored
    // for future visits — the real, current equivalent of "manual choice overrides
    // detection", now driven by the cookie the proxy actually reads server-side.
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.lang === 'fr', { timeout: 5000 });
    if (!/\/fr(\/|$)/.test(page.url())) throw new Error(`expected fresh '/' visit to redirect to /fr, got ${page.url()}`);
    console.log('✓ fresh visit to \'/\' after choosing fr redirects to /fr (cookie honored server-side)');

    await browser.close();
  }

  // ─── Test 5: x-detected-locale cookie persists across pages ───────
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.lang === 'de', { timeout: 5000 });
    // Navigate to a different page – language should persist. No fixed delay needed:
    // waitForFunction itself already polls until the condition holds or times out.
    await page.goto(`${BASE_URL}/merge`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.lang === 'de', { timeout: 5000 });
    console.log('✓ de persists after navigation to /merge');
    await browser.close();
  }

  if (errors.length > 0) {
    console.error('\n❌ Page errors:', errors);
    process.exit(1);
  }

  console.log('\n✅ All language detection tests passed');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
