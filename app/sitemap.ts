import type { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { localeGuidesSlug } from '@/lib/guides-slugs';
import guides from '@/content/guides';
import { buildCanonicalUrl } from '@/lib/guides-canonical';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://optimapdf.com';

  const pages: MetadataRoute.Sitemap = [
    '', '/merge', '/split', '/compress', '/pdf-to-word', '/word-to-pdf',
    '/jpg-to-pdf', '/protect-pdf', '/unlock-pdf', '/rotate-pdf',
    '/page-numbers', '/watermark-pdf', '/ocr-pdf', '/extract-pages', '/delete-pages',
    '/reorder-pages', '/crop-pdf', '/add-page', '/edit-pdf', '/metadata', '/openoffice-to-pdf', '/sign-pdf',
    '/pdf-to-openoffice', '/pdf-to-excel', '/ai-chat', '/ai-summary', '/privacy',
    '/pdf-to-powerpoint', '/compare-pdf', '/excel-to-pdf', '/pdf-to-txt',
    '/html-to-pdf', '/url-to-pdf', '/pdf-to-html', '/flatten-pdf',
    '/pdf-to-svg', '/redact-pdf', '/pdf-to-epub', '/ai-translate', '/fill-form', '/pdf-to-images', '/to-pdfa', '/faq', '/help', '/rodo', '/security',
  ].map(path => ({
    url: base + path,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1.0 : 0.8,
  }));

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
