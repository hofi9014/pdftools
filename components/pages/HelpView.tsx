'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import type { LocaleContent, helpData as helpDataType } from '@/content/pages/help';

function lc(locale: string, obj: LocaleContent): string {
  return obj[locale] || obj['en'] || '';
}

// The page text arrives as a prop: one language on /{locale}/help, all of them on /help.
export default function HelpView({ locale: forcedLocale, helpData }: { locale?: Locale; helpData: typeof helpDataType }) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const isRtl = locale === 'ar' || locale === 'fa';
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['general']));
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleItem = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center mb-12">
        <div className="text-5xl mb-4">🆘</div>
        <h1 className="text-3xl sm:text-4xl font-bold tool-heading mb-3">
          {t('help.title', locale)}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
          {t('help.subtitle', locale)}
        </p>
      </div>

      <div className="space-y-4">
        {helpData.map(cat => (
          <div key={cat.key} className="tool-card rounded-2xl border overflow-hidden">
            <button
              onClick={() => toggleSection(cat.key)}
              className="w-full flex items-center justify-between px-6 py-4 text-left transition hover:bg-[var(--coffee-surface-hover)]"
            >
              <span className="font-bold text-base" style={{ color: 'var(--coffee-text)' }}>
                {cat.icon} {lc(locale, cat.label)}
              </span>
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${openSections.has(cat.key) ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--coffee-text-tertiary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openSections.has(cat.key) && (
              <div className="border-t" style={{ borderColor: 'var(--coffee-border)' }}>
                {cat.items.map(item => (
                  <div key={item.key}>
                    <button
                      onClick={() => toggleItem(item.key)}
                      className="w-full flex items-center justify-between px-6 py-3.5 text-left transition hover:bg-[var(--coffee-surface-hover)] gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg shrink-0">{item.icon}</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--coffee-text-secondary)' }}>
                          {lc(locale, item.q)}
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ${openItems.has(item.key) ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--coffee-text-tertiary)' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {openItems.has(item.key) && (
                      <div className="px-6 pb-4" style={{ backgroundColor: 'var(--coffee-accent-soft)' }}>
                        <div className="pt-3 pb-2 text-sm leading-relaxed" style={{ color: 'var(--coffee-text)' }}>
                          {lc(locale, item.a)}
                        </div>
                        {item.href !== '#' && (
                          <Link
                            href={item.href}
                            className="inline-flex items-center gap-1 text-sm font-medium transition hover:underline"
                            style={{ color: 'var(--coffee-accent-ink)' }}
                          >
                            {t('help.open_tool', locale)} →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
