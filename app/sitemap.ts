import type { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { localeGuidesSlug } from '@/lib/guides-slugs';
import guides from '@/content/guides';
import { buildCanonicalUrl } from '@/lib/guides-canonical';
import { tools, toolPath } from '@/lib/tools';

// Every info page that exists under app/[locale]/ (the unprefixed /privacy etc. only 307-redirect
// to a locale by Accept-Language — see proxy.ts — so they must not be listed).
const infoPages = ['privacy', 'faq', 'help', 'rodo', 'security', 'terms', 'wsparcie', 'nasze-zasady'];

/** hreflang map for /{locale}/{path}: every locale plus x-default → English, matching lib/metadata.ts. */
function localeAlternates(base: string, path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = base + '/' + l + (path ? '/' + path : '');
  languages['x-default'] = base + '/en' + (path ? '/' + path : '');
  return languages;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://optimapdf.com';

  // Canonical, locale-prefixed URLs only. lastModified is omitted where no real modification date
  // exists: stamping every URL with the build time tells crawlers that all pages changed on every
  // deploy, which teaches them to ignore the field.
  const pages: MetadataRoute.Sitemap = [];
  const addLocalized = (path: string, changeFrequency: 'weekly', priority: number) => {
    for (const locale of locales) {
      pages.push({
        url: base + '/' + locale + (path ? '/' + path : ''),
        changeFrequency,
        priority,
        alternates: { languages: localeAlternates(base, path) },
      });
    }
  };
  addLocalized('', 'weekly', 1.0);
  for (const t of tools.filter(t => !t.disabled)) addLocalized(toolPath(t.key).slice(1), 'weekly', 0.8);
  for (const p of infoPages) addLocalized(p, 'weekly', 0.5);

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
