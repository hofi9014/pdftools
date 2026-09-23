'use client';
import { useEffect, useState } from 'react';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';

// FINDING (2026-09-23) — same class of bug as MobileMenu/LanguageSelector: this component's
// button `title` tooltip always used useHydrationSafeLocale(), ignoring the URL-derived locale
// its parent (Header) already resolved, so the tooltip could show in the wrong language for a
// first-time visitor whose browser language differs from the URL's locale.
export default function ThemeToggle({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const [dark, setDark] = useState(false);
  const locale = forcedLocale ?? useHydrationSafeLocale();

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button onClick={toggle} className="p-3 rounded-lg hover:bg-[var(--coffee-surface-hover)] transition min-h-[44px] min-w-[44px] flex items-center justify-center text-lg" title={dark ? t('theme.light', locale) : t('theme.dark', locale)}>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
