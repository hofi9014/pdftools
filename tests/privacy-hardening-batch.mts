// Batch of privacy-hardening fixes verified together, following a code-grounded audit that
// found OptimaPDF's actual architecture is much stronger than assumed: only url-to-pdf and the
// 3 AI tools (ai-chat/ai-summary/ai-translate, via our own /api/ai) ever send anything off the
// visitor's device — every other tool page is 100% local, confirmed here by grep rather than
// by trusting a comment. Fixed together:
//
// - lib/pdf/fonts.ts: edit-pdf silently contacted fonts.gstatic.com (for export) and
//   fonts.googleapis.com (for the live editor preview, on every page load) before self-hosting.
//   Fonts are now served from public/fonts/. This also fixed a real, separate bug the migration
//   uncovered: two of the old hardcoded fonts.gstatic.com hashes (PT Sans regular/italic) had
//   already rotted and returned 404 — exporting with that font would have thrown.
// - components/CookieConsent.tsx + app/layout.tsx: Google Analytics is no longer loaded at all
//   (not even in "consent: denied" mode) until the visitor explicitly accepts the cookie
//   banner — previously gtag.js loaded unconditionally on every page view.
// - app/url-to-pdf/page.tsx + lib/i18n.ts: added an inline "this leaves your device" warning
//   (page.url_warning, all 16 locales) matching the existing AI warning pattern, since
//   url-to-pdf is the one non-AI tool that is genuinely server-side.
// - lib/i18n.ts: page.ai_warning (all 16 locales) now mentions the request also transits our
//   own /api/ai server route on its way to OpenRouter, not just OpenRouter itself.
// - next.config.ts: removed CSP allowances for unpkg.com, fonts.googleapis.com,
//   fonts.gstatic.com and openrouter.ai (in connect-src) — none of them are reachable from the
//   browser in any real code path, so they only widened where an XSS could exfiltrate to.
// - public/icon-demo.html: deleted — an orphaned, unlinked scratch file (found while tracing
//   the only actual user of unpkg.com) that loaded both unpkg.com and fonts.googleapis.com.
// - next.config.ts img-src: added www.googletagmanager.com — a pre-existing gap found live
//   while verifying the consent-gating fix above: GA4's own image-beacon ping was silently
//   CSP-blocked, so even a visitor who explicitly accepted analytics never actually sent any.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getFontFamily } from '../lib/pdf/fonts';

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

