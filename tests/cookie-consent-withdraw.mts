// Consent to Google Analytics can be withdrawn as easily as it was given (GDPR art. 7(3)).
//
// Before: the privacy policy told the visitor to "remove the cookie-consent entry from your
// browser's localStorage" — there was no control on the page — and the _ga cookies GA had set
// stayed after declining. The banner called the analytics "anonymous", which Google Analytics 4
// with an identifier cookie is not (and its `anonymize_ip` option no longer does anything).
// Now: a "Cookie settings" link in the footer reopens the banner; declining stops GA in the page
// at once and expires its cookies. The browser-side flow is proven by e2e/cookie-consent.mts.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { analyticsCookieNames, expireAnalyticsCookies, readConsent, setAnalyticsDisabled, GA_MEASUREMENT_ID, OPEN_COOKIE_SETTINGS_EVENT } = await import('../lib/analytics-consent.ts');
const { all, locales } = await import('../lib/i18n.ts');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

console.log('\n=== which cookies are Google Analytics, and how they are removed ===');
{
  const jar = 'x-detected-locale=pl; _ga=GA1.1.123.456; _ga_KN3C22GVP8=GS1.1.789; theme=dark; _gid=GA1.2.1; _gat_UA-1=1; ga=keep';
  check(JSON.stringify(analyticsCookieNames(jar)) === '["_ga","_ga_KN3C22GVP8","_gid","_gat_UA-1"]', `GA cookies found, other cookies left alone (${analyticsCookieNames(jar).join(', ')})`);
  const lines = expireAnalyticsCookies('_ga=1; _ga_KN3C22GVP8=2', 'www.optimapdf.com');
  check(lines.length === 6 && lines.every((l) => /Max-Age=0; path=\//.test(l)), `each GA cookie is expired on path / (${lines.length} lines)`);
  check(lines.includes('_ga=; Max-Age=0; path=/; domain=.optimapdf.com') && lines.includes('_ga=; Max-Age=0; path=/; domain=.www.optimapdf.com') && lines.includes('_ga=; Max-Age=0; path=/'),
    'on the parent domain GA uses (.optimapdf.com), on the host, and without a domain');
  check(expireAnalyticsCookies('theme=dark', 'optimapdf.com').length === 0, 'nothing to remove when GA set nothing');
  check(expireAnalyticsCookies('_ga=1', 'localhost').join('|') === '_ga=; Max-Age=0; path=/', 'a host without dots: removed without a domain');
}

console.log('\n=== the stored choice ===');
{
  const store = (v: string | null) => ({ getItem: () => v });
  check(readConsent(store('accepted')) === 'accepted' && readConsent(store('declined')) === 'declined' && readConsent(store(null)) === null && readConsent(store('maybe')) === null, 'accepted / declined / no answer');
  check(readConsent({ getItem: () => { throw new Error('blocked'); } }) === null && readConsent(undefined) === null, 'storage blocked (private window) counts as no answer, no crash');
  const win: Record<string, unknown> = {};
  setAnalyticsDisabled(win, true);
  check(win[`ga-disable-${GA_MEASUREMENT_ID}`] === true, 'declining sets the flag gtag reads on every hit');
  setAnalyticsDisabled(win, false);
  check(win[`ga-disable-${GA_MEASUREMENT_ID}`] === false, 'accepting again clears it');
}

console.log('\n=== the page: a control to change the choice ===');
{
  const footer = readFileSync(join(ROOT, 'components/Footer.tsx'), 'utf8');
  const banner = readFileSync(join(ROOT, 'components/CookieConsent.tsx'), 'utf8');
  check(/dispatchEvent\(new Event\(OPEN_COOKIE_SETTINGS_EVENT\)\)/.test(footer) && footer.includes("t('cookie.settings', locale)"), 'the footer has a "Cookie settings" button that reopens the banner');
  check(banner.includes('addEventListener(OPEN_COOKIE_SETTINGS_EVENT') && OPEN_COOKIE_SETTINGS_EVENT.length > 0, 'the banner listens for it');
  check(/const decline[\s\S]*?setAnalyticsDisabled\([^)]*true\)[\s\S]*?expireAnalyticsCookies\(document\.cookie/.test(banner), 'declining turns GA off and expires its cookies');
  check(!banner.includes('anonymize_ip'), 'no anonymize_ip (it has no effect in Google Analytics 4)');
}

console.log('\n=== the banner says what happens, in all 16 languages ===');
{
  const anon = /anonim|anonym|anónim|anônim|匿名|गुमनाम|مجهول|ناشناس|nafnlaus/i;
  const bad = locales.filter((l) => anon.test(all[l]!['cookie.text'] ?? ''));
  check(bad.length === 0, `no locale calls Google Analytics anonymous (${bad.join(', ') || 'none'})`);
  const noGoogle = locales.filter((l) => !(all[l]!['cookie.text'] ?? '').includes('Google LLC'));
  check(noGoogle.length === 0, `each names Google LLC as the recipient (${noGoogle.join(', ') || 'all'})`);
  const missing = locales.filter((l) => !all[l]!['cookie.settings']);
  check(missing.length === 0, `"Cookie settings" is translated in every locale (${missing.join(', ') || 'all 16'})`);
  const english = locales.filter((l) => l !== 'en' && all[l]!['cookie.settings'] === all.en!['cookie.settings']);
  check(english.length === 0, `no locale shows the English label (${english.join(', ') || 'none'})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
