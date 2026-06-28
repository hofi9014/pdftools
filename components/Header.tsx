'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import MobileMenu from './MobileMenu';

interface CatTool {
  key: string;
  href: string;
}

interface Category {
  key: string;
  icon: string;
  tools: CatTool[];
}

const categories: Category[] = [
  {
    key: 'edit', icon: '✏️',
    tools: [
      { key: 'merge', href: '/merge' },
      { key: 'split', href: '/split' },
      { key: 'compress', href: '/compress' },
      { key: 'rotate', href: '/rotate-pdf' },
      { key: 'crop', href: '/crop-pdf' },
      { key: 'delete', href: '/delete-pages' },
      { key: 'extract', href: '/extract-pages' },
      { key: 'reorder', href: '/reorder-pages' },
      { key: 'addpage', href: '/add-page' },
      { key: 'edit', href: '/edit-pdf' },
      { key: 'pagenumbers', href: '/page-numbers' },
      { key: 'watermark', href: '/watermark-pdf' },
      { key: 'redact', href: '/redact-pdf' },
      { key: 'flatten', href: '/flatten-pdf' },
      { key: 'metadata', href: '/metadata' },
    ],
  },
  {
    key: 'convert', icon: '🔄',
    tools: [
      { key: 'word', href: '/pdf-to-word' },
      { key: 'wordtopdf', href: '/word-to-pdf' },
      { key: 'jpgTopdf', href: '/jpg-to-pdf' },
      { key: 'images', href: '/pdf-to-images' },
      { key: 'excel', href: '/pdf-to-excel' },
      { key: 'excel2pdf', href: '/excel-to-pdf' },
      { key: 'ppt', href: '/pdf-to-powerpoint' },
      { key: 'openoffice', href: '/openoffice-to-pdf' },
      { key: 'pdf2openoffice', href: '/pdf-to-openoffice' },
      { key: 'txt', href: '/pdf-to-txt' },
      { key: 'svg', href: '/pdf-to-svg' },
      { key: 'epub', href: '/pdf-to-epub' },
      { key: 'html', href: '/html-to-pdf' },
      { key: 'html2pdf', href: '/pdf-to-html' },
      { key: 'url', href: '/url-to-pdf' },
    ],
  },
  {
    key: 'secure', icon: '🔒',
    tools: [
      { key: 'protect', href: '/protect-pdf' },
      { key: 'unlock', href: '/unlock-pdf' },
      { key: 'sign', href: '/sign-pdf' },
    ],
  },
  {
    key: 'more', icon: '🧩',
    tools: [
      { key: 'aichat', href: '/ai-chat' },
      { key: 'aisummary', href: '/ai-summary' },
      { key: 'translate', href: '/ai-translate' },
      { key: 'ocr', href: '/ocr-pdf' },
      { key: 'compare', href: '/compare-pdf' },
      { key: 'fillform', href: '/fill-form' },
      { key: 'pdfa', href: '/to-pdfa' },
    ],
  },
];

export default function Header() {
  const { locale } = useLocale();

  return (
    <header className="border-b border-[var(--coffee-border)] bg-[var(--coffee-surface)] backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold shrink-0" style={{ color: 'var(--coffee-text)' }}>
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--coffee-accent)] to-[var(--coffee-gold)] flex items-center justify-center text-white text-sm font-bold shadow-[0_0_12px_var(--coffee-accent-glow)]">P</span>
          <span className="hidden xs:inline">PDFTools</span>
          <span className="xs:hidden">PT</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--coffee-text-secondary)' }}>
          <Link href="/" className="px-3 py-2 rounded-lg hover:bg-[var(--coffee-surface-hover)] transition" style={{ color: 'var(--coffee-text-secondary)' }}>{t('nav.home', locale)}</Link>
          {categories.map(cat => (
            <div key={cat.key} className="relative group">
              <button className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-[var(--coffee-surface-hover)] transition cursor-pointer whitespace-nowrap" style={{ color: 'var(--coffee-text-secondary)' }}>
                {cat.icon}
                <span>{t(`nav.category.${cat.key}`, locale)}</span>
                <svg className="w-3 h-3 ml-0.5 mt-0.5 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none group-hover:pointer-events-auto">
                <div className="bg-[var(--coffee-surface-solid)] dark:bg-[var(--coffee-surface-solid)] rounded-2xl shadow-xl border border-[var(--coffee-border)] p-4 min-w-[200px] backdrop-blur-xl">
                  <div className="grid gap-1">
                    {cat.tools.map(tool => (
                      <Link key={tool.href} href={tool.href}
                        className="block px-3 py-2 rounded-lg text-sm transition hover:bg-[var(--coffee-surface-hover)]" style={{ color: 'var(--coffee-text-secondary)' }}>
                        {t(`tool.${tool.key}`, locale)}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Link href="/guide" className="px-3 py-2 rounded-lg hover:bg-[var(--coffee-surface-hover)] transition" style={{ color: 'var(--coffee-text-secondary)' }}>{t('nav.guide', locale)}</Link>
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
