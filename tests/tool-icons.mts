// Every icon on the site is drawn, not emoji (tool and category icons approved 2026-11-07, the
// rest of the site 2026-11-08). Emoji are drawn by the visitor's operating system, so the same
// icon looked different on Windows, Android, iPhone and Mac, and blank on older systems.
//
// The owner's rule for the second step: "one tool must not have two different icons" and every
// icon must be logical. So this also checks that
//  - a glyph that belongs to one tool (the lock of "Protect PDF", the scissors of "Crop PDF"…)
//    is used only on that tool's own page, never as a decoration with another meaning,
//  - a place that names a tool (home-page scenarios, help answers that link to a tool) shows
//    that tool's own icon, not a look-alike,
//  - categories have glyphs of their own (the "Convert" category used the arrow of "Rotate PDF").
import { createElement as h, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const { getToolIcon, getCategoryIcon } = await import('../lib/icons.tsx');
const { tools, categories, keyBySlug } = await import('../lib/tools.ts');
const { GLYPH_NAMES } = await import('../components/ToolGlyph.tsx');
const { helpData } = await import('../content/pages/help.ts');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

// An emoji as it is drawn: a character with emoji presentation, or any pictograph followed by
// the emoji variation selector (✏️, ⚠️, ℹ️). Text arrows such as "↔" or "←" are plain text.
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;
const render = (n: unknown) => renderToStaticMarkup(h(Fragment, null, n as never));
const text = (html: string) => html.replace(/<[^>]*>/g, '');

const files: string[] = [];
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(p)) files.push(p.replace(/\\/g, '/'));
  }
};
['app', 'components', 'content', 'lib'].forEach(walk);

console.log('=== no emoji anywhere in the interface sources ===');
{
  // lib/guides-validate.ts prints to the build log, not to the page.
  const bad: string[] = [];
  for (const f of files.filter((f) => f !== 'lib/guides-validate.ts')) {
    readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      if (!/^\s*(\/\/|\*|\/\*)/.test(l) && EMOJI.test(l)) bad.push(`${f}:${i + 1}`);
    });
  }
  check(bad.length === 0, `no emoji in app/, components/, content/, lib/ (${bad.slice(0, 8).join(', ') || 'none'}${bad.length > 8 ? ` …+${bad.length - 8}` : ''})`);
}

console.log('\n=== tool and category icons ===');
{
  const missing = tools.filter((t) => !render(getToolIcon(t.key))).map((t) => t.key);
  check(missing.length === 0, `all ${tools.length} tools have an icon (${missing.join(', ') || 'ok'})`);
  const withEmoji = tools.filter((t) => EMOJI.test(text(render(getToolIcon(t.key))))).map((t) => t.key);
  check(withEmoji.length === 0, `no tool icon contains an emoji (${withEmoji.join(', ') || 'none'})`);
  const extra = ['guide', 'cloud', 'cloud-access', 'cloud-relogin', 'cloud-privacy'].filter((k) => EMOJI.test(text(render(getToolIcon(k)))));
  check(extra.length === 0, `the FAQ section icons (guide, cloud) are drawn (${extra.join(', ') || 'ok'})`);
  const drawn = render(getToolIcon('protect'));
  check(/<svg[^>]*aria-hidden="true"/.test(drawn) && /linearGradient/.test(drawn), 'the lock in “Protect PDF” is a drawn, hidden-from-screen-readers SVG');
  const bad = categories.filter((c) => { const html = render(getCategoryIcon(c.key)); return !html || EMOJI.test(text(html)); }).map((c) => c.key);
  check(bad.length === 0, `menu and FAQ category icons are drawn (${bad.join(', ') || 'all'})`);
  const home = readFileSync('components/pages/HomeView.tsx', 'utf8');
  check(home.includes('getCategoryIcon(cat.key)') && !/\{cat\.icon\}/.test(home), 'the home page catalogue uses the drawn category icons');
}

