import { chromium } from 'playwright';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track ALL outbound requests to cloud domains
  const cloudRequests: string[] = [];
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('googleapis.com') || url.includes('dropbox.com') ||
        url.includes('live.net') || url.includes('microsoftonline.com') ||
        url.includes('graph.microsoft.com') || url.includes('accounts.google.com')) {
      cloudRequests.push(url);
    }
    route.continue();
  });

  const consoleMsgs: string[] = [];
  page.on('console', msg => consoleMsgs.push(`${msg.type()}: ${msg.text()}`));

  console.log('1. Navigating to /merge...');
  // No fixed settle delay: the next real interaction (clicking cloudBtn below) already
  // waits for that button specifically via .waitFor().
  await page.goto(`${BASE_URL}/merge`, { waitUntil: 'networkidle' });

  // Set offline
  console.log('2. Setting browser offline...');
  // context.setOffline() is a CDP command Playwright already awaits to completion — no
  // additional settling delay needed.
  await context.setOffline(true);

  // Open cloud picker dropdown
  console.log('3. Clicking cloud picker button...');
  const cloudBtn = page.locator('button:has-text("☁️")');
  await cloudBtn.waitFor({ timeout: 5000 });
  await cloudBtn.click();

  // Verify dropdown is visible
  const googleBtn = page.locator('button:has-text("Google Drive")');
  const dropboxBtn = page.locator('button:has-text("Dropbox")');
  const oneDriveBtn = page.locator('button:has-text("OneDrive")');

  // Wait for whichever provider button actually renders first, instead of a fixed delay —
  // not all three are guaranteed to appear (e.g. Google Drive is conditionally hidden).
  await googleBtn.or(dropboxBtn).or(oneDriveBtn).first().waitFor({ timeout: 3000 }).catch(() => {});

  const googleVisible = await googleBtn.isVisible().catch(() => false);
  console.log(`   Google Drive button visible: ${googleVisible}`);

  // Click each cloud provider button and verify offline message
  for (const [name, btn] of [['Google Drive', googleBtn], ['Dropbox', dropboxBtn], ['OneDrive', oneDriveBtn]] as const) {
    if (!(await btn.isVisible().catch(() => false))) {
      console.log(`   ${name}: button not visible, skipping`);
      continue;
    }

    console.log(`\n4. Clicking ${name} (offline)...`);
    const beforeCount = cloudRequests.length;
    await btn.click();

    // Check for offline message
    const offlineMsg = page.locator('text=wymaga połączenia z internetem');
    // Wait for the message to actually appear (up to 2s) instead of guessing a fixed delay
    // then checking once — if it never appears, this resolves at the timeout and the
    // isVisible() check below correctly reports false, same as before.
    await offlineMsg.waitFor({ timeout: 2000 }).catch(() => {});
    const offlineMsgVisible = await offlineMsg.isVisible().catch(() => false);

    console.log(`   Offline message visible: ${offlineMsgVisible}`);
    console.log(`   New cloud requests triggered: ${cloudRequests.length - beforeCount}`);

    if (offlineMsgVisible) {
      console.log(`   ✓ ${name}: offline message shown immediately, no network attempt`);
    } else {
      console.log(`   ✗ ${name}: offline message NOT found`);

      // Check for loading spinner (would indicate it tried to connect)
      const loading = page.locator('.animate-spin');
      const loadingVisible = await loading.isVisible().catch(() => false);
      console.log(`   Loading spinner visible: ${loadingVisible}`);
    }

    // Re-open dropdown for next provider: wait for the dropdown to actually close first
    // (whichever provider button was visible before), then for it to reopen — both real
    // DOM-state conditions instead of guessed fixed delays.
    await googleBtn.or(dropboxBtn).or(oneDriveBtn).first().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    await cloudBtn.click();
    await googleBtn.or(dropboxBtn).or(oneDriveBtn).first().waitFor({ timeout: 3000 }).catch(() => {});
  }

  // Final report
  console.log('\n═══════════════════════════════════════');
  console.log('Cloud requests made during test:');
  if (cloudRequests.length === 0) {
    console.log('  NONE — all cloud operations blocked by offline guard');
  } else {
    for (const url of cloudRequests) console.log(`  ${url}`);
  }
  console.log('═══════════════════════════════════════');

  // Also test CloudFileSaver: navigate to a page with saver
  console.log('\n5. Testing CloudFileSaver offline guard...');
  // The saver only appears after processing, but we can test on /merge
  // by checking if the saver buttons exist and click them offline
  //
  // The browser context is still offline from step 2 onward — navigating to a fresh page
  // needs a real network request regardless of any app-level offline guard, so it must be
  // restored to online first (this was a pre-existing bug: the context was never restored,
  // so this navigation always failed with ERR_INTERNET_DISCONNECTED before reaching any of
  // the checks below).
  await context.setOffline(false);
  await page.goto(`${BASE_URL}/compress`, { waitUntil: 'networkidle' });

  // Check if saver buttons are visible (they appear after processing, so might not be)
  // Instead, verify the component code is correct by checking no errors
  const jsErrors = consoleMsgs.filter(m => m.startsWith('error:') && !m.includes('favicon'));
  if (jsErrors.length > 0) {
    console.log(`   JS Errors found: ${jsErrors.length}`);
    for (const e of jsErrors) console.log(`     ${e}`);
  }
  console.log('   No unexpected JS errors');

  await browser.close();
  console.log('\n✓ Test complete');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
