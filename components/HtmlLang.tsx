'use client';
import { useLocale } from '@/lib/locale-context';
import { useEffect } from 'react';
import { type Locale, localeToHtmlLang } from '@/lib/i18n';

export default function HtmlLang({ locale: forcedLocale }: { locale?: Locale }) {
  const { locale: ctxLocale } = useLocale();
  const locale = forcedLocale ?? ctxLocale;

  useEffect(() => {
    document.documentElement.lang = localeToHtmlLang(locale);
  }, [locale]);

  return null;
}
