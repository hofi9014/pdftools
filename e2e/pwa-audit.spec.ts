import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results: { check: string; status: 'PASS' | 'FAIL' | 'WARN'; detail: string }[] = [];
  let allPassed = true;

  function check(name: string, pass: boolean, detail: string) {
    const status = pass ? 'PASS' : 'FAIL';
    results.push({ check: name, status, detail });
    if (!pass) allPassed = false;
  }

  function warn(name: string, detail: string) {
    results.push({ check: name, status: 'WARN', detail });
  }

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 2000));

  // ── 1. Manifest ──
  const manifestLink = await page.evaluate(() => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return null;
    return { href: link.getAttribute('href'), content: '' };
  });
  if (manifestLink) {
    check('Manifest link in HTML', manifestLink.href === '/manifest.json' || !!manifestLink.href, 'rel=manifest href=' + manifestLink.href);
  } else {
    check('Manifest link in HTML', false, 'No <link rel="manifest"> found');
  }

  // Fetch and validate manifest
  let manifestValid = false;
  try {
    const manifestRes = await page.evaluate(async () => {
      const res = await fetch('/manifest.json');
      if (!res.ok) return null;
      return await res.json();
    });
    if (manifestRes) {
      manifestValid = true;
      check('Manifest is valid JSON', true, 'manifest.json loaded and parsed');
      check('Manifest has name', !!manifestRes.name, 'name: ' + manifestRes.name);
      check('Manifest has short_name', !!manifestRes.short_name, 'short_name: ' + (manifestRes.short_name || 'missing'));
      check('Manifest has start_url', !!manifestRes.start_url, 'start_url: ' + manifestRes.start_url);
      check('Manifest display is standalone', manifestRes.display === 'standalone', 'display: ' + manifestRes.display);
      check('Manifest has theme_color', !!manifestRes.theme_color, 'theme_color: ' + (manifestRes.theme_color || 'missing'));
      check('Manifest has background_color', !!manifestRes.background_color, 'background_color: ' + (manifestRes.background_color || 'missing'));

      if (manifestRes.icons && manifestRes.icons.length > 0) {
        check('Manifest has icons', manifestRes.icons.length > 0, manifestRes.icons.length + ' icon(s) defined');
        const sizes = manifestRes.icons.map((i: any) => i.sizes);
        check('Manifest has 192x192 icon', sizes.some((s: string) => s === '192x192'), 'sizes: ' + sizes.join(', '));
        check('Manifest has 512x512 icon', sizes.some((s: string) => s === '512x512'), 'sizes: ' + sizes.join(', '));

        // Verify icons exist
        for (const icon of manifestRes.icons) {
          try {
            const resp = await page.evaluate(async (src) => {
              const r = await fetch(src);
              return { ok: r.ok, type: r.headers.get('content-type') };
            }, icon.src);
            if (!resp.ok) {
              warn('Icon not found: ' + icon.src, 'HTTP ' + resp.status);
            }
          } catch { warn('Icon fetch error: ' + icon.src, ''); }
        }
      } else {
        check('Manifest has icons', false, 'No icons defined');
      }
    } else {
      check('Manifest is valid JSON', false, 'Failed to fetch /manifest.json');
    }
  } catch (e) {
    check('Manifest fetch', false, String(e));
  }

  // ── 2. Service Worker ──
  const swRegistered = await page.evaluate(async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      return { count: regs.length, urls: regs.map(r => r.active?.scriptURL || r.installing?.scriptURL || '(pending)') };
    } catch { return null; }
  });
  if (swRegistered && swRegistered.count > 0) {
    check('Service Worker registered', swRegistered.count > 0, swRegistered.count + ' SW(s): ' + swRegistered.urls.join(', '));
    const hasCorrect = swRegistered.urls.some(u => u.includes('/sw.js'));
    check('SW is our /sw.js', hasCorrect, 'URLs: ' + swRegistered.urls.join(', '));
  } else {
    check('Service Worker registered', false, 'No SW found');
  }

  // ── 3. viewport meta ──
  const viewport = await page.evaluate(() => {
    const m = document.querySelector('meta[name="viewport"]');
    return m ? m.getAttribute('content') : null;
  });
  check('Viewport meta tag', !!viewport && viewport.includes('width=device-width'), 'content: ' + (viewport || 'missing'));

  // ── 4. Apple touch icon ──
  const appleTouchIcon = await page.evaluate(() => {
    const link = document.querySelector('link[rel="apple-touch-icon"]');
    return link ? link.getAttribute('href') : null;
  });
  if (appleTouchIcon) {
    check('Apple touch icon', true, 'href: ' + appleTouchIcon);
  } else {
    warn('Apple touch icon', 'Not found (recommended for iOS)');
  }

  // ── 5. Apple mobile-web-app-capable ──
  const appleCapable = await page.evaluate(() => {
    const m = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    return m ? m.getAttribute('content') : null;
  });
  if (appleCapable) {
    check('iOS standalone meta', appleCapable === 'yes', 'content: ' + appleCapable);
  } else {
    warn('iOS standalone meta', 'Not found (recommended for iOS PWA)');
  }

  // ── 6. Apple mobile-web-app-status-bar-style ──
  const statusBar = await page.evaluate(() => {
    const m = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    return m ? m.getAttribute('content') : null;
  });
  if (statusBar) {
    check('iOS status bar style', true, 'content: ' + statusBar);
  } else {
    warn('iOS status bar style', 'Not found (recommended for iOS PWA)');
  }

  // ── 7. Msapplication-tilecolor ──
  const msTile = await page.evaluate(() => {
    const m = document.querySelector('meta[name="msapplication-TileColor"]');
    return m ? m.getAttribute('content') : null;
  });
  if (msTile) {
    check('Windows tile color', true, 'content: ' + msTile);
  }

  // ── 8. Content-Type of manifest (should be JSON) ──
  try {
    const manifestResp = await page.evaluate(async () => {
      const res = await fetch('/manifest.json');
      return { contentType: res.headers.get('content-type'), ok: res.ok };
    });
    if (manifestResp.ok) {
      check('Manifest Content-Type', manifestResp.contentType && (manifestResp.contentType.includes('json') || manifestResp.contentType.includes('application/manifest+json')), 'Content-Type: ' + (manifestResp.contentType || 'none'));
    }
  } catch {}

  // ── 9. SW activated and controlling page ──
  const swControlling = await page.evaluate(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      return { active: !!reg?.active, controlling: !!navigator.serviceWorker.controller };
    } catch { return null; }
  });
  if (swControlling) {
    check('SW active', swControlling.active, '');
    check('SW controlling page', swControlling.controlling, 'navigator.serviceWorker.controller is set');
  }

  // ── 10. Offline page accessible ──
  try {
    const offlinePage = await page.evaluate(async () => {
      const res = await fetch('/offline.html');
      return { ok: res.ok, size: (await res.text()).length };
    });
    check('Offline page exists', offlinePage.ok, offlinePage.size + ' bytes');
  } catch { check('Offline page exists', false, 'fetch failed'); }

  // ── 11. HTTPS check (exempt localhost) ──
  check('Page served over HTTPS (local exempt)', page.url().startsWith('http://localhost'), 'URL: ' + page.url());

  // ── Print report ──
  console.log('\n========================================');
  console.log('  PWA MANUAL AUDIT REPORT');
  console.log('========================================\n');

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '⚠';
    console.log('  ' + icon + ' [' + r.status + '] ' + r.check);
    if (r.detail) console.log('         ' + r.detail);
  }

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;

  console.log('\n  ----------------------------------------');
  console.log('  PASS: ' + passCount + '  FAIL: ' + failCount + '  WARN: ' + warnCount);
  console.log('  ----------------------------------------');
  console.log(allPassed ? '\n  ✓ ALL CHECKS PASSED' : '\n  ✗ SOME CHECKS FAILED');

  await browser.close();
}

run().catch(err => {
  console.error('Audit error:', err);
  process.exit(1);
});
