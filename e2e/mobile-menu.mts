import { chromium } from 'playwright';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

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

  // Polls the same visibility check hasVisibleInPanel does in one shot, via waitForFunction,
  // instead of sleeping a guessed duration then checking once — waits exactly as long as
  // needed for the accordion animation/DOM update, no more, no less, and fails fast if the
  // expected state never arrives.
  function waitForPanelState(selector: string, text: string, visible: boolean, timeout = 5000): Promise<void> {
    return page.waitForFunction(({ sel, txt, vis }) => {
      const panel = document.querySelector('[class*="overflow-y-auto"]');
      if (!panel) return false;
      const els = panel.querySelectorAll(sel);
      let found = false;
      for (const el of els) {
        if (el.textContent?.includes(txt)) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) { found = true; break; }
        }
      }
      return found === vis;
    }, { sel: selector, txt: text, vis: visible }, { timeout }).then(() => {}).catch(() => {});
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
  await page.goto(`${BASE_URL}/`, { waitUntil: 'load', timeout: 15000 }).catch(() => {});

  const hamburger = page.locator('header button[class*="md:hidden"]').first();
  await hamburger.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  check('Hamburger button visible', await hamburger.isVisible().catch(() => false));

  console.log('\n2. Open menu + verify categories...');
  await hamburger.click();
  await page.waitForSelector('[class*="overflow-y-auto"]', { state: 'visible', timeout: 5000 }).catch(() => {});

  const cats = ['Edycja', 'Konwersja', 'Zabezpieczenia', 'Więcej'];
  for (const ct of cats) {
    check(`Category "${ct}" visible`, await hasVisibleInPanel('button', ct));
  }

  console.log('\n3. Accordion expand/collapse...');
  await clickMobileCat('Edycja');
  await waitForPanelState('a', 'Połącz PDF', true);
  check('Tool "Połącz PDF" visible after expand', await hasVisibleInPanel('a', 'Połącz PDF'));

  await clickMobileCat('Edycja');
  await waitForPanelState('a', 'Połącz PDF', false);
  check('Tool hidden after collapse', !(await hasVisibleInPanel('a', 'Połącz PDF')));

  console.log('\n4. Wi\u0119cej category expand + divider...');
  await clickMobileCat('Więcej');
  await waitForPanelState('a', 'Nasze zasady', true);
  check('"Nasze zasady" under Wi\u0119cej', await hasVisibleInPanel('a', 'Nasze zasady'));
  check('"Informacje" divider label visible', await hasVisibleInPanel('span', 'Informacje'));

  console.log(allPassed ? '\n=== ALL PASSED ===' : '\n=== SOME FAILED ===');
  await browser.close();
  if (!allPassed) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
