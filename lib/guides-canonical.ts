import type { Locale } from '@/lib/i18n';
import type { GuideArticle } from '@/types/guide';
import { getLocaleSegment } from '@/lib/guides-slugs';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://optimapdf.com';

export function buildCanonicalUrl(article: GuideArticle, locale: Locale): string {
  if (article.canonicalOverride?.[locale]) {
    return article.canonicalOverride[locale]!;
  }
  const segment = getLocaleSegment(locale);
  return `${BASE}/${segment}/${article.category}/${article.slug}`;
}
