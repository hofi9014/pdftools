import { chromium } from 'playwright';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// InstallBanner renders `t('install.title', locale)` = "Zainstaluj aplikację OptimaPDF"
// This string is unique to the InstallBanner component (not found in InstallSection or hero.offline_pitch).
const BANNER_TEXT = 'Zainstaluj aplikację OptimaPDF';
const BANNER_TEXT_EN = 'Install OptimaPDF app';

async function hasBannerText(page: any): Promise<boolean> {
  return page.evaluate((text: string) =>
    Array.from(document.querySelectorAll('div')).some(d =>
      d.textContent?.includes(text)
    ),
    BANNER_TEXT
  );
}

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
  await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 15000 }).catch(() => {});
  await sleep(2000);

  // Dispatch BIP
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt');
    (e as any).prompt = () => {};
    (e as any).userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(e);
  });
  await sleep(1000);

  check('Banner visible after BIP', await hasBannerText(page));
  check('Install button says "Zainstaluj"', await page.locator('button:has-text("Zainstaluj")').first().isVisible().catch(() => false));
  check('Dismiss button says "Nie teraz"', await page.locator('button:has-text("Nie teraz")').first().isVisible().catch(() => false));

  // ── Test 2: Dismiss works ──
  console.log('\n2. Dismiss button hides banner...');
  await page.locator('button:has-text("Nie teraz")').first().click();
  await sleep(1000);
  check('Banner hidden after dismiss', !(await hasBannerText(page)));

  // ── Test 3: Banner hidden in standalone mode ──
  console.log('\n3. Banner hidden in standalone mode...');
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.addInitScript(() => {
    window.matchMedia = (query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
  });
  await page2.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 15000 }).catch(() => {});
  await sleep(2000);
  check('No banner in standalone mode', !(await hasBannerText(page2)));
  await ctx2.close();

  // ── Test 4: No banner without BIP on desktop ──
  console.log('\n4. No banner on desktop without BIP...');
  await page.evaluate(() => localStorage.removeItem('optimapdf_install_dismissed'));
  await page.reload({ waitUntil: 'load', timeout: 15000 }).catch(() => {});
  await sleep(2000);
  check('No banner without BIP on desktop', !(await hasBannerText(page)));

  // ── Test 5: EN locale after BIP ──
  console.log('\n5. English locale test...');
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
  await sleep(1000);

  check('EN banner shows "Install OptimaPDF app"', await page.evaluate(() =>
    Array.from(document.querySelectorAll('div')).some(d =>
      d.textContent?.includes('Install OptimaPDF app'))
  ));
  check('EN install button says "Install"', await page.locator('button:has-text("Install")').first().isVisible().catch(() => false));
  check('EN dismiss button says "Not now"', await page.locator('button:has-text("Not now")').first().isVisible().catch(() => false));

  // ── Test 6: iOS user-agent shows iOS instructions ──
  console.log('\n6. iOS user-agent shows iOS instructions...');
  const iosContext = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page3 = await iosContext.newPage();
  await page3.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 15000 }).catch(() => {});
  await sleep(2000);

  check('iOS instruction shown', await page3.evaluate(() =>
    Array.from(document.querySelectorAll('div')).some(d =>
      d.textContent?.includes('iOS') || d.textContent?.includes('Udost\u0119pnij'))
  ));
  check('iOS dismiss button visible', await page3.locator('button:has-text("Nie teraz")').first().isVisible().catch(() => false));
  await iosContext.close();

  console.log(allPassed ? '\n=== ALL TESTS PASSED ===' : '\n=== SOME TESTS FAILED ===');
  await browser.close();
  if (!allPassed) process.exit(1);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
