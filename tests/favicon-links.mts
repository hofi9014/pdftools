// The tab icon. Since 2026-09-15 the page linked '/icon?v=2' — the route of a dynamic icon that was
// removed that day — so every page asked for a 404 and the browser tab showed a placeholder globe;
// /favicon.ico, which browsers and search engines request on their own, was a 404 too.
// This test ties every icon the pages link to a file that is actually published.
// Run: npx tsx tests/favicon-links.mts
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { rootMetadata } from '../lib/root-metadata';

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) fails++; };
const root = process.cwd();

type Icon = { url: string | URL; sizes?: string };
const icons = rootMetadata.icons as { icon: Icon | Icon[]; apple: Icon | Icon[] };
const all = [icons.icon, icons.apple].flat() as Icon[];
check(all.length >= 3, `${all.length} icons linked`);
for (const i of all) {
  const url = String(i.url);
  const path = url.split('?')[0]!;
  // app/icon.png is published at /icon.png by Next's file convention; everything else lives in public/.
  const file = path === '/icon.png' ? join(root, 'app', 'icon.png') : join(root, 'public', path);
  check(!url.includes('?') && existsSync(file), `${url} is a published file`);
}
const ico = readFileSync(join(root, 'public', 'favicon.ico'));
const count = ico.readUInt16LE(4);
const sizes = Array.from({ length: count }, (_, k) => ico[6 + k * 16] || 256).sort((a, b) => a - b);
check(ico.readUInt16LE(2) === 1 && JSON.stringify(sizes) === '[16,32,48]', `favicon.ico holds 16, 32 and 48 px (${sizes})`);
const png = readFileSync(join(root, 'public', 'icons', 'favicon-96x96.png'));
check(png.readUInt32BE(16) === 96 && png.readUInt32BE(20) === 96, 'favicon-96x96.png is 96×96 (a multiple of 48 for search results)');
check(all.some((i) => String(i.url) === '/favicon.ico'), 'pages link /favicon.ico');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
