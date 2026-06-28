'use client';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

const toolDefs = [
  { key: "merge", href: "/merge" },
  { key: "split", href: "/split" },
  { key: "compress", href: "/compress" },
  { key: "word", href: "/pdf-to-word" },
  { key: "wordtopdf", href: "/word-to-pdf" },
  { key: "jpgTopdf", href: "/jpg-to-pdf" },
  { key: "images", href: "/pdf-to-images" },
  { key: "protect", href: "/protect-pdf" },
  { key: "unlock", href: "/unlock-pdf" },
  { key: "rotate", href: "/rotate-pdf" },
  { key: "pagenumbers", href: "/page-numbers" },
  { key: "watermark", href: "/watermark-pdf" },
  { key: "ocr", href: "/ocr-pdf" },
  { key: "extract", href: "/extract-pages" },
  { key: "delete", href: "/delete-pages" },
  { key: "reorder", href: "/reorder-pages" },
  { key: "crop", href: "/crop-pdf" },
  { key: "addpage", href: "/add-page" },
  { key: "edit", href: "/edit-pdf" },
  { key: "sign", href: "/sign-pdf" },
  { key: "metadata", href: "/metadata" },
  { key: "excel", href: "/pdf-to-excel" },
  { key: "excel2pdf", href: "/excel-to-pdf" },
  { key: "openoffice", href: "/openoffice-to-pdf" },
  { key: "pdf2openoffice", href: "/pdf-to-openoffice" },
  { key: "txt", href: "/pdf-to-txt" },
  { key: "aichat", href: "/ai-chat" },
  { key: "aisummary", href: "/ai-summary" },
  { key: "ppt", href: "/pdf-to-powerpoint" },
  { key: "compare", href: "/compare-pdf" },
  { key: "html", href: "/html-to-pdf" },
  { key: "url", href: "/url-to-pdf" },
  { key: "html2pdf", href: "/pdf-to-html" },
  { key: "flatten", href: "/flatten-pdf" },
  { key: "svg", href: "/pdf-to-svg" },
  { key: "redact", href: "/redact-pdf" },
  { key: "epub", href: "/pdf-to-epub" },
  { key: "translate", href: "/ai-translate" },
  { key: "fillform", href: "/fill-form" },
  { key: "pdfa", href: "/to-pdfa" },
  { key: "guide", href: "/guide" },
];

export default function Home() {
  const { locale } = useLocale();

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4 text-center">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 20%, var(--coffee-accent-glow) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 60%, var(--coffee-gold-glow) 0%, transparent 60%)'
        }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border" style={{
            backgroundColor: 'var(--coffee-badge-bg)',
            color: 'var(--coffee-badge-text)',
            borderColor: 'var(--coffee-border)'
          }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--coffee-accent)', boxShadow: '0 0 8px var(--coffee-accent)' }} />
            {t('hero.badge', locale)}
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4 leading-tight" style={{ color: 'var(--coffee-text)' }}>
            {t('home.title', locale)}
          </h2>
          <p className="text-lg sm:text-xl mb-10 max-w-xl mx-auto" style={{ color: 'var(--coffee-text-secondary)' }}>
            {t('home.subtitle', locale)}
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="#tools" className="btn-accent text-base">
              {t('home.cta', locale)} →
            </a>
            <a href="/privacy" className="btn-ghost text-base">
              {t('hero.privacy', locale)}
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="flex justify-center gap-12 sm:gap-16 py-8 px-4">
        <div className="text-center">
          <div className="text-4xl font-black gradient-text">42</div>
          <div className="text-sm mt-1" style={{ color: 'var(--coffee-text-tertiary)' }}>{t('stats.tools', locale)}</div>
        </div>
        <div className="w-px self-stretch" style={{ backgroundColor: 'var(--coffee-border-strong)' }} />
        <div className="text-center">
          <div className="text-4xl font-black gradient-text">{t('stats.local', locale)}</div>
          <div className="text-sm mt-1" style={{ color: 'var(--coffee-text-tertiary)' }}>{t('stats.local_sub', locale)}</div>
        </div>
        <div className="w-px self-stretch" style={{ backgroundColor: 'var(--coffee-border-strong)' }} />
        <div className="text-center">
          <div className="text-4xl font-black gradient-text">100%</div>
          <div className="text-sm mt-1" style={{ color: 'var(--coffee-text-tertiary)' }}>{t('stats.free', locale)}</div>
        </div>
      </div>

      {/* Tools */}
      <section id="tools" className="max-w-7xl mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-3" style={{ color: 'var(--coffee-text)' }}>{t('home.pdfTools', locale)}</h3>
        <p className="text-center mb-12" style={{ color: 'var(--coffee-text-secondary)' }}>
          {t('home.subtitle2', locale)}
        </p>
        <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {toolDefs.map((tool) => (
            <a key={tool.href} href={tool.href}
              className="coffee-card p-5 sm:p-6 group">
              <div className="text-3xl sm:text-4xl mb-3">{getToolIcon(tool.key)}</div>
              <h4 className="font-bold mb-1 text-sm sm:text-base" style={{ color: 'var(--coffee-text)' }}>{t(`tool.${tool.key}`, locale)}</h4>
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--coffee-text-tertiary)' }}>{t(`desc.${tool.key}`, locale)}</p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
