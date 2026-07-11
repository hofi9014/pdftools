import { chromium } from 'playwright';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.route('https://js.live.net/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.OneDrive = { open: function() {} };' }));
  await page.route('https://www.googletagmanager.com/**', r => r.abort());
  await page.route('https://accounts.google.com/**', r => r.abort());

  let allPassed = true;
  function check(name: string, pass: boolean) {
    console.log(pass ? `  \u2713 ${name}` : `  \u2717 ${name}`);
    if (!pass) allPassed = false;
  }

  // ── Test 1: BIP event triggers install UI ──
  console.log('\n1. beforeinstallprompt event triggers install UI (PL)...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await sleep(1000);

  // Dispatch BIP
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt');
    (e as any).prompt = () => {};
    (e as any).userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(e);
  });
  await sleep(500);

  const bannerAfterBip = await page.evaluate(() => {
    return !!Array.from(document.body.querySelectorAll('div')).some(d =>
      d.textContent?.includes('Zainstaluj'));
  });
  check('Banner visible after BIP', bannerAfterBip);

  const installBtnVisible = await page.locator('button:has-text("Zainstaluj")').first().isVisible().catch(() => false);
  check('Install button says "Zainstaluj"', installBtnVisible);

  const dismissBtnVisible = await page.locator('button:has-text("Nie teraz")').first().isVisible().catch(() => false);
  check('Dismiss button says "Nie teraz"', dismissBtnVisible);

  // ── Test 2: Dismiss works ──
  console.log('\n2. Dismiss button hides banner...');
  await page.locator('button:has-text("Nie teraz")').first().click();
  await sleep(500);
  const stillVisible = await page.evaluate(() => {
    return !!Array.from(document.body.querySelectorAll('div')).some(d =>
      d.textContent?.includes('Zainstaluj'));
  });
  check('Banner hidden after dismiss', !stillVisible);

  // ── Test 3: Banner hidden in standalone mode ──
  console.log('\n3. Banner hidden in standalone mode...');
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.addInitScript(() => {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  });
  await page2.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await sleep(1000);
  const standaloneBanner = await page2.evaluate(() => {
    return !!Array.from(document.body.querySelectorAll('div')).some(d =>
      d.textContent?.includes('Zainstaluj'));
  });
  check('No banner in standalone mode', !standaloneBanner);
  await ctx2.close();

  // ── Test 4: No banner without BIP on desktop ──
  console.log('\n4. No banner on desktop without BIP...');
  await page.evaluate(() => localStorage.removeItem('optimapdf_install_dismissed'));
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(1000);
  const noBipBanner = await page.evaluate(() => {
    return !!Array.from(document.body.querySelectorAll('div')).some(d =>
      d.textContent?.includes('Zainstaluj'));
  });
  check('No banner without BIP on desktop', !noBipBanner);

  // ── Test 5: EN locale after BIP ──
  console.log('\n5. English locale test...');
  // Switch locale to EN via localStorage + reload
  await page.evaluate(() => {
    localStorage.removeItem('optimapdf_install_dismissed');
    localStorage.setItem('locale', 'en');
  });
  await page.reload({ waitUntil: 'load', timeout: 15000 }).catch(() => {});
  await sleep(2000);

  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt');
    (e as any).prompt = () => {};
    (e as any).userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(e);
  });
  await sleep(500);

  const enTitleVisible = await page.evaluate(() => {
    return !!Array.from(document.body.querySelectorAll('div')).some(d =>
      d.textContent?.includes('Install OptimaPDF app'));
  });
  check('EN banner shows "Install OptimaPDF app"', enTitleVisible);

  const enInstallVisible = await page.locator('button:has-text("Install")').first().isVisible().catch(() => false);
  check('EN install button says "Install"', enInstallVisible);

  const enDismissVisible = await page.locator('button:has-text("Not now")').first().isVisible().catch(() => false);
  check('EN dismiss button says "Not now"', enDismissVisible);

  // ── Test 6: iOS user-agent shows iOS instructions ──
  console.log('\n6. iOS user-agent shows iOS instructions...');
  const iosContext = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page3 = await iosContext.newPage();
  await page3.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await sleep(1500);

  const iosText = await page3.evaluate(() => {
    return !!Array.from(document.body.querySelectorAll('div')).some(d =>
      d.textContent?.includes('iOS') || d.textContent?.includes('Udost\u0119pnij'));
  });
  check('iOS instruction shown', iosText);

  const iosDismissVisible = await page3.locator('button:has-text("Nie teraz")').first().isVisible().catch(() => false);
  check('iOS dismiss button visible', iosDismissVisible);

  await iosContext.close();

  console.log(allPassed ? '\n=== ALL TESTS PASSED ===' : '\n=== SOME TESTS FAILED ===');
  await browser.close();
  if (!allPassed) process.exit(1);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
