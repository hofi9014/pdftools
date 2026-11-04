// The coffee cup in the home-page circle (components/HeroCoffeeCup.tsx) is decoration only:
// no text, not focusable, inside the aria-hidden illustration. The whole cup, saucer and steam
// must sit inside the 330 px circle (the circle clips anything past its edge, which is what made
// the first versions look cut off), and the steam must stay visible for people who turned off
// animations (the global reduced-motion rule ends every animation at once).
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const { default: HeroCoffeeCup } = await import('../components/HeroCoffeeCup');
const svg = renderToStaticMarkup(React.createElement(HeroCoffeeCup));

check('renders an svg with a 330×330 view box', /<svg[^>]*viewBox="0 0 330 330"/.test(svg));
check('the svg is not focusable', /<svg[^>]*focusable="false"/.test(svg));
check('the svg carries no text', svg.replace(/<[^>]*>/g, '').trim() === '');

// Every ellipse, mapped through the transforms of the groups that hold it, must lie inside the
// circle (centre 165,165, radius 165). Ellipses blurred by a filter may spill a little; the
// steam may rise 22 units when animated — both get their margin.
type M = { a: number; d: number; e: number; f: number };
const id: M = { a: 1, d: 1, e: 0, f: 0 };
const compose = (m: M, t: M): M => ({ a: m.a * t.a, d: m.d * t.d, e: m.e + m.a * t.e, f: m.f + m.d * t.f });
function parseTransform(s: string): M {
  let m = id;
  for (const [, op, args] of s.matchAll(/(translate|scale)\(([^)]*)\)/g)) {
    const n = args!.trim().split(/[\s,]+/).map(Number);
    m = compose(m, op === 'translate' ? { a: 1, d: 1, e: n[0]!, f: n[1] ?? 0 } : { a: n[0]!, d: n[1] ?? n[0]!, e: 0, f: 0 });
  }
  return m;
}
const body = svg.slice(svg.indexOf('</defs>'));
const stack: M[] = [id];
let worst = 0;
let worstWhat = '';
let ellipses = 0;
for (const [tag] of body.matchAll(/<\/?(g|ellipse)\b[^>]*>/g)) {
  if (tag.startsWith('</g')) { stack.pop(); continue; }
  const attr = (n: string) => tag.match(new RegExp(`\\b${n}="([^"]*)"`))?.[1];
  if (tag.startsWith('<g')) {
    const m = attr('transform') ? compose(stack.at(-1)!, parseTransform(attr('transform')!)) : stack.at(-1)!;
    if (!tag.endsWith('/>')) stack.push(m);
    continue;
  }
  ellipses++;
  const m = stack.at(-1)!;
  const [cx, cy, rx, ry] = ['cx', 'cy', 'rx', 'ry'].map((n) => Number(attr(n)));
  const blur = attr('filter') ? 6 : 0;
  const rise = (attr('class') ?? '').includes('hero-steam') ? 22 : 0;
  for (let deg = 0; deg < 360; deg += 3) {
    const r = (deg * Math.PI) / 180;
    const x = m.e + m.a * (cx! + (rx! + blur) * Math.cos(r));
    const y = m.f + m.d * (cy! + (ry! + blur) * Math.sin(r) - (Math.sin(r) < 0 ? rise : 0));
    const dist = Math.hypot(x - 165, y - 165);
    if (dist > worst) { worst = dist; worstWhat = `ellipse ${cx},${cy}`; }
  }
}
check('the drawing has its ellipses (saucer, cup, coffee, steam)', ellipses >= 20, `${ellipses}`);
check('the whole cup, saucer and steam fit inside the circle', worst <= 165, `farthest point ${worst.toFixed(1)} from the centre, ${worstWhat}`);

// Home page: inside the aria-hidden illustration, in a circle that clips.
const home = readFileSync('components/pages/HomeView.tsx', 'utf8');
const at = home.indexOf('<HeroCoffeeCup />');
const before = home.slice(0, at);
check('the home page renders the cup', at > 0);
check('…inside the aria-hidden illustration', before.lastIndexOf('aria-hidden="true"') > before.lastIndexOf('</div>\n          </div>'));
check('…in the round circle that clips it', /rounded-full overflow-hidden[^>]*>\s*$/.test(before));

// Steam: visible at rest (what reduced motion leaves on screen) in both themes.
const css = readFileSync('app/globals.css', 'utf8');
const rest = [...css.matchAll(/--steam-rest:\s*([\d.]+)/g)].map((m) => Number(m[1]));
check('steam has a resting opacity in light and dark mode', rest.length === 2, rest.join(', '));
check('…and it is visible in both', rest.every((v) => v >= 0.3));
check('steam takes its resting opacity outside the animation', /\.hero-steam\s*\{[^}]*opacity:\s*var\(--steam-rest\)/.test(css));
check('reduced motion ends animations instead of hiding them', /prefers-reduced-motion: reduce[\s\S]{0,200}animation-duration: 0\.01ms/.test(css));

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
