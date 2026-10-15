'use client';

import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';

// First focusable element on every page: keyboard and screen-reader users jump past the header
// navigation straight to the page's <main id="main-content"> (WCAG 2.4.1 Bypass Blocks).
// Hidden until it receives focus.
export default function SkipLink({ locale }: { locale?: Locale }) {
  const storedLocale = useHydrationSafeLocale();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[1000] focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold focus:shadow-lg"
      style={{ backgroundColor: 'var(--coffee-accent-ink)', color: 'var(--coffee-on-accent)' }}
    >
      {t('a11y.skip_to_content', locale ?? storedLocale)}
    </a>
  );
}