console.log('=== the core guarantee: no app/*/page.tsx silently gains a network call ===');
{
  // Only url-to-pdf is allowed a real network call — it's the one tool that, by definition
  // (fetching an arbitrary URL), cannot run entirely client-side. Everything else, including
  // the 3 AI tool pages, must reach the network only through a shared lib function (client-ai.ts
  // for AI), never directly from the page component — that's what this test enforces.
  const ALLOWED = new Set(['url-to-pdf']);
  const NETWORK_PATTERN = /\bfetch\s*\(|XMLHttpRequest|\baxios\b/;
  const appDir = join(repoRoot, 'app');
  const toolDirs = readdirSync(appDir, { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'api' && d.name !== '[locale]');
  check(toolDirs.length >= 45, `sanity: found a substantial number of app/* page directories (got ${toolDirs.length})`);

  const violations: string[] = [];
  let scanned = 0;
  for (const dir of toolDirs) {
    const pagePath = join(appDir, dir.name, 'page.tsx');
    if (!existsSync(pagePath)) continue;
    scanned++;
    const src = readFileSync(pagePath, 'utf-8');
    const hasNetwork = NETWORK_PATTERN.test(src);
    if (hasNetwork && !ALLOWED.has(dir.name)) violations.push(dir.name);
    if (!hasNetwork && ALLOWED.has(dir.name)) violations.push(`${dir.name} (expected a network call, found none — allowlist entry is stale)`);
  }
  check(scanned >= 45, `sanity: scanned a substantial number of page.tsx files (got ${scanned})`);
  check(violations.length === 0, `every app/*/page.tsx matches its expected network-call status — violations: ${violations.join(', ') || 'none'}`);
}

console.log('\n=== edit-pdf fonts are self-hosted, not fetched from Google at runtime ===');
{
  const fontsSrc = readFileSync(join(repoRoot, 'lib', 'pdf', 'fonts.ts'), 'utf-8');
  check(!/https:\/\/fonts\.(gstatic|googleapis)\.com/.test(fontsSrc.replace(/\/\/.*$/gm, '')), 'lib/pdf/fonts.ts has no live fetch to a Google Fonts host outside of comments');
  check(fontsSrc.includes("FONTS_BASE = '/fonts'"), 'fonts are served from a local, same-origin path');

  check(typeof getFontFamily === 'function', 'sanity: lib/pdf/fonts.ts still exports getFontFamily');

  const expectedFiles = [
    'arimo-regular', 'cousine-regular', 'cousine-bold', 'cousine-italic',
    'georgia-regular', 'georgia-bold', 'georgia-italic',
    'lato-regular', 'lato-bold', 'lato-italic',
    'notosans-regular', 'notosans-bold', 'notosans-italic',
    'opensans-regular', 'opensans-bold', 'opensans-italic',
    'ptsans-regular', 'ptsans-bold', 'ptsans-italic',
    'roboto-regular', 'roboto-bold', 'roboto-italic',
    'tinos-regular', 'tinos-bold', 'tinos-italic',
    'verdana-regular', 'verdana-bold', 'verdana-italic',
  ];
  const missing = expectedFiles.filter(f => !existsSync(join(repoRoot, 'public', 'fonts', `${f}.woff2`)));
  check(missing.length === 0, `all ${expectedFiles.length} self-hosted font files exist in public/fonts/ — missing: ${missing.join(', ') || 'none'}`);

  // Every downloaded file must be a genuine WOFF2 (magic bytes 'wOF2'), not an HTML error page —
  // this is exactly the class of bug this migration could have silently introduced.
  const badMagic = expectedFiles.filter(f => {
    const buf = readFileSync(join(repoRoot, 'public', 'fonts', `${f}.woff2`));
    return buf.subarray(0, 4).toString('latin1') !== 'wOF2';
  });
  check(badMagic.length === 0, `every self-hosted font file has a genuine WOFF2 signature — bad: ${badMagic.join(', ') || 'none'}`);
}

console.log('\n=== Google Analytics is not loaded before consent ===');
{
  const layoutSrc = readFileSync(join(repoRoot, 'app', 'layout.tsx'), 'utf-8');
  check(!layoutSrc.includes('googletagmanager.com'), 'app/layout.tsx no longer unconditionally loads gtag.js');
  check(!layoutSrc.includes("gtag('consent'"), 'the old always-runs consent-default-denied script is gone from layout.tsx');

  const consentSrc = readFileSync(join(repoRoot, 'components', 'CookieConsent.tsx'), 'utf-8');
  check(consentSrc.includes('googletagmanager.com'), 'CookieConsent.tsx now owns the GA script tags');
  check(/\{granted && \(/.test(consentSrc), 'the GA scripts are rendered conditionally on a granted-consent flag');
  check(consentSrc.includes('setGranted(true)'), 'accepting the banner (or a prior "accepted" localStorage value) is what flips the flag to true');
}

console.log('\n=== url-to-pdf has an inline "leaves your device" disclosure, like the AI tools ===');
{
  const urlPageSrc = readFileSync(join(repoRoot, 'app', 'url-to-pdf', 'page.tsx'), 'utf-8');
  check(urlPageSrc.includes("t('page.url_warning', locale)"), 'app/url-to-pdf/page.tsx renders the new url_warning banner');

  const i18nSrc = readFileSync(join(repoRoot, 'lib', 'i18n.ts'), 'utf-8');
  const urlWarningCount = (i18nSrc.match(/'page\.url_warning':/g) || []).length;
  const aiWarningCount = (i18nSrc.match(/'page\.ai_warning':/g) || []).length;
  check(urlWarningCount === 16, `page.url_warning exists for all 16 locales — got ${urlWarningCount}`);
  check(aiWarningCount === 16, `page.ai_warning still exists for all 16 locales — got ${aiWarningCount}`);

  // One "our server" marker per locale, in file order (pl,en,es,de,fr,it,pt,is,tr,sv,no,ja,hi,ar,fa,zh) —
  // the exact phrase inserted into that locale's page.ai_warning when this fix was made.
  const serverMarkers = [
    'nasz serwer', 'through our server', 'nuestro servidor', 'unseren Server', 'notre serveur',
    'nostro server', 'nosso servidor', 'netþjóninn okkar', 'sunucumuz üzerinden', 'via vår server',
    'via vår server', 'サーバーを経由して', 'हमारे सर्वर के माध्यम से', 'عبر خادمنا', 'از طریق سرور ما',
    '通过我们的服务器',
  ];
  const missingMarkers = serverMarkers.filter(m => !i18nSrc.includes(m));
  check(missingMarkers.length === 0, `all 16 page.ai_warning translations mention the OptimaPDF-server hop, not just OpenRouter — missing markers: ${missingMarkers.join(', ') || 'none'}`);
}

console.log('\n=== CSP no longer allows unreachable-from-the-browser origins ===');
{
  // Strip line comments first — next.config.ts documents exactly which hosts were removed and
  // why, in a comment that names them, which would otherwise defeat a naive substring check.
  const configSrc = readFileSync(join(repoRoot, 'next.config.ts'), 'utf-8');
  const cspArrayOnly = configSrc.slice(configSrc.indexOf('const csp = ['), configSrc.indexOf('].join'));
  check(!cspArrayOnly.includes('unpkg.com'), 'unpkg.com removed from CSP (its only real user, public/icon-demo.html, is deleted)');
  check(!cspArrayOnly.includes('fonts.googleapis.com'), 'fonts.googleapis.com removed from CSP (edit-pdf fonts are self-hosted now)');
  check(!cspArrayOnly.includes('fonts.gstatic.com'), 'fonts.gstatic.com removed from CSP (edit-pdf fonts are self-hosted now)');
  check(!/connect-src[^"]*openrouter\.ai/.test(cspArrayOnly), 'openrouter.ai removed from connect-src (the browser never calls it directly, only our /api/ai route does)');
  check(!existsSync(join(repoRoot, 'public', 'icon-demo.html')), 'public/icon-demo.html (orphaned, loaded unpkg.com + Google Fonts) is deleted');
  check(/img-src[^"]*www\.googletagmanager\.com/.test(cspArrayOnly), 'img-src allows www.googletagmanager.com — GA4\'s own consent/init beacon ping needs this, or accepted analytics silently never send');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
