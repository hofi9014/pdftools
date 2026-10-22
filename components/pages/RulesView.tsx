'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { homePath } from '@/lib/tools';
import type { content as contentType } from '@/content/pages/nasze-zasady';

// The page text arrives as a prop: one language on /{locale}/nasze-zasady, all of them on /nasze-zasady.
export default function RulesView({ locale: forcedLocale, content }: { locale?: Locale; content: typeof contentType }) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  // Safe: content always has an 'en' entry (defined below), used as the fallback default.
  const lang = content[locale] || content.en!;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">📋</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{lang.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{lang.subtitle}</p>
      </div>

      <div className="tool-card rounded-2xl border p-8 space-y-8 text-sm leading-relaxed" style={{ color: 'var(--coffee-text-secondary)' }}>
        {lang.sections.map((sec, i) => (
          <section key={i}>
            <h2 className="text-lg sm:text-xl font-bold tool-heading mb-3">{sec.h}</h2>
            {sec.pStart ? (
              <p>{sec.pStart}<Link href={`/${locale}/wsparcie`}>{sec.linkLabel}</Link>{sec.pEnd}</p>
            ) : (
              <p>{sec.p}</p>
            )}
          </section>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link href={homePath(locale)} className="!text-[var(--coffee-accent-ink)] hover:underline text-sm">
          {t('back.to_home', locale)}
        </Link>
      </div>
    </div>
  );
}
