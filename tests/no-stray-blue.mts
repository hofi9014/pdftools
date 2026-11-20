// Tool pages use Tailwind blue utilities (selected option cards, progress bars, info panels);
// app/globals.css maps them to the site palette so ~40 pages follow the theme without edits.
// Until 2026-11-20 some were not mapped: the selected compression level was light blue
// (bg-blue-50), progress bars blue (bg-blue-500), info text blue (text-blue-700) — off-palette.
// This test lists every blue utility used in app/, components/ and lib/ and requires a rule in
// globals.css that overrides it. Run: npm run test:no-stray-blue
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

const files: string[] = [];
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(f)) files.push(p);
  }
};
for (const d of ['app', 'components', 'lib']) walk(d);

const used = new Set<string>();
for (const f of files) {
  for (const m of readFileSync(f, 'utf8').matchAll(/(?<![\w-])((?:[a-z]+:)*(?:bg|text|border)-blue-\d+(?:\/\d+)?)(?![\w-])/g)) used.add(m[1]!);
}
const css = readFileSync('app/globals.css', 'utf8');
// Tailwind's class selector for "dark:hover:bg-blue-900/30" is ".dark\:hover\:bg-blue-900\/30".
const selector = (cls: string) => '.' + cls.replace(/:/g, '\\:').replace(/\//g, '\\/');
check(used.size > 20, `${used.size} blue utilities found in the code`);
for (const cls of [...used].sort()) {
  // A rule counts when the escaped class appears in a selector followed by more selector text or "{".
  // and is not part of a compound selector (".border-dashed.bg-blue-50" covers drop zones only).
  const sel = selector(cls);
  let ok = false;
  for (let idx = css.indexOf(sel); idx >= 0 && !ok; idx = css.indexOf(sel, idx + 1)) {
    const before = idx > 0 ? css[idx - 1]! : '\n';
    const after = css[idx + sel.length] ?? '';
    ok = /[\s,]/.test(before) && /[\s,:{]/.test(after);
  }
  check(ok, `${cls} is mapped to the site palette`);
}
const blueHex = /#(?:eff6ff|dbeafe|3b82f6|2563eb|1d4ed8|1e40af|93c5fd|60a5fa)\b/i;
check(!blueHex.test(css), 'globals.css itself uses no Tailwind blue hex value');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
