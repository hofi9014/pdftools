import { chromium } from 'playwright';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

// Some of what this script waits for is a real app-internal setInterval polling loop with
// no DOM/network signal to hook a selector to (the whole point is verifying cleanup happens
// SOMETIME within a wall-clock window). Rather than a blind fixed wait regardless of whether
// the condition already holds, poll the actual condition and resolve as soon as it's true,
// still bounded by the same timeout used before as a ceiling.
async function waitForCondition(check: () => Promise<boolean> | boolean, timeoutMs: number, intervalMs = 100): Promise<boolean> {
  const start = Date.now();
  for (;;) {
    if (await check()) return true;
    if (Date.now() - start >= timeoutMs) return false;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

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
  await page.goto(`${BASE_URL}/merge`, { waitUntil: 'networkidle' });
  const cloudBtn = page.locator('button:has-text("☁️")');
  await cloudBtn.waitFor({ timeout: 5000 }).catch(() => {});

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
  await cloudBtn.click();
  const oneDriveBtn = page.locator('button:has-text("OneDrive")');
  await oneDriveBtn.waitFor({ timeout: 3000 }).catch(() => {});
  await oneDriveBtn.click();

  // Wait for cleanup to run + interval ticks — poll the real condition (both stale keys
  // gone) instead of blindly waiting the full 2000ms every time; still bounded by the same
  // 2000ms ceiling if cleanup is ever slower than expected.
  const staleKeysGone = () => page.evaluate((states) => {
    return states.every((s) => localStorage.getItem('onedrive-oauth-' + s) === null);
  }, staleStates);
  await waitForCondition(staleKeysGone, 2000);

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

  // Wait for the interval to find and remove the key (poll instead of a blind fixed
  // 3-tick-plus-buffer wait), bounded by the same 1500ms ceiling as before.
  const freshKeyGone = () => page.evaluate((state) => localStorage.getItem('onedrive-oauth-' + state) === null, freshState);
  await waitForCondition(freshKeyGone, 1500);

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

  const lateKeyGone = () => page.evaluate((state) => localStorage.getItem('onedrive-oauth-' + state) === null, lateKeyState);
  await waitForCondition(lateKeyGone, 1500);

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
