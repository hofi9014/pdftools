'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t, locales, type Locale } from '@/lib/i18n';
import { localeGuidesSlug, localeFromSegment } from '@/lib/guides-slugs';
import { keyBySlug } from '@/lib/tools';

const guidesLocaleSegments = new Set(Object.values(localeGuidesSlug));

export default function Breadcrumbs({ locale: forcedLocale }: { locale?: Locale }) {
  const pathname = usePathname();
  const locale = forcedLocale ?? useHydrationSafeLocale();
  const segments = pathname.split('/').filter(Boolean);

  // Guide article titles come from content/guides (lib/guides.ts), loaded dynamically —
  // not imported statically here — so this site-wide component (rendered on every page)
  // doesn't bundle all guide content for pages that never show one. Populated
  // asynchronously; the slug-derived fallback below renders immediately in the meantime.
  const [guideTitles, setGuideTitles] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { getAllArticles } = await import('@/lib/guides');
      if (cancelled) return;
      const articles = getAllArticles();
      const found: Record<string, string> = {};
      // Recomputed from `pathname` (already a dependency below) rather than closing over
      // the outer `segments` array, which is a fresh reference every render and would
      // otherwise force this effect to run on every re-render regardless of navigation.
      for (const seg of pathname.split('/').filter(Boolean)) {
        const article = articles.find(a => a.slug === seg);
        if (article) found[seg] = article.title[locale] || article.title.en;
      }
      setGuideTitles(found);
    })();
    return () => { cancelled = true; };
  }, [pathname, locale]);

  if (segments.length === 0) return null;

  const homeLabel = t('breadcrumb.home', locale);

  return (
    <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 pt-4 text-sm" style={{ color: 'var(--coffee-text-tertiary)' }}>
      <ol className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-xs sm:text-sm">
        <li>
          <Link href="/" className="hover:text-[var(--coffee-accent)] transition">{homeLabel}</Link>
        </li>
        {segments.map((seg, i) => {
          // skip locale segments (e.g. /pl/merge → skip "pl")
          if ((locales as readonly string[]).includes(seg)) return null;

          // Guide category slugs (content/guides/{category}) follow a "-pdf"-suffixed
          // naming convention distinct from the shorter tool-page slugs they correspond
          // to (e.g. "merge-pdf" for the "merge" tool, "split-pdf" for "split") — confirmed
          // against every category directory currently in content/guides. Falling back to
          // the suffix-stripped slug catches those without a separate category-name system.
          const key = keyBySlug[seg] || keyBySlug[seg.replace(/-pdf$/, '')];
          let label: string;
          if (key) {
            label = t(`tool.${key}`, locale);
          } else if (seg === 'guides') {
            // skip — the next segment is the locale segment
            return null;
          } else if (seg === 'guide') {
            label = t('nav.guide', locale);
          } else if (guidesLocaleSegments.has(seg)) {
            label = t('guides.breadcrumb', locale);
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
                <Link href={href} className="hover:text-[var(--coffee-accent)] transition" style={{ color: 'var(--coffee-text-tertiary)' }}>{label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
