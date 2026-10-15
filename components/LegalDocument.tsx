'use client';
import Link from 'next/link';
import { t, isRtlLocale, type Locale } from '@/lib/i18n';
import { homePath } from '@/lib/tools';
import type { LegalDoc } from '@/lib/legal/types';

/**
 * One layout for the privacy policy, the GDPR information and the security page. The page's
 * <main> comes from the root layout, so this is a <div>: each of these pages used to open a
 * second <main> inside the first (two main landmarks, flagged by axe).
 */
export default function LegalDocument({ doc, icon, locale }: { doc: LegalDoc; icon: string; locale: Locale }) {
  const rtl = isRtlLocale(locale);
  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="text-center mb-10">
        <div className="text-5xl mb-4" aria-hidden="true">{icon}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{doc.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{doc.updated}</p>
      </div>

      <div className="tool-card rounded-2xl border p-8 space-y-8 text-sm leading-relaxed text-start" style={{ color: 'var(--coffee-text-secondary)' }}>
        {doc.intro && <p className="text-base leading-relaxed">{doc.intro}</p>}
        {doc.sections.map((sec, i) => (
          <section key={i}>
            <h2 className="text-lg sm:text-xl font-bold tool-heading mb-3">{sec.h}</h2>
            {sec.p && <p className="mb-2">{sec.p}</p>}
            {sec.items && (
              <ul className="list-disc space-y-1.5 ps-5">
                {sec.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            )}
            {sec.sub && (
              <div className="space-y-4 mt-3">
                {sec.sub.map((sub, k) => (
                  <div key={k}>
                    <h3 className="text-base font-bold tool-heading mb-2">{sub.h}</h3>
                    <p className="mb-2">{sub.p}</p>
                    {sub.items && (
                      <ul className="list-disc space-y-1.5 ps-5">
                        {sub.items.map((item, l) => <li key={l}>{item}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link href={homePath(locale)} className="!text-[var(--coffee-accent)] hover:underline text-sm">
          {t('back.to_home', locale)}
        </Link>
      </div>
    </div>
  );
}
