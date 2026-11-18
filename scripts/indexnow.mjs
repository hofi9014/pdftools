// Tells search engines that support IndexNow (Bing, Yandex, Seznam, Naver…) which pages changed,
// so they recrawl them now instead of on their own schedule. Google does not use IndexNow — for
// Google, request indexing in Search Console.
//
//   npm run indexnow -- /pl /pl/compress   these paths only
//
// Only the pages that actually changed, and at most MAX_URLS at a time. Submitting the whole
// sitemap (which this script used to do by default) made Bing Webmaster Tools warn "Avoid
// IndexNow Batch Mode to prevent excessive server load and potential indexing delays"
// (2026-11-18, after two whole-sitemap runs of 2.1K and 1.2K URLs). New pages are found through
// the sitemap anyway. In Git Bash, prefix with MSYS_NO_PATHCONV=1 — otherwise /pl becomes a disk path.
//
// The key proves the site owns the request: search engines fetch https://optimapdf.com/<key>.txt
// and compare. Run after a deploy is live (the key file must already be served).
import { pathToFileURL } from 'node:url';

export const HOST = 'optimapdf.com';
export const KEY = '4a88aab0dd721971fb64b5ec0bf9f881';
const ORIGIN = `https://${HOST}`;
export const MAX_URLS = 50;

/** The addresses to submit for the given command-line paths, or why there are none. */
export function selectUrls(paths) {
  if (!paths.length) return { error: 'name the changed pages, e.g. npm run indexnow -- /pl/compress (the whole sitemap is not submitted)' };
  const bad = paths.find((p) => !p.startsWith('/') && !p.startsWith(ORIGIN));
  if (bad) return { error: `not a path on ${HOST}: ${bad} (Git Bash turns /pl into a disk path — use MSYS_NO_PATHCONV=1)` };
  const urls = [...new Set(paths.map((p) => new URL(p, ORIGIN).href))].filter((u) => new URL(u).host === HOST);
  if (!urls.length) return { error: 'no addresses to submit' };
  if (urls.length > MAX_URLS) return { error: `${urls.length} addresses — at most ${MAX_URLS} at a time; submit only pages that changed` };
  return { urls };
}

async function main() {
  const picked = selectUrls(process.argv.slice(2));
  if (picked.error) throw new Error(picked.error);
  const urls = picked.urls;
  const keyRes = await fetch(`${ORIGIN}/${KEY}.txt`);
  const keyBody = (await keyRes.text()).trim();
  if (!keyRes.ok || keyBody !== KEY) throw new Error(`key file not served (${keyRes.status}) — deploy first`);

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList: urls }),
  });
  // 200 = accepted, 202 = accepted, key validation pending. Anything else is an error.
  console.log(`IndexNow: ${urls.length} addresses → HTTP ${res.status} ${await res.text()}`.trim());
  if (res.status !== 200 && res.status !== 202) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
