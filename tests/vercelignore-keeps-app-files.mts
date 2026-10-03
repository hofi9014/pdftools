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

console.log('\n=== the page matcher covers legacy URLs but not static files ===');
// The matcher as written in the source ('/((?!…).*)', with "\\." for a literal dot).
const pageMatcher = /'(\/\(\(\?![^']+)'/.exec(proxy)?.[1]?.replace(/\\\\/g, '\\');
check(!!pageMatcher, 'found the page matcher');
const mre = new RegExp('^' + pageMatcher + '$');
for (const path of ['/', '/merge', '/pdf-to-word', '/privacy', '/pl/merge']) check(mre.test(path), `runs for ${path}`);
for (const path of ['/pdfjs-dist/cmaps/78-H.bcmap', '/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf', '/tesseract/tesseract-core.wasm',
  '/sw.js', '/manifest.json', '/dropbox-oauth.html', '/icc/sRGB-IEC61966-2.1.icc', '/logo.png', '/_next/static/chunks/a.js', '/api/ai', '/guides/pl/x', '/sitemap.xml']) {
  check(!mre.test(path), `skips ${path}`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
