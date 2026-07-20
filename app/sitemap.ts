import type { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { localeGuidesSlug } from '@/lib/guides-slugs';
import guides from '@/content/guides';
import { buildCanonicalUrl } from '@/lib/guides-canonical';
import { tools, toolPath } from '@/lib/tools';

const infoPages = ['privacy', 'faq', 'help', 'rodo', 'security'];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://optimapdf.com';

  const pages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1.0 },
    ...tools.map(t => ({
      url: base + toolPath(t.key),
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8 as const,
    })),
    ...infoPages.map(p => ({
      url: base + '/' + p,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8 as const,
    })),
  ];

  // hub pages: /guides/{localeSegment}
  for (const locale of locales) {
    const segment = localeGuidesSlug[locale];
    const hreflang: Record<string, string> = {};
    for (const l of locales) {
      hreflang[l] = `${base}/guides/${localeGuidesSlug[l as Locale]}`;
    }
    pages.push({
      url: `${base}/guides/${segment}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: { languages: hreflang },
    });
  }

  // category pages: /guides/{localeSegment}/{category}
  for (const locale of locales) {
    for (const article of guides) {
      const segment = localeGuidesSlug[locale];
      const url = `${base}/guides/${segment}/${article.category}`;
      const hreflang: Record<string, string> = {};
      for (const l of locales) {
        hreflang[l] = `${base}/guides/${localeGuidesSlug[l as Locale]}/${article.category}`;
      }
      if (!pages.some(p => p.url === url)) {
        pages.push({
          url,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: { languages: hreflang },
        });
      }
    }
  }

  // article pages: /{localeSegment}/{category}/{slug}
  for (const article of guides) {
    const hreflang: Record<string, string> = {};
    for (const l of locales) {
      hreflang[l] = buildCanonicalUrl(article, l as Locale);
    }
    for (const locale of locales) {
      pages.push({
        url: buildCanonicalUrl(article, locale as Locale),
        lastModified: new Date(article.updatedAt),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: { languages: hreflang },
      });
    }
  }

  return pages;
}
