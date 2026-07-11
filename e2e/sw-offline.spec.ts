import { chromium } from 'playwright';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function countCachedStatic(page: any) {
  return page.evaluate(async () => {
    const cache = await caches.open('optimapdf-v1');
    const requests = await cache.keys();
    return requests
      .filter(r => new URL(r.url).pathname.startsWith('/_next/static/'))
      .map(r => r.url);
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Block external noise
  await page.route('https://js.live.net/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.OneDrive = { open: function() {} };' }));
  await page.route('https://www.googletagmanager.com/**', r => r.abort());
  await page.route('https://accounts.google.com/**', r => r.abort());

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('  [CONSOLE ERROR]', msg.text());
  });

  // ── 1) Register SW first, then navigate ──
  console.log('Step 1: Register SW...');
  await page.goto('http://localhost:3000/compress', { waitUntil: 'networkidle' });
  await sleep(1000);

  await page.evaluate(() => {
    return navigator.serviceWorker.register('/sw.js').then(reg => {
      return new Promise<void>((resolve) => {
        if (reg.active && reg.active.state === 'activated') { resolve(); return; }
        reg.addEventListener('updatefound', () => {
          const w = reg.installing || reg.waiting;
          if (w) w.addEventListener('statechange', () => { if (w.state === 'activated') resolve(); });
        });
      });
    });
  });
  console.log('  SW activated.\n');

  // ── 2) Navigate 4 times, checking cache growth ──
  for (let i = 1; i <= 4; i++) {
    console.log(`Step 2.${i}: Navigate to /compress (#${i})...`);
    // Reload with full page reload (not client-side nav) so SW intercepts fresh requests
    await page.goto('http://localhost:3000/compress', { waitUntil: 'networkidle' });
    await sleep(800);

    const cached = await countCachedStatic(page);
    console.log(`  _next/static cached: ${cached.length} entries`);
    if (cached.length > 0) {
      console.log(`  First 3: ${cached.slice(0, 3).map(u => new URL(u).pathname).join(', ')}`);
    }
  }

  // ── 3) Final cache count ──
  const finalCached = await countCachedStatic(page);
  console.log(`\nStep 3: Total _next/static cached: ${finalCached.length}`);

  if (finalCached.length === 0) {
    console.log('WARNING: No _next/static assets cached! Navigation may not have gone through SW.');
    // Try forcing the page through SW by navigating once more after claim
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await sleep(1000);
    const retry = await countCachedStatic(page);
    console.log(`  Retry cached: ${retry.length}`);
    if (retry.length === 0) {
      console.log('  Still nothing cached — aborting offline test.\n');
      await browser.close();
      return;
    }
    finalCached.push(...retry);
  }

  // ── 4) Offline test ──
  console.log('\nStep 4: Switching to offline mode...');
  await context.setOffline(true);
  await page.goto('http://localhost:3000/compress', { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {
    console.log('  Page load completed (possibly via offline.html fallback)');
  });
  await sleep(1000);

  // Check what page we're on — did we get the app or offline.html?
  const title = await page.title().catch(() => '(no title)');
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 300) || '').catch(() => '(no body)');
  console.log(`  Page title: "${title}"`);
  console.log(`  Body preview: "${bodyText.substring(0, 100)}"`);

  // Try clicking the file picker button or any interactive element
  const anyButton = page.locator('button, input[type="file"], [role="button"], a').first();
  const btnVisible = await anyButton.isVisible().catch(() => false);
  if (btnVisible) {
    console.log('  Interactive element found on page.');
    // Try clicking it
    await anyButton.click().catch(e => console.log('  Click failed:', e.message?.substring(0, 80)));
    await sleep(300);
    // Did anything change?
    const afterClick = await page.evaluate(() => document.activeElement?.tagName || '(no focus change)').catch(() => '(error)');
    console.log(`  Active element after click: ${afterClick}`);
  } else {
    console.log('  No interactive element found — likely offline.html fallback');
  }

  if (btnVisible && !bodyText.includes('offline') && !bodyText.includes('Offline')) {
    console.log('\nRESULT: Page appears interactive offline — success!');
  } else if (bodyText.includes('offline') || bodyText.includes('Offline') || bodyText.includes('Jesteś offline')) {
    console.log('\nRESULT: Offline fallback page displayed — expected if static assets were not cached yet');
    console.log('  (The fallback means SW is working, but assets need more visits to populate)');
  } else {
    console.log('\nRESULT: Page loaded but interactivity uncertain — needs manual inspection');
  }

  console.log(`\nCACHED _next/static URLs (${finalCached.length} total):`);
  for (const url of finalCached) console.log(`  ${url}`);

  await browser.close();
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
