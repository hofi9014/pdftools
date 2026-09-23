// Audit finding (fresh scanning round, components/LayoutShell.tsx) — extractLocaleFromPath()
// only ever recognized a BARE locale code as segments[0] (e.g. /de/merge). Guide URLs are
// routed as /guides/{localizedSlug}/{category}/{slug} (app/guides/[locale]/[category]/[slug]/
// page.tsx — {localizedSlug} is a per-locale string from localeGuidesSlug, e.g. "anleitungen"
// for de, "przewodnik" for pl, "guides" for en — NOT a bare locale code), so segments[0] is
// literally "guides" for every locale and never matched. Header/Footer/Breadcrumbs/SchemaHowTo/
// HtmlLang — all fed by this same function via LayoutShell — fell back to the stored/browser-
// detected locale on EVERY guide page as a result, while the article page itself correctly
// resolved and rendered the real locale, producing a page mixing (e.g.) a German article body
// with an English header/breadcrumb/footer whenever there was no matching stored preference.
//
// Fixed by recognizing the /guides/{localizedSlug} shape too, resolving {localizedSlug} via the
// same localeFromSegment() the article page itself already uses.

import { extractLocaleFromPath } from '../components/LayoutShell';
import { localeGuidesSlug } from '../lib/guides-slugs';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== bare locale-prefixed tool paths still resolve correctly (no regression) ===');
check(extractLocaleFromPath('/de/merge') === 'de', '/de/merge -> de');
check(extractLocaleFromPath('/pl/compress') === 'pl', '/pl/compress -> pl');
check(extractLocaleFromPath('/merge') === undefined, '/merge (no locale segment) -> undefined');

console.log('\n=== guide paths now resolve the real locale from the localized slug segment ===');
for (const [locale, slug] of Object.entries(localeGuidesSlug)) {
  const path = `/guides/${slug}/merge-pdf/how-to-merge-pdf-online`;
  const resolved = extractLocaleFromPath(path);
  check(resolved === locale, `/guides/${slug}/... -> ${locale} (got ${resolved})`);
}

console.log('\n=== edge cases ===');
check(extractLocaleFromPath('/guides/anleitungen') === 'de', '/guides/anleitungen alone (hub page, no category/slug) still resolves to de');
check(extractLocaleFromPath('/guides') === undefined, '/guides with no further segment -> undefined (no locale slug to resolve)');
check(extractLocaleFromPath('/guide') === undefined, '/guide (singular, the unrelated legacy tool-list page) is NOT mistaken for /guides');
check(extractLocaleFromPath('/guides/totally-unknown-slug/x/y') === 'en', 'an unrecognized guide locale slug falls back to en (matching localeFromSegment\'s own documented default), not undefined');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
