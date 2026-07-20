'use client';
import { usePathname } from 'next/navigation';
import { type Locale, locales } from '@/lib/i18n';
import Header from './Header';
import Footer from './Footer';
import Breadcrumbs from './Breadcrumbs';
import HtmlLang from './HtmlLang';
import SchemaHowTo from './SchemaHowTo';

function extractLocaleFromPath(pathname: string): Locale | undefined {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && (locales as readonly string[]).includes(segments[0])) {
    return segments[0] as Locale;
  }
  return undefined;
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = extractLocaleFromPath(pathname);

  return (
    <>
      <HtmlLang locale={locale} />
      <SchemaHowTo locale={locale} />
      <Header locale={locale} />
      <Breadcrumbs locale={locale} />
      {children}
      <Footer locale={locale} />
    </>
  );
}
