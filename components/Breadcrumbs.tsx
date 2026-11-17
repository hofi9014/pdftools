'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t, locales, type Locale } from '@/lib/i18n';
import { localeGuidesSlug, localeFromSegment } from '@/lib/guides-slugs';
import { keyBySlug, homePath } from '@/lib/tools';
import { categoryTool } from '@/lib/guide-category-tools';
import { resolveCategorySegment } from '@/lib/guide-category-urls';

const guidesLocaleSegments = new Set(Object.values(localeGuidesSlug));

// Info pages are not tools, so keyBySlug does not know them; without this their crumb was the raw
// slug ("Privacy", "Nasze zasady", "Wsparcie") in every language.
const infoPageLabel: Record<string, string> = {
  privacy: 'breadcrumb.privacy',
  rodo: 'rodo.link',
  security: 'security.link',
  terms: 'breadcrumb.terms',
  faq: 'faq.link',
  help: 'help.link',
  'nasze-zasady': 'nav.rules',
  wsparcie: 'nav.support',
  'where-your-file-goes': 'nav.upload_check',
};

/** usePathname() is percent-encoded (/guides/%D8%AF…), the slugs it is compared with are not. */
function pathSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean).map((seg) => {
    try { return decodeURIComponent(seg); } catch { return seg; }
  });
}

/** /guides/{hub}/{category}/{slug} — the only pages whose last crumb is a guide's title. */
export function isGuideArticlePath(segments: string[]): boolean {
  return segments[0] === 'guides' && segments.length === 4;
}

export default function Breadcrumbs({ locale: forcedLocale }: { locale?: Locale }) {
  const pathname = usePathname();
  const locale = forcedLocale ?? useHydrationSafeLocale();
  const segments = pathSegments(pathname);

  // Guide article titles come from content/guides (lib/guides.ts), loaded dynamically —
  // not imported statically here — so this site-wide component (rendered on every page)
  // doesn't bundle all guide content for pages that never show one. Populated
  // asynchronously; the slug-derived fallback below renders immediately in the meantime.
  // Only an article address (/guides/{hub}/{category}/{slug}) has a title to look up — measured
  // 2026-11-12: running this on every page fetched all guides in 16 languages (636 kB, 171 kB
  // brotli) on every page of the site.
  const [guideTitles, setGuideTitles] = useState<Record<string, string>>({});
  const onGuideArticle = isGuideArticlePath(segments);
  useEffect(() => {
    if (!onGuideArticle) return;
    let cancelled = false;
    (async () => {
      const [{ getAllArticles }, { resolveArticleSegment }] = await Promise.all([import('@/lib/guides'), import('@/lib/guide-urls')]);
      if (cancelled) return;
      // Recomputed from `pathname` (already a dependency below) rather than closing over
      // the outer `segments` array, which is a fresh reference every render and would
      // otherwise force this effect to run on every re-render regardless of navigation.
      // The address names the article in its own language (lib/guide-urls.ts) — resolve it.
      const [, hub, catSeg, artSeg] = pathSegments(pathname);
      const cat = resolveCategorySegment(localeFromSegment(hub!), catSeg!);
      const art = cat && resolveArticleSegment(localeFromSegment(hub!), cat.category, artSeg!);
      const article = cat && art ? getAllArticles().find(a => a.category === cat.category && a.slug === art.slug) : undefined;
      setGuideTitles(article ? { [artSeg!]: article.title[locale] || article.title.en } : {});
    })();
    return () => { cancelled = true; };
  }, [pathname, locale, onGuideArticle]);

  if (segments.length === 0) return null;

  const homeLabel = t('breadcrumb.home', locale);

  return (
    <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 pt-4 text-sm" style={{ color: 'var(--coffee-text-tertiary)' }}>
      <ol className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-xs sm:text-sm">
        <li>
          <Link href={homePath(locale)} className="hover:text-[var(--coffee-accent-ink)] transition">{homeLabel}</Link>
        </li>
        {segments.map((seg, i) => {
          // skip locale segments (e.g. /pl/merge → skip "pl")
          if ((locales as readonly string[]).includes(seg)) return null;

          // Guide category slugs (content/guides/{category}) follow a "-pdf"-suffixed
          // naming convention distinct from the shorter tool-page slugs they correspond
          // to (e.g. "merge-pdf" for the "merge" tool, "split-pdf" for "split") — confirmed
          // against every category directory currently in content/guides. Falling back to
          // the suffix-stripped slug catches those without a separate category-name system.
          // /guides/{segment}/…: the first segment is only the prefix, the second is always the
          // localized guides hub — decided by position, because two of those segments are
          // themselves "guides" (en) and "guide" (it) and were read as the prefix / the /guide page.
          const inGuides = segments[0] === 'guides';
          if (inGuides && i === 0) return null;
          // A guide category names its tool in lib/guide-category-tools.ts ("pdf-to-jpg" is the
          // "PDF to images" tool, which suffix-stripping could not find).
          // Since 2026-11-14 the category segment is in the page's language (lib/guide-category-urls.ts).
          const guideCategory = inGuides && i === 2 ? resolveCategorySegment(localeFromSegment(segments[1]!), seg)?.category : undefined;
          const key = (guideCategory && categoryTool[guideCategory]) || keyBySlug[seg] || keyBySlug[seg.replace(/-pdf$/, '')];
          let label: string;
          if (inGuides && i === 1) {
            label = t('guides.breadcrumb', locale);
          } else if (key) {
            label = t(`tool.${key}`, locale);
          } else if (seg === 'guide') {
            label = t('nav.guide', locale);
          } else if (guidesLocaleSegments.has(seg)) {
            label = t('guides.breadcrumb', locale);
          } else if (infoPageLabel[seg]) {
            label = t(infoPageLabel[seg], locale);
          } else if (guideTitles[seg]) {
            label = guideTitles[seg];
          } else {
            label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
          }
          const href = '/' + segments.slice(0, i + 1).join('/');
          const isLast = i === segments.length - 1;
          return (
            <li key={seg} className="flex items-center gap-1.5">
              <span style={{ color: 'var(--coffee-border-strong)' }}>/</span>
              {isLast ? (
                <span className="font-medium" style={{ color: 'var(--coffee-text)' }}>{label}</span>
              ) : (
                <Link href={href} className="hover:text-[var(--coffee-accent-ink)] transition" style={{ color: 'var(--coffee-text-tertiary)' }}>{label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
