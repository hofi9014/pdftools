// One dictionary per page (2026-10-22): the guards that keep the other 15 out of the browser.
// e2e/i18n-page-bundle.mts checks the built site; this checks the wiring without a build, so CI's
// Node step catches a regression before the build does.
//
// Before: lib/i18n.ts held all 16 dictionaries and every page loaded them (918 kB of script);
// and ten client components rendered in the visitor's stored language instead of the page's.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

console.log('=== the browser bundle gets no dictionaries ===');
{
  const pkg = JSON.parse(read('package.json')) as { imports?: Record<string, Record<string, string>> };
  const entry = pkg.imports?.['#translations'];
  check(entry?.browser === './lib/translations/none.ts' && entry?.default === './lib/translations/all.ts', `package.json "imports": '#translations' → none.ts in the browser, all.ts elsewhere (${JSON.stringify(entry)})`);
  check(/export const all: Record<string, Record<string, string>> = \{\};/.test(read('lib/translations/none.ts')), 'lib/translations/none.ts exports an empty set');
  check(read('lib/i18n.ts').includes("from '#translations'"), "lib/i18n.ts takes its dictionaries from '#translations'");
}

console.log('\n=== who may import the full set ===');
{
  const files: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(join(ROOT, d))) {
      const p = join(d, n);
      if (n === 'node_modules' || n.startsWith('.')) continue;
      if (statSync(join(ROOT, p)).isDirectory()) walk(p);
      else if (/\.(tsx?|mts)$/.test(n) && !n.endsWith('.bak')) files.push(p.replace(/\\/g, '/'));
    }
  };
  for (const d of ['app', 'components', 'lib', 'hooks']) walk(d);
  const importing = (re: RegExp) => files.filter((f) => re.test(read(f)));
  const bundle = importing(/from ['"](@\/lib\/translations\/bundle|\.\/bundle)['"]/);
  check(bundle.sort().join() === ['components/AllTranslations.tsx', 'lib/translations/all.ts'].join(), `only components/AllTranslations.tsx (and all.ts) import the full set (${bundle.join(', ')})`);
  const single = importing(/from ['"]@\/lib\/translations\/[a-z]{2}['"]/)
    .concat(importing(/from ['"]\.\/[a-z]{2}['"]/).filter((f) => f.startsWith('lib/translations/') && f !== 'lib/translations/bundle.ts'));
  check(single.length === 0, `nothing imports a single language file directly (${single.join(', ')})`);
  const viaAlias = importing(/from ['"](#translations|@\/lib\/translations\/all)['"]/).filter((f) => f !== 'lib/i18n.ts');
  check(viaAlias.length === 0, `only lib/i18n.ts uses '#translations' (${viaAlias.join(', ')})`);
  // Next loads every client component a layout IMPORTS, rendered or not: importing
  // AllTranslations into RootDocument put all 16 dictionaries back on every page (measured).
  const all = importing(/from ['"]@\/components\/AllTranslations['"]/);
  check(all.sort().join() === ['app/(unprefixed)/layout.tsx', 'app/global-not-found.tsx'].join(), `AllTranslations is imported only by the two documents without a language (${all.join(', ')})`);
  check(!read('app/_root/RootDocument.tsx').includes('AllTranslations"') && read('app/_root/RootDocument.tsx').includes('messagesFor(locale)'), 'RootDocument passes the page its own dictionary and does not import the full set');
}

console.log('\n=== the page dictionary ===');
const { all, locales, messagesFor, registerMessages, t } = await import('../lib/i18n.ts');
{
  const en = all.en!;
  let incomplete = 0, wrong = 0;
  for (const l of locales) {
    const m = messagesFor(l);
    for (const k of Object.keys(en)) if (!(k in m)) incomplete++;
    for (const [k, v] of Object.entries(m)) if (v !== (all[l]![k] ?? en[k])) wrong++;
  }
  check(incomplete === 0 && wrong === 0, `messagesFor(locale) = that language with the en fallback applied, for all 16 (${incomplete} missing, ${wrong} wrong)`);
  check(Object.keys(all).length === 16 && locales.every((l) => Object.keys(all[l]!).length > 900), 'on the server all 16 dictionaries are loaded');
}

console.log('\n=== a language the page did not load is reported ===');
{
  const g = globalThis as Record<string, unknown>;
  const saved = all.sv;
  delete all.sv;
  g.window = {};
  const errors: string[] = [];
  const orig = console.error;
  console.error = (...a: unknown[]) => { errors.push(a.join(' ')); };
  const v1 = t('nav.home', 'sv');
  t('nav.tools', 'sv');
  console.error = orig;
  delete g.window;
  check(errors.length === 1 && errors[0]!.includes('"sv"'), `reported once per language (${errors.length}: ${errors[0] ?? ''})`);
  check(v1 === all.en!['nav.home'], 'and the en text is shown meanwhile, as before');
  registerMessages('sv', saved!);
  check(t('nav.home', 'sv') === saved!['nav.home'], 'registerMessages() makes it available');
}

console.log('\n=== components follow the page language ===');
{
  const ctx = read('lib/locale-context.tsx');
  check(/useHydrationSafeLocale\(\): Locale \{[\s\S]{0,120}if \(routeLocale\) return routeLocale;/.test(ctx), 'useHydrationSafeLocale() returns the language in the address first');
  check(/routeLocale=\{locale\}/.test(read('app/_root/RootDocument.tsx')), 'RootDocument gives the provider the language in the address');
  const mag = read('components/Magnifier.tsx');
  check(!mag.includes('Powiększ') && mag.includes("t('magnifier.zoom', locale)") && mag.includes("aria-label={t('magnifier.zoom', locale)}"), 'the zoom button is named in the page language (was "Powiększ / Zoom" everywhere)');
  check(locales.every((l) => all[l]!['magnifier.zoom'] && all[l]!['magnifier.reset']) && new Set(locales.map((l) => all[l]!['magnifier.zoom'])).size >= 14, 'its labels exist in all 16 languages');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
