import { chromium } from 'playwright';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // ── Mock external scripts that block load ──
  await page.route('https://js.live.net/v7.2/OneDrive.js', (route) => {
    route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.OneDrive = { open: function() {} };' });
  });
  await page.route('https://www.googletagmanager.com/**', route => route.abort());
  await page.route('https://accounts.google.com/**', route => route.abort());

  const consoleMessages: { type: string; text: string }[] = [];
  page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
  const pageErrors: string[] = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  console.log('Navigating to /merge...');
  await page.goto('http://localhost:3000/merge', { waitUntil: 'networkidle' });
  await sleep(1000);

  // Register SW from page context
  let swActivated = false;
  await page.evaluate(() => {
    return navigator.serviceWorker.register('/sw.js').then(reg => {
      return new Promise<void>((resolve) => {
        if (reg.active) {
          resolve();
          return;
        }
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing || reg.waiting;
          if (worker) {
            worker.addEventListener('statechange', () => {
              if (worker.state === 'activated') resolve();
            });
          }
        });
      });
    });
  });
  swActivated = true;
  console.log('✓ Service Worker registered and activated\n');

  // ────────────────────────────────────────────────────────────
  // 2) Inspect caches — list ALL cached URLs
  // ────────────────────────────────────────────────────────────
  const cacheEntries = await page.evaluate(async () => {
    const keys = await caches.keys();
    const all: { cacheName: string; url: string }[] = [];
    for (const name of keys.sort()) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      for (const req of requests.sort((a, b) => a.url.localeCompare(b.url))) {
        all.push({ cacheName: name, url: req.url });
      }
    }
    return all;
  });

  console.log(`Found ${cacheEntries.length} cached URLs across ${new Set(cacheEntries.map(e => e.cacheName)).size} cache(s):\n`);
  for (const { cacheName, url } of cacheEntries) {
    console.log(`  [${cacheName}] ${url}`);
  }
  console.log('');

  // ────────────────────────────────────────────────────────────
  // 3) Confirm forbidden URLs are NOT cached
  // ────────────────────────────────────────────────────────────
  const forbiddenPatterns = [
    '/api/ai', '/api/exports',
    'openrouter.ai', 'dropbox.com', 'googleapis.com',
    'live.com', 'microsoftonline.com', 'graph.microsoft.com',
  ];
  let forbiddenViolations = 0;
  for (const { url } of cacheEntries) {
    for (const pat of forbiddenPatterns) {
      if (url.includes(pat)) {
        console.log(`✗ FORBIDDEN URL in cache: ${url}`);
        forbiddenViolations++;
      }
    }
  }
  if (forbiddenViolations === 0) {
    console.log('✓ No forbidden URLs (external APIs, /api/*) present in any cache\n');
  }

  // ────────────────────────────────────────────────────────────
  // 4) Full OneDrive flow test AFTER SW activation
  // ────────────────────────────────────────────────────────────
  console.log('OneDrive flow test (after SW activation)...');

  // Click OneDrive button
  const odBtn = page.locator('button:has-text("☁️")');
  await odBtn.waitFor({ timeout: 5000 }).catch(() => {});
  if (await odBtn.isVisible()) {
    await odBtn.click();
    await sleep(300);
    await page.locator('button:has-text("OneDrive")').click();
    await sleep(2000);

    // Inject a fake oauth key simulating a successful popup
    const state = 'sw-test-state-999';
    const payload = '[OneDriveSDK-OauthResponse]' + JSON.stringify({
      type: 'success', accessToken: 'sw-test-token-999', idToken: '', state,
    });
    await page.evaluate(({ s, p }) => localStorage.setItem('onedrive-oauth-' + s, p), { s: state, p: payload });
    await sleep(2000);

    // Verify the key was consumed (removed from localStorage)
    const consumed = await page.evaluate((s) => {
      return localStorage.getItem('onedrive-oauth-' + s) === null;
    }, state);

    if (consumed) {
      console.log('✓ OneDrive flow: auth key consumed by interval after SW activation');
    } else {
      console.log('✗ OneDrive flow: auth key NOT consumed');
    }

    // Check for "Another popup" errors
    const popupErrors = consoleMessages.filter(m =>
      m.text.toLowerCase().includes('another popup is already opened'));
    if (popupErrors.length === 0) {
      console.log('✓ OneDrive flow: no "Another popup is already opened" error\n');
    } else {
      console.log('✗ OneDrive flow: popup error detected! ' + popupErrors.map(e => e.text).join('; ') + '\n');
    }
  } else {
    console.log('ℹ OneDrive button not visible — skipping OneDrive flow test\n');
  }

  // ────────────────────────────────────────────────────────────
  // Check page errors (ignore hydration)
  // ────────────────────────────────────────────────────────────
  const relevantErrors = pageErrors.filter(e => !e.includes('Hydration failed'));
  if (relevantErrors.length > 0) {
    console.log('✗ Page errors:', relevantErrors);
  } else {
    console.log('✓ No page errors');
  }

  // ────────────────────────────────────────────────────────────
  // Full report
  // ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('CACHED URLs:');
  const grouped = new Map<string, string[]>();
  for (const { cacheName, url } of cacheEntries) {
    if (!grouped.has(cacheName)) grouped.set(cacheName, []);
    grouped.get(cacheName)!.push(url);
  }
  for (const [cacheName, urls] of grouped) {
    console.log(`\n--- ${cacheName} (${urls.length} entries) ---`);
    for (const u of urls) console.log(`  ${u}`);
  }
  console.log('\n═══════════════════════════════════════');

  console.log('\nOneDrive result: ' + (
    cacheEntries.some(e => e.url.includes('live.net')) ? 'FAIL — live.net found in cache' : 'PASS — no live.net in cache'
  ));

  await browser.close();
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
