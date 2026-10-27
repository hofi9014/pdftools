// Tells search engines that support IndexNow (Bing, Yandex, Seznam, Naver…) which pages changed,
// so they recrawl them now instead of on their own schedule. Google does not use IndexNow — for
// Google, request indexing in Search Console.
//
//   npm run indexnow               every address in the live sitemap
//   npm run indexnow -- /pl /pl/compress   only these paths
//
// The key proves the site owns the request: search engines fetch https://optimapdf.com/<key>.txt
// and compare. Run after a deploy is live (the key file must already be served).
import { pathToFileURL } from 'node:url';

export const HOST = 'optimapdf.com';
export const KEY = '4a88aab0dd721971fb64b5ec0bf9f881';
const ORIGIN = `https://${HOST}`;

async function main() {
  const keyRes = await fetch(`${ORIGIN}/${KEY}.txt`);
  const keyBody = (await keyRes.text()).trim();
  if (!keyRes.ok || keyBody !== KEY) throw new Error(`key file not served (${keyRes.status}) — deploy first`);

  const paths = process.argv.slice(2);
  let urls;
  if (paths.length) {
    urls = paths.map((p) => new URL(p, ORIGIN).href);
  } else {
    const xml = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  }
  urls = [...new Set(urls)].filter((u) => new URL(u).host === HOST);
  if (!urls.length) throw new Error('no addresses to submit');

  for (let i = 0; i < urls.length; i += 10000) {
    const batch = urls.slice(i, i + 10000);
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList: batch }),
    });
    // 200 = accepted, 202 = accepted, key validation pending. Anything else is an error.
    console.log(`IndexNow: ${batch.length} addresses → HTTP ${res.status} ${await res.text()}`.trim());
    if (res.status !== 200 && res.status !== 202) process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
