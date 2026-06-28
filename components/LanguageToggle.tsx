'use client';
import { useLocale } from '@/lib/locale-context';

export default function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === 'pl' ? 'en' : 'pl')}
      className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium border border-[var(--coffee-border)] hover:bg-[var(--coffee-surface-hover)] transition min-h-[44px]"
      style={{ color: 'var(--coffee-text-secondary)' }}
      aria-label="Przełącz język"
    >
      <span className={locale === 'pl' ? 'font-bold' : ''} style={{ color: locale === 'pl' ? 'var(--coffee-accent)' : undefined }}>PL</span>
      <span style={{ color: 'var(--coffee-border-strong)' }}>/</span>
      <span className={locale === 'en' ? 'font-bold' : ''} style={{ color: locale === 'en' ? 'var(--coffee-accent)' : undefined }}>EN</span>
    </button>
  );
}
