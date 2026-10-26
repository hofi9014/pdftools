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

  const choose = (next: boolean) => {
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  // Both themes stay visible as a two-button switch, so the current theme is shown, not implied.
  const option = (isDark: boolean, icon: string, label: string) => (
    <button type="button" onClick={() => choose(isDark)} aria-pressed={dark === isDark} title={label} aria-label={label}
      className="w-9 h-9 rounded-[10px] flex items-center justify-center text-base transition cursor-pointer"
      style={{ backgroundColor: dark === isDark ? 'var(--coffee-accent-soft)' : 'transparent' }}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );

  return (
    <div role="group" aria-label={t('theme.dark', locale) + ' / ' + t('theme.light', locale)}
      className="flex items-center p-[3px] rounded-[13px] border"
      style={{ borderColor: 'var(--coffee-border-strong)', backgroundColor: 'var(--coffee-surface-solid)' }}>
      {option(false, '☀️', t('theme.light', locale))}
      {option(true, '🌙', t('theme.dark', locale))}
    </div>
  );
}
