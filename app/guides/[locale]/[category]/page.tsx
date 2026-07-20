import Link from 'next/link';
import type { Metadata } from 'next';
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
  'merge-pdf': {
    pl: 'Łączenie PDF', en: 'Merge PDF', de: 'PDF-Zusammenfügung',
    es: 'Combinar PDF', fr: 'Fusionner PDF', it: 'Unire PDF',
    pt: 'Unir PDF', sv: 'Slå ihop PDF', no: 'Slå sammen PDF',
    is: 'Sameina PDF', tr: 'PDF Birleştirme', ar: 'دمج PDF',
    fa: 'ادغام PDF', hi: 'PDF मर्ज करें', ja: 'PDF結合', zh: '合并PDF',
  },
  'split-pdf': {
    pl: 'Dzielenie PDF', en: 'Split PDF', de: 'PDF-Teilung',
    es: 'Dividir PDF', fr: 'Diviser PDF', it: 'Dividere PDF',
    pt: 'Dividir PDF', sv: 'Dela PDF', no: 'Dele PDF',
    is: 'Skipta PDF', tr: 'PDF Bölme', ar: 'تقسيم PDF',
    fa: 'تقسیم PDF', hi: 'PDF विभाजित करें', ja: 'PDF分割', zh: '拆分PDF',
  },
  'protect-pdf': {
    pl: 'Zabezpieczanie PDF', en: 'Protect PDF', de: 'PDF-Schutz',
    es: 'Proteger PDF', fr: 'Protéger PDF', it: 'Proteggere PDF',
    pt: 'Proteger PDF', sv: 'Skydda PDF', no: 'Beskytt PDF',
    is: 'Vernda PDF', tr: 'PDF Koruma', ar: 'حماية PDF',
    fa: 'محافظت از PDF', hi: 'PDF सुरक्षित करें', ja: 'PDF保護', zh: '保护PDF',
  },
  'unlock-pdf': {
    pl: 'Odblokowywanie PDF', en: 'Unlock PDF', de: 'PDF-Entsperrung',
    es: 'Desbloquear PDF', fr: 'Déverrouiller PDF', it: 'Sbloccare PDF',
    pt: 'Desbloquear PDF', sv: 'Lås upp PDF', no: 'Lås opp PDF',
    is: 'Opna PDF', tr: 'PDF Kilidini Aç', ar: 'فتح قفل PDF',
    fa: 'باز کردن قفل PDF', hi: 'PDF अनलॉक करें', ja: 'PDFロック解除', zh: '解锁PDF',
  },
  'pdf-to-word': {
    pl: 'PDF do Worda', en: 'PDF to Word', de: 'PDF zu Word',
    es: 'PDF a Word', fr: 'PDF vers Word', it: 'PDF in Word',
    pt: 'PDF para Word', sv: 'PDF till Word', no: 'PDF til Word',
    is: 'PDF í Word', tr: 'PDF\'den Word\'e', ar: 'PDF إلى Word',
    fa: 'PDF به Word', hi: 'PDF से Word', ja: 'PDFからWordへ', zh: 'PDF转Word',
  },
  'jpg-to-pdf': {
    pl: 'JPG do PDF', en: 'JPG to PDF', de: 'JPG zu PDF',
    es: 'JPG a PDF', fr: 'JPG en PDF', it: 'JPG in PDF',
    pt: 'JPG para PDF', sv: 'JPG till PDF', no: 'JPG til PDF',
    is: 'JPG í PDF', tr: 'JPG\'den PDF\'ye', ar: 'JPG إلى PDF',
    fa: 'JPG به PDF', hi: 'JPG से PDF', ja: 'JPGからPDFへ', zh: 'JPG转PDF',
  },
};

const categoryTool: Record<string, import('@/types/guide').ToolSlug> = {
  'compress-pdf': 'compress',
  'merge-pdf': 'merge',
  'split-pdf': 'split',
  'protect-pdf': 'protect',
  'unlock-pdf': 'unlock',
  'pdf-to-word': 'word',
  'jpg-to-pdf': 'jpgTopdf',
};

function getCategoryLabel(category: string, locale: Locale): string {
  return categoryLabels[category]?.[locale] || category;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string }> }): Promise<Metadata> {
  const { locale: localeSegment, category } = await params;
  const locale = localeFromSegment(localeSegment) as Locale;
  const label = getCategoryLabel(category, locale);
  return {
    title: label,
    description: t('guides.hub_subtitle', locale),
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
