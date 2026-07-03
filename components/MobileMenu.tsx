'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { localeGuidesSlug } from '@/lib/guides-slugs';

const toolKeys = [
  { key: 'merge', href: '/merge' },
  { key: 'split', href: '/split' },
  { key: 'compress', href: '/compress' },
  { key: 'word', href: '/pdf-to-word' },
  { key: 'wordtopdf', href: '/word-to-pdf' },
  { key: 'jpgTopdf', href: '/jpg-to-pdf' },
  { key: 'protect', href: '/protect-pdf' },
  { key: 'unlock', href: '/unlock-pdf' },
  { key: 'rotate', href: '/rotate-pdf' },
  { key: 'watermark', href: '/watermark-pdf' },
  { key: 'pagenumbers', href: '/page-numbers' },
  { key: 'ocr', href: '/ocr-pdf' },
  { key: 'extract', href: '/extract-pages' },
  { key: 'delete', href: '/delete-pages' },
  { key: 'reorder', href: '/reorder-pages' },
  { key: 'crop', href: '/crop-pdf' },
  { key: 'addpage', href: '/add-page' },
  { key: 'edit', href: '/edit-pdf' },
  { key: 'sign', href: '/sign-pdf' },
  { key: 'metadata', href: '/metadata' },
  { key: 'excel', href: '/pdf-to-excel' },
  { key: 'excel2pdf', href: '/excel-to-pdf' },
  { key: 'txt', href: '/pdf-to-txt' },
  { key: 'ppt', href: '/pdf-to-powerpoint' },
  { key: 'compare', href: '/compare-pdf' },
  { key: 'html', href: '/html-to-pdf' },
  { key: 'url', href: '/url-to-pdf' },
  { key: 'html2pdf', href: '/pdf-to-html' },
  { key: 'flatten', href: '/flatten-pdf' },
  { key: 'openoffice', href: '/openoffice-to-pdf' },
  { key: 'pdf2openoffice', href: '/pdf-to-openoffice' },
  { key: 'aichat', href: '/ai-chat' },
  { key: 'aisummary', href: '/ai-summary' },
  { key: 'translate', href: '/ai-translate' },
  { key: 'svg', href: '/pdf-to-svg' },
  { key: 'redact', href: '/redact-pdf' },
  { key: 'epub', href: '/pdf-to-epub' },
  { key: 'fillform', href: '/fill-form' },
  { key: 'images', href: '/pdf-to-images' },
  { key: 'pdfa', href: '/to-pdfa' },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { locale } = useLocale();

  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="md:hidden p-3 rounded-lg hover:bg-[var(--coffee-surface-hover)] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
        title={t('nav.tools', locale)}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--coffee-text-secondary)' }}>
          {open ? (
            <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed top-16 left-0 right-0 bottom-0 z-50 md:hidden flex flex-col" style={{ backgroundColor: 'var(--coffee-surface-solid)' }}>
            <div className="sticky top-0 px-4 py-3 border-b border-[var(--coffee-border)] shrink-0 space-y-1" style={{ backgroundColor: 'var(--coffee-surface-solid)' }}>
              <Link href="/" className="block px-3 py-2 text-sm rounded-lg hover:bg-[var(--coffee-surface-hover)]" style={{ color: 'var(--coffee-text-secondary)' }} onClick={() => setOpen(false)}>{t('nav.home', locale)}</Link>
              <Link href="/guide" className="block px-3 py-2 text-sm rounded-lg hover:bg-[var(--coffee-surface-hover)]" style={{ color: 'var(--coffee-text-secondary)' }} onClick={() => setOpen(false)}>📖 {t('nav.guide', locale)}</Link>
              <Link href={`/guides/${localeGuidesSlug[locale]}`} className="block px-3 py-2 text-sm rounded-lg hover:bg-[var(--coffee-surface-hover)]" style={{ color: 'var(--coffee-text-secondary)' }} onClick={() => setOpen(false)}>📚 {t('nav.guides', locale)}</Link>
              <div className="pt-2 border-t border-[var(--coffee-border)]">
                <span className="text-xs font-semibold uppercase tracking-wider px-3" style={{ color: 'var(--coffee-text-tertiary)' }}>{t('nav.tools', locale)}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {toolKeys.map((tk) => (
                <Link key={tk.href} href={tk.href}
                  className="block px-4 py-4 text-sm border-b border-[var(--coffee-border)] last:border-0 min-h-[44px] flex items-center hover:bg-[var(--coffee-accent-subtle)]"
                  style={{ color: 'var(--coffee-text-secondary)' }}
                  onClick={() => setOpen(false)}>
                  {t(`tool.${tk.key}`, locale)}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
