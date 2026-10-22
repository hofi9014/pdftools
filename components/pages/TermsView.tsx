'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { homePath } from '@/lib/tools';
import type { content as contentType } from '@/content/pages/terms';

// The page text arrives as a prop: one language on /{locale}/terms, all of them on /terms.
export default function TermsView({ locale: forcedLocale, content }: { locale?: Locale; content: typeof contentType }) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const lang = (locale === 'en' || !(locale in content)) ? 'en' : (locale as keyof typeof content);
  const data = content[lang] || content.en;
  const isRtl = locale === 'ar' || locale === 'fa';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <Link href={homePath(locale)} className="text-sm text-[var(--coffee-accent-ink)] hover:underline mb-4 inline-block">&larr; {t('back.to_home', locale)}</Link>
      <h1 className="text-3xl font-bold mb-2">{data.title}</h1>
      <p className="text-sm text-gray-500 mb-8">{data.updated}</p>
      {data.sections.map((s, i) => (
        <section key={i} className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{s.h}</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{s.p}</p>
        </section>
      ))}
    </div>
  );
}
