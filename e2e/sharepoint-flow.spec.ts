import { chromium, type Page } from 'playwright';

const MOCK_TOKEN = 'mock-sharepoint-token-abc123';
const MOCK_SITE = { id: 'tenant.sharepoint.com,site1,guid1', name: 'EngineeringSite', displayName: 'Engineering Team', webUrl: 'https://contoso.sharepoint.com/sites/engineering' };
const MOCK_SITES = [
  { id: 'tenant.sharepoint.com,site1,guid1', name: 'MarketingSite', displayName: 'Marketing Department', webUrl: 'https://contoso.sharepoint.com/sites/marketing' },
  { id: 'tenant.sharepoint.com,site2,guid2', name: 'SalesSite', displayName: 'Sales & CRM', webUrl: 'https://contoso.sharepoint.com/sites/sales' },
  MOCK_SITE,
];
const MOCK_LIBRARIES = [
  { id: 'drive-docs', name: 'Documents', driveType: 'documentLibrary' },
  { id: 'drive-shared', name: 'Shared Assets', driveType: 'documentLibrary' },
];
const MOCK_FILES = [
  { id: 'file-1', name: 'report.pdf', file: { mimeType: 'application/pdf' }, size: 102400, lastModifiedDateTime: '2025-06-01T12:00:00Z' },
  { id: 'file-2', name: 'budget.xlsx', file: { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, size: 51200, lastModifiedDateTime: '2025-06-05T14:30:00Z' },
  { id: 'folder-1', name: 'Archive', folder: { childCount: 5 } },
];

async function setupMocks(page: Page) {
  await page.context().addInitScript({
    content: `
    window.open = function(_url, _target, _features) {
      setTimeout(function() {
        window.postMessage({ type: 'sharepoint-token', accessToken: 'mock-sharepoint-token-abc123' }, window.location.origin);
      }, 300);
      return { closed: false, close: function() {}, location: { href: '' } };
    };
  `});

  // Mock POST /v1.0/search/query — used by auto-search on mount (empty query → wildcard)
  await page.route('https://graph.microsoft.com/v1.0/search/query', async (route) => {
    const response = {
      value: [{
        hitsContainers: [{
          hits: MOCK_SITES.map((site) => ({
            hitId: site.id,
            rank: 1,
            resource: { '@odata.type': '#microsoft.graph.site', ...site },
          })),
          total: MOCK_SITES.length,
          moreResultsAvailable: false,
        }],
      }],
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
  });

  // Mock GET /v1.0/sites/{hostname}:/{path} — direct site-by-URL endpoint
  await page.route('https://graph.microsoft.com/v1.0/sites/**', async (route, request) => {
    const url = request.url();
    if (url.includes('/drives')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: MOCK_LIBRARIES }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SITE) });
  });

  // Mock GET /v1.0/drives/{id}/root/children
  await page.route('https://graph.microsoft.com/v1.0/drives/*/root/children*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: MOCK_FILES }) });
  });

  // Mock GET /v1.0/drives/{id}/items/{id}/content (download)
  await page.route('https://graph.microsoft.com/v1.0/drives/*/items/*/content', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4 mock' });
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Mock OneDrive SDK
  await page.route('https://js.live.net/v7.2/OneDrive.js', (route) => {
    route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.OneDrive = { open: function() {} };' });
  });

  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await setupMocks(page);
  await page.goto('http://localhost:3000/merge', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log('\n=== SHAREPOINT FLOW TESTS ===\n');
  let allPassed = true;

  // ─────────────────────────────────────────────────────────
  // Test 1: Open SharePoint dialog after OAuth
  // ─────────────────────────────────────────────────────────
  console.log('[TEST 1] Opening SharePoint picker from dropdown...');

  await page.locator('button:has-text("Dodaj z chmury")').click();
  await page.waitForTimeout(300);
  await page.locator('button:has-text("SharePoint")').click();
  await page.waitForTimeout(500);

  const dialogTitle = page.locator('h2:has-text("SharePoint")');
  if (await dialogTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('  ✓ SharePoint dialog opened');
  } else {
    console.log('  ✗ SharePoint dialog did not open');
    const text = await page.locator('.fixed.inset-0').textContent().catch(() => 'no-overlay');
    console.log('  Dialog content:', text?.substring(0, 300));
    allPassed = false;
  }

  // Wait for OAuth mock to deliver token (300ms) + auto-search to complete
  await page.waitForTimeout(2000);

  // ─────────────────────────────────────────────────────────
  // Test 2: Auto-search shows site tiles after OAuth
  // ─────────────────────────────────────────────────────────
  console.log('[TEST 2] Auto-search shows site tiles after OAuth...');

  const firstTile = page.locator('button:has-text("Marketing Department")');
  if (await firstTile.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('  ✓ Site tiles visible after auto-search');
  } else {
    console.log('  ✗ Site tiles not visible');
    const text = await page.locator('.fixed.inset-0').textContent().catch(() => 'no-overlay');
    console.log('  Dialog content:', text?.substring(0, 500));
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────
  // Test 3: Click a site tile → libraries displayed
  // ─────────────────────────────────────────────────────────
  console.log('[TEST 3] Click a site tile to see libraries...');

  const engTile = page.locator('button:has-text("Engineering Team")');
  if (await engTile.isVisible({ timeout: 3000 }).catch(() => false)) {
    await engTile.click();
    await page.waitForTimeout(1000);
  } else {
    // Fall back to first visible site tile
    await firstTile.click();
    await page.waitForTimeout(1000);
  }

  try {
    await page.waitForSelector('text=Documents', { timeout: 5000 });
    console.log('  ✓ Library list loaded after tile click');
  } catch {
    console.log('  ✗ Library list not visible after tile click');
    const text = await page.locator('.fixed.inset-0').textContent().catch(() => 'no-overlay');
    console.log('  Dialog content:', text?.substring(0, 400));
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────
  // Test 4: Select a library → files displayed (picker mode)
  // ─────────────────────────────────────────────────────────
  console.log('[TEST 4] Selecting a library shows file browser...');

  const firstLib = page.locator('button:has-text("Shared Assets")');
  if (await firstLib.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstLib.click();
    await page.waitForTimeout(800);

    try {
      await page.waitForSelector('text=report.pdf', { timeout: 4000 });
      console.log('  ✓ File list loaded');
    } catch {
      console.log('  ✗ File list not visible');
      const text = await page.locator('.fixed.inset-0').textContent().catch(() => 'no-overlay');
      console.log('  Dialog content:', text?.substring(0, 300));
      allPassed = false;
    }
  } else {
    console.log('  ✗ Shared Assets library button not visible');
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────
  // Test 5: Select a file and download
  // ─────────────────────────────────────────────────────────
  console.log('[TEST 5] Selecting files and downloading...');

  const fileRow = page.locator('div.flex.items-center.gap-3').filter({ hasText: 'report.pdf' });
  if (await fileRow.count() > 0) {
    const fileCheckbox = fileRow.locator('input[type="checkbox"]');
    if (await fileCheckbox.isVisible().catch(() => false)) {
      await fileCheckbox.check();
      await page.waitForTimeout(200);
      console.log('  ✓ File checkbox selected');
    } else {
      console.log('  ✗ File checkbox not found in row');
      allPassed = false;
    }
  } else {
    console.log('  ✗ File row not found');
    allPassed = false;
  }

  const downloadBtn = page.locator('button:has-text("Download")');
  try {
    await downloadBtn.waitFor({ state: 'visible', timeout: 2000 });
    await page.locator('button:has-text("Download"):not([disabled])').waitFor({ timeout: 3000 });
    const btnText = await downloadBtn.textContent();
    if (btnText?.includes('1')) {
      console.log('  ✓ Download button shows count: ' + btnText?.trim());
    }

    await downloadBtn.click();
    await page.waitForTimeout(1000);
    try {
      await page.waitForSelector('text=successfully', { timeout: 5000 });
      console.log('  ✓ Files downloaded successfully');
    } catch {
      console.log('  ✗ Download did not complete');
      allPassed = false;
    }
  } catch (e) {
    console.log('  ✗ Download button issue: ' + (e instanceof Error ? e.message : String(e)));
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────
  // Test 6: Close the dialog
  // ─────────────────────────────────────────────────────────
  console.log('[TEST 6] Closing dialog...');

  const closeBtn = page.locator('button:has-text("Close")');
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(300);
    if (!(await dialogTitle.isVisible().catch(() => false))) {
      console.log('  ✓ Dialog closed successfully');
    } else {
      console.log('  ✗ Dialog still visible after close');
      allPassed = false;
    }
  } else {
    console.log('  ✗ Close button not visible');
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────
  // Test 7: Recent sites chip appears after reopen
  // ─────────────────────────────────────────────────────────
  console.log('[TEST 7] Recent sites chip visible after dialog reopen...');

  await page.locator('button:has-text("Dodaj z chmury")').click();
  await page.waitForTimeout(300);
  await page.locator('button:has-text("SharePoint")').click();
  await page.waitForTimeout(1500);

  const recentChip = page.locator('button:has-text("Engineering Team")');
  if (await recentChip.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('  ✓ Recent site chip "Engineering Team" visible');
  } else {
    console.log('  ✗ Recent site chip not visible');
    const text = await page.locator('.fixed.inset-0').textContent().catch(() => 'no-overlay');
    console.log('  Dialog content:', text?.substring(0, 500));
    allPassed = false;
  }

  // Click recent site chip and verify it connects to libraries
  await recentChip.click();
  await page.waitForTimeout(1000);
  try {
    await page.waitForSelector('text=Documents', { timeout: 5000 });
    console.log('  ✓ Recent site chip navigated to libraries');
  } catch {
    console.log('  ✗ Libraries not shown after clicking recent site chip');
    const text = await page.locator('.fixed.inset-0').textContent().catch(() => 'no-overlay');
    console.log('  Dialog content:', text?.substring(0, 500));
    allPassed = false;
  }

  // Go back to sites
  const backBtn = page.locator('button:has-text("Back")');
  if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await backBtn.click();
    await page.waitForTimeout(300);
  }

  // ─────────────────────────────────────────────────────────
  // Test 8: URL validation — invalid URL shows error
  // ─────────────────────────────────────────────────────────
  console.log('[TEST 8] URL validation — invalid URL...');

  // Expand manual options to reveal URL input
  const manualToggle = page.locator('button:has-text("Nie widzisz swojej witryny")');
  if (await manualToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await manualToggle.click();
    await page.waitForTimeout(300);
  } else {
    console.log('  [DEBUG] manualToggle not visible');
  }

  await page.waitForTimeout(500);

  const urlInput = page.locator('input[placeholder*="https://tenant.sharepoint.com"]');
  await urlInput.fill('not-a-url');
  await page.waitForTimeout(200);

  await page.locator('button:has-text("Connect")').first().click();
  await page.waitForTimeout(1500);

  const errorDiv = page.locator('div:has-text("Invalid SharePoint URL")');
  if (await errorDiv.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('  ✓ Invalid URL correctly rejected');
  } else {
    console.log('  ✗ Error not shown for invalid URL');
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────
  // Test 9: Non-SharePoint URL rejected
  // ─────────────────────────────────────────────────────────
  console.log('[TEST 9] Non-SharePoint URL rejected...');

  await urlInput.fill('https://example.com/some-page');
  await page.locator('button:has-text("Connect")').click();
  await page.waitForTimeout(500);

  const errorDiv2 = page.locator('div:has-text("Invalid SharePoint URL")');
  if (await errorDiv2.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('  ✓ Non-SharePoint URL correctly rejected');
  } else {
    console.log('  ✗ Non-SharePoint URL not rejected');
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────
  // Test 10: Search still works as fallback
  // ─────────────────────────────────────────────────────────
  console.log('[TEST 10] Explicit search still works as fallback...');

  const searchInput = page.locator('input[placeholder*="Search"]');
  if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.locator('button:has-text("Search")').click();
    await page.waitForTimeout(800);
    if (await page.locator('text=Marketing Department').isVisible({ timeout: 4000 }).catch(() => false)) {
      console.log('  ✓ Search results visible (fallback works)');
    } else {
      console.log('  ✗ Search results not visible');
      allPassed = false;
    }
  } else {
    console.log('  ✗ Search input not visible');
    allPassed = false;
  }

  // ─────────────────────────────────────────────────────────
  // Check for errors
  // ─────────────────────────────────────────────────────────
  const relevantErrors = pageErrors.filter((e) => !e.includes('Hydration failed') && !e.includes('chrome-extension'));
  if (relevantErrors.length === 0) {
    console.log('  ✓ No page errors');
  } else {
    console.log('  ✗ Page errors:', JSON.stringify(relevantErrors));
    allPassed = false;
  }

  console.log(allPassed ? '\n=== ALL TESTS PASSED ===' : '\n=== SOME TESTS FAILED ===');
  await browser.close();
  if (!allPassed) process.exit(1);
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
