import { chromium } from 'playwright';

async function run() {
  const errors: string[] = [];

  // ─── Test 1: de-DE → detects de ───────────────────────────────────
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('http://localhost:3000/', { waitUntil: 'load' });
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
    await page.goto('http://localhost:3000/', { waitUntil: 'load' });
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
    await page.goto('http://localhost:3000/', { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.lang === 'en', { timeout: 5000 });
    console.log('✓ ru-RU (unsupported) → lang=en (fallback)');
    await browser.close();
  }

  // ─── Test 4: Manual choice (localStorage) overrides detection ─────
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    page.on('pageerror', err => errors.push(err.message));
    // Set a manual French preference in localStorage BEFORE navigating
    await page.goto('http://localhost:3000/', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.evaluate(() => localStorage.setItem('locale', 'fr'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.waitForFunction(() => document.documentElement.lang === 'fr', { timeout: 5000 });
    console.log('✓ de-DE browser + localStorage=fr → lang=fr (manual wins)');
    await browser.close();
  }

  // ─── Test 5: x-detected-locale cookie persists across pages ───────
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('http://localhost:3000/', { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.lang === 'de', { timeout: 5000 });
    // Navigate to a different page – language should persist
    await page.goto('http://localhost:3000/merge', { waitUntil: 'load' });
    await page.waitForTimeout(500);
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
