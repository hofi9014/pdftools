import type { Locale } from '@/lib/i18n';
import type { GuideArticle } from '@/types/guide';
import { guideArticlePath } from '@/lib/guide-urls';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://optimapdf.com';

export function buildCanonicalUrl(article: GuideArticle, locale: Locale): string {
  if (article.canonicalOverride?.[locale]) {
    return article.canonicalOverride[locale]!;
  }
  return `${BASE}${guideArticlePath(locale, article.category, article.slug)}`;
}
