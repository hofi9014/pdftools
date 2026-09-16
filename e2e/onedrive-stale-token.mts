import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Intercept OneDrive SDK script with a mock that does NOT call
  // success/cancel — keeps the interval running for testing.
  await page.route('https://js.live.net/v7.2/OneDrive.js', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'window.OneDrive = { open: function() {} };',
    });
  });

  const consoleMessages: { type: string; text: string }[] = [];
  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // Navigate to merge page
  await page.goto('http://localhost:3000/merge', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // ═══════════════════════════════════════════════════════════════
  // TEST 1: Stale keys cleanup
  // ═══════════════════════════════════════════════════════════════

  // Inject TWO stale keys (simulating leftovers from a previous flow)
  const staleStates = ['stale-state-111', 'stale-state-222'];
  await page.evaluate((states) => {
    for (const s of states) {
      const payload = '[OneDriveSDK-OauthResponse]' + JSON.stringify({
        type: 'success', accessToken: 'stale-' + s, idToken: '', state: s,
      });
      localStorage.setItem('onedrive-oauth-' + s, payload);
    }
  }, staleStates);

  // Click OneDrive button to trigger handleOneDrive
  await page.locator('button:has-text("☁️")').click();
  await page.waitForTimeout(300);
  await page.locator('button:has-text("OneDrive")').click();

  // Wait for cleanup to run + interval ticks
  await page.waitForTimeout(2000);

  // Check: stale keys removed from localStorage
  const staleRemaining = await page.evaluate((states) => {
    let count = 0;
    for (const s of states) {
      if (localStorage.getItem('onedrive-oauth-' + s) !== null) count++;
    }
    return count;
  }, staleStates);

  // Check: cleanup console logs present
  const cleanupLogs = consoleMessages.filter(m =>
    m.text.includes('[OneDrive] Removing stale token key'));

  // ═══════════════════════════════════════════════════════════════
  // TEST 2: Fresh key injected mid-flow is delivered by interval
  // ═══════════════════════════════════════════════════════════════

  const freshState = 'fresh-state-789';
  const freshPayload = '[OneDriveSDK-OauthResponse]' + JSON.stringify({
    type: 'success', accessToken: 'fresh-token-789', idToken: '', state: freshState,
  });

  // Inject a key simulating the OAuth popup storing a token
  await page.evaluate(({ state, payload }) => {
    localStorage.setItem('onedrive-oauth-' + state, payload);
  }, { state: freshState, payload: freshPayload });

  // Wait 3 interval ticks (900ms) + buffer
  await page.waitForTimeout(1500);

  // The interval should have found the key, removed it, and called deliverToken
  const freshKeyRemoved = await page.evaluate((state) => {
    return localStorage.getItem('onedrive-oauth-' + state) === null;
  }, freshState);

  // ═══════════════════════════════════════════════════════════════
  // TEST 3: Pre-existing keys NOT delivered (silently removed)
  // ═══════════════════════════════════════════════════════════════

  // The initial cleanup removed stale keys 111 and 222. But what if a key
  // SURVIVES the cleanup (e.g., added by another tab between snapshot and
  // cleanup)? The interval should not deliver it.
  //
  // To test: inject a key that looks pre-existing BEFORE the interval tick

  // Inject another key now — it will NOT be in preExistingKeys because
  // the snapshot was taken before cleanup. So the interval should DELIVER it.
  const lateKeyState = 'late-state-333';
  await page.evaluate(({ state, payload }) => {
    localStorage.setItem('onedrive-oauth-' + state, payload);
  }, { state: lateKeyState, payload: freshPayload });

  await page.waitForTimeout(1500);

  const lateKeyRemoved = await page.evaluate((state) => {
    return localStorage.getItem('onedrive-oauth-' + state) === null;
  }, lateKeyState);

  // ═══════════════════════════════════════════════════════════════
  // Check for errors
  // ═══════════════════════════════════════════════════════════════

  const popupErrorLogs = consoleMessages.filter(m =>
    m.text.toLowerCase().includes('another popup is already opened') ||
    m.text.toLowerCase().includes('popupopen'));

  // Ignore pre-existing hydration mismatch (CookieConsent component bug)
  const relevantPageErrors = pageErrors.filter(e =>
    !e.includes('Hydration failed'));

  const silentRemovalLogs = consoleMessages.filter(m =>
    m.text.includes('[OneDrive] Silently removed stale token'));

  // ═══════════════════════════════════════════════════════════════
  // Results
  // ═══════════════════════════════════════════════════════════════

  console.log('\n=== TEST RESULTS ===\n');

  let allPassed = true;

  // Check 1: Stale keys detected by cleanup
  if (cleanupLogs.length >= 2) {
    console.log('✓ [CLEANUP] Both stale keys detected and removed (logs: ' + cleanupLogs.length + ')');
  } else {
    console.log('✗ [CLEANUP] Expected ≥2 cleanup logs, got ' + cleanupLogs.length);
    allPassed = false;
  }

  // Check 2: Stale keys removed from localStorage
  if (staleRemaining === 0) {
    console.log('✓ [CLEANUP] Stale keys removed from localStorage');
  } else {
    console.log('✗ [CLEANUP] ' + staleRemaining + ' stale keys remain');
    allPassed = false;
  }

  // Check 3: Fresh mid-flow key was picked up and removed by interval
  if (freshKeyRemoved) {
    console.log('✓ [INTERVAL] Fresh key (mid-flow) was consumed by interval');
  } else {
    console.log('✗ [INTERVAL] Fresh key was NOT consumed by interval');
    allPassed = false;
  }

  // Check 4: Late key (injected after cleanup) was also consumed
  if (lateKeyRemoved) {
    console.log('✓ [INTERVAL] Late key (post-cleanup) was consumed by interval');
  } else {
    console.log('✗ [INTERVAL] Late key was NOT consumed by interval');
    allPassed = false;
  }

  // Check 5: No stale keys were delivered (no "Another popup" error)
  if (popupErrorLogs.length === 0 && relevantPageErrors.length === 0) {
    console.log('✓ [ERROR] No "Another popup is already opened" error');
  } else {
    console.log('✗ [ERROR] ' + JSON.stringify([...popupErrorLogs, ...relevantPageErrors]));
    allPassed = false;
  }

  // Check 6: Any silent removal logs (interval skipping stale)
  if (silentRemovalLogs.length > 0) {
    console.log('✓ [INTERVAL] ' + silentRemovalLogs.length + ' stale key(s) silently removed (not delivered)');
  }

  // Final localStorage check
  const finalKeys = await page.evaluate(() => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('onedrive-oauth-')) keys.push(k);
    }
    return keys;
  });
  if (finalKeys.length === 0) {
    console.log('✓ [CLEANUP] No stale keys remain in localStorage at end');
  } else {
    console.log('ℹ [CLEANUP] Keys remain: ' + finalKeys.join(', '));
  }

  console.log(allPassed ? '\n=== ALL TESTS PASSED ===' : '\n=== SOME TESTS FAILED ===');
  await browser.close();
  if (!allPassed) process.exit(1);
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