console.log('\n=== one tool, one icon ===');
// Which tools draw each glyph, read from lib/icons.tsx (`key: row(<>…gl('lock')…</>)`).
const iconsSrc = readFileSync('lib/icons.tsx', 'utf8');
const toolsSection = iconsSrc.slice(iconsSrc.indexOf('const tools'), iconsSrc.indexOf('const categoryIcons'));
const owners = new Map<string, Set<string>>();
for (const m of toolsSection.matchAll(/^\s*'?([\w-]+)'?:\s*(.+)$/gm)) {
  for (const g of m[2]!.matchAll(/(?:gl\('|name=")(\w+)/g)) {
    if (!owners.has(g[1]!)) owners.set(g[1]!, new Set());
    owners.get(g[1]!)!.add(m[1]!);
  }
}
const toolKeys = new Set(tools.map((t) => t.key));
// A glyph drawn by exactly one tool belongs to it. Glyphs drawn by several tools are shared
// concepts (the sparkle marks every AI tool, the picture marks image files).
const owned = new Map([...owners].filter(([, s]) => [...s].filter((k) => toolKeys.has(k)).length === 1)
  .map(([g, s]) => [g, [...s].find((k) => toolKeys.has(k))!]));
{
  check(owned.get('lock') === 'protect' && owned.get('scissors') === 'crop' && owned.get('rotate') === 'rotate',
    `glyph ownership read from lib/icons.tsx (${owned.size} glyphs belong to one tool each)`);

  const categorySrc = iconsSrc.slice(iconsSrc.indexOf('const categoryIcons'));
  const catGlyphs = [...categorySrc.matchAll(/name="(\w+)"/g)].map((m) => m[1]!);
  const shared = catGlyphs.filter((g) => owned.has(g));
  check(catGlyphs.length >= 5 && shared.length === 0, `category glyphs (${catGlyphs.join(', ')}) are not any tool's own glyph (${shared.join(', ') || 'none'})`);

  // Every place a glyph is chosen by name: name="x", name={…'x'…}, 'x' as const, glyph: 'x',
  // and the glyph lists in SupportView / ThemeToggle.
  const toolOfFile = (f: string): string | null => {
    const m = f.match(/^app\/\(unprefixed\)\/([^/]+)\/page\.tsx$/);
    if (m) return keyBySlug[m[1]!] ?? null;
    if (f.startsWith('components/edit-pdf/')) return 'edit';
    if (f.startsWith('components/sign-pdf/')) return 'sign';
    return null;
  };
  // The editor's "Signature" button inserts a signature: the same meaning as "Sign PDF".
  const allowed = new Set(['components/edit-pdf/Toolbar.tsx:signature']);
  const misuse: string[] = [];
  const unknown: string[] = [];
  const valid = new Set<string>(GLYPH_NAMES);
  for (const f of files.filter((f) => f.endsWith('.tsx') && f !== 'components/ToolGlyph.tsx' && f !== 'lib/icons.tsx')) {
    const src = readFileSync(f, 'utf8');
    const names = [
      ...[...src.matchAll(/<ToolGlyph name="(\w+)"/g)].map((m) => m[1]!),
      ...[...src.matchAll(/<ToolGlyph name=\{([^}]*)\}/g)].flatMap((m) => [...m[1]!.matchAll(/'(\w+)'/g)].map((x) => x[1]!)),
      ...[...src.matchAll(/'(\w+)' as const/g)].map((m) => m[1]!).filter((n) => valid.has(n)),
      ...[...src.matchAll(/glyph: '(\w+)'/g)].map((m) => m[1]!),
      ...[...src.matchAll(/GlyphName\[\] = \[([^\]]*)\]/g)].flatMap((m) => [...m[1]!.matchAll(/'(\w+)'/g)].map((x) => x[1]!)),
      ...[...src.matchAll(/option\(\w+, '(\w+)'/g)].map((m) => m[1]!),
    ];
    for (const n of new Set(names)) {
      if (!valid.has(n)) { unknown.push(`${f}:${n}`); continue; }
      const owner = owned.get(n);
      if (owner && owner !== toolOfFile(f) && !allowed.has(`${f}:${n}`)) misuse.push(`${f}: ${n} (belongs to ${owner})`);
    }
  }
  check(misuse.length === 0, `a tool's own glyph appears only on that tool's page (${misuse.join('; ') || 'ok'})`);
  check(unknown.length === 0, `every glyph named in markup exists (${unknown.join(', ') || 'ok'})`);

  const scenarios = readFileSync('components/pages/HomeView.tsx', 'utf8');
  check(/home\.scenarios_\$\{key\}/.test(scenarios) && /\{getToolIcon\(key\)\}/.test(scenarios),
    'each home-page scenario shows the icon of the tool it links to');
  const toolItems = helpData.flatMap((c) => c.items).filter((i) => i.href !== '#');
  const otherItems = helpData.flatMap((c) => c.items).filter((i) => i.href === '#');
  check(toolItems.length > 20 && toolItems.every((i) => !i.icon && keyBySlug[i.href.slice(1)]),
    `help answers that open a tool (${toolItems.length}) carry no icon of their own and point at a real tool`);
  check(otherItems.every((i) => i.icon && !owned.has(i.icon)), 'the other help answers use generic glyphs, not a tool’s');
  const helpView = readFileSync('components/pages/HelpView.tsx', 'utf8');
  check(/getToolIcon\(keyBySlug\[item\.href\.slice\(1\)\]/.test(helpView), 'the help page draws the linked tool’s own icon');
}

console.log('\n=== gradient ids stay unique on a page ===');
{
  const html = render([getToolIcon('protect'), getToolIcon('protect'), getCategoryIcon('secure')].map((n, i) => h('span', { key: i }, n as never)));
  const ids = [...html.matchAll(/<linearGradient id="([^"]+)"/g)].map((m) => m[1]!).filter((id) => id.startsWith('tg'));
  check(ids.length >= 5 && new Set(ids).size === ids.length, `three icons on one page define ${ids.length} gradients with distinct ids`);
  const refs = [...html.matchAll(/url\(#(tg[^)]+)\)/g)].map((m) => m[1]!);
  check(refs.length > 0 && refs.every((r) => ids.includes(r)), 'every fill points at a gradient defined in the same page');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
