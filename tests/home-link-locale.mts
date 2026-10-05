// "Home" links must point at the home page of the language being read, never at "/".
//
// "/" has no page of its own: proxy.ts answers it with a 307 to /{locale}, the locale taken from
// the visitor's cookie or browser language. The header logo, the "Home" nav item, the mobile menu,
// the breadcrumb and five info pages all linked to "/", so
//   - every page view made Next prefetch "/?_rsc=…", i.e. one proxy run plus a redirect that
//     buys nothing (the header is on every page), and
//   - clicking "Home" on /de/merge in a Polish browser landed on /pl — the one link in the header
//     that ignored the language of the page, next to forty that follow it.
//
// The real-browser half of this proof is e2e/home-link-locale.mts; this file pins the source so
// a new `href="/"` cannot slip back in.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { homePath } from '../lib/tools';
import { locales } from '../lib/i18n';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

console.log('=== homePath ===');
{
  check(homePath('de') === '/de', "homePath('de') is /de");
  check(locales.every((l) => homePath(l) === `/${l}`), 'every locale maps to its own prefixed home page');
  check(homePath() === '/' && homePath(undefined) === '/', 'without a locale it falls back to / (the proxy picks the language)');
}

console.log('\n=== no component or page links to the bare root ===');
{
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.tsx')) files.push(p);
    }
  };
  walk(join(repoRoot, 'app'));
  walk(join(repoRoot, 'components'));
  check(files.length >= 100, `sanity: scanned a substantial number of .tsx files (got ${files.length})`);

  // href="/", href='/', href={'/'}, href={"/"}, href={`/`} and router.push/replace('/').
  const ROOT_LINK = new RegExp('href=\\{?["\'`]/["\'`]\\}?|\\.(?:push|replace)\\(["\'`]/["\'`]\\)');
  const offenders = files
    .filter((f) => ROOT_LINK.test(readFileSync(f, 'utf-8')))
    .map((f) => relative(repoRoot, f).replace(/\\/g, '/'));
  check(offenders.length === 0, `no link to the bare root — offenders: ${offenders.join(', ') || 'none'}`);

  for (const f of ['components/Header.tsx', 'components/MobileMenu.tsx', 'components/Breadcrumbs.tsx']) {
    check(readFileSync(join(repoRoot, f), 'utf-8').includes('href={homePath(locale)}'), `${f} builds its home link from the page's locale`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
