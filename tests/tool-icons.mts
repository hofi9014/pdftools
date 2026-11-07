// Tool and category icons are drawn, not emoji (approved 2026-11-07). Emoji are drawn by the
// visitor's operating system, so the same icon looked different on Windows, Android, iPhone and
// Mac, and blank on older systems. This renders every icon the site shows and requires no emoji
// in it, a drawn glyph wherever an emoji used to be, and gradient ids that stay unique when the
// same icon appears twice on a page (the menu and the catalogue both show it).
import { createElement as h, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';

const { getToolIcon, getCategoryIcon } = await import('../lib/icons.tsx');
const { tools, categories } = await import('../lib/tools.ts');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const EMOJI = /\p{Extended_Pictographic}/u;
const render = (n: unknown) => renderToStaticMarkup(h(Fragment, null, n as never));

console.log('=== every tool icon ===');
{
  const withEmoji: string[] = [];
  const missing: string[] = [];
  for (const tool of tools) {
    const html = render(getToolIcon(tool.key));
    if (!html) missing.push(tool.key);
    if (EMOJI.test(html.replace(/<[^>]*>/g, ''))) withEmoji.push(tool.key);
  }
  check(missing.length === 0, `all ${tools.length} tools have an icon (${missing.join(', ') || 'ok'})`);
  check(withEmoji.length === 0, `no tool icon contains an emoji (${withEmoji.join(', ') || 'none'})`);
  const extra = ['guide', 'cloud', 'cloud-access', 'cloud-relogin', 'cloud-privacy'].filter((k) => EMOJI.test(render(getToolIcon(k)).replace(/<[^>]*>/g, '')));
  check(extra.length === 0, `the FAQ section icons (guide, cloud) are drawn too (${extra.join(', ') || 'ok'})`);
  const drawn = render(getToolIcon('protect'));
  check(/<svg[^>]*aria-hidden="true"/.test(drawn) && /linearGradient/.test(drawn), 'the lock in “Protect PDF” is a drawn, hidden-from-screen-readers SVG');
}

console.log('\n=== category icons ===');
{
  const bad = categories.filter((c) => { const html = render(getCategoryIcon(c.key)); return !html || EMOJI.test(html.replace(/<[^>]*>/g, '')); }).map((c) => c.key);
  check(bad.length === 0, `menu and FAQ category icons are drawn (${bad.join(', ') || 'all'})`);
  const home = readFileSync('components/pages/HomeView.tsx', 'utf8');
  check(home.includes('getCategoryIcon(cat.key)') && !/\{cat\.icon\}/.test(home), 'the home page catalogue uses the same drawn category icons, not the emoji in lib/tools');
}

console.log('\n=== gradient ids stay unique on a page ===');
{
  const html = render([getToolIcon('protect'), getToolIcon('protect'), getCategoryIcon('secure')].map((n, i) => h('span', { key: i }, n as never)));
  const ids = [...html.matchAll(/<linearGradient id="([^"]+)"/g)].map((m) => m[1]!).filter((id) => id.startsWith('tg'));
  check(ids.length >= 6 && new Set(ids).size === ids.length, `three lock icons on one page define ${ids.length} gradients with distinct ids`);
  const refs = [...html.matchAll(/url\(#(tg[^)]+)\)/g)].map((m) => m[1]!);
  check(refs.length > 0 && refs.every((r) => ids.includes(r)), 'every fill points at a gradient defined in the same page');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
