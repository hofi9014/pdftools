// IndexNow (scripts/indexnow.mjs) only works while the key file it names is published with
// exactly the key, and while the deploy does not drop it. Run: npx tsx tests/indexnow-key.mts
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { KEY, HOST, MAX_URLS, selectUrls } from '../scripts/indexnow.mjs';

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) fails++; };
const file = join(process.cwd(), 'public', `${KEY}.txt`);
check(/^[0-9a-f]{32}$/.test(KEY), 'the key is 32 hex characters (IndexNow allows 8-128 of a-z, A-Z, 0-9, -)');
check(existsSync(file) && readFileSync(file, 'utf8').trim() === KEY, `public/${KEY}.txt holds exactly the key`);
check(HOST === 'optimapdf.com', 'host is the production domain');
const ignore = readFileSync(join(process.cwd(), '.vercelignore'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
check(!ignore.some((p) => p === '*.txt' || p === 'public' || p === 'public/' || p === `public/${KEY}.txt`), '.vercelignore does not drop the key file');
// Only named pages are submitted — Bing warned against whole-sitemap batches (2026-11-18).
check(!!selectUrls([]).error, 'no paths → refused (the whole sitemap is never submitted)');
check(JSON.stringify(selectUrls(['/pl/compress', '/pl/compress', '/pl'])) === JSON.stringify({ urls: ['https://optimapdf.com/pl/compress', 'https://optimapdf.com/pl'] }), 'named paths → their addresses, without duplicates');
check(!!selectUrls(['C:/Program Files/Git/pl']).error, 'a path mangled by Git Bash is refused, not sent');
check(!!selectUrls(Array.from({ length: MAX_URLS + 1 }, (_, i) => `/pl/p${i}`)).error && !!selectUrls(Array.from({ length: MAX_URLS }, (_, i) => `/pl/p${i}`)).urls, `more than ${MAX_URLS} addresses → refused, ${MAX_URLS} accepted`);
check(!readFileSync(join(process.cwd(), 'scripts', 'indexnow.mjs'), 'utf8').includes('sitemap.xml`'), 'the script no longer reads the sitemap');
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
