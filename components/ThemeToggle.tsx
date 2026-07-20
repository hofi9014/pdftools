'use client';
import { useEffect, useState } from 'react';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const locale = useHydrationSafeLocale();

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
