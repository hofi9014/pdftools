import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { locales, t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { getCategoryLabel, categoryTool } from '@/lib/guide-categories';
import { localeFromSegment, getLocaleSegment } from '@/lib/guides-slugs';
import { getArticlesByCategory, getAllCategories } from '@/lib/guides';
import CTATool from '@/components/guides/CTATool';
import { socialMetadata, fullTitle } from '@/lib/metadata';




export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string }> }): Promise<Metadata> {
  const { locale: localeSegment, category } = await params;
  const locale = localeFromSegment(localeSegment) as Locale;
  const label = getCategoryLabel(category, locale);
  const description = t('guides.hub_subtitle', locale);
  const url = (l: Locale) => `https://optimapdf.com/guides/${getLocaleSegment(l)}/${category}`;
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = url(l);
  languages['x-default'] = url('en');
  return {
    title: label,
    description,
    alternates: { canonical: url(locale), languages },
    ...socialMetadata({ locale, title: fullTitle(label), description, url: url(locale) }),
  };
}

export async function generateStaticParams() {
  const { getAllCategories } = await import('@/lib/guides');
  const categories = getAllCategories();
  const params: { locale: string; category: string }[] = [];
  for (const locale of locales) {
    for (const cat of categories) {
      params.push({ locale: getLocaleSegment(locale), category: cat });
    }
  }
  return params;
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale: localeSegment, category } = await params;
  const locale = localeFromSegment(localeSegment) as Locale;
  // FINDING (2026-09-23) — same class of bug as the sibling [slug] article page: an unrecognized
  // category previously rendered a normal 200 "no articles" page (getCategoryLabel() even falls
  // back to echoing the raw, invalid category string as the page's own <h1>), instead of a real
  // 404. getAllCategories() is the definitive list derived from actual guide content, so any
  // category not in it can never have articles — checking it directly (rather than inferring
  // invalidity from an empty articles array) is also correct if that ever changes.
  if (!getAllCategories().includes(category)) notFound();
  const articles = getArticlesByCategory(category);
  const tool = categoryTool[category];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link
        href={`/guides/${getLocaleSegment(locale)}`}
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        {t('guides.back_to_all', locale)}
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {getCategoryLabel(category, locale)}
      </h1>

      {tool && (
        <div className="mb-8">
          <CTATool tool={tool} locale={locale} />
        </div>
      )}

      <div className="grid gap-4">
        {articles.map(article => (
          <Link
            key={article.slug}
            href={`/guides/${getLocaleSegment(locale)}/${category}/${article.slug}`}
            className="block p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition"
          >
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
              {(article.title as Record<string, string>)[locale] || article.title.en}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {(article.excerpt as Record<string, string>)[locale] || article.excerpt.en}
            </p>
          </Link>
        ))}
      </div>

      {articles.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          {t('guides.no_articles', locale)}
        </p>
      )}
    </div>
  );
}
