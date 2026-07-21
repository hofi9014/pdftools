'use client';
import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { localeGuidesSlug } from '@/lib/guides-slugs';
import { getCategoryIcon } from '@/lib/icons';
import { toolsByCategory, toolPath } from '@/lib/tools';

interface CatTool {
  key: string;
  href: string;
  navKey?: string;
  icon?: string;
}

interface Category {
  key: string;
  tools: CatTool[];
}

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const locale = useHydrationSafeLocale();

  const infoMore: CatTool[] = [
    { key: 'rules', href: toolPath('rules', locale), navKey: 'nav.rules', icon: '📜' },
    { key: 'support', href: toolPath('support', locale), navKey: 'nav.support', icon: '💬' },
  ];

  const categories: Category[] = [
    {
      key: 'edit',
      tools: toolsByCategory('edit').map(t => ({ key: t.key, href: toolPath(t.key, locale) })),
    },
    {
      key: 'convert',
      tools: toolsByCategory('convert').map(t => ({ key: t.key, href: toolPath(t.key, locale) })),
    },
    {
      key: 'secure',
      tools: toolsByCategory('secure').map(t => ({ key: t.key, href: toolPath(t.key, locale) })),
    },
    {
      key: 'more',
      tools: [
        ...toolsByCategory('more').map(t => ({ key: t.key, href: toolPath(t.key, locale) })),
        ...infoMore,
      ],
    },
  ];

  const toggleCategory = useCallback((key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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
      {open && typeof window !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed top-16 left-0 right-0 bottom-0 z-50 md:hidden flex flex-col" style={{ backgroundColor: 'var(--coffee-surface-solid)' }}>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="px-4 py-3 space-y-1">
                <Link href="/" className="block px-3 py-2 text-sm rounded-lg hover:bg-[var(--coffee-surface-hover)]" style={{ color: 'var(--coffee-text-secondary)' }} onClick={() => setOpen(false)}>{t('nav.home', locale)}</Link>
                <Link href={toolPath('guide', locale)} className="block px-3 py-2 text-sm rounded-lg hover:bg-[var(--coffee-surface-hover)]" style={{ color: 'var(--coffee-text-secondary)' }} onClick={() => setOpen(false)}>📖 {t('nav.guide', locale)}</Link>
                <Link href={`/guides/${localeGuidesSlug[locale]}`} className="block px-3 py-2 text-sm rounded-lg hover:bg-[var(--coffee-surface-hover)]" style={{ color: 'var(--coffee-text-secondary)' }} onClick={() => setOpen(false)}>📚 {t('nav.guides', locale)}</Link>
              </div>
              <div className="px-4 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-3" style={{ color: 'var(--coffee-text-tertiary)' }}>{t('nav.tools', locale)}</span>
              </div>
              {categories.map(cat => (
                <div key={cat.key}>
                  <button onClick={() => toggleCategory(cat.key)}
                    className="flex items-center justify-between w-full px-4 py-4 text-sm font-semibold border-b border-[var(--coffee-border)] min-h-[44px] hover:bg-[var(--coffee-surface-hover)]"
                    style={{ color: 'var(--coffee-text-secondary)' }}>
                    <span className="flex items-center gap-2">
                      {getCategoryIcon(cat.key)}
                      <span>{t(`nav.category.${cat.key}`, locale)}</span>
                    </span>
                    <svg className={`w-4 h-4 transition-transform ${expanded.has(cat.key) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expanded.has(cat.key) && (
                    <div className="bg-[var(--coffee-surface)]">
                      {cat.tools.map((tool, i) => (
                        <div key={tool.href}>
                          {cat.key === 'more' && i === 7 && (
                            <div className="border-t border-[var(--coffee-border)] mx-4 py-1">
                              <span className="block px-3 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--coffee-text-tertiary)' }}>
                                {t('footer.info', locale)}
                              </span>
                            </div>
                          )}
                          <Link href={tool.href}
                            className="flex items-center gap-2 px-7 py-4 text-sm border-b border-[var(--coffee-border)] last:border-0 min-h-[44px] hover:bg-[var(--coffee-surface-hover)]"
                            style={{ color: 'var(--coffee-text-secondary)' }}
                            onClick={() => setOpen(false)}>
                            {tool.icon && <span>{tool.icon}</span>}{t(tool.navKey ?? `tool.${tool.key}`, locale)}
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
