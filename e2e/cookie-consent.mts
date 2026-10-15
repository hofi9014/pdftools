// Consent to analytics in a real browser: nothing is loaded before a choice, accepting loads GA,
// and "Cookie settings" in the footer lets the visitor withdraw — which stops GA and removes its
// cookies at once. Google's script is answered by a local stand-in that sets a _ga cookie the
// way gtag does, so the test never contacts Google.
// Run against a dev or production server: E2E_BASE_URL (default http://localhost:3000).
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'pl-PL', serviceWorkers: 'block' });
const gaRequests: string[] = [];
await ctx.route(/googletagmanager\.com|google-analytics\.com/, async (route) => {
  gaRequests.push(route.request().url());
  await route.fulfill({ contentType: 'text/javascript', body: "document.cookie='_ga=GA1.1.42.42;path=/';document.cookie='_ga_KN3C22GVP8=GS1.1.42;path=/';" });
});
const page = await ctx.newPage();
const gaCookies = async () => (await ctx.cookies()).filter((c) => c.name === '_ga' || c.name.startsWith('_ga_')).map((c) => c.name);
const banner = page.getByRole('region', { name: 'Ustawienia cookies' });

console.log('\n=== first visit ===');
await page.goto(`${BASE}/pl/merge`, { waitUntil: 'networkidle' });
check(await banner.isVisible(), 'the consent banner is shown');
check(gaRequests.length === 0, `nothing is requested from Google before a choice (${gaRequests.length})`);
const text = await banner.innerText();
check(text.includes('Google LLC') && !/anonim/i.test(text), 'the banner names Google and does not call the analytics anonymous');

console.log('\n=== accept ===');
await banner.getByRole('button', { name: 'Akceptuję' }).click();
await page.waitForTimeout(1500);
check(gaRequests.length > 0, `Google Analytics loads after accepting (${gaRequests.length} request)`);
check((await gaCookies()).includes('_ga'), `GA set its cookies (${(await gaCookies()).join(', ')})`);
await page.reload({ waitUntil: 'networkidle' });
check(!(await banner.isVisible()), 'on the next page the banner does not ask again');

console.log('\n=== withdraw through "Cookie settings" in the footer ===');
const settings = page.locator('footer').getByRole('button', { name: 'Ustawienia cookies' });
check(await settings.isVisible(), 'the footer has a "Ustawienia cookies" button');
await settings.click();
check(await banner.isVisible(), 'it reopens the banner');
await banner.getByRole('button', { name: 'Odrzucam' }).click();
await page.waitForTimeout(500);
check((await gaCookies()).length === 0, `declining removes the GA cookies (left: ${(await gaCookies()).join(', ') || 'none'})`);
check(await page.evaluate(() => (window as unknown as Record<string, unknown>)['ga-disable-G-KN3C22GVP8'] === true), 'and switches GA off in the page without a reload');
check(await page.evaluate(() => localStorage.getItem('cookie-consent')) === 'declined', 'the choice is stored');
const before = gaRequests.length;
await page.reload({ waitUntil: 'networkidle' });
check(gaRequests.length === before, `after withdrawing, the next page requests nothing from Google (${gaRequests.length - before})`);
check(!(await banner.isVisible()), 'and does not ask again');

console.log('\n=== another language ===');
await page.goto(`${BASE}/de/merge`, { waitUntil: 'networkidle' });
check(await page.locator('footer').getByRole('button', { name: 'Cookie-Einstellungen' }).isVisible(), 'the German footer shows "Cookie-Einstellungen"');

// A visitor whose browser is Polish (stored preference pl) opens an Arabic page for the first
// time: the consent text has to be in the page's language, not in the stored one.
const fresh = await browser.newContext({ locale: 'pl-PL', serviceWorkers: 'block' });
await fresh.addInitScript(() => { try { localStorage.setItem('locale', 'pl'); } catch { /* */ } });
const ar = await fresh.newPage();
await ar.goto(`${BASE}/ar/privacy`, { waitUntil: 'networkidle' });
const arBanner = ar.getByRole('region', { name: 'إعدادات ملفات تعريف الارتباط' });
check(await arBanner.isVisible(), 'on /ar/privacy with a stored Polish preference the banner is in Arabic');
check(!(await ar.getByText('Akceptuję').isVisible()), 'and shows no Polish button');
await fresh.close();

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
