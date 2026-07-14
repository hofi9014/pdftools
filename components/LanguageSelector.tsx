'use client';
import { useLocale } from '@/lib/locale-context';
import { locales, t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { localeGuidesSlug, localeFromSegment, getLocaleSegment } from '@/lib/guides-slugs';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';

const flagMap: Record<string, string> = {
  ar: 'sa', de: 'de', en: 'gb', es: 'es', fa: 'ir', fr: 'fr', hi: 'in',
  is: 'is', it: 'it', ja: 'jp', no: 'no', pl: 'pl', pt: 'pt',
  sv: 'se', tr: 'tr', zh: 'cn',
};

const labelMap: Record<string, string> = {
  ar: 'العربية', de: 'Deutsch', en: 'English', es: 'Español', fa: 'فارسی',
  fr: 'Français', hi: 'हिन्दी', is: 'Íslenska', it: 'Italiano', ja: '日本語',
  no: 'Norsk', pl: 'Polski', pt: 'Português', sv: 'Svenska', tr: 'Türkçe', zh: '中文',
};

function isGuidesPath(pathname: string): boolean {
  return pathname === '/guides' || pathname.startsWith('/guides/');
}

export default function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = useCallback((code: Locale) => {
    setOpen(false);

    if (isGuidesPath(pathname)) {
      const segments = pathname.split('/').filter(Boolean);
      const currentLocaleSeg = segments[1] || '';
      const currentLocale = localeFromSegment(currentLocaleSeg);
      if (currentLocale !== code) {
        localStorage.setItem('locale', code);
        segments[1] = getLocaleSegment(code);
        setLocale(code);
        router.push('/' + segments.join('/'));
        return;
      }
    }
    setLocale(code);
  }, [pathname, setLocale, router]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-sm transition"
        style={{ color: 'var(--coffee-text-secondary)', backgroundColor: open ? 'var(--coffee-surface-hover)' : 'transparent' }}
        aria-label={t('lang.switch', locale)}
        title={t('lang.switch', locale)}
      >
        <img src={`/flags/${flagMap[locale]}.svg`} alt="" className="inline-block w-auto h-4" />
        <span className="hidden sm:inline">{labelMap[locale]}</span>
        <svg className="w-3.5 h-3.5 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 py-1 min-w-[140px] rounded-xl border shadow-xl z-50"
          style={{
            backgroundColor: 'var(--coffee-surface)',
            borderColor: 'var(--coffee-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          {locales.map(code => (
            <button
              key={code}
              onClick={() => handleChange(code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition`}
              style={{
                color: code === locale ? 'var(--coffee-accent)' : 'var(--coffee-text-secondary)',
                backgroundColor: code === locale ? 'var(--coffee-accent-soft)' : 'transparent',
              }}
              onMouseEnter={e => { if (code !== locale) (e.target as HTMLElement).style.backgroundColor = 'var(--coffee-surface-hover)'; }}
              onMouseLeave={e => { if (code !== locale) (e.target as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              <img src={`/flags/${flagMap[code]}.svg`} alt="" className="inline-block w-auto h-4" />
              {labelMap[code]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
