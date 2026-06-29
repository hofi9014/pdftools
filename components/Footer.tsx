'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

const toolLinks = [
  { key: 'merge', href: '/merge' },
  { key: 'compress', href: '/compress' },
  { key: 'word', href: '/pdf-to-word' },
  { key: 'ocr', href: '/ocr-pdf' },
  { key: 'aichat', href: '/ai-chat' },
  { key: 'aisummary', href: '/ai-summary' },
  { key: 'edit', href: '/edit-pdf' },
  { key: 'sign', href: '/sign-pdf' },
  { key: 'fillform', href: '/fill-form' },
  { key: 'images', href: '/pdf-to-images' },
  { key: 'pdfa', href: '/to-pdfa' },
  { key: 'compare', href: '/compare-pdf' },
  { key: 'ppt', href: '/pdf-to-powerpoint' },
  { key: 'txt', href: '/pdf-to-txt' },
  { key: 'html', href: '/html-to-pdf' },
  { key: 'url', href: '/url-to-pdf' },
  { key: 'flatten', href: '/flatten-pdf' },
];

const convLinks = [
  { key: 'wordtopdf', href: '/word-to-pdf' },
  { key: 'jpgTopdf', href: '/jpg-to-pdf' },
  { key: 'openoffice', href: '/openoffice-to-pdf' },
  { key: 'pdf2openoffice', href: '/pdf-to-openoffice' },
  { key: 'excel', href: '/pdf-to-excel' },
  { key: 'excel2pdf', href: '/excel-to-pdf' },
  { key: 'html2pdf', href: '/pdf-to-html' },
  { key: 'html', href: '/html-to-pdf' },
  { key: 'url', href: '/url-to-pdf' },
];

const infoLinks = [
  { key: 'nav.home', href: '/' },
  { href: '/#tools', labelKey: null },
  { href: '/faq', labelKey: 'faq.link' },
  { href: '/help', labelKey: 'help.link' },
  { href: '/privacy', labelKey: 'nav.privacy' },
  { href: '/rodo', labelKey: 'rodo.link' },
  { href: '/security', labelKey: 'security.link' },
  { href: '/guide', labelKey: 'nav.guide' },
];

const linkStyle = 'text-[rgba(245,237,228,0.65)] hover:text-[#F5EDE4] transition';

export default function Footer() {
  const { locale } = useLocale();

  return (
    <footer className="bg-[#3C2415] dark:bg-[#0A0807] text-gray-400 py-8 mt-12 border-t border-[rgba(255,255,255,0.06)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-left">
          <div>
            <p className="font-bold text-[#F5EDE4] mb-3">OptimaPDF</p>
            <p className="text-sm leading-relaxed text-[rgba(245,237,228,0.65)]">{t('footer.desc', locale)}</p>
          </div>
          <div>
            <p className="font-semibold text-[rgba(245,237,228,0.8)] mb-3">{t('footer.tools', locale)}</p>
            <ul className="space-y-2 text-sm">
              {toolLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className={linkStyle}>{t(`tool.${link.key}`, locale)}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-[rgba(245,237,228,0.8)] mb-3">{t('footer.conversions', locale)}</p>
            <ul className="space-y-2 text-sm">
              {convLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className={linkStyle}>{t(`tool.${link.key}`, locale)}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-[rgba(245,237,228,0.8)] mb-3">{t('footer.info', locale)}</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className={linkStyle}>{t('nav.home', locale)}</Link></li>
              <li><Link href="/#tools" className={linkStyle}>{t('footer.all_tools', locale)}</Link></li>
              <li><Link href="/faq" className={linkStyle}>{t('faq.link', locale)}</Link></li>
              <li><Link href="/help" className={linkStyle}>{t('help.link', locale)}</Link></li>
              <li><Link href="/privacy" className={linkStyle}>{t('nav.privacy', locale)}</Link></li>
              <li><Link href="/rodo" className={linkStyle}>{t('rodo.link', locale)}</Link></li>
              <li><Link href="/security" className={linkStyle}>{t('security.link', locale)}</Link></li>
              <li><Link href="/guide" className={linkStyle}>{t('nav.guide', locale)}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[rgba(255,255,255,0.06)] pt-6 text-center text-xs text-[rgba(245,237,228,0.4)]">
          <p>&copy; {new Date().getFullYear()} OptimaPDF. {t('footer.copyright', locale)}</p>
        </div>
      </div>
    </footer>
  );
}
