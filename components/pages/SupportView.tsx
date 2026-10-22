'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import type { content as contentType } from '@/content/pages/wsparcie';

/* ------------------------------------------------------------------ */
/*  Skonfiguruj poniższe stałe przed wdrożeniem                       */
/* ------------------------------------------------------------------ */
/*                                                                      */
/*  UWAGA — link TESTOWY (tryb Sandbox Stripe). Zwróć uwagę na 'test_'  */
/*  w URL. Przed uruchomieniem prawdziwych wpłat ZASTĄP go linkiem     */
/*  produkcyjnym Stripe (bez 'test_').                                 */
/*                                                                      */
const STRIPE_DONATE_URL = 'https://buy.stripe.com/test_aFafZie8kb3OcUecDwgfu00';
const SUPPORTER_BADGE_URL = '/supporter-badge.svg';                   /* ← ścieżka do odznaki (opcjonalnie)    */
const IS_TEST_MODE = STRIPE_DONATE_URL.includes('test_');              /* ← automatycznie wykrywa tryb testowy   */
/* ------------------------------------------------------------------ */

// The page text arrives as a prop: one language on /{locale}/wsparcie, all of them on /wsparcie.
export default function SupportView({ locale: forcedLocale, content }: { locale?: Locale; content: typeof contentType }) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const lang = (content as Record<string, typeof content.pl>)[locale] || content.en;
  const isRtl = locale === 'ar' || locale === 'fa';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      {isRtl && (
        <style>{`
          .wsparcie-rtl ul { padding-right: 1.25rem; padding-left: 0; }
          .wsparcie-rtl ol { padding-right: 1.25rem; padding-left: 0; }
          .wsparcie-rtl { text-align: right; }
        `}</style>
      )}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">💬</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{lang.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{lang.subtitle}</p>
      </div>

      <div className={`tool-card rounded-2xl border p-8 space-y-8 text-sm leading-relaxed ${isRtl ? 'wsparcie-rtl' : ''}`} style={{ color: 'var(--coffee-text-secondary)' }}>
        {/* Donation section — prominent, at the top */}
        <section className="text-center pb-6 border-b" style={{ borderColor: 'var(--coffee-border)' }}>
          <h2 className="text-xl font-bold tool-heading mb-3">{lang.donateSection.h}</h2>
          <p className="mb-4 max-w-lg mx-auto">{lang.donateSection.p}</p>
          <a
            href={STRIPE_DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--coffee-accent-ink)', color: 'var(--coffee-on-accent)' }}
          >
            {lang.donateSection.button}
          </a>
          <p className="mt-2 text-xs" style={{ color: 'var(--coffee-text-tertiary)' }}>{lang.donateSection.note}</p>
          {IS_TEST_MODE && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide"
              style={{ backgroundColor: '#fef08a', color: '#854d0e', border: '1px solid #facc15' }}>
              ⚠️ TRYB TESTOWY (Stripe Sandbox)
            </div>
          )}
        </section>

        {/* Supporter badge info */}
        <section className="text-center">
          <h2 className="text-lg font-bold tool-heading mb-2">🏅 {lang.donateSection.badgeLabel}</h2>
          <p className="max-w-lg mx-auto">{lang.donateSection.badgeDesc}</p>
          {SUPPORTER_BADGE_URL && (
            <div className="mt-4 flex justify-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border" style={{ borderColor: 'var(--coffee-border)', backgroundColor: 'var(--coffee-badge-bg)' }}>
                <span>⭐</span> Supporter
              </span>
            </div>
          )}
        </section>

        {/* Other sections */}
        {lang.sections.map((sec, i) => (
          <section key={i} className="pt-2">
            <h2 className="text-lg sm:text-xl font-bold tool-heading mb-3">{sec.h}</h2>
            <p className="mb-2">{sec.p}</p>
            {sec.link && (
              <p>
                <a href={sec.link.startsWith('mailto:') ? sec.link : `/${locale}${sec.link}`} className="!text-[var(--coffee-accent-ink)] hover:underline font-medium">
                  {sec.linkText}
                </a>
              </p>
            )}
            {sec.items && (
              <ul className={`list-disc space-y-1.5 mt-2 ${isRtl ? 'pr-5' : 'pl-5'}`}>
                {sec.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link href={`/${locale}`} className="!text-[var(--coffee-accent-ink)] hover:underline text-sm">
          {t('back.to_home', locale)}
        </Link>
      </div>
    </div>
  );
}
