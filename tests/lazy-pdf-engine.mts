// The PDF engine is not part of a tool page's own JavaScript (plan 1.4, 2026-11-12).
//
// Before: every tool page imported lib/client-pdf.ts (pdf-lib, fontkit, the converters) and a few
// imported jszip, the xlsx/pptx writers, the Office converters and the editor statically — about
// 620-790 kB extra in each tool page's initial scripts, and, because the header links to every
// tool, prefetched on every page of the site. Breadcrumbs, rendered on every page, also fetched
// all guides in 16 languages (636 kB) to look up one article title.
//
// This test checks the source: pages and components reach the engine only through
// lib/client-pdf-lazy.ts, the facade forwards to real engine functions, every page using it warms
// it up when idle, and the guides are only loaded on guide article pages. The built-site effect is
// measured by e2e/initial-js-weight.mts.
//
// Run: npx tsx tests/lazy-pdf-engine.mts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) fails++; };

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mts)$/.test(n) ? [p] : [];
  });
}
const files = ['app', 'components', 'hooks'].flatMap(walk);
const src = (p: string) => readFileSync(p, 'utf8');

// 1. No static import of the engine or of the heavy modules from pages, components or hooks.
const HEAVY = [
  "'@/lib/client-pdf'", "'jszip'", "'@/lib/client-pdf-docx'", "'@/lib/client-pptx'",
  "'@/lib/office-document-to-pdf'", "'@/components/edit-pdf/PdfEditor'", "'pdf-lib'", "'pdfjs-dist'",
];
const staticImports: string[] = [];
for (const f of files) {
  for (const m of src(f).matchAll(/^import\s+(?!type\b)[\s\S]*?\s+from\s+('[^']+');/gm)) {
    if (HEAVY.includes(m[1]!)) staticImports.push(`${f} ← ${m[1]}`);
  }
}
check(staticImports.length === 0, `no static import of the PDF engine or heavy modules in app/, components/, hooks/${staticImports.length ? ': ' + staticImports.join(', ') : ''}`);

// 2. The facade forwards to functions that really exist in the engine (by name).
const lazy = src('lib/client-pdf-lazy.ts');
const engine = src('lib/client-pdf.ts');
const forwarded = [...lazy.matchAll(/^export const (\w+) = lazy\('(\w+)'\);/gm)];
check(forwarded.length >= 40, `facade forwards ${forwarded.length} engine functions`);
const badName = forwarded.filter(([, a, b]) => a !== b);
check(badName.length === 0, 'every facade export has the same name as the engine function it calls');
const missing = forwarded.filter(([, , n]) => !new RegExp(`export async function ${n}\\b`).test(engine));
check(missing.length === 0, `every forwarded name is an async engine function${missing.length ? ': ' + missing.map((m) => m[2]).join(', ') : ''}`);

// 3. Everything a page/component imports from the facade is exported by it.
const exported = new Set([
  ...forwarded.map((m) => m[1]!),
  ...[...lazy.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]!),
  ...[...lazy.matchAll(/^export (?:type )?\{([^}]*)\}/gm)].flatMap((m) => m[1]!.split(',').map((s) => s.trim())),
]);
const users = files.filter((f) => src(f).includes("from '@/lib/client-pdf-lazy'"));
check(users.length >= 38, `${users.length} pages/components use the facade`);
const unknown: string[] = [];
for (const f of users) {
  const m = src(f).match(/import \{([^}]*)\} from '@\/lib\/client-pdf-lazy'/);
  for (const raw of m?.[1]?.split(',') ?? []) {
    const name = raw.trim().replace(/^type\s+/, '');
    if (name && !exported.has(name)) unknown.push(`${f}: ${name}`);
  }
}
check(unknown.length === 0, `every imported facade name exists${unknown.length ? ': ' + unknown.join(', ') : ''}`);

// 4. The facade loads the engine only on demand, and preloading does not pull pdf.js along.
check(/import\('\.\/client-pdf'\)/.test(lazy) && !/^import\s+(?!type\b).*from '\.\/client-pdf'/m.test(lazy),
  'facade imports the engine dynamically only');
check(!/initPdfjs\(\)/.test(lazy.slice(lazy.indexOf('function preloadPdfEngine'), lazy.indexOf('type Lazy'))),
  'preloadPdfEngine does not start pdf.js (~420 kB the page never fetched up front before)');

// 5. Every tool page that uses the engine warms it up when idle (offline use after one visit).
const toolPages = readdirSync('app/(unprefixed)').map((d) => join('app/(unprefixed)', d, 'page.tsx'))
  .filter((p) => { try { return statSync(p).isFile(); } catch { return false; } });
const needsPreload = toolPages.filter((p) => /client-pdf-lazy|import\('@\/lib\/office-document-to-pdf'\)|edit-pdf\/PdfEditor/.test(src(p)));
const noPreload = needsPreload.filter((p) => !/useIdlePreload\((preloadPdfEngine|preloadTool)\)/.test(src(p)));
check(needsPreload.length >= 38, `${needsPreload.length} tool pages load an engine`);
check(noPreload.length === 0, `each of them calls useIdlePreload${noPreload.length ? ' — missing: ' + noPreload.join(', ') : ''}`);
// The preload is a module-level function (a new function each render would re-run the effect).
const inlinePreload = needsPreload.filter((p) => /useIdlePreload\(\(\)/.test(src(p)));
check(inlinePreload.length === 0, 'preload functions are module-level, not created per render');

// 6. Breadcrumbs loads the guides only on a guide article address.
const { isGuideArticlePath } = await import('../components/Breadcrumbs');
check(isGuideArticlePath(['guides', 'przewodnik', 'compress-pdf', 'how-to-compress-pdf-online']), 'article address → titles looked up');
for (const segs of [['pl', 'merge'], ['pl'], ['guides', 'przewodnik'], ['guides', 'przewodnik', 'compress-pdf'], ['pl', 'faq']]) {
  check(!isGuideArticlePath(segs), `/${segs.join('/')} → guides not loaded`);
}
const bc = src('components/Breadcrumbs.tsx');
check(/if \(!onGuideArticle\) return;/.test(bc), 'the effect returns before importing the guides on other pages');

console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PASS');
process.exit(fails ? 1 : 0);
