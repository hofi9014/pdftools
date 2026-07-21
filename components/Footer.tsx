'use client';
import Link from 'next/link';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { localeGuidesSlug } from '@/lib/guides-slugs';
import { toolPath } from '@/lib/tools';

const toolLinkKeys = ['merge', 'compress', 'word', 'ocr', 'aichat', 'aisummary',
  'edit', 'sign', 'fillform', 'images', 'pdfa', 'compare', 'ppt', 'txt', 'html', 'url', 'flatten'];

const convLinkKeys = ['wordtopdf', 'jpgTopdf', 'openoffice', 'pdf2openoffice',
  'excel', 'excel2pdf', 'html2pdf', 'html', 'url'];

const linkStyle = 'text-[rgba(245,237,228,0.65)] hover:text-[#F5EDE4] transition';

export default function Footer({ locale: forcedLocale }: { locale?: Locale }) {
  const locale = forcedLocale ?? useHydrationSafeLocale();

  const toolLinks = toolLinkKeys.map(key => ({ key, href: toolPath(key, locale) }));
  const convLinks = convLinkKeys.map(key => ({ key, href: toolPath(key, locale) }));

  const infoLinks = [
    { labelKey: 'nav.home', href: locale ? `/${locale}` : '/' },
    { labelKey: 'footer.all_tools', href: locale ? `/${locale}/#tools` : '/#tools' },
    { labelKey: 'faq.link', href: toolPath('faq', locale) },
    { labelKey: 'help.link', href: toolPath('help', locale) },
    { labelKey: 'nav.rules', href: locale ? `/${locale}/nasze-zasady` : '/nasze-zasady' },
    { labelKey: 'nav.support', href: locale ? `/${locale}/wsparcie` : '/wsparcie' },
    { labelKey: 'nav.privacy', href: toolPath('privacy', locale) },
    { labelKey: 'rodo.link', href: toolPath('rodo', locale) },
    { labelKey: 'security.link', href: toolPath('security', locale) },
    { labelKey: 'nav.guide', href: toolPath('guide', locale) },
  ];

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
              {infoLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className={linkStyle}>{t(link.labelKey, locale)}</Link>
                </li>
              ))}
              <li><Link href={`/guides/${localeGuidesSlug[locale]}`} className={linkStyle}>{t('nav.guides', locale)}</Link></li>
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
