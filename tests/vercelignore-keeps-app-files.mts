// .vercelignore listed `proxy.ts` — since the very first commit. Vercel removes ignored files
// BEFORE the build, so the proxy (this Next.js version's replacement for middleware.ts) was never
// part of any production deployment: no CSRF origin check, no per-IP rate limit and no upload
// size rejection on /api/*, and no redirect of legacy un-prefixed URLs to /{locale}/…. Nothing
// local could notice — `next dev`, `next start` and every test run with the file present.
// Found by probing production after a deploy:
//   POST /api/url-to-pdf with "Origin: https://evil.example"  → 200 + a PDF   (locally: 403)
//   GET  /merge                                                → 200          (locally: 307)
// and the same on every still-existing earlier deployment.
//
// This test fails if .vercelignore excludes anything the deployed app is built from.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const patterns = readFileSync(join(ROOT, '.vercelignore'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
// .vercelignore uses .gitignore syntax; the patterns in this file are plain names and "*" globs
// without slashes, which match a path segment at any depth.
const toRegex = (p: string) => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
const regexes = patterns.map((p) => ({ p, re: toRegex(p) }));
const ignoredBy = (path: string): string | undefined => {
  for (const seg of path.split('/')) {
    const hit = regexes.find((r) => r.re.test(seg));
    if (hit) return hit.p;
  }
  return undefined;
};

console.log('=== .vercelignore must not remove files the app is built from ===');
check(!patterns.includes('proxy.ts'), 'proxy.ts (CSRF check, rate limit, locale redirects) is not ignored');
check(ignoredBy('proxy.ts') === undefined, `no pattern matches proxy.ts (matched by: ${ignoredBy('proxy.ts')})`);

const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean);
const appFiles = tracked.filter((f) =>
  /^(app|lib|components|hooks|content|types|public|scripts)\//.test(f)
  || ['proxy.ts', 'next.config.ts', 'package.json', 'package-lock.json', 'tsconfig.json', 'postcss.config.mjs', 'vercel.json'].includes(f));
const removed = appFiles.map((f) => ({ f, by: ignoredBy(f) })).filter((x) => x.by);
check(appFiles.length > 300, `sanity: the app file list is real (${appFiles.length} files)`);
check(removed.length === 0, `no app/lib/components/public/config file is ignored (${removed.length}: ${removed.slice(0, 5).map((x) => `${x.f} ← ${x.by}`).join(', ')})`);

// The matcher itself must still cover both things the proxy exists for.
const proxy = readFileSync(join(ROOT, 'proxy.ts'), 'utf8');
check(/export function proxy\(/.test(proxy) && /matcher:\s*\[\s*'\/api\/:path\*'/.test(proxy), 'proxy.ts exports proxy() and matches /api/*');

console.log('\n=== the page matcher covers legacy URLs but not static files or localized pages ===');
// The matcher as written in the source ('/((?!…).*)', with "\\." for a literal dot).
const pageMatcher = /'(\/\(\(\?![^']+)'/.exec(proxy)?.[1]?.replace(/\\\\/g, '\\');
check(!!pageMatcher, 'found the page matcher');
const mre = new RegExp('^' + pageMatcher + '$');
// Every path the proxy redirects must still reach it — including the ones that merely START
// with the letters of a locale code ("/faq" ~ fa, "/delete-pages" ~ de, "/protect-pdf" ~ pt…).
const legacy = [.../LEGACY_PATHS = new Set\(\[([\s\S]*?)\]\)/.exec(proxy)![1]!.matchAll(/'([^']*)'/g)].map((m) => m[1]!);
check(legacy.length >= 50, `sanity: read the legacy path list (${legacy.length})`);
const missed = legacy.filter((s) => !mre.test('/' + s));
check(missed.length === 0, `runs for all ${legacy.length} legacy paths (missed: ${missed.join(', ')})`);
for (const path of ['/', '/merge', '/faq', '/delete-pages', '/protect-pdf']) check(mre.test(path), `runs for ${path}`);
for (const path of ['/pdfjs-dist/cmaps/78-H.bcmap', '/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf', '/tesseract/tesseract-core.wasm',
  '/sw.js', '/manifest.json', '/dropbox-oauth.html', '/icc/sRGB-IEC61966-2.1.icc', '/logo.png', '/_next/static/chunks/a.js', '/api/ai', '/guides/pl/x', '/sitemap.xml']) {
  check(!mre.test(path), `skips ${path}`);
}

// Localized pages are the canonical URLs and need nothing from the proxy: putting it in front of
// them doubled their server wait on production (~100 ms vs ~50 ms) and cost one function
// invocation per page view and per <Link> prefetch.
const locales = [.../const LOCALES = \[([^\]]*)\]/.exec(proxy)![1]!.matchAll(/'([a-z]{2})'/g)].map((m) => m[1]!);
const i18nLocales = [.../export const locales = \[([^\]]*)\]/.exec(readFileSync(join(ROOT, 'lib/i18n.ts'), 'utf8'))![1]!.matchAll(/'([a-z]{2})'/g)].map((m) => m[1]!);
const matcherLocales = /\(\?:((?:[a-z]{2}\|)+[a-z]{2})\)\(\?:\/\|\$\)/.exec(pageMatcher ?? '')?.[1]?.split('|') ?? [];
check(locales.length === 16, `sanity: read LOCALES from proxy.ts (${locales.length})`);
check([...locales].sort().join() === [...i18nLocales].sort().join(), 'proxy.ts LOCALES equals lib/i18n.ts locales');
check([...locales].sort().join() === [...matcherLocales].sort().join(), `the matcher's locale list equals LOCALES (${matcherLocales.length})`);
const stillMatched = locales.flatMap((l) => [`/${l}`, `/${l}/merge`, `/${l}/guide`]).filter((p) => mre.test(p));
check(stillMatched.length === 0, `skips every /{locale} and /{locale}/… path (${stillMatched.slice(0, 5).join(', ')})`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
