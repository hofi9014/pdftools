import Link from 'next/link';
import type { Metadata } from 'next';
import { locales, t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { localeFromSegment, getLocaleSegment } from '@/lib/guides-slugs';
import { getArticle, getAllArticles } from '@/lib/guides';
import { buildCanonicalUrl } from '@/lib/guides-canonical';
import ContentBlockRenderer from '@/components/guides/ContentBlockRenderer';
import CTATool from '@/components/guides/CTATool';
import { validateGuides } from '@/lib/guides-validate';

if (process.env.NODE_ENV === 'production') {
  const { errors } = validateGuides();
  if (errors > 0) {
    throw new Error(`Guide validation failed with ${errors} error(s)`);
  }
}

export async function generateStaticParams() {
  const articles = getAllArticles();
  const params: { locale: string; category: string; slug: string }[] = [];
  for (const locale of locales) {
    for (const article of articles) {
      params.push({
        locale: getLocaleSegment(locale),
        category: article.category,
        slug: article.slug,
      });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string; slug: string }> }): Promise<Metadata> {
  const { locale: localeSegment, category, slug } = await params;
  const locale = localeFromSegment(localeSegment) as Locale;
  const article = getArticle(category, slug);
  if (!article) return {};

  const title = (article.title as Record<string, string>)[locale] || article.title.en;
  const description = (article.excerpt as Record<string, string>)[locale] || article.excerpt.en;
  const canonical = buildCanonicalUrl(article, locale);

  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = buildCanonicalUrl(article, l as Locale);
  }

  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'OptimaPDF',
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; category: string; slug: string }>;
}) {
  const { locale: localeSegment, category, slug } = await params;
  const locale = localeFromSegment(localeSegment) as Locale;
  const article = getArticle(category, slug);

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          {t('guides.article_not_found', locale)}
        </h1>
        <Link href={`/guides/${getLocaleSegment(locale)}`} className="text-blue-600 hover:underline mt-4 inline-block">
          {t('guides.all_guides', locale)}
        </Link>
      </div>
    );
  }

  const title = (article.title as Record<string, string>)[locale] || article.title.en;
  const steps = article.body.filter((b): b is { type: 'step'; title: import('@/types/guide').LocalizedString; text: import('@/types/guide').LocalizedString } => b.type === 'step');
  const canonical = buildCanonicalUrl(article, locale);

  const howToSchema = steps.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description: (article.excerpt as Record<string, string>)[locale] || article.excerpt.en,
    image: 'https://optimapdf.com/icon-512.svg',
    estimatedCost: { '@type': 'MonetaryAmount', currency: locale === 'pl' ? 'PLN' : 'USD', value: '0' },
    supply: { '@type': 'HowToSupply', name: locale === 'pl' ? 'Plik PDF' : 'PDF file' },
    tool: { '@type': 'HowToTool', name: 'OptimaPDF' },
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: (s.title as Record<string, string>)[locale] || s.title.en,
      text: (s.text as Record<string, string>)[locale] || s.text.en,
    })),
    inLanguage: locale,
  } : null;

  const faqSchema = article.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faq.map(f => ({
      '@type': 'Question',
      name: (f.q as Record<string, string>)[locale] || f.q.en,
      acceptedAnswer: {
        '@type': 'Answer',
        text: (f.a as Record<string, string>)[locale] || f.a.en,
      },
    })),
  } : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'OptimaPDF', item: 'https://optimapdf.com/' },
              { '@type': 'ListItem', position: 2, name: t('guides.breadcrumb', locale), item: `https://optimapdf.com/guides/${getLocaleSegment(locale)}` },
              { '@type': 'ListItem', position: 3, name: title, item: canonical },
            ],
          }),
        }}
      />
      {howToSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      )}
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      <Link
        href={`/guides/${getLocaleSegment(locale)}/${category}`}
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        {t('guides.back_to_category', locale)}
      </Link>

      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">{title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('guides.published', locale)}: {article.publishedAt}
            {article.updatedAt !== article.publishedAt && (
              <> · {t('guides.updated', locale)}: {article.updatedAt}</>
            )}
          </p>
        </header>

        <div className="prose dark:prose-invert max-w-none">
          <ContentBlockRenderer blocks={article.body} locale={locale} />
        </div>

        {article.faq.length > 0 && (
          <section className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">
              {t('guides.faq_title', locale)}
            </h2>
            <div className="space-y-4">
              {article.faq.map((faq, i) => (
                <details key={i} className="group rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <summary className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition list-none flex items-center justify-between">
                    <span>{(faq.q as Record<string, string>)[locale] || faq.q.en}</span>
                    <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <div className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                    {(faq.a as Record<string, string>)[locale] || faq.a.en}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </article>

      {article.relatedTool && (
        <div className="mt-8">
          <CTATool tool={article.relatedTool} locale={locale} />
        </div>
      )}
    </div>
  );
}
