// Audit finding (Medium, ui area) — components/Breadcrumbs.tsx derived the label for any
// segment it didn't recognize (guide category slugs, guide article slugs) mechanically from
// the URL: capitalize the first letter, replace dashes with spaces. A French or German user
// browsing a guide saw literal untranslated text like "Merge pdf" (the audit's own cited
// example — the guide category segment) regardless of their locale, and the article-title
// segment had the exact same defect for a different reason (deriving from the article slug
// instead of the real GuideArticle.title).
//
// Fixed two ways:
//   1. Guide category slugs ("merge-pdf", "split-pdf", "compress-pdf", ...) follow a
//      "-pdf"-suffixed convention distinct from the shorter tool-page slugs they correspond
//      to ("merge", "split", "compress") — the existing tool-slug lookup now also tries the
//      suffix-stripped slug, confirmed against every category directory currently in
//      content/guides.
//   2. The final article-slug segment now resolves the real GuideArticle.title for the
//      current locale (loaded via a dynamic import of lib/guides, so this site-wide component
//      doesn't bundle all guide content into every page's JS), falling back to the old
//      slug-derived label immediately while that resolves.
//
// Verified live in the browser for both categories (merge-pdf needs suffix-stripping,
// unlock-pdf matches directly) — this test checks the underlying data the fix depends on:
// every current guide category resolves to a real tool translation, and confirms the tool
// registry doesn't already have a "-pdf"-suffixed slug that could conflict with this fallback.

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { keyBySlug } from '../lib/tools';
import { t, locales } from '../lib/i18n';
import { getAllArticles } from '../lib/guides';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== Breadcrumbs: guide category and article segments resolve to real translations ===');

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

console.log('--- source check: Breadcrumbs.tsx actually wires up both fixes (not just data-side proof) ---');
const breadcrumbsSrc = readFileSync(join(root, 'components', 'Breadcrumbs.tsx'), 'utf-8');
check(breadcrumbsSrc.includes("keyBySlug[seg] || keyBySlug[seg.replace(/-pdf$/, '')]"), 'the tool-key lookup falls back to the "-pdf"-suffix-stripped slug for guide categories');
check(breadcrumbsSrc.includes("await import('@/lib/guides')"), 'guide article data is loaded via a dynamic import (not bundled into every page)');
check(breadcrumbsSrc.includes('guideTitles[seg]'), 'the render path actually reads the resolved guide title before falling back to the slug-derived label');
const guideCategories = readdirSync(join(root, 'content', 'guides'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

check(guideCategories.length > 0, `sanity: found guide categories (${guideCategories.join(', ')})`);

for (const category of guideCategories) {
  const key = keyBySlug[category] || keyBySlug[category.replace(/-pdf$/, '')];
  check(!!key, `[${category}] resolves to a real tool key (direct or "-pdf"-suffix-stripped) — got "${key}"`);
  if (key) {
    const label = t(`tool.${key}`, 'pl');
    check(label !== `tool.${key}` && label !== category, `[${category}] Polish label is a real translation, not a fallback or the raw slug (got "${label}")`);
  }
}

// The fallback must never accidentally shadow a REAL, intentionally "-pdf"-suffixed tool
// slug that has its own distinct meaning from the stripped version (there are none today,
// but this guards against silently breaking one added later).
console.log('\n--- sanity: stripping "-pdf" from a guide category never collides with an unrelated real tool slug ---');
for (const category of guideCategories) {
  const stripped = category.replace(/-pdf$/, '');
  if (stripped === category) continue; // no suffix to strip
  const directKey = keyBySlug[category];
  const strippedKey = keyBySlug[stripped];
  if (directKey && strippedKey) {
    check(directKey === strippedKey, `[${category}] if both the exact slug and the stripped slug exist as real tools, they must be the SAME tool (got direct="${directKey}", stripped="${strippedKey}")`);
  } else {
    check(true, `[${category}] only one of "${category}"/"${stripped}" exists as a tool slug — no ambiguity`);
  }
}

console.log('\n--- guide articles have real, locale-distinct titles for the async-resolved breadcrumb ---');
const articles = getAllArticles();
check(articles.length > 0, `sanity: found guide articles (${articles.length})`);
for (const article of articles.slice(0, 3)) {
  const plTitle = article.title.pl;
  const enTitle = article.title.en;
  check(!!plTitle && plTitle.length > 0, `[${article.slug}] has a non-empty Polish title`);
  check(plTitle !== article.slug, `[${article.slug}] Polish title is a real translation, not the raw slug`);
  check(plTitle !== enTitle, `[${article.slug}] Polish and English titles actually differ (pl="${plTitle}", en="${enTitle}")`);
}

check(locales.includes('pl' as (typeof locales)[number]), 'sanity: pl is a configured locale');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
