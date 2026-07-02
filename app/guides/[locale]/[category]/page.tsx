import Link from 'next/link';
import { locales, t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { localeFromSegment, getLocaleSegment } from '@/lib/guides-slugs';
import { getArticlesByCategory } from '@/lib/guides';
import CTATool from '@/components/guides/CTATool';

const categoryLabels: Record<string, Record<Locale, string>> = {
  'compress-pdf': {
    pl: 'Kompresja PDF', en: 'Compress PDF', de: 'PDF-Komprimierung',
    es: 'Comprimir PDF', fr: 'Compresser PDF', it: 'Comprimere PDF',
    pt: 'Comprimir PDF', sv: 'Komprimera PDF', no: 'Komprimere PDF',
    is: 'Þjappa PDF', tr: 'PDF Sıkıştırma', ar: 'ضغط PDF',
    fa: 'فشرده‌سازی PDF', hi: 'PDF संपीड़न', ja: 'PDF圧縮', zh: '压缩PDF',
  },
};

const categoryTool: Record<string, import('@/types/guide').ToolSlug> = {
  'compress-pdf': 'compress',
};

function getCategoryLabel(category: string, locale: Locale): string {
  return categoryLabels[category]?.[locale] || category;
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
  const articles = getArticlesByCategory(category);
  const tool = categoryTool[category];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link
        href={`/${getLocaleSegment(locale)}`}
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        ← {t('guides.back_to_all', locale)}
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
            href={`/${getLocaleSegment(locale)}/${category}/${article.slug}`}
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
