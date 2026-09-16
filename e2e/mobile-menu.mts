import { chromium } from 'playwright';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();

  await page.route('https://js.live.net/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.OneDrive = { open: function() {} };' }));
  await page.route('https://www.googletagmanager.com/**', r => r.abort());
  await page.route('https://accounts.google.com/**', r => r.abort());

  let allPassed = true;
  function check(name: string, pass: boolean) {
    console.log(pass ? `  \u2713 ${name}` : `  \u2717 ${name}`);
    if (!pass) allPassed = false;
  }

  function hasVisibleInPanel(selector: string, text: string): Promise<boolean> {
    return page.evaluate(({ sel, txt }) => {
      const panel = document.querySelector('[class*="overflow-y-auto"]');
      if (!panel) return false;
      const els = panel.querySelectorAll(sel);
      for (const el of els) {
        if (el.textContent?.includes(txt)) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) return true;
        }
      }
      return false;
    }, { sel: selector, txt: text });
  }

  function clickMobileCat(text: string): Promise<boolean> {
    return page.evaluate((txt) => {
      const panel = document.querySelector('[class*="overflow-y-auto"]');
      if (!panel) return false;
      const btns = panel.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent?.includes(txt) && b.offsetParent !== null) {
          b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
      }
      return false;
    }, text);
  }

  console.log('\n1. Mobile menu hamburger visible...');
  await page.goto('http://127.0.0.1:3013/', { waitUntil: 'load', timeout: 15000 }).catch(() => {});
  await sleep(2000);

  const hamburger = page.locator('header button[class*="md:hidden"]').first();
  check('Hamburger button visible', await hamburger.isVisible().catch(() => false));

  console.log('\n2. Open menu + verify categories...');
  await hamburger.click();
  await sleep(500);

  const cats = ['Edycja', 'Konwersja', 'Zabezpieczenia', 'Więcej'];
  for (const ct of cats) {
    check(`Category "${ct}" visible`, await hasVisibleInPanel('button', ct));
  }

  console.log('\n3. Accordion expand/collapse...');
  await clickMobileCat('Edycja');
  await sleep(600);
  check('Tool "Połącz PDF" visible after expand', await hasVisibleInPanel('a', 'Połącz PDF'));

  await clickMobileCat('Edycja');
  await sleep(600);
  check('Tool hidden after collapse', !(await hasVisibleInPanel('a', 'Połącz PDF')));

  console.log('\n4. Wi\u0119cej category expand + divider...');
  await clickMobileCat('Więcej');
  await sleep(600);
  check('"Nasze zasady" under Wi\u0119cej', await hasVisibleInPanel('a', 'Nasze zasady'));
  check('"Informacje" divider label visible', await hasVisibleInPanel('span', 'Informacje'));

  console.log(allPassed ? '\n=== ALL PASSED ===' : '\n=== SOME FAILED ===');
  await browser.close();
  if (!allPassed) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
