'use client';
import { useLocale } from '@/lib/locale-context';
import { locales, t } from '@/lib/i18n';
import { useState, useRef, useEffect } from 'react';

const flagMap: Record<string, string> = {
  pl: '🇵🇱', en: '🇬🇧', es: '🇪🇸', de: '🇩🇪', fr: '🇫🇷', it: '🇮🇹', pt: '🇵🇹',
  is: '🇮🇸', tr: '🇹🇷', sv: '🇸🇪', no: '🇳🇴', ja: '🇯🇵', hi: '🇮🇳',
};

const labelMap: Record<string, string> = {
  pl: 'Polski', en: 'English', es: 'Español', de: 'Deutsch', fr: 'Français', it: 'Italiano', pt: 'Português',
  is: 'Íslenska', tr: 'Türkçe', sv: 'Svenska', no: 'Norsk', ja: '日本語', hi: 'हिन्दी',
};

export default function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-sm transition"
        style={{ color: 'var(--coffee-text-secondary)', backgroundColor: open ? 'var(--coffee-surface-hover)' : 'transparent' }}
        aria-label={t('lang.switch', locale)}
        title={t('lang.switch', locale)}
      >
        <span className="text-base leading-none">{flagMap[locale] || '🌐'}</span>
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
              onClick={() => { setLocale(code); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition`}
              style={{
                color: code === locale ? 'var(--coffee-accent)' : 'var(--coffee-text-secondary)',
                backgroundColor: code === locale ? 'var(--coffee-accent-soft)' : 'transparent',
              }}
              onMouseEnter={e => { if (code !== locale) (e.target as HTMLElement).style.backgroundColor = 'var(--coffee-surface-hover)'; }}
              onMouseLeave={e => { if (code !== locale) (e.target as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              <span className="text-base leading-none">{flagMap[code] || '🌐'}</span>
              {labelMap[code]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
