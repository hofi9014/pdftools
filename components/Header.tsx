'use client';
import Link from 'next/link';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { localeGuidesSlug } from '@/lib/guides-slugs';
import { getCategoryIcon } from '@/lib/icons';
import { toolsByCategory, toolPath } from '@/lib/tools';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import MobileMenu from './MobileMenu';

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

export default function Header({ locale: forcedLocale }: { locale?: Locale }) {
  const locale = forcedLocale ?? useHydrationSafeLocale();

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

  return (
    <header className="border-b border-[var(--coffee-border)] bg-[var(--coffee-surface)] backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="OptimaPDF" className="h-11 w-auto" />
          <span className="hidden xs:inline text-xl font-bold" style={{ color: 'var(--coffee-text)' }}>OptimaPDF</span>
          <span className="xs:hidden text-xl font-bold" style={{ color: 'var(--coffee-text)' }}>OP</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--coffee-text-secondary)' }}>
          <Link href="/" className="px-3 py-2 rounded-lg hover:bg-[var(--coffee-surface-hover)] transition" style={{ color: 'var(--coffee-text-secondary)' }}>{t('nav.home', locale)}</Link>
          {categories.map(cat => (
            <div key={cat.key} className="relative group">
              <button className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-[var(--coffee-surface-hover)] transition cursor-pointer whitespace-nowrap" style={{ color: 'var(--coffee-text-secondary)' }}>
                {getCategoryIcon(cat.key)}
                <span>{t(`nav.category.${cat.key}`, locale)}</span>
                <svg className="w-3 h-3 ml-0.5 mt-0.5 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none group-hover:pointer-events-auto">
                <div className="bg-[var(--coffee-surface-solid)] dark:bg-[var(--coffee-surface-solid)] rounded-2xl shadow-xl border border-[var(--coffee-border)] p-4 min-w-[200px] backdrop-blur-xl">
                  <div className="grid gap-1">
                    {cat.tools.map((tool, i) => (
                      <div key={tool.href}>
                        {cat.key === 'more' && i === 7 && (
                          <>
                            <div className="border-t my-1.5" style={{ borderColor: 'var(--coffee-border)' }} />
                            <span className="block px-3 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--coffee-text-tertiary)' }}>
                              {t('footer.info', locale)}
                            </span>
                          </>
                        )}
                        <Link href={tool.href}
                          className="block px-3 py-2 rounded-lg text-sm transition hover:bg-[var(--coffee-surface-hover)]"
                          style={{ color: 'var(--coffee-text-secondary)' }}>
                          {tool.icon && <span className="mr-1.5">{tool.icon}</span>}{t(tool.navKey ?? `tool.${tool.key}`, locale)}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Link href={toolPath('guide', locale)} className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-[var(--coffee-surface-hover)] transition" style={{ color: 'var(--coffee-text-secondary)' }}>📖 {t('nav.guide', locale)}</Link>
          <Link href={`/guides/${localeGuidesSlug[locale]}`} className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-[var(--coffee-surface-hover)] transition" style={{ color: 'var(--coffee-text-secondary)' }}>📚 {t('nav.guides', locale)}</Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <MobileMenu />
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
