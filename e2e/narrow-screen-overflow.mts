// Every page, in every language, fits a 375px phone screen: no element reaches past the left or
// right edge of the viewport.
//
// Found by CI on Linux, where /ar/url-to-pdf scrolled sideways by 4px. Measured on Windows the
// same row (URL field + "Try an example URL" button that could neither shrink nor wrap) stuck out
// of its card in 15 of 16 languages and pushed the whole page wider than the screen in 8 of them
// (Polish 424px, German 433px). The older RTL sweep (e2e/rtl-layout.mts) only opened /ar pages
// and only compared document scrollWidth, which misses overflow to the LEFT (RTL) and overflow
// hidden by the `overflow-x: hidden` safety net on <html> — content cut off is still a bug.
//
// So this test looks at elements, not at the scroll width: any visible element whose box ends
// past either edge of the viewport fails, unless an ancestor scrolls or clips it on purpose
// (code blocks, wide tables) or it is positioned off-screen on purpose (fixed/visually hidden).
//
// Pages: the home page and every app/[locale]/* directory, in all 16 languages.
import { chromium, type Page } from 'playwright';
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const WIDTH = 375;
const LOCALES = ['ar', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'is', 'it', 'ja', 'no', 'pl', 'pt', 'sv', 'tr', 'zh'];
const PARALLEL = 6;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localeDir = join(root, 'app', '[locale]');
const slugs = ['', ...readdirSync(localeDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(localeDir, d.name, 'page.tsx')))
  .map((d) => d.name)];

type Offender = { tag: string; text: string; left: number; right: number };

async function offenders(page: Page): Promise<Offender[]> {
  return page.evaluate((width) => {
    const out: { tag: string; text: string; left: number; right: number }[] = [];
    // (No named helper functions in here: tsx would wrap them in a __name() the page lacks.)
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue; // visually hidden (sr-only, skip link at rest)
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed') continue;
      if (r.left >= -1 && r.right <= width + 1) continue;
      // Inside something that clips or scrolls sideways on purpose (or inside a fixed layer such
      // as a closed drawer): the page itself does not get wider.
      let p = el.parentElement;
      let excused = false;
      while (p && p !== document.body && p !== document.documentElement) {
        const ps = getComputedStyle(p);
        if (ps.position === 'fixed' || (['auto', 'scroll', 'hidden', 'clip'].includes(ps.overflowX) && p.getBoundingClientRect().right <= width + 1 && p.getBoundingClientRect().left >= -1)) {
          excused = true; break;
        }
        p = p.parentElement;
      }
      if (excused) continue;
      // Report the outermost offender only: its children stick out with it.
      const parent = el.parentElement?.getBoundingClientRect();
      if (parent && (parent.left < -1 || parent.right > width + 1) && el.parentElement !== document.body) continue;
      out.push({
        tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? `.${el.className.split(/\s+/).slice(0, 3).join('.')}` : ''),
        text: (el.textContent ?? '').trim().slice(0, 40),
        left: Math.round(r.left), right: Math.round(r.right),
      });
    }
    return out;
  }, WIDTH);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: WIDTH, height: 812 } });
  const paths = LOCALES.flatMap((l) => slugs.map((s) => (s ? `/${l}/${s}` : `/${l}`)));
  const failures: string[] = [];
  let checked = 0;

  // Negative control: the check must see an element sticking out on either side.
  {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/pl/merge`, { waitUntil: 'load' });
    await page.evaluate(() => {
      const right = document.createElement('div'); right.style.cssText = 'width:420px;height:10px';
      const left = document.createElement('div'); left.style.cssText = 'width:50px;height:10px;margin-left:-60px';
      document.querySelector('main')!.append(right, left);
    });
    const found = await offenders(page);
    if (!found.some((o) => o.right > WIDTH) || !found.some((o) => o.left < 0)) {
      throw new Error(`negative control: an element past the right and the left edge must be reported, got ${JSON.stringify(found)}`);
    }
    console.log('✓ negative control: elements past the right and the left edge are reported');
    await page.close();
  }

  const queue = [...paths];
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    const page = await context.newPage();
    while (queue.length) {
      const path = queue.shift()!;
      try {
        const res = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'load', timeout: 30000 });
        if (!res || res.status() >= 400) { failures.push(`${path}: HTTP ${res?.status()}`); continue; }
        await page.evaluate(() => document.fonts.ready);
        const found = await offenders(page);
        for (const o of found) failures.push(`${path}: <${o.tag}> "${o.text}" spans ${o.left}..${o.right}px`);
        // Tool pages used to pass "☁️ " + label to CloudFilePicker, which adds the icon itself.
        if (await page.evaluate(() => document.body.innerText.includes('☁️ ☁️'))) {
          failures.push(`${path}: the cloud button shows its icon twice`);
        }
        checked++;
      } catch (e) {
        failures.push(`${path}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    await page.close();
  }));
  await browser.close();

  if (failures.length) {
    console.error(`\n❌ ${failures.length} element(s) past the screen edge at ${WIDTH}px:`);
    for (const f of failures.sort()) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`✓ ${checked} pages (${slugs.length} pages × ${LOCALES.length} languages) fit a ${WIDTH}px screen`);
  console.log('ALL PASS');
}

run().catch((e) => { console.error(e); process.exit(1); });
