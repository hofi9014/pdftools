import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let postCalled = 0, getCalled = 0;
  const requests: string[] = [];

  await page.route(/graph\.microsoft\.com\/v1\.0\/search\/query/, async (route) => {
    postCalled++;
    requests.push('POST /search/query');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: [] }) });
  });

  await page.route(/graph\.microsoft\.com\/v1\.0\/sites\?search=/, async (route) => {
    getCalled++;
    requests.push('GET /sites?search= (SHOULD NOT HAPPEN)');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: [] }) });
  });

  await page.route('https://js.live.net/v7.2/OneDrive.js', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.OneDrive={open:function(){}}' })
  );

  await page.addInitScript(() => {
    const orig = window.open;
    window.open = () => {
      setTimeout(() => window.postMessage({ type: 'sharepoint-token', accessToken: 'test' }, location.origin), 300);
      return { closed: false, close: () => {}, location: { href: '' } } as any;
    };
  });

  await page.goto('http://localhost:3000/merge', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.locator('button:has-text("☁️")').click();
  await page.waitForTimeout(200);
  await page.locator('button:has-text("SharePoint")').click();
  await page.waitForTimeout(3000);

  console.log(JSON.stringify({ postCalled, getCalled, requests }));
  console.log(postCalled > 0 && getCalled === 0 ? 'VERIFIED: POST /search/query used' : 'ISSUE: wrong endpoint');

  await browser.close();
}

run().catch((e) => { console.error(e); process.exit(1); });
