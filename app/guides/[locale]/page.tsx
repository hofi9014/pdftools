import Link from 'next/link';
import type { Metadata } from 'next';
import { locales, t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { getCategoryLabel } from '@/lib/guide-categories';
import { localeFromSegment, getLocaleSegment } from '@/lib/guides-slugs';
import { getAllArticles, getAllCategories } from '@/lib/guides';
import type { GuideArticle } from '@/types/guide';
import { socialMetadata, fullTitle } from '@/lib/metadata';



export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: localeSegment } = await params;
  const locale = localeFromSegment(localeSegment) as Locale;
  const title = t('guides.hub_title', locale);
  const description = t('guides.hub_subtitle', locale);
  const url = (l: Locale) => `https://optimapdf.com/guides/${getLocaleSegment(l)}`;
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = url(l);
  languages['x-default'] = url('en');
  return {
    // The hub is in the same segment as the guides root layout, whose title template does not
    // reach it — so the full title is given here (it read "Anleitungen", not "… | OptimaPDF").
    title: { absolute: fullTitle(title) },
    description,
    alternates: { canonical: url(locale), languages },
    ...socialMetadata({ locale, title: fullTitle(title), description, url: url(locale) }),
  };
}

export async function generateStaticParams() {
  return locales.map(locale => ({ locale: getLocaleSegment(locale) }));
}

export default async function GuidesHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeSegment } = await params;
  const locale = localeFromSegment(localeSegment) as Locale;
  const categories = getAllCategories();
  const articles = getAllArticles();
  const articlesByCategory = new Map<string, GuideArticle[]>();
  for (const a of articles) {
    const list = articlesByCategory.get(a.category) || [];
    list.push(a);
    articlesByCategory.set(a.category, list);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {t('guides.hub_title', locale)}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-10">
        {t('guides.hub_subtitle', locale)}
      </p>

      {categories.map(cat => {
        const catArticles = articlesByCategory.get(cat) || [];
        return (
          <section key={cat} className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
              <Link href={`/guides/${getLocaleSegment(locale)}/${cat}`} className="hover:text-blue-600 transition">
                {getCategoryLabel(cat, locale)}
              </Link>
            </h2>
            <div className="grid gap-4">
              {catArticles.map(article => (
                <Link
                  key={article.slug}
                  href={`/guides/${getLocaleSegment(locale)}/${cat}/${article.slug}`}
                  className="block p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition"
                >
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    {(article.title as Record<string, string>)[locale] || article.title.en}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {(article.excerpt as Record<string, string>)[locale] || article.excerpt.en}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
