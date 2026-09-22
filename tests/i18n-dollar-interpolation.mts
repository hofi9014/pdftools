// Audit finding (Medium, i18n/UI area) — lib/i18n.ts's t() interpolates {param} placeholders
// with `val.replace(new RegExp(...), String(v))` — passing a plain STRING as the second argument
// to String.prototype.replace(). Per the JS spec (and MDN), a string replacement argument is NOT
// inserted literally: sequences like $&, $`, $', $$, $<n> are special replacement patterns ($&
// means "re-insert the whole match", $$ means "a literal $", etc). Any interpolated value
// containing '$' silently corrupts the output instead of being inserted as typed.
//
// Reachable with ordinary, non-malicious user input: app/page.tsx's homepage search box passes
// the raw typed query straight into t('home.search_no_results', locale, { query: search }) — a
// user searching for e.g. "cena $" or "foo$&bar" (nothing exotic — '$' is an ordinary character
// people type, especially around prices) would see a garbled result message instead of their own
// search text echoed back.
//
// Fixed by using a replacer FUNCTION instead of a replacer string — per spec, a function's
// return value is always inserted literally, with no special-pattern parsing at all.

import { t } from '../lib/i18n';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== t(): interpolated values containing "$" are inserted literally ===');

check(
  t('home.search_no_results', 'pl', { query: 'foo$&bar' }).includes('foo$&bar'),
  `"$&" (re-insert whole match) is NOT specially interpreted (got: ${JSON.stringify(t('home.search_no_results', 'pl', { query: 'foo$&bar' }))})`,
);
check(
  t('home.search_no_results', 'pl', { query: "foo$'bar" }).includes("foo$'bar"),
  `"$'" (insert text after match) is NOT specially interpreted (got: ${JSON.stringify(t('home.search_no_results', 'pl', { query: "foo$'bar" }))})`,
);
check(
  t('home.search_no_results', 'pl', { query: 'foo$`bar' }).includes('foo$`bar'),
  `"$\`" (insert text before match) is NOT specially interpreted (got: ${JSON.stringify(t('home.search_no_results', 'pl', { query: 'foo$`bar' }))})`,
);
check(
  t('home.search_no_results', 'pl', { query: 'foo$$bar' }).includes('foo$$bar'),
  `"$$" (literal dollar escape) is NOT specially interpreted — stays as two dollar signs, not collapsed to one (got: ${JSON.stringify(t('home.search_no_results', 'pl', { query: 'foo$$bar' }))})`,
);
check(
  t('home.search_no_results', 'pl', { query: 'price $100' }).includes('price $100'),
  `an ordinary, realistic search like "price $100" round-trips exactly (got: ${JSON.stringify(t('home.search_no_results', 'pl', { query: 'price $100' }))})`,
);

console.log('\n=== regression guard: ordinary interpolation without "$" is unaffected ===');
check(
  t('home.search_no_results', 'pl', { query: 'merge pdf' }) === 'Nie znaleziono narzędzi pasujących do „merge pdf”.',
  `plain query interpolates exactly as before (got: ${JSON.stringify(t('home.search_no_results', 'pl', { query: 'merge pdf' }))})`,
);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
